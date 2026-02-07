import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, Play, FileText, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { AddHouseholdForm, type HouseholdFormData } from '../../components/features/AddHouseholdForm';
import { householdsApi, type Household } from '../../services/api';
import { clsx } from 'clsx';

export function Households() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [expandedHousehold, setExpandedHousehold] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await householdsApi.list();
      setHouseholds(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load households');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'attention':
        return <Badge variant="red">Attention Needed</Badge>;
      case 'rebalance':
        return <Badge variant="amber">Rebalance Due</Badge>;
      case 'good':
        return <Badge variant="green">Good Standing</Badge>;
      default:
        return <Badge variant="gray">{status}</Badge>;
    }
  };

  const toggleExpand = (householdId: string) => {
    setExpandedHousehold(expandedHousehold === householdId ? null : householdId);
  };

  const handleRunAnalysis = async (householdId: string) => {
    try {
      await householdsApi.analyze(householdId);
      // In production, you might want to show a toast or update the UI
    } catch (err) {
      console.error('Failed to start analysis:', err);
    }
  };

  const handleCreateHousehold = async (data: HouseholdFormData) => {
    setIsCreating(true);
    try {
      await householdsApi.create(data);
      setIsModalOpen(false);
      fetchData(); // Refresh list
    } catch (err) {
      console.error('Failed to create household:', err);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Households</h1>
          <p className="text-gray-500">{households.length} households under management</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Add Household
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {households.map((household) => {
          const isExpanded = expandedHousehold === household.id;

          return (
            <Card key={household.id} className="overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{household.name}</h3>
                  <p className="text-sm text-gray-500">{(household.members ?? []).join(', ')}</p>
                </div>
                {getStatusBadge(household.status)}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total Value</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(household.totalValue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Accounts</p>
                  <p className="text-lg font-semibold text-gray-900">{(household.accounts ?? []).length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Risk Score</p>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full',
                          household.riskScore > 60
                            ? 'bg-red-500'
                            : household.riskScore > 40
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                        )}
                        style={{ width: `${household.riskScore}%` }}
                      />
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {household.riskScore}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expand Button */}
              <button
                onClick={() => toggleExpand(household.id)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
              >
                {isExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
                {isExpanded ? 'Hide' : 'Show'} Accounts ({(household.accounts ?? []).length})
              </button>

              {/* Expanded Accounts List */}
              {isExpanded && (
                <div className="border-t border-gray-200 pt-4 -mx-8 px-8 -mb-8 pb-8 bg-gray-50">
                  <div className="space-y-3">
                    {(household.accounts ?? []).map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{account.name}</p>
                          <p className="text-xs text-gray-500">
                            {account.custodian} • {account.type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(account.balance)}
                          </p>
                          <p className="text-xs text-gray-500">{account.taxType}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {!isExpanded && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => handleRunAnalysis(household.id)}
                  >
                    <Play size={14} />
                    Run Analysis
                  </Button>
                  <Button variant="secondary" size="sm" className="flex items-center gap-2">
                    <FileText size={14} />
                    View Report
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Household Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Household"
        size="md"
      >
        <AddHouseholdForm
          onSubmit={handleCreateHousehold}
          onCancel={() => setIsModalOpen(false)}
          isLoading={isCreating}
        />
      </Modal>
    </div>
  );
}
