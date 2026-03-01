import { useState, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { useToast } from '../../contexts/ToastContext';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EXPECTED_COLUMNS = [
  'Name',
  'Email',
  'Account Type',
  'Custodian',
  'Approximate Value',
  'Risk Tolerance',
];

const VALID_ACCOUNT_TYPES = new Set([
  'brokerage',
  'traditional_ira',
  'roth_ira',
  'sep_ira',
  'simple_ira',
  'inherited_ira',
  '401k',
  '403b',
  '457b',
  'tsp',
  'pension_rollover',
  'joint',
  'trust',
]);

const VALID_RISK_TOLERANCES = new Set([
  'conservative',
  'moderate',
  'moderate_aggressive',
  'aggressive',
]);

const SAMPLE_CSV = `Name,Email,Account Type,Custodian,Approximate Value,Risk Tolerance
John Smith,john@example.com,brokerage,Schwab,500000,moderate
Jane Doe,jane@example.com,roth_ira,Fidelity,250000,aggressive
Bob Wilson,bob@example.com,traditional_ira,TD Ameritrade,750000,conservative
Alice Brown,invalid-email,401k,Vanguard,100000,moderate_aggressive
Charlie Lee,charlie@example.com,sep_ira,Schwab,300000,moderate`;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedRow {
  name: string;
  email: string;
  account_type: string;
  custodian: string;
  approximate_value: string;
  risk_tolerance: string;
}

interface ValidatedRow {
  rowIndex: number;
  data: ParsedRow;
  valid: boolean;
  errors: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((c) => c.trim());
  const nameIdx = header.findIndex((h) => h.toLowerCase().includes('name'));
  const emailIdx = header.findIndex((h) => h.toLowerCase().includes('email'));
  const accountTypeIdx = header.findIndex(
    (h) => h.toLowerCase().includes('account') && h.toLowerCase().includes('type')
  );
  const custodianIdx = header.findIndex((h) => h.toLowerCase().includes('custodian'));
  const valueIdx = header.findIndex(
    (h) => h.toLowerCase().includes('value') || h.toLowerCase().includes('approximate')
  );
  const riskIdx = header.findIndex(
    (h) => h.toLowerCase().includes('risk') && h.toLowerCase().includes('tolerance')
  );

  const get = (row: string[], idx: number) =>
    idx >= 0 && idx < row.length ? row[idx].trim() : '';

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim());
    if (parts.some((p) => p)) {
      rows.push({
        name: get(parts, nameIdx),
        email: get(parts, emailIdx),
        account_type: get(parts, accountTypeIdx).toLowerCase().replace(/\s+/g, '_'),
        custodian: get(parts, custodianIdx),
        approximate_value: get(parts, valueIdx),
        risk_tolerance: get(parts, riskIdx).toLowerCase().replace(/\s+/g, '_'),
      });
    }
  }
  return rows;
}

