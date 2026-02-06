export default function MetricCard({ title, value, change, changeType, icon: Icon, label, subtext, trend }) {
  const changeColors = {
    positive: 'text-[var(--status-success)]',
    negative: 'text-[var(--status-error)]',
    warning: 'text-[var(--status-warning)]',
    neutral: 'text-[var(--text-secondary)]',
  };
  const displayTitle = title ?? label;
  const displayChange = change ?? subtext;

  return (
    <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-6 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{displayTitle}</p>
          <p className="text-2xl font-semibold text-[var(--text-primary)] mt-1">{value}</p>
          <p className={`text-sm mt-1 ${changeColors[changeType] || changeColors.neutral}`}>
            {displayChange}
          </p>
        </div>
        {Icon && (
          <div className="p-2 bg-[var(--primary-light)] rounded-lg">
            <Icon className="w-5 h-5 text-[var(--primary-blue)]" />
          </div>
        )}
      </div>
    </div>
  );
}
