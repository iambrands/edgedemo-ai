import { useEffect, useState, useCallback } from 'react';
import {
  Scissors, Shield, Loader2,
  Plus,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || '';
const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

export default function DirectIndexing() {
  const { token } = useAuth();
  const [indices, setIndices] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<any>(null);
  const [exclusions, setExclusions] = useState<any[]>([]);
  const [harvestResult, setHarvestResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [harvesting, setHarvesting] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadIndices = useCallback(async () => {
    setLoading(true);
    try {
      const [idxRes, exclRes] = await Promise.all([
        fetch(`${API}/api/v1/direct-indexing/indices`, { headers }),
        fetch(`${API}/api/v1/direct-indexing/exclusions`, { headers }),
      ]);
      const idxData = await idxRes.json();
      const exclData = await exclRes.json();
      setIndices(idxData.indices || []);
      setExclusions(exclData.categories || []);
    } catch {} finally { setLoading(false); }
  }, [token]);

  const loadIndex = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/v1/direct-indexing/indices/${id}`, { headers });
      setSelectedIndex(await res.json());
    } catch {}
  };

  const runHarvest = async (id: string) => {
    setHarvesting(true);
    try {
      const res = await fetch(`${API}/api/v1/direct-indexing/harvest/${id}`, { method: 'POST', headers });
      setHarvestResult(await res.json());
    } catch {} finally { setHarvesting(false); }
  };

  useEffect(() => { loadIndices(); }, [loadIndices]);

  return (
    <div className="space-y-6">
      <PageHeader title="Direct Indexing" subtitle="Personalized index construction with continuous tax-loss harvesting" />

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : selectedIndex ? (
        <div className="space-y-4">
          <button onClick={() => { setSelectedIndex(null); setHarvestResult(null); }} className="text-sm text-blue-600 hover:text-blue-800">&larr; Back to all indices</button>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedIndex.name}</h2>
                <p className="text-sm text-slate-500">Benchmark: {selectedIndex.benchmark} &middot; {selectedIndex.client_name} &middot; {selectedIndex.holdings_count} holdings</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => runHarvest(selectedIndex.id)} disabled={harvesting}>
                {harvesting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Scissors className="w-4 h-4 mr-1" />}
                Run Tax Harvest
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Value</p><p className="text-lg font-bold text-slate-900">{fmt(selectedIndex.total_value)}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">YTD Return</p><p className={`text-lg font-bold ${selectedIndex.ytd_return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pct(selectedIndex.ytd_return)}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Benchmark YTD</p><p className="text-lg font-bold text-slate-700">{pct(selectedIndex.benchmark_ytd)}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Tracking Error</p><p className="text-lg font-bold text-blue-600">{selectedIndex.tracking_error_bps} bps</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Tax Alpha YTD</p><p className="text-lg font-bold text-emerald-600">+{selectedIndex.tax_alpha_ytd}%</p></Card>
          </div>

          {/* Sector weights */}
          {selectedIndex.sector_weights && (
            <Card>
              <h3 className="font-semibold text-slate-900 mb-3">Sector Allocation</h3>
              <div className="space-y-2">
                {Object.entries(selectedIndex.sector_weights).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([sector, weight]) => (
                  <div key={sector} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-36 truncate">{sector}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min((weight as number), 100)}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 w-12 text-right">{(weight as number).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Exclusions */}
          <Card>
            <h3 className="font-semibold text-slate-900 mb-3">Active Exclusions</h3>
            <div className="flex flex-wrap gap-2">
              {(selectedIndex.exclusions || []).map((ex: string) => (
                <span key={ex} className="flex items-center gap-1 text-sm bg-red-50 text-red-700 px-3 py-1 rounded-full">
                  <Shield className="w-3 h-3" />{ex}
                </span>
              ))}
            </div>
          </Card>

          {/* Harvest result */}
          {harvestResult && (
            <Card className="bg-emerald-50 border-emerald-200">
              <h3 className="font-semibold text-emerald-900 mb-3">Tax Harvest Results</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><p className="text-xs text-emerald-700 uppercase">Losses Harvested</p><p className="text-xl font-bold text-emerald-800">{fmt(harvestResult.total_losses_harvested)}</p></div>
                <div><p className="text-xs text-emerald-700 uppercase">Est. Tax Savings</p><p className="text-xl font-bold text-emerald-800">{fmt(harvestResult.estimated_tax_savings)}</p></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-emerald-200">
                      <th className="pb-2 text-left text-xs font-semibold text-emerald-700">Sell</th>
                      <th className="pb-2 text-left text-xs font-semibold text-emerald-700">Buy (Replacement)</th>
                      <th className="pb-2 text-right text-xs font-semibold text-emerald-700">Loss Harvested</th>
                      <th className="pb-2 text-center text-xs font-semibold text-emerald-700">Wash Sale Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(harvestResult.trades || []).map((t: any, i: number) => (
                      <tr key={i} className="border-b border-emerald-100">
                        <td className="py-1.5 font-mono text-red-700">{t.sell_symbol}</td>
                        <td className="py-1.5 font-mono text-emerald-700">{t.buy_symbol}</td>
                        <td className="py-1.5 text-right font-semibold text-emerald-800">{fmt(t.loss_harvested)}</td>
                        <td className="py-1.5 text-center"><Badge variant="green" size="sm">{t.wash_sale_check}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Holdings */}
          <Card>
            <h3 className="font-semibold text-slate-900 mb-3">Top Holdings ({selectedIndex.holdings?.length || 0} shown)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-2 text-left text-xs font-semibold text-slate-600">Symbol</th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-600">Sector</th>
                    <th className="pb-2 text-right text-xs font-semibold text-slate-600">Weight</th>
                    <th className="pb-2 text-right text-xs font-semibold text-slate-600">Qty</th>
                    <th className="pb-2 text-right text-xs font-semibold text-slate-600">Cost</th>
                    <th className="pb-2 text-right text-xs font-semibold text-slate-600">Current</th>
                    <th className="pb-2 text-right text-xs font-semibold text-slate-600">Gain/Loss</th>
                    <th className="pb-2 text-center text-xs font-semibold text-slate-600">Harvest?</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedIndex.holdings || []).slice(0, 30).map((h: any) => (
                    <tr key={h.symbol} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-1.5 font-mono font-medium text-slate-900">{h.symbol}</td>
                      <td className="py-1.5 text-xs text-slate-600">{h.sector}</td>
                      <td className="py-1.5 text-right text-slate-700">{h.weight_pct}%</td>
                      <td className="py-1.5 text-right text-slate-700">{h.quantity.toFixed(2)}</td>
                      <td className="py-1.5 text-right text-slate-700">${h.cost_basis.toFixed(2)}</td>
                      <td className="py-1.5 text-right text-slate-700">${h.current_price.toFixed(2)}</td>
                      <td className={`py-1.5 text-right font-medium ${h.gain_loss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(h.gain_loss)}</td>
                      <td className="py-1.5 text-center">{h.harvestable ? <Scissors className="w-3.5 h-3.5 text-amber-500 mx-auto" /> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Active Indices</p><p className="text-2xl font-bold text-slate-900">{indices.length}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Total Value</p><p className="text-2xl font-bold text-slate-900">{fmt(indices.reduce((s, ix) => s + ix.total_value, 0))}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Losses Harvested YTD</p><p className="text-2xl font-bold text-emerald-600">{fmt(indices.reduce((s, ix) => s + ix.harvested_losses_ytd, 0))}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Harvest Opportunities</p><p className="text-2xl font-bold text-amber-600">{indices.reduce((s, ix) => s + ix.harvest_opportunities, 0)}</p></Card>
          </div>

          {/* Index cards */}
          <div className="space-y-4">
            {indices.map(ix => (
              <Card key={ix.id} className="cursor-pointer hover:ring-1 hover:ring-blue-300 transition-all" onClick={() => loadIndex(ix.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{ix.name}</h3>
                      <Badge variant={ix.status === 'active' ? 'green' : 'amber'} size="sm">{ix.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{ix.client_name} &middot; Benchmark: {ix.benchmark} &middot; {ix.holdings_count} holdings</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm"><span className="text-slate-500">Value:</span> <span className="font-semibold text-slate-900">{fmt(ix.total_value)}</span></span>
                      <span className="text-sm"><span className="text-slate-500">YTD:</span> <span className={`font-semibold ${ix.ytd_return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pct(ix.ytd_return)}</span></span>
                      <span className="text-sm"><span className="text-slate-500">Tax Alpha:</span> <span className="font-semibold text-emerald-600">+{ix.tax_alpha_ytd}%</span></span>
                      <span className="text-sm"><span className="text-slate-500">TE:</span> <span className="font-semibold text-blue-600">{ix.tracking_error_bps} bps</span></span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(ix.exclusions || []).map((ex: string) => (
                        <span key={ex} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{ex}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Harvested YTD</p>
                    <p className="text-lg font-bold text-emerald-600">{fmt(ix.harvested_losses_ytd)}</p>
                    <p className="text-xs text-amber-600 mt-1">{ix.harvest_opportunities} opportunities</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Create new */}
          <button className="w-full border-2 border-dashed border-slate-300 rounded-xl py-6 text-sm font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Create New Custom Index
          </button>

          {/* Available exclusions */}
          <Card>
            <h3 className="font-semibold text-slate-900 mb-3">Available Exclusion Categories</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {exclusions.map(ex => (
                <div key={ex.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-slate-700">{ex.name}</span>
                  <span className="text-xs text-slate-500">{ex.companies_excluded} cos.</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