function validateRow(row: ParsedRow, rowIndex: number): ValidatedRow {
  const errors: string[] = [];

  if (row.name.length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  if (!row.email.includes('@')) {
    errors.push('Email must contain @');
  }
  if (!VALID_ACCOUNT_TYPES.has(row.account_type)) {
    errors.push(`Invalid account type: ${row.account_type || '(empty)'}`);
  }
  const value = parseFloat(row.approximate_value.replace(/[$,]/g, ''));
  if (isNaN(value) || value < 0) {
    errors.push('Approximate value must be a non-negative number');
  }
  if (!VALID_RISK_TOLERANCES.has(row.risk_tolerance)) {
    errors.push(`Invalid risk tolerance: ${row.risk_tolerance || '(empty)'}`);
  }

  return {
    rowIndex,
    data: row,
    valid: errors.length === 0,
    errors,
  };
}

function generateTemplateCSV(): string {
  return EXPECTED_COLUMNS.join(',') + '\n';
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function BulkImport() {
  const toast = useToast();
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const processCSV = useCallback((text: string) => {
    const parsed = parseCSV(text);
    const validated = parsed.map((row, i) => validateRow(row, i + 1));
    setValidatedRows(validated);
    setImportComplete(false);
  }, []);

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) {
        setValidatedRows([]);
        setFileName(null);
        return;
      }
      if (!file.name.toLowerCase().endsWith('.csv')) {
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) || '';
        processCSV(text);
      };
      reader.readAsText(file);
    },
    [processCSV]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.toLowerCase().endsWith('.csv')) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    handleFile(file);
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([generateTemplateCSV()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUseSampleData = () => {
    processCSV(SAMPLE_CSV);
    setFileName('sample_data.csv');
  };

  const handleImport = async () => {
    const validRows = validatedRows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setImporting(true);
    setImportProgress(0);
    setImportComplete(false);

    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 150));
      setImportProgress((i / steps) * 100);
    }

    setImportedCount(validRows.length);
    setImportComplete(true);
    setImporting(false);
    toast.success(`${validRows.length} client${validRows.length !== 1 ? 's' : ''} imported successfully`);
  };

  const handleReset = () => {
    setValidatedRows([]);
    setFileName(null);
    setImportComplete(false);
    setImportedCount(0);
    setImportProgress(0);
  };

  const validCount = validatedRows.filter((r) => r.valid).length;
  const errorCount = validatedRows.filter((r) => !r.valid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Bulk Client Import"
        subtitle="Import multiple clients at once using a CSV file"
      />

      {/* Template Download */}
      <Card>
        <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
          <FileSpreadsheet size={18} />
          CSV Template
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Download the template with the required columns: Name, Email, Account Type,
          Custodian, Approximate Value, Risk Tolerance.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Download CSV Template
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUseSampleData}
            className="flex items-center gap-2"
          >
            Use Sample Data
          </Button>
        </div>
      </Card>

      {/* Upload Section */}
      <Card>
        <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
          <Upload size={18} />
          Upload CSV
        </h3>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
          }`}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleInputChange}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload size={40} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">
              {fileName
                ? `Selected: ${fileName}`
                : 'Drag and drop your CSV file here, or click to browse'}
            </span>
            <span className="text-xs text-slate-500">Accepts .csv files only</span>
          </label>
        </div>
      </Card>

      {/* Summary Cards */}
      {validatedRows.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Total Rows"
              value={String(validatedRows.length)}
              color="slate"
            />
            <MetricCard
              label="Valid Rows"
              value={String(validCount)}
              icon={<CheckCircle size={18} />}
              color="emerald"
            />
            <MetricCard
              label="Error Rows"
              value={String(errorCount)}
              icon={<AlertTriangle size={18} />}
              color="red"
            />
          </div>

          {/* Preview Table */}
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Preview & Validation</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Review parsed rows. Fix errors in your CSV and re-upload if needed.
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Custodian</TableHead>
                  <TableHead className="text-right">Approx. Value</TableHead>
                  <TableHead>Risk Tolerance</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validatedRows.map((vr) => (
                  <TableRow
                    key={vr.rowIndex}
                    className={vr.valid ? '' : 'bg-red-50/70 hover:bg-red-50'}
                  >
                    <TableCell>
                      {vr.valid ? (
                        <CheckCircle size={18} className="text-emerald-600" />
                      ) : (
                        <span
                          className="inline-flex items-center gap-1"
                          title={vr.errors.join('; ')}
                        >
                          <XCircle size={18} className="text-red-600" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-900">{vr.data.name}</TableCell>
                    <TableCell>{vr.data.email}</TableCell>
                    <TableCell>{vr.data.account_type}</TableCell>
                    <TableCell>{vr.data.custodian}</TableCell>
                    <TableCell className="text-right font-mono">
                      {(() => {
                        const val = parseFloat(vr.data.approximate_value.replace(/[$,]/g, ''));
                        return isNaN(val) ? '—' : `$${val.toLocaleString()}`;
                      })()}
                    </TableCell>
                    <TableCell>{vr.data.risk_tolerance}</TableCell>
                    <TableCell
                      className="text-xs text-red-600 max-w-[200px]"
                      title={vr.errors.join('; ')}
                    >
                      {vr.valid ? '—' : vr.errors.join('; ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Import Button & Progress */}
          {!importComplete ? (
            <div className="flex items-center justify-between gap-4">
              <Button variant="secondary" size="sm" onClick={handleReset}>
                Clear & Start Over
              </Button>
              <div className="flex items-center gap-4">
                {importing && (
                  <div className="flex items-center gap-2 min-w-[200px]">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-500">
                      {Math.round(importProgress)}%
                    </span>
                  </div>
                )}
                <Button
                  onClick={handleImport}
                  disabled={validCount === 0 || importing}
                  isLoading={importing}
                  size="sm"
                >
                  {importing
                    ? 'Importing...'
                    : `Import ${validCount} Valid Client${validCount !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          ) : (
            <Card>
              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle size={24} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-800">
                    Import completed successfully
                  </p>
                  <p className="text-sm text-emerald-700 mt-1">
                    {importedCount} client{importedCount !== 1 ? 's' : ''} imported.
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={handleReset} className="mt-4">
                Import More Clients
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
