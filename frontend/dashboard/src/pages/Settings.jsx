import { PageContainer } from '../components/layout/PageContainer';

export function Settings() {
  return (
    <PageContainer title="Settings">
      <div className="bg-white rounded-lg border border-[var(--border)] p-6 max-w-2xl">
        <h3 className="font-semibold mb-4">Account</h3>
        <p className="text-sm text-[var(--text-muted)]">Profile and preferences.</p>
      </div>
    </PageContainer>
  );
}
