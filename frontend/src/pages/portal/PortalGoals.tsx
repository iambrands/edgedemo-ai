import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Target, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { 
  getGoals, createGoal, deleteGoal, 
  Goal, GoalCreateRequest, PortalApiError 
} from '../../services/portalApi';

const GOAL_TYPES = [
  { value: 'retirement', label: 'Retirement', emoji: '🏖️' },
  { value: 'education', label: 'Education', emoji: '🎓' },
  { value: 'home_purchase', label: 'Home Purchase', emoji: '🏠' },
  { value: 'emergency_fund', label: 'Emergency Fund', emoji: '🛡️' },
  { value: 'wealth_transfer', label: 'Wealth Transfer', emoji: '🎁' },
  { value: 'custom', label: 'Custom Goal', emoji: '⭐' },
];

export default function PortalGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<GoalCreateRequest>({
    goal_type: 'retirement',
    name: '',
    target_amount: 0,
    target_date: '',
    monthly_contribution: undefined,
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await getGoals();
      setGoals(data);
    } catch (err) {
      console.error('Failed to load goals', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await createGoal(form);
      setShowModal(false);
      setForm({
        goal_type: 'retirement',
        name: '',
        target_amount: 0,
        target_date: '',
        monthly_contribution: undefined,
      });
      loadGoals();
    } catch (err) {
      if (err instanceof PortalApiError) {
        setError(err.message);
      } else {
        setError('Failed to create goal');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    
    try {
      await deleteGoal(id);
      setGoals(goals.filter((g) => g.id !== id));
    } catch (err) {
      console.error('Failed to delete goal', err);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });

  const getGoalEmoji = (type: string) => {
    const found = GOAL_TYPES.find((t) => t.value === type);
    return found?.emoji || '🎯';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading your goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link 
              to="/portal/dashboard" 
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Your Goals</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Goal</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {goals.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
              <Target className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-gray-900">No goals yet</h3>
            <p className="text-gray-500 mt-2 max-w-sm mx-auto">
              Set financial goals to track your progress and stay motivated on your wealth-building journey.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <div key={goal.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{getGoalEmoji(goal.goal_type)}</div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900 text-lg">{goal.name}</h3>
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                            goal.on_track
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {goal.on_track ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              On Track
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              Behind
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 capitalize">
                        {goal.goal_type.replace('_', ' ')} • Target: {formatDate(goal.target_date)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete goal"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">
                        {formatCurrency(goal.current_amount)}
                      </span>
                      <span className="text-gray-500 ml-2">
                        of {formatCurrency(goal.target_amount)}
                      </span>
                    </div>
                    <span className="text-lg font-semibold" style={{ 
                      color: goal.on_track ? '#16a34a' : '#ca8a04' 
                    }}>
                      {(goal.progress_pct * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        goal.on_track ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(goal.progress_pct * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {goal.monthly_contribution && (
                  <p className="mt-4 text-sm text-gray-500">
                    Monthly contribution: {formatCurrency(goal.monthly_contribution)}
                  </p>
                )}

                {goal.notes && (
                  <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    {goal.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Create New Goal</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Goal Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {GOAL_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setForm({ ...form, goal_type: type.value })}
                      className={`p-3 border rounded-lg text-left transition-all ${
                        form.goal_type === type.value
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-lg">{type.emoji}</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{type.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Retire by 65"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.target_amount || ''}
                    onChange={(e) =>
                      setForm({ ...form, target_amount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="500,000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  required
                  value={form.target_date}
                  onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Contribution (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    value={form.monthly_contribution || ''}
                    onChange={(e) =>
                      setForm({ ...form, monthly_contribution: parseFloat(e.target.value) || undefined })
                    }
                    className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1,000"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
