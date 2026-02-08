import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface AddHouseholdFormProps {
  onSubmit: (data: HouseholdFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface HouseholdFormData {
  name: string;
  members: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentObjective: string;
  timeHorizon: string;
}

export function AddHouseholdForm({ onSubmit, onCancel, isLoading }: AddHouseholdFormProps) {
  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>(['']);
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [investmentObjective, setInvestmentObjective] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addMember = () => setMembers([...members, '']);
  
  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };
  
  const updateMember = (index: number, value: string) => {
    const updated = [...members];
    updated[index] = value;
    setMembers(updated);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Household name is required';
    if (!members.some(m => m.trim())) newErrors.members = 'At least one member is required';
    if (!investmentObjective) newErrors.investmentObjective = 'Investment objective is required';
    if (!timeHorizon) newErrors.timeHorizon = 'Time horizon is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    onSubmit({
      name: name.trim(),
      members: members.filter(m => m.trim()),
      riskTolerance,
      investmentObjective,
      timeHorizon,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Household Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Household Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Smith Family"
          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition ${
            errors.name ? 'border-red-500' : 'border-slate-300'
          }`}
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      {/* Members */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Members *
        </label>
        <div className="space-y-2">
          {members.map((member, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={member}
                onChange={(e) => updateMember(index, e.target.value)}
                placeholder="Member name"
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
              {members.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMember(index)}
                  className="p-2.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addMember}
          className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <Plus size={16} /> Add another member
        </button>
        {errors.members && <p className="text-red-500 text-sm mt-1">{errors.members}</p>}
      </div>

      {/* Risk Tolerance */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Risk Tolerance *
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['conservative', 'moderate', 'aggressive'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setRiskTolerance(level)}
              className={`py-2.5 px-4 rounded-lg border-2 font-medium text-sm capitalize transition ${
                riskTolerance === level
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Investment Objective */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Investment Objective *
        </label>
        <select
          value={investmentObjective}
          onChange={(e) => setInvestmentObjective(e.target.value)}
          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none appearance-none bg-white ${
            errors.investmentObjective ? 'border-red-500' : 'border-slate-300'
          }`}
        >
          <option value="">Select objective</option>
          <option value="growth">Growth</option>
          <option value="income">Income</option>
          <option value="balanced">Balanced (Growth & Income)</option>
          <option value="preservation">Capital Preservation</option>
          <option value="speculation">Speculation</option>
        </select>
        {errors.investmentObjective && <p className="text-red-500 text-sm mt-1">{errors.investmentObjective}</p>}
      </div>

      {/* Time Horizon */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Time Horizon *
        </label>
        <select
          value={timeHorizon}
          onChange={(e) => setTimeHorizon(e.target.value)}
          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none appearance-none bg-white ${
            errors.timeHorizon ? 'border-red-500' : 'border-slate-300'
          }`}
        >
          <option value="">Select time horizon</option>
          <option value="short">Short-term (0-3 years)</option>
          <option value="medium">Medium-term (3-10 years)</option>
          <option value="long">Long-term (10+ years)</option>
        </select>
        {errors.timeHorizon && <p className="text-red-500 text-sm mt-1">{errors.timeHorizon}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          className="flex-1"
        >
          Create Household
        </Button>
      </div>
    </form>
  );
}
