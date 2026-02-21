import { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Clock, Video, ChevronLeft, ChevronRight,
  Check, X, Loader2, MessageSquare, Phone, Mail,
} from 'lucide-react';
import { getMeetings, getMeetingAvailability, scheduleMeeting, cancelMeeting } from '../../services/portalApi';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Meeting {
  id: string;
  title: string;
  datetime: string;
  duration_minutes: number;
  meeting_type: string;
  status: string;
  advisor_name: string;
  notes: string;
  meeting_link: string;
}

interface Slot {
  id: string;
  date: string;
  time: string;
  datetime: string;
  duration_minutes: number;
}

interface MeetingType {
  id: string;
  name: string;
  duration: number;
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PortalMeetings() {
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [advisorName, setAdvisorName] = useState('');
  const [advisorPhone, setAdvisorPhone] = useState('');

  const [slots, setSlots] = useState<Slot[]>([]);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);

  // Booking wizard
  const [step, setStep] = useState<'list' | 'type' | 'time' | 'confirm'>('list');
  const [selType, setSelType] = useState<MeetingType | null>(null);
  const [selSlot, setSelSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    Promise.all([getMeetings(), getMeetingAvailability()])
      .then(([m, a]) => {
        setUpcoming(m.upcoming || []);
        setAdvisorName(m.advisor_name || '');
        setAdvisorPhone(m.advisor_phone || '');
        setSlots(a.slots || []);
        setMeetingTypes(a.meeting_types || []);
      })
      .catch((e) => console.error('meetings load failed', e))
      .finally(() => setLoading(false));
  }, []);

  /* Week calendar logic */
  const weekDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() + 1 + weekOffset * 7);
    // skip to monday
    while (start.getDay() === 0 || start.getDay() === 6) start.setDate(start.getDate() + 1);
    const dates: string[] = [];
    const d = new Date(start);
    while (dates.length < 5) {
      if (d.getDay() >= 1 && d.getDay() <= 5) dates.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, [weekOffset]);

  const slotsByDate = useMemo(() => {
    const map: Record<string, Slot[]> = {};
    for (const s of slots) {
      if (!weekDates.includes(s.date)) continue;
      (map[s.date] ||= []).push(s);
    }
    return map;
  }, [slots, weekDates]);

  const handleBook = async () => {
    if (!selType || !selSlot) return;
    setSubmitting(true);
    try {
      const res = await scheduleMeeting({
        meeting_type: selType.id,
        datetime: selSlot.datetime,
        notes,
      });
      if (res.meeting) setUpcoming((prev) => [...prev, res.meeting]);
      setStep('list');
      setSelType(null);
      setSelSlot(null);
      setNotes('');
    } catch (e) {
      console.error('booking failed', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelMeeting(id);
      setUpcoming((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error('cancel failed', e);
    }
  };

  const fmtDt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  const fmtDay = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Meetings</h1>
            <p className="text-slate-500 text-sm">Schedule and manage meetings with your advisor</p>
          </div>
          {step === 'list' && (
            <button
              onClick={() => setStep('type')}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Calendar className="h-4 w-4" />
              Schedule Meeting
            </button>
          )}
          {step !== 'list' && (
            <button onClick={() => { setStep('list'); setSelType(null); setSelSlot(null); }} className="text-sm text-slate-500 hover:text-slate-700">
              ← Back to meetings
            </button>
          )}
        </div>

        {/* ── LIST VIEW ──────────────────────────────── */}
        {step === 'list' && (
          <>
            {/* Advisor card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-5">
              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                {advisorName.split(' ').map(n => n[0]).join('').slice(0, 2) || 'LW'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{advisorName}</p>
                <p className="text-sm text-slate-500">Your Financial Advisor</p>
              </div>
              <div className="flex gap-3">
                <a href={`tel:${advisorPhone}`} className="p-2 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"><Phone className="h-5 w-5" /></a>
                <a href="mailto:leslie@iabadvisors.com" className="p-2 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"><Mail className="h-5 w-5" /></a>
              </div>
            </div>

            {/* Upcoming */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Upcoming Meetings</h2>
              {upcoming.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                  <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No upcoming meetings</p>
                  <button onClick={() => setStep('type')} className="mt-3 text-sm text-blue-600 hover:underline">Schedule one now →</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((m) => (
                    <div key={m.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                      <div className="p-3 bg-blue-50 rounded-xl"><Video className="h-5 w-5 text-blue-600" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">{m.title}</p>
                        <p className="text-sm text-slate-500">{fmtDt(m.datetime)} · {m.duration_minutes} min</p>
                        {m.notes && <p className="text-xs text-slate-400 mt-1 truncate">{m.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {m.status}
                        </span>
                        <a href={m.meeting_link} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          Join
                        </a>
                        <button onClick={() => handleCancel(m.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── STEP 1: TYPE ───────────────────────────── */}
        {step === 'type' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">What would you like to discuss?</h2>
            <p className="text-sm text-slate-500 mb-5">Choose a meeting type</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {meetingTypes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelType(t); setStep('time'); }}
                  className="flex items-start gap-4 p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left"
                >
                  <div className="p-2 bg-blue-50 rounded-lg"><MessageSquare className="h-5 w-5 text-blue-600" /></div>
                  <div>
                    <p className="font-medium text-slate-900">{t.name}</p>
                    <p className="text-sm text-slate-500">{t.description}</p>
                    <p className="text-xs text-slate-400 mt-1"><Clock className="inline h-3 w-3 mr-1" />{t.duration} min</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: TIME ───────────────────────────── */}
        {step === 'time' && selType && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Select a date & time</h2>
            <p className="text-sm text-slate-500 mb-4">{selType.name} · {selType.duration} min</p>

            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setWeekOffset((o) => Math.max(0, o - 1))} disabled={weekOffset === 0} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
              <span className="text-sm font-medium text-slate-700">
                {fmtDay(weekDates[0])} – {fmtDay(weekDates[weekDates.length - 1])}
              </span>
              <button onClick={() => setWeekOffset((o) => o + 1)} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight className="h-5 w-5" /></button>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {weekDates.map((date) => {
                const daySlots = slotsByDate[date] || [];
                return (
                  <div key={date}>
                    <p className="text-xs font-medium text-slate-500 text-center mb-2">{fmtDay(date)}</p>
                    <div className="space-y-1.5">
                      {daySlots.length === 0 && <p className="text-xs text-slate-300 text-center py-2">—</p>}
                      {daySlots.map((sl) => (
                        <button
                          key={sl.id}
                          onClick={() => { setSelSlot(sl); setStep('confirm'); }}
                          className={`w-full py-2 px-1 text-xs rounded-lg border transition-all ${
                            selSlot?.id === sl.id
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700'
                          }`}
                        >
                          {sl.time}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 3: CONFIRM ────────────────────────── */}
        {step === 'confirm' && selType && selSlot && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Confirm Your Meeting</h2>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3 mb-6">
              <div className="flex justify-between"><span className="text-sm text-slate-500">Type</span><span className="text-sm font-medium text-slate-900">{selType.name}</span></div>
              <div className="flex justify-between"><span className="text-sm text-slate-500">Date</span><span className="text-sm font-medium text-slate-900">{fmtDay(selSlot.date)}</span></div>
              <div className="flex justify-between"><span className="text-sm text-slate-500">Time</span><span className="text-sm font-medium text-slate-900">{selSlot.time}</span></div>
              <div className="flex justify-between"><span className="text-sm text-slate-500">Duration</span><span className="text-sm font-medium text-slate-900">{selType.duration} min</span></div>
              <div className="flex justify-between"><span className="text-sm text-slate-500">Advisor</span><span className="text-sm font-medium text-slate-900">{advisorName}</span></div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="What would you like to discuss?"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('time')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm">← Back</button>
              <button
                onClick={handleBook}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {submitting ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
