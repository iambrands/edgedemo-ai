import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Users, Upload, FileText, 
  CheckCircle, AlertTriangle, Video, BarChart2, Mail, Plus
} from 'lucide-react';

interface Participant {
  name: string;
  email?: string;
  role?: string;
}

interface Meeting {
  id: string;
  household_id: string;
  title: string;
  meeting_type: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  platform: string | null;
  participants: Participant[];
  created_at: string;
  has_transcript: boolean;
  has_analysis: boolean;
}

interface TranscriptSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
}

interface ActionItem {
  id: string;
  description: string;
  assigned_to: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  source_text: string | null;
}

interface MeetingAnalysis {
  executive_summary: string;
  detailed_notes: string;
  key_topics: string[];
  client_concerns: Array<{ concern: string; severity: string; requires_action: boolean }>;
  life_events: Array<{ event: string; timeline: string; financial_impact: string }>;
  action_items: ActionItem[];
  risk_tolerance_signals: { current_assessment: string; signals: string[]; recommended_review: boolean } | null;
  sentiment_score: number;
  sentiment_breakdown: { positive: number; neutral: number; negative: number } | null;
  compliance_flags: Array<{ type: string; description: string; severity: string }>;
  requires_review: boolean;
  suggested_followup_email: string | null;
  next_meeting_topics: string[];
}

interface Transcript {
  id: string;
  meeting_id: string;
  raw_text: string;
  segments: TranscriptSegment[];
  word_count: number;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  processing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const priorityColors: Record<string, string> = {
  urgent: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-gray-400',
};

// Ensure HTTPS for production Railway URLs to prevent mixed content errors
const API_BASE = (() => {
  let url = import.meta.env.VITE_API_URL || '';
  
  // Fix: Sometimes env var gets set incorrectly with "VITE_API_URL=" prefix
  if (url.includes('VITE_API_URL=')) {
    url = url.replace(/.*VITE_API_URL=/i, '');
  }
  
  // Ensure HTTPS for railway.app URLs
  if (url.includes('railway.app') && url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }
  
  return url;
})();

const MeetingsPage: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'transcript' | 'actions'>('analysis');
  const [, setShowNewMeetingModal] = useState(false);

