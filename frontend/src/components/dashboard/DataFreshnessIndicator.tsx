import { useState, useEffect } from 'react';

interface FreshnessData {
  last_sync: string;
  stale: boolean;
  age_seconds: number;
}

export function DataFreshnessIndicator() {
  const [data, setData] = useState<FreshnessData | null>(null);

  useEffect(() => {
    const fetchFreshness = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || '';
        const token = localStorage.getItem('edgeai_token') || sessionStorage.getItem('edgeai_token');
        const res = await fetch(`${apiBase}/api/v1/market-data/advisor/current/data-freshness`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setData(await res.json());
      } catch { /* silently degrade */ }
    };
    fetchFreshness();
    const interval = setInterval(fetchFreshness, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  const { age_seconds, stale } = data;
  let dotColor = 'bg-emerald-500';
  let label = 'Live';
  if (age_seconds > 90 || stale) {
    dotColor = 'bg-red-500';
    const mins = Math.floor(age_seconds / 60);
    label = `Stale — ${mins}m ago`;
  } else if (age_seconds > 60) {
    dotColor = 'bg-amber-500';
    label = 'Syncing...';
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}
