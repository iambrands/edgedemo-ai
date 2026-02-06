import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startOnboarding, saveOnboardingStep, getOnboardingSession } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Client Information', fields: ['name', 'dob', 'contact'] },
  { id: 2, title: 'Financial Profile', fields: ['income', 'net_worth', 'liquid_net_worth'] },
  { id: 3, title: 'Risk Assessment', fields: ['questionnaire'] },
  { id: 4, title: 'Account Setup', fields: ['accounts'] },
  { id: 5, title: 'Statement Upload', fields: ['statements'] },
  { id: 6, title: 'Portfolio Recommendation', fields: ['portfolio'] },
  { id: 7, title: 'IPS Generation', fields: ['ips'] },
  { id: 8, title: 'Review & Sign', fields: ['review'] },
];

export default function OnboardingWizard() {
  const [sessionId, setSessionId] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: startOnboarding,
    onSuccess: (data) => setSessionId(data.session_id),
  });

  const saveMutation = useMutation({
    mutationFn: ({ sid, step, data }) => saveOnboardingStep(sid, step, data),
    onSuccess: (data) => {
      setCurrentStep(data.current_step);
      queryClient.invalidateQueries(['onboarding', sessionId]);
    },
  });

  useEffect(() => {
    if (!sessionId) startMutation.mutate();
  }, []);

  const handleNext = () => {
    if (sessionId) {
      saveMutation.mutate({ sid: sessionId, step: currentStep, data: formData });
    } else {
      setCurrentStep((s) => Math.min(8, s + 1));
    }
  };

  const handleBack = () => setCurrentStep((s) => Math.max(1, s - 1));

  if (startMutation.isPending && !sessionId) {
    return <div className="p-12 text-center text-[var(--text-muted)]">Starting onboarding...</div>;
  }

  return (
    <PageContainer title="Client Onboarding">
      <div className="mb-8">
        <div className="flex gap-1 mb-4">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`h-1 flex-1 rounded ${s.id <= currentStep ? 'bg-primary' : 'bg-[var(--border)]'}`}
            />
          ))}
        </div>
        <p className="text-sm text-[var(--text-muted)]">Step {currentStep} of 8: {STEPS.find((s) => s.id === currentStep)?.title}</p>
      </div>

      <div className="bg-white rounded-lg border border-[var(--border)] p-8 shadow-sm max-w-2xl">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Client Information</h3>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Full Name</label>
              <input value={formData.name ?? ''} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} className="w-full border rounded-lg px-4 py-2" placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Date of Birth</label>
              <input type="date" value={formData.dob ?? ''} onChange={(e) => setFormData((f) => ({ ...f, dob: e.target.value }))} className="w-full border rounded-lg px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Email</label>
              <input type="email" value={formData.email ?? ''} onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))} className="w-full border rounded-lg px-4 py-2" placeholder="jane@example.com" />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Financial Profile</h3>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Annual Income</label>
              <input type="number" value={formData.income ?? ''} onChange={(e) => setFormData((f) => ({ ...f, income: e.target.value }))} className="w-full border rounded-lg px-4 py-2" placeholder="120000" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Total Net Worth</label>
              <input type="number" value={formData.net_worth ?? ''} onChange={(e) => setFormData((f) => ({ ...f, net_worth: e.target.value }))} className="w-full border rounded-lg px-4 py-2" placeholder="500000" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Liquid Net Worth</label>
              <input type="number" value={formData.liquid_net_worth ?? ''} onChange={(e) => setFormData((f) => ({ ...f, liquid_net_worth: e.target.value }))} className="w-full border rounded-lg px-4 py-2" placeholder="400000" />
            </div>
          </div>
        )}

        {currentStep >= 3 && currentStep <= 8 && (
          <div className="py-8 text-center text-[var(--text-muted)]">
            <p>Step {currentStep}: {STEPS.find((s) => s.id === currentStep)?.title}</p>
            <p className="text-sm mt-2">Placeholder for {STEPS.find((s) => s.id === currentStep)?.title.toLowerCase()} content. Use ETF Builder for risk assessment, Statements for upload, etc.</p>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t border-[var(--border)]">
          <button onClick={handleBack} disabled={currentStep === 1} className="inline-flex items-center gap-2 px-4 py-2 text-primary disabled:opacity-50">
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
          <button onClick={handleNext} disabled={saveMutation.isPending} className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg disabled:opacity-50">
            {currentStep === 8 ? 'Complete' : 'Next'} <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