  useEffect(() => {
    loadMeetings();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('edgeai_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const loadMeetings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/meetings`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
        // Auto-select first completed meeting
        const completedMeeting = data.find((m: Meeting) => m.status === 'completed');
        if (completedMeeting) {
          setSelectedMeeting(completedMeeting);
          loadMeetingDetails(completedMeeting.id);
        }
      }
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMeetingDetails = async (meetingId: string) => {
    try {
      // Load analysis
      const analysisRes = await fetch(`${API_BASE}/api/v1/meetings/${meetingId}/analysis`, {
        headers: getAuthHeaders()
      });
      if (analysisRes.ok) {
        const analysisData = await analysisRes.json();
        setAnalysis(analysisData);
      } else {
        setAnalysis(null);
      }

      // Load transcript
      const transcriptRes = await fetch(`${API_BASE}/api/v1/meetings/${meetingId}/transcript`, {
        headers: getAuthHeaders()
      });
      if (transcriptRes.ok) {
        const transcriptData = await transcriptRes.json();
        setTranscript(transcriptData);
      } else {
        setTranscript(null);
      }
    } catch (error) {
      console.error('Failed to load meeting details:', error);
    }
  };

  const handleFileUpload = async (meetingId: string, file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('edgeai_token');
      const response = await fetch(`${API_BASE}/api/v1/meetings/${meetingId}/upload-recording`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        await loadMeetings();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const updateActionItem = async (meetingId: string, itemId: string, status: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/meetings/${meetingId}/action-items/${itemId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      
      if (response.ok && analysis) {
        // Update local state
        const updatedItems = analysis.action_items.map(item => 
          item.id === itemId ? { ...item, status } : item
        );
        setAnalysis({ ...analysis, action_items: updatedItems });
      }
    } catch (error) {
      console.error('Failed to update action item:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentEmoji = (score: number) => {
    if (score > 0.3) return '😊';
    if (score < -0.3) return '😟';
    return '😐';
  };

  const getSentimentLabel = (score: number) => {
    if (score > 0.3) return 'Positive';
    if (score < -0.3) return 'Concerned';
    return 'Neutral';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Meeting Intelligence</h1>
          <p className="text-gray-400 mt-1">
            AI-powered meeting transcription, analysis, and action tracking
          </p>
        </div>
        <button
          onClick={() => setShowNewMeetingModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Meeting
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{meetings.length}</p>
              <p className="text-sm text-gray-400">Total Meetings</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {meetings.filter(m => m.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-400">Analyzed</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {analysis?.action_items?.filter(a => a.status === 'pending').length || 0}
              </p>
              <p className="text-sm text-gray-400">Pending Actions</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {Math.round(meetings.reduce((acc, m) => acc + (m.duration_seconds || 0), 0) / 60)}m
              </p>
              <p className="text-sm text-gray-400">Total Time</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meetings List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-4">
            <h2 className="text-lg font-medium text-white mb-4">Recent Meetings</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  onClick={() => {
                    setSelectedMeeting(meeting);
                    if (meeting.status === 'completed') {
                      loadMeetingDetails(meeting.id);
                    } else {
                      setAnalysis(null);
                      setTranscript(null);
                    }
                  }}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedMeeting?.id === meeting.id
                      ? 'bg-blue-600/20 border border-blue-500'
                      : 'bg-slate-700/30 hover:bg-slate-700/50 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-white truncate pr-2">{meeting.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs border whitespace-nowrap ${statusColors[meeting.status]}`}>
                      {meeting.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {meeting.scheduled_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(meeting.scheduled_at)}
                      </span>
                    )}
                    {meeting.duration_seconds && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(meeting.duration_seconds)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {meeting.participants.length}
                    </span>
                  </div>
                  {meeting.has_analysis && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <BarChart2 className="w-3 h-3" />
                        Analysis Ready
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Meeting Detail / Analysis */}
        <div className="lg:col-span-2">
          {selectedMeeting ? (
            <div className="space-y-4">
              {/* Meeting Header */}
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedMeeting.title}</h2>
                    <p className="text-gray-400 mt-1">
                      {selectedMeeting.meeting_type.replace('_', ' ')} • {selectedMeeting.platform || 'In Person'}
                      {selectedMeeting.scheduled_at && ` • ${formatDate(selectedMeeting.scheduled_at)} at ${formatTime(selectedMeeting.scheduled_at)}`}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm border ${statusColors[selectedMeeting.status]}`}>
                    {selectedMeeting.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Participants */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedMeeting.participants.map((p, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-gray-300">
                      {p.name} {p.role && <span className="text-gray-500">({p.role})</span>}
                    </span>
                  ))}
                </div>

                {/* Upload Recording */}
                {(selectedMeeting.status === 'scheduled' || selectedMeeting.status === 'failed') && (
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept="audio/*,video/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileUpload(selectedMeeting.id, e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="recording-upload"
                    />
                    <label
                      htmlFor="recording-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className={`w-10 h-10 mb-3 ${isUploading ? 'text-blue-400 animate-pulse' : 'text-gray-400'}`} />
                      <span className="text-white font-medium">
                        {isUploading ? 'Uploading & Processing...' : 'Upload Meeting Recording'}
                      </span>
                      <span className="text-gray-400 text-sm mt-1">
                        MP3, MP4, WAV, or WebM
                      </span>
                    </label>
                  </div>
                )}

                {/* Processing Status */}
                {selectedMeeting.status === 'processing' && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 flex items-center gap-4">
                    <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
                    <div>
                      <p className="text-white font-medium">Processing Recording</p>
                      <p className="text-gray-400 text-sm">
                        Transcribing and analyzing... This may take a few minutes.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs */}
              {selectedMeeting.status === 'completed' && analysis && (
                <>
                  <div className="flex gap-2 border-b border-slate-700/50">
                    <button
                      onClick={() => setActiveTab('analysis')}
                      className={`px-4 py-2 font-medium transition-colors ${
                        activeTab === 'analysis'
                          ? 'text-blue-400 border-b-2 border-blue-400'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <BarChart2 className="w-4 h-4 inline mr-2" />
                      Analysis
                    </button>
                    <button
                      onClick={() => setActiveTab('transcript')}
                      className={`px-4 py-2 font-medium transition-colors ${
                        activeTab === 'transcript'
                          ? 'text-blue-400 border-b-2 border-blue-400'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-4 h-4 inline mr-2" />
                      Transcript
                    </button>
                    <button
                      onClick={() => setActiveTab('actions')}
                      className={`px-4 py-2 font-medium transition-colors ${
                        activeTab === 'actions'
                          ? 'text-blue-400 border-b-2 border-blue-400'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Actions ({analysis.action_items?.length || 0})
                    </button>
                  </div>

                  {/* Analysis Tab */}
                  {activeTab === 'analysis' && (
                    <div className="space-y-4">
                      {/* Executive Summary */}
                      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                        <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-400" />
                          Executive Summary
                        </h3>
                        <p className="text-gray-300 leading-relaxed">{analysis.executive_summary}</p>
                      </div>

                      {/* Key Topics & Sentiment */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                          <h3 className="text-lg font-medium text-white mb-3">Key Topics</h3>
                          <div className="flex flex-wrap gap-2">
                            {analysis.key_topics.map((topic, i) => (
                              <span key={i} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                          <h3 className="text-lg font-medium text-white mb-3">Client Sentiment</h3>
                          <div className="flex items-center gap-4">
                            <div className="text-4xl">{getSentimentEmoji(analysis.sentiment_score)}</div>
                            <div>
                              <p className="text-white font-medium">{getSentimentLabel(analysis.sentiment_score)}</p>
                              <p className="text-gray-400 text-sm">
                                Score: {(analysis.sentiment_score * 100).toFixed(0)}%
                              </p>
                            </div>
                          </div>
                          {analysis.sentiment_breakdown && (
                            <div className="mt-3 flex gap-4 text-sm">
                              <span className="text-green-400">+{(analysis.sentiment_breakdown.positive * 100).toFixed(0)}%</span>
                              <span className="text-gray-400">{(analysis.sentiment_breakdown.neutral * 100).toFixed(0)}%</span>
                              <span className="text-red-400">-{(analysis.sentiment_breakdown.negative * 100).toFixed(0)}%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Client Concerns */}
                      {analysis.client_concerns.length > 0 && (
                        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                          <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-400" />
                            Client Concerns
                          </h3>
                          <div className="space-y-3">
                            {analysis.client_concerns.map((concern, i) => (
                              <div key={i} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                                <span className={`w-2 h-2 rounded-full mt-2 ${
                                  concern.severity === 'high' ? 'bg-red-500' :
                                  concern.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                }`} />
                                <div className="flex-1">
                                  <span className="text-gray-300">{concern.concern}</span>
                                  {concern.requires_action && (
                                    <span className="ml-2 text-xs text-orange-400">(Action Required)</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Life Events */}
                      {analysis.life_events.length > 0 && (
                        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                          <h3 className="text-lg font-medium text-white mb-3">Life Events Detected</h3>
                          <div className="space-y-3">
                            {analysis.life_events.map((event, i) => (
                              <div key={i} className="p-3 bg-slate-700/30 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-white font-medium">{event.event}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    event.timeline === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                                    event.timeline === 'current' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {event.timeline}
                                  </span>
                                </div>
                                <p className="text-gray-400 text-sm">{event.financial_impact}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Compliance Flags */}
                      {analysis.compliance_flags.length > 0 && (
                        <div className={`bg-slate-800/50 backdrop-blur border rounded-xl p-6 ${
                          analysis.requires_review ? 'border-red-500/50' : 'border-slate-700/50'
                        }`}>
                          <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                            <AlertTriangle className={`w-5 h-5 ${analysis.requires_review ? 'text-red-400' : 'text-yellow-400'}`} />
                            Compliance Notes
                          </h3>
                          <div className="space-y-3">
                            {analysis.compliance_flags.map((flag, i) => (
                              <div key={i} className={`p-3 rounded-lg ${
                                flag.severity === 'critical' ? 'bg-red-500/20 border border-red-500/30' :
                                flag.severity === 'warning' ? 'bg-yellow-500/20 border border-yellow-500/30' : 
                                'bg-blue-500/20 border border-blue-500/30'
                              }`}>
                                <p className="font-medium text-white capitalize">{flag.type}</p>
                                <p className="text-gray-300 text-sm">{flag.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Follow-up Email */}
                      {analysis.suggested_followup_email && (
                        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                          <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-400" />
                            Suggested Follow-up Email
                          </h3>
                          <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans bg-slate-900/50 p-4 rounded-lg">
                            {analysis.suggested_followup_email}
                          </pre>
                          <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                            Copy to Clipboard
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transcript Tab */}
                  {activeTab === 'transcript' && transcript && (
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-white">Meeting Transcript</h3>
                        <span className="text-sm text-gray-400">{transcript.word_count} words</span>
                      </div>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {transcript.segments.map((segment, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="text-xs text-gray-500 w-12 pt-1">
                              {formatTimestamp(segment.start)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-blue-400 mb-1">{segment.speaker}</p>
                              <p className="text-gray-300">{segment.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions Tab */}
                  {activeTab === 'actions' && (
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                      <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        Action Items
                      </h3>
                      <div className="space-y-3">
                        {analysis.action_items.map((item) => (
                          <div key={item.id} className="flex items-start gap-3 p-4 bg-slate-700/30 rounded-lg">
                            <input
                              type="checkbox"
                              checked={item.status === 'completed'}
                              onChange={() => updateActionItem(
                                selectedMeeting.id,
                                item.id,
                                item.status === 'completed' ? 'pending' : 'completed'
                              )}
                              className="w-5 h-5 mt-1 rounded border-gray-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <p className={`text-white ${item.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                                {item.description}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="text-gray-400">
                                  Assigned: <span className="text-gray-300">{item.assigned_to}</span>
                                </span>
                                <span className={priorityColors[item.priority]}>
                                  {item.priority} priority
                                </span>
                                {item.due_date && (
                                  <span className="text-gray-400">
                                    Due: {formatDate(item.due_date)}
                                  </span>
                                )}
                              </div>
                              {item.source_text && (
                                <p className="mt-2 text-sm text-gray-500 italic">
                                  "{item.source_text}"
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-12 text-center">
              <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">No Meeting Selected</h3>
              <p className="text-gray-400">
                Select a meeting from the list or create a new one to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingsPage;
