import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle, Clock, RefreshCw } from 'lucide-react';
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
import { statementsApi, type ParsedStatement } from '../../services/api';

const SUPPORTED_BROKERAGES = [
  'Northwestern Mutual',
  'Robinhood',
  'E*TRADE',
  'Charles Schwab',
  'Fidelity',
  'Vanguard',
  'TD Ameritrade',
  'Merrill Lynch',
  'Morgan Stanley',
  'UBS',
  'Raymond James',
  'Edward Jones',
  'LPL Financial',
  'Ameriprise',
  'Principal',
  'TIAA',
  'T. Rowe Price',
];

export function Statements() {
  const [statements, setStatements] = useState<ParsedStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await statementsApi.list();
      setStatements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length > 0) {
      await uploadFiles(pdfFiles);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFiles(Array.from(files));
    }
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        await statementsApi.upload(file);
      }
      // Refresh the list after upload
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'parsing':
        return <Clock className="w-4 h-4 text-amber-500 animate-spin" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error && statements.length === 0) {
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statements</h1>
        <p className="text-gray-500">Upload and parse investment statements</p>
      </div>

      {/* Upload Area */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Upload Investment Statements
        </h2>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center transition-colors
            ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
          `}
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {uploading ? (
              <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <p className="text-gray-700 font-medium mb-2">
            {uploading ? 'Uploading...' : 'Drag and drop your statements here, or'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="secondary"
            className="mb-4"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            Select Files
          </Button>
          <p className="text-sm text-gray-500">
            Supports PDF, CSV, and images from 17+ brokerages
          </p>
        </div>

        {/* Supported Brokerages */}
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-3">
            Supports statements from:
          </p>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_BROKERAGES.map((brokerage) => (
              <Badge key={brokerage} variant="gray">
                {brokerage}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Recently Parsed Statements */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recently Parsed Statements
          </h2>
          <Badge variant="blue">{statements.length} documents</Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Custodian</TableHead>
              <TableHead>Parsed</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statements.map((statement) => (
              <TableRow key={statement.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{statement.filename}</span>
                  </div>
                </TableCell>
                <TableCell>{statement.custodian}</TableCell>
                <TableCell>{statement.parsed}</TableCell>
                <TableCell className="text-gray-500">{statement.date}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: statement.confidence }}
                      />
                    </div>
                    <span className="text-sm text-gray-500">{statement.confidence}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(statement.status)}
                    <span className="capitalize text-sm">{statement.status}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
