export function PageContainer({ children, title }) {
  return (
    <div className="flex-1 overflow-auto bg-[var(--bg-light)]">
      <div className="p-6 max-w-7xl mx-auto">
        {title && (
          <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-6">{title}</h1>
        )}
        {children}
      </div>
    </div>
  );
}
