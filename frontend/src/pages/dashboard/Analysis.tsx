import { useState } from 'react';
import {
  PieChart,
  DollarSign,
  Receipt,
  AlertTriangle,
  Layers,
  FileText,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { AnalysisModal } from '../../components/features/AnalysisModal';

type ToolType = 'portfolio' | 'fee' | 'tax' | 'risk' | 'etf' | 'ips';

interface AnalysisTool {
  id: ToolType;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  status: 'available' | 'coming-soon';
}

const ANALYSIS_TOOLS: AnalysisTool[] = [
  {
    id: 'portfolio',
    title: 'Portfolio Analysis',
    description:
      'Comprehensive portfolio analysis including asset allocation, diversification metrics, and optimization suggestions.',
    icon: PieChart,
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-500',
    status: 'available',
  },
  {
    id: 'fee',
    title: 'Fee Analysis',
    description:
      'Identify hidden fees, expense ratios, and cost optimization opportunities across all accounts.',
    icon: DollarSign,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-500',
    status: 'available',
  },
  {
    id: 'tax',
    title: 'Tax Analysis',
    description:
      'Tax-loss harvesting opportunities, asset location optimization, and tax efficiency scoring.',
    icon: Receipt,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-500',
    status: 'available',
  },
  {
    id: 'risk',
    title: 'Risk Analysis',
    description:
      'Risk assessment including concentration analysis, correlation metrics, and stress testing scenarios.',
    icon: AlertTriangle,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    status: 'available',
  },
  {
    id: 'etf',
    title: 'ETF Builder',
    description:
      'Build custom ETF portfolios with factor-based screening and replication strategies.',
    icon: Layers,
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-500',
    status: 'available',
  },
  {
    id: 'ips',
    title: 'IPS Generator',
    description:
      'Generate compliant Investment Policy Statements based on client profiles and objectives.',
    icon: FileText,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    status: 'available',
  },
];

export function Analysis() {
  const [selectedTool, setSelectedTool] = useState<AnalysisTool | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analysis Tools</h1>
        <p className="text-gray-500">
          AI-powered analysis tools for comprehensive portfolio insights
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ANALYSIS_TOOLS.map((tool) => (
          <Card
            key={tool.id}
            variant="feature"
            className="cursor-pointer group"
            onClick={() => tool.status === 'available' && setSelectedTool(tool)}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-12 h-12 ${tool.iconBg} rounded-xl flex items-center justify-center`}
              >
                <tool.icon className={`w-6 h-6 ${tool.iconColor}`} />
              </div>
              {tool.status === 'available' ? (
                <Badge variant="green">Available</Badge>
              ) : (
                <Badge variant="gray">Coming Soon</Badge>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
              {tool.title}
            </h3>
            <p className="text-sm text-gray-500">{tool.description}</p>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Analysis</h2>
        <p className="text-gray-500 text-sm mb-4">
          Run a quick analysis on a specific household or account to get instant insights.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Wilson Household</p>
            <p className="text-xs text-gray-500">Last analyzed: Feb 4, 2026</p>
            <button 
              onClick={() => setSelectedTool(ANALYSIS_TOOLS[0])}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Run Analysis →
            </button>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Henderson Family</p>
            <p className="text-xs text-gray-500">Last analyzed: Jan 28, 2026</p>
            <button 
              onClick={() => setSelectedTool(ANALYSIS_TOOLS[0])}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Run Analysis →
            </button>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Martinez Retirement</p>
            <p className="text-xs text-gray-500">Last analyzed: Jan 30, 2026</p>
            <button 
              onClick={() => setSelectedTool(ANALYSIS_TOOLS[0])}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Run Analysis →
            </button>
          </div>
        </div>
      </Card>

      {/* Analysis Modal */}
      {selectedTool && (
        <AnalysisModal
          isOpen={!!selectedTool}
          onClose={() => setSelectedTool(null)}
          toolType={selectedTool.id}
          toolTitle={selectedTool.title}
        />
      )}
    </div>
  );
}
