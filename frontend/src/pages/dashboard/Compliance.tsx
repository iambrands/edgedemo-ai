import { useState, useEffect } from 'react';
import { Download, Filter, RefreshCw, ChevronDown, Table as TableIcon, FileText } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { complianceApi, type ComplianceLog } from '../../services/api';
import { exportToCSV, exportToPDF } from '../../utils/export';

export function Compliance() {
  const [logs, setLogs] = useState<ComplianceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await complianceApi.getAuditTrail();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'PASS':
        return <Badge variant="green">PASS</Badge>;
      case 'FAIL':
        return <Badge variant="red">FAIL</Badge>;
      case 'WARNING':
        return <Badge variant="amber">WARNING</Badge>;
      default:
        return <Badge variant="gray">{result}</Badge>;
    }
  };

  const passCount = logs.filter((log) => log.result === 'PASS').length;
  const failCount = logs.filter((log) => log.result === 'FAIL').length;
  const warningCount = logs.filter((log) => log.result === 'WARNING').length;

  const handleExportCSV = () => {
    exportToCSV(logs as unknown as Record<string, unknown>[], 'edgeai-compliance-audit-trail', [
      { key: 'date', header: 'Date' },
      { key: 'household', header: 'Household' },
      { key: 'rule', header: 'Rule' },
      { key: 'result', header: 'Result' },
      { key: 'detail', header: 'Detail' },
      { key: 'promptVersion', header: 'Model Version' },
    ]);
    setExportMenuOpen(false);
  };

  const handleExportPDF = () => {
    const tableRows = logs.map(log => `
      <tr>
        <td>${log.date}</td>
        <td>${log.household}</td>
        <td>${log.rule}</td>
        <td class="${log.result.toLowerCase()}">${log.result}</td>
        <td>${log.detail}</td>
      </tr>
    `).join('');

    const content = `
      <h1>Compliance Audit Trail</h1>
      <p><strong>Report Period:</strong> ${logs[logs.length - 1]?.date || 'N/A'} to ${logs[0]?.date || 'N/A'}</p>
      <p><strong>Total Records:</strong> ${logs.length}</p>
      
      <div class="summary-box">
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-value pass">${passCount}</div>
            <div class="summary-label">Passed</div>
          </div>
          <div class="summary-item">
            <div class="summary-value warning">${warningCount}</div>
            <div class="summary-label">Warnings</div>
          </div>
          <div class="summary-item">
            <div class="summary-value fail">${failCount}</div>
            <div class="summary-label">Failed</div>
          </div>
        </div>
      </div>
      
      <h2>Detailed Audit Log</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Household</th>
            <th>Rule</th>
            <th>Result</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    exportToPDF('EdgeAI Compliance Audit Trail', content, 'compliance-report');
    setExportMenuOpen(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
          <p className="text-gray-500">Audit trail and regulatory compliance monitoring</p>
        </div>
        
        {/* Export Dropdown */}
        <div className="relative">
          <Button
            variant="secondary"
            className="flex items-center gap-2"
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
          >
            <Download size={18} />
            Export Report
            <ChevronDown size={16} className={`transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
          </Button>
          
          {exportMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setExportMenuOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <TableIcon size={18} className="text-green-600" />
                  Export as CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FileText size={18} className="text-red-600" />
                  Export as PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-green-50 border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Passing Checks</p>
              <p className="text-3xl font-bold text-green-600">{passCount}</p>
            </div>
            <Badge variant="green">PASS</Badge>
          </div>
        </Card>

        <Card className="bg-amber-50 border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700">Warnings</p>
              <p className="text-3xl font-bold text-amber-600">{warningCount}</p>
            </div>
            <Badge variant="amber">WARNING</Badge>
          </div>
        </Card>

        <Card className="bg-red-50 border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Failed Checks</p>
              <p className="text-3xl font-bold text-red-600">{failCount}</p>
            </div>
            <Badge variant="red">FAIL</Badge>
          </div>
        </Card>
      </div>

      {/* Audit Trail Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Compliance Audit Trail</h2>
          <Button variant="secondary" size="sm" className="flex items-center gap-2">
            <Filter size={16} />
            Filter
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Household</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead>Prompt Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-gray-500">{log.date}</TableCell>
                <TableCell className="font-medium">{log.household}</TableCell>
                <TableCell>
                  <Badge variant="blue">{log.rule}</Badge>
                </TableCell>
                <TableCell>{getResultBadge(log.result)}</TableCell>
                <TableCell className="max-w-xs truncate text-gray-500">
                  {log.detail}
                </TableCell>
                <TableCell className="text-gray-500 font-mono text-xs">
                  {log.promptVersion}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Compliance Rules Reference */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Rules Reference</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900 mb-1">FINRA 2111 - Suitability</p>
            <p className="text-sm text-gray-500">
              Requires reasonable basis to believe recommendations are suitable based on
              client's investment profile.
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900 mb-1">FINRA 2330 - Variable Products</p>
            <p className="text-sm text-gray-500">
              Special suitability requirements for variable annuity and variable life
              insurance recommendations.
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900 mb-1">Regulation Best Interest (Reg BI)</p>
            <p className="text-sm text-gray-500">
              Broker-dealers must act in retail customer's best interest and disclose
              material conflicts of interest.
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900 mb-1">SEC Rule 206(4)-7</p>
            <p className="text-sm text-gray-500">
              Investment advisers must adopt and implement written compliance policies and
              procedures.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
