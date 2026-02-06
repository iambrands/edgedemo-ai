export default function LoadingSpinner({ size = 'md', message = 'Loading...' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`animate-spin rounded-full border-b-2 border-primary ${sizes[size]}`} />
      {message && <p className="mt-4 text-sm text-[var(--text-secondary)]">{message}</p>}
    </div>
  );
}
