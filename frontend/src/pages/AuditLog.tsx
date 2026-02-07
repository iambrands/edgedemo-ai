import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface AuditEvent {
  id: number;
  action_type: string;
  action_category: string;
  description: string;
  details: Record<string, any> | null;
  symbol: string | null;
  success: boolean;
  timestamp: string;
}

const AuditLog: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchAuditLog = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { per_page: '100' };
      if (filter !== 'all') params.action_type = filter;
      const response = await api.get('/api/trades/recent-activity');
      const data = response.data;
      // Use audit_logs if available, fall back to trades/positions
      if (data.audit_logs) {
        setEvents(data.audit_logs);
      } else {
        // Build events from trades
        const tradeEvents: AuditEvent[] = (data.recent_trades || []).map((t: any) => ({
          id: t.id,
          action_type: t.action === 'buy' ? 'trade_buy' : 'trade_sell',
          action_category: 'trade',
          description: `${t.action.toUpperCase()} ${t.quantity}x ${t.symbol} @ $${t.price}`,
          details: t,
          symbol: t.symbol,
          success: true,
          timestamp: t.trade_date,
        }));
        setEvents(tradeEvents);
      }
    } catch (error) {
      console.error('Failed to fetch audit log:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  const exportCSV = () => {
    const csv = [
      ['Timestamp', 'Event Type', 'Category', 'Description', 'Symbol', 'Success'],
      ...events.map((e) => [
        new Date(e.timestamp).toISOString(),
        e.action_type,
        e.action_category || '',
        e.description || '',
        e.symbol || '',
        String(e.success),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const eventIcon = (type: string) => {
    if (type.includes('buy')) return '📈';
    if (type.includes('sell') || type.includes('close')) return '📉';
    if (type.includes('stop_loss')) return '🛑';
    if (type.includes('profit')) return '🎯';
    if (type.includes('risk') || type.includes('block')) return '⚠️';
    if (type.includes('automation')) return '🤖';
    if (type.includes('login')) return '🔐';
    if (type.includes('acknowledge')) return '✅';
    return '📋';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600 mt-1">
            View all activity on your account. This log is retained for 7 years for compliance purposes.
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="all">All Events</option>
          <option value="trade_buy">Buy Trades</option>
          <option value="trade_sell">Sell Trades</option>
          <option value="stop_loss">Stop Losses</option>
          <option value="automation">Automations</option>
        </select>
      </div>

      {/* Event List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading audit log...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No audit events found.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Event</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">
                    Details
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleDateString()}{' '}
                      <span className="text-gray-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-4 md:px-6 py-3 text-sm">
                      <span className="mr-2">{eventIcon(event.action_type)}</span>
                      {event.description || event.action_type}
                    </td>
                    <td className="px-4 md:px-6 py-3 text-sm text-gray-600 hidden md:table-cell">
                      {event.symbol && <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{event.symbol}</span>}
                    </td>
                    <td className="px-4 md:px-6 py-3 text-sm">
                      {event.success ? (
                        <span className="text-green-600 font-medium">Success</span>
                      ) : (
                        <span className="text-red-600 font-medium">Failed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compliance note */}
      <p className="text-xs text-gray-400 text-center">
        Audit records are retained for 7 years in compliance with regulatory requirements (IRS, FINRA).
        Contact support@optionsedge.ai for data export requests.
      </p>
    </div>
  );
};

export default AuditLog;
