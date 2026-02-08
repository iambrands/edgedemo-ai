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
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

const priorityColors: Record<string, string> = {
  urgent: 'text-red-600',
  high: 'text-orange-600',
  medium: 'text-amber-600',
  low: 'text-slate-500',
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
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'transcript' | 'actions'>('analysis');
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);

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
      // Try with auth first, fallback to no-auth for demo
      let response = await fetch(`${API_BASE}/api/v1/meetings`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        response = await fetch(`${API_BASE}/api/v1/meetings`);
      }
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
    } catch (err) {
      console.error('Failed to load meetings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMeetingDetails = async (meetingId: string) => {
    try {
      // Load analysis (try with auth, fallback to no-auth)
      let analysisRes = await fetch(`${API_BASE}/api/v1/meetings/${meetingId}/analysis`, {
        headers: getAuthHeaders()
      });
      if (!analysisRes.ok) {
        analysisRes = await fetch(`${API_BASE}/api/v1/meetings/${meetingId}/analysis`);
      }
      if (analysisRes.ok) {
        const analysisData = await analysisRes.json();
        setAnalysis(analysisData);
      } else {
        setAnalysis(null);
      }

      // Load transcript (try with auth, fallback to no-auth)
      let transcriptRes = await fetch(`${API_BASE}/api/v1/meetings/${meetingId}/transcript`, {
        headers: getAuthHeaders()
      });
      if (!transcriptRes.ok) {
        transcriptRes = await fetch(`${API_BASE}/api/v1/meetings/${meetingId}/transcript`);
      }
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
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <p className="text-red-600">{error}</p>
        <button onClick={() => { setError(null); loadMeetings(); }} className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Meeting Intelligence</h1>
          <p className="text-slate-500 mt-1">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Meetings</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{meetings.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Video className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Analyzed</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {meetings.filter(m => m.status === 'completed').length}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Actions</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {analysis?.action_items?.filter(a => a.status === 'pending').length || 0}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Time</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {Math.round(meetings.reduce((acc, m) => acc + (m.duration_seconds || 0), 0) / 60)}m
              </p>
            </div>
            <div className="p-3 bg-cyan-50 rounded-xl">
              <Clock className="h-6 w-6 text-cyan-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meetings List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Recent Meetings</h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
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
                  className={`p-4 cursor-pointer transition-all ${
                    selectedMeeting?.id === meeting.id
                      ? 'bg-blue-50 border-l-2 border-l-blue-600'
                      : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-slate-900 truncate pr-2">{meeting.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs border whitespace-nowrap ${statusColors[meeting.status]}`}>
                      {meeting.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
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
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
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
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{selectedMeeting.title}</h2>
                    <p className="text-slate-500 mt-1">
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
                    <span key={i} className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700">
                      {p.name} {p.role && <span className="text-slate-500">({p.role})</span>}
                    </span>
                  ))}
                </div>

                {/* Upload Recording */}
                {(selectedMeeting.status === 'scheduled' || selectedMeeting.status === 'failed') && (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50">
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
                      <Upload className={`w-10 h-10 mb-3 ${isUploading ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`} />
                      <span className="text-slate-900 font-medium">
                        {isUploading ? 'Uploading & Processing...' : 'Upload Meeting Recording'}
                      </span>
                      <span className="text-slate-500 text-sm mt-1">
                        MP3, MP4, WAV, or WebM
                      </span>
                    </label>
                  </div>
                )}

                {/* Processing Status */}
                {selectedMeeting.status === 'processing' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center gap-4">
                    <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full" />
                    <div>
                      <p className="text-slate-900 font-medium">Processing Recording</p>
                      <p className="text-slate-500 text-sm">
                        Transcribing and analyzing... This may take a few minutes.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs */}
              {selectedMeeting.status === 'completed' && analysis && (
                <>
                  <div className="flex gap-6 border-b border-slate-200 px-1">
                    <button
                      onClick={() => setActiveTab('analysis')}
                      className={`px-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'analysis'
                          ? 'text-blue-600 border-blue-600'
                          : 'text-slate-500 border-transparent hover:text-slate-700'
                      }`}
                    >
                      <BarChart2 className="w-4 h-4 inline mr-2" />
                      Analysis
                    </button>
                    <button
                      onClick={() => setActiveTab('transcript')}
                      className={`px-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'transcript'
                          ? 'text-blue-600 border-blue-600'
                          : 'text-slate-500 border-transparent hover:text-slate-700'
                      }`}
                    >
                      <FileText className="w-4 h-4 inline mr-2" />
                      Transcript
                    </button>
                    <button
                      onClick={() => setActiveTab('actions')}
                      className={`px-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === 'actions'
                          ? 'text-blue-600 border-blue-600'
                          : 'text-slate-500 border-transparent hover:text-slate-700'
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
                      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                        <h3 className="text-lg font-medium text-blue-900 mb-3 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          Executive Summary
                        </h3>
                        <p className="text-slate-700 leading-relaxed">{analysis.executive_summary}</p>
                      </div>

                      {/* Key Topics & Sentiment */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                          <h3 className="text-lg font-medium text-slate-900 mb-3">Key Topics</h3>
                          <div className="flex flex-wrap gap-2">
                            {analysis.key_topics.map((topic, i) => (
                              <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                          <h3 className="text-lg font-medium text-slate-900 mb-3">Client Sentiment</h3>
                          <div className="flex items-center gap-4">
                            <div className="text-4xl">{getSentimentEmoji(analysis.sentiment_score)}</div>
                            <div>
                              <p className="text-slate-900 font-medium">{getSentimentLabel(analysis.sentiment_score)}</p>
                              <p className="text-slate-500 text-sm">
                                Score: {(analysis.sentiment_score * 100).toFixed(0)}%
                              </p>
                            </div>
                          </div>
                          {analysis.sentiment_breakdown && (
                            <div className="mt-3 flex gap-4 text-sm">
                              <span className="text-emerald-600">+{(analysis.sentiment_breakdown.positive * 100).toFixed(0)}%</span>
                              <span className="text-slate-500">{(analysis.sentiment_breakdown.neutral * 100).toFixed(0)}%</span>
                              <span className="text-red-600">-{(analysis.sentiment_breakdown.negative * 100).toFixed(0)}%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Client Concerns */}
                      {analysis.client_concerns.length > 0 && (
                        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
                          <h3 className="text-lg font-medium text-amber-900 mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            Client Concerns
                          </h3>
                          <div className="space-y-3">
                            {analysis.client_concerns.map((concern, i) => (
                              <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-100">
                                <span className={`w-2 h-2 rounded-full mt-2 ${
                                  concern.severity === 'high' ? 'bg-red-500' :
                                  concern.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                                }`} />
                                <div className="flex-1">
                                  <span className="text-slate-700">{concern.concern}</span>
                                  {concern.requires_action && (
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">Action Required</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Life Events */}
                      {analysis.life_events.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                          <h3 className="text-lg font-medium text-slate-900 mb-3 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-slate-500" />
                            Life Events Detected
                          </h3>
                          <div className="space-y-3">
                            {analysis.life_events.map((event, i) => (
                              <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-slate-900 font-medium">{event.event}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs border ${
                                    event.timeline === 'upcoming' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    event.timeline === 'current' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                    {event.timeline}
                                  </span>
                                </div>
                                <p className="text-slate-500 text-sm">{event.financial_impact}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Compliance Flags */}
                      {analysis.compliance_flags.length > 0 && (
                        <div className={`bg-white rounded-xl p-6 border shadow-sm ${
                          analysis.requires_review ? 'border-red-200 border-l-4 border-l-red-400' : 'border-slate-200'
                        }`}>
                          <h3 className="text-lg font-medium text-slate-900 mb-3 flex items-center gap-2">
                            <AlertTriangle className={`w-5 h-5 ${analysis.requires_review ? 'text-red-500' : 'text-amber-500'}`} />
                            Compliance Notes
                          </h3>
                          <div className="space-y-3">
                            {analysis.compliance_flags.map((flag, i) => (
                              <div key={i} className={`p-3 rounded-lg border ${
                                flag.severity === 'critical' ? 'bg-red-50 border-red-200' :
                                flag.severity === 'warning' ? 'bg-amber-50 border-amber-200' : 
                                'bg-blue-50 border-blue-200'
                              }`}>
                                <p className="font-medium text-slate-900 capitalize">{flag.type}</p>
                                <p className="text-slate-600 text-sm">{flag.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Follow-up Email */}
                      {analysis.suggested_followup_email && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                          <h3 className="text-lg font-medium text-slate-900 mb-3 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-slate-500" />
                            Suggested Follow-up Email
                          </h3>
                          <pre className="text-slate-700 text-sm whitespace-pre-wrap font-sans bg-slate-50 p-4 rounded-lg border border-slate-100">
                            {analysis.suggested_followup_email}
                          </pre>
                          <button
                            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                            onClick={() => {
                              if (analysis?.suggested_followup_email) {
                                navigator.clipboard.writeText(analysis.suggested_followup_email);
                              }
                            }}
                          >
                            Copy to Clipboard
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transcript Tab */}
                  {activeTab === 'transcript' && transcript && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-slate-900">Meeting Transcript</h3>
                        <span className="text-sm text-slate-500">{transcript.word_count} words</span>
                      </div>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {transcript.segments.map((segment, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="text-xs text-slate-400 w-12 pt-1 font-mono">
                              {formatTimestamp(segment.start)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-blue-600 mb-1">{segment.speaker}</p>
                              <p className="text-slate-700">{segment.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions Tab */}
                  {activeTab === 'actions' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                      <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        Action Items
                      </h3>
                      <div className="space-y-3">
                        {analysis.action_items.map((item) => (
                          <div key={item.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <input
                              type="checkbox"
                              checked={item.status === 'completed'}
                              onChange={() => updateActionItem(
                                selectedMeeting.id,
                                item.id,
                                item.status === 'completed' ? 'pending' : 'completed'
                              )}
                              className="w-5 h-5 mt-1 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <p className={`text-slate-900 ${item.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                                {item.description}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="text-slate-500">
                                  Assigned: <span className="text-slate-700">{item.assigned_to}</span>
                                </span>
                                <span className={priorityColors[item.priority]}>
                                  {item.priority} priority
                                </span>
                                {item.due_date && (
                                  <span className="text-slate-500">
                                    Due: {formatDate(item.due_date)}
                                  </span>
                                )}
                              </div>
                              {item.source_text && (
                                <p className="mt-2 text-sm text-slate-400 italic">
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <Video className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-slate-900 mb-2">No Meeting Selected</h3>
              <p className="text-slate-500">
                Select a meeting from the list or create a new one to get started
              </p>
            </div>
          )}
        </div>
      </div>
      {/* New Meeting Modal */}
      {showNewMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">New Meeting</h3>
              <p className="text-sm text-slate-500 mt-1">Record or upload a meeting for AI analysis</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Title</label>
                <input type="text" placeholder="e.g., Wilson Quarterly Review" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client / Household</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select...</option>
                  <option value="wilson">Wilson Household</option>
                  <option value="henderson">Henderson Family</option>
                  <option value="martinez">Martinez Household</option>
                  <option value="patel">Patel Family</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Type</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="review">Portfolio Review</option>
                  <option value="planning">Financial Planning</option>
                  <option value="onboarding">Client Onboarding</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">After creating, upload a recording or connect a live transcription to enable AI analysis.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setShowNewMeetingModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button onClick={() => setShowNewMeetingModal(false)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Meeting</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingsPage;
