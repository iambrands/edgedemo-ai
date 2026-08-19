import { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { b2cApi, type B2CGoal } from '../../services/b2cApi';
import { AppLink } from '../brand/AppLink';

function RadialRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(pct, 100);
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E2E8F0"
        strokeWidth={5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

const GOAL_COLORS: Record<string, string> = {
  retirement: '#3B82F6',
  emergency_fund: '#F59E0B',
  education: '#8B5CF6',
  home_purchase: '#10B981',
  vacation: '#06B6D4',
  custom: '#64748B',
};

function getGoalColor(type: string): string {
  return GOAL_COLORS[type] ?? '#64748B';
}

function formatCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function GoalRings() {
  const [goals, setGoals] = useState<B2CGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    b2cApi
      .getGoals()
      .then((res) => setGoals(res.goals.slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
        <div className="h-4 w-24 bg-slate-100 rounded mb-4" />
        <div className="flex gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-14 h-14 rounded-full bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (goals.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Goal Progress</h2>
        </div>
        <AppLink to="/client/goals" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          View all &rarr;
        </AppLink>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {goals.map((goal) => {
          const color = getGoalColor(goal.goal_type);
          return (
            <div key={goal.id} className="flex flex-col items-center text-center gap-1.5">
              <div className="relative">
                <RadialRing pct={goal.progress_pct} color={color} size={56} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-700">{Math.round(goal.progress_pct)}%</span>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-700 truncate max-w-full leading-tight">
                {goal.name}
              </p>
              <p className="text-[10px] text-slate-400 tabular-nums">
                {formatCompact(goal.current_amount)} / {formatCompact(goal.target_amount)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
