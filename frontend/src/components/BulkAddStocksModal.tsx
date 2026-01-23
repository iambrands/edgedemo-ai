import React, { useState } from 'react';

interface BulkAddStocksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (symbols: string[]) => Promise<void>;
  existingSymbols: string[];
}

// Pre-configured stock lists
const STOCK_LISTS: { [key: string]: string[] } = {
  'Tech Leaders': ['MSFT', 'AMD', 'AMZN', 'GOOGL', 'NFLX', 'CRM', 'ADBE'],
  'Major ETFs': ['SPY', 'QQQ', 'IWM', 'DIA', 'XLF', 'XLE', 'XLK', 'XLV', 'TLT'],
  'High IV Plays': ['COIN', 'PLTR', 'RIVN', 'SNAP', 'DKNG', 'ABNB', 'MARA'],
  'Blue Chips': ['JPM', 'V', 'MA', 'JNJ', 'PG', 'KO', 'WMT', 'DIS'],
  'FAANG+': ['META', 'AAPL', 'AMZN', 'NFLX', 'GOOGL', 'MSFT', 'NVDA', 'TSLA'],
  'Financials': ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK'],
  'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC'],
  'Healthcare': ['UNH', 'JNJ', 'PFE', 'ABBV', 'TMO', 'MRK', 'LLY']
};

const BulkAddStocksModal: React.FC<BulkAddStocksModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingSymbols
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [previewSymbols, setPreviewSymbols] = useState<string[]>([]);
  const [importMethod, setImportMethod] = useState<'manual' | 'lists' | 'file'>('manual');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  // Parse input text into symbols
  const parseSymbols = (text: string): string[] => {
    // Split by comma, space, newline, tab
    const symbols = text
      .toUpperCase()
      .split(/[\s,\n\t]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length <= 5 && /^[A-Z]+$/.test(s));
    
    // Remove duplicates
    return Array.from(new Set(symbols));
  };

  // Get symbols that are already in watchlist
  const getExistingFromPreview = (): string[] => {
    const existingSet = new Set(existingSymbols.map(s => s.toUpperCase()));
    return previewSymbols.filter(s => existingSet.has(s));
  };

  // Get symbols that are new (not in watchlist)
  const getNewSymbols = (): string[] => {
    const existingSet = new Set(existingSymbols.map(s => s.toUpperCase()));
    return previewSymbols.filter(s => !existingSet.has(s));
  };

  // Handle text input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    
    if (text.trim()) {
      const symbols = parseSymbols(text);
      setPreviewSymbols(symbols);
    } else {
      setPreviewSymbols([]);
    }
  };

  // Handle list selection
  const handleListToggle = (listName: string) => {
    const newSelected = selectedLists.includes(listName)
      ? selectedLists.filter(l => l !== listName)
      : [...selectedLists, listName];
    
    setSelectedLists(newSelected);
    
    // Update preview
    const allSymbols = newSelected.flatMap(list => STOCK_LISTS[list] || []);
    setPreviewSymbols(Array.from(new Set(allSymbols))); // Remove duplicates
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const symbols = parseSymbols(text);
      setPreviewSymbols(symbols);
      setInputText(text);
    };
    reader.readAsText(file);
  };

  // Handle add
  const handleAdd = async () => {
    const newSymbols = getNewSymbols();
    if (newSymbols.length === 0) {
      return;
    }

    setIsAdding(true);
    try {
      await onAdd(newSymbols);
      handleClose();
    } catch (error) {
      console.error('Failed to add stocks:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Handle close
  const handleClose = () => {
    setInputText('');
    setSelectedLists([]);
    setPreviewSymbols([]);
    setImportMethod('manual');
    onClose();
  };

  const newSymbols = getNewSymbols();
  const existingInPreview = getExistingFromPreview();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div 
        className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-secondary">Bulk Add Stocks</h2>
          <button 
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Import Method Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                importMethod === 'manual'
                  ? 'text-primary border-primary'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
              onClick={() => setImportMethod('manual')}
            >
              ✏️ Manual Entry
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                importMethod === 'lists'
                  ? 'text-primary border-primary'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
              onClick={() => setImportMethod('lists')}
            >
              📋 Pre-Made Lists
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                importMethod === 'file'
                  ? 'text-primary border-primary'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
              onClick={() => setImportMethod('file')}
            >
              📁 Import File
            </button>
          </div>

          {/* Manual Entry */}
          {importMethod === 'manual' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Enter stock symbols (separated by comma, space, or newline):
              </label>
              <textarea
                value={inputText}
                onChange={handleInputChange}
                placeholder="Example: AAPL, MSFT, GOOGL&#10;or&#10;AAPL MSFT GOOGL&#10;or&#10;AAPL&#10;MSFT&#10;GOOGL"
                rows={6}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg font-mono text-sm focus:border-primary focus:outline-none resize-y"
              />
              <p className="text-xs text-gray-500">
                💡 Tip: You can paste multiple symbols from a spreadsheet
              </p>
            </div>
          )}

          {/* Pre-Made Lists */}
          {importMethod === 'lists' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Select one or more lists to add:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(STOCK_LISTS).map(([listName, symbols]) => (
                  <div
                    key={listName}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedLists.includes(listName)
                        ? 'border-primary bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleListToggle(listName)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedLists.includes(listName)}
                        onChange={() => {}}
                        className="w-4 h-4 text-primary rounded focus:ring-primary"
                      />
                      <h4 className="font-semibold text-sm text-gray-900">{listName}</h4>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">
                      {symbols.slice(0, 5).join(', ')}
                      {symbols.length > 5 && ` +${symbols.length - 5} more`}
                    </p>
                    <p className="text-xs font-medium text-gray-400">
                      {symbols.length} stocks
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Import */}
          {importMethod === 'file' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Upload a CSV or text file with stock symbols:
              </label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 focus:outline-none"
              />
              <p className="text-xs text-gray-500">
                💡 File should contain one symbol per line or comma-separated
              </p>
              {inputText && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">File Contents:</h4>
                  <pre className="text-xs text-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {inputText}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Preview Section */}
          {previewSymbols.length > 0 && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Preview ({previewSymbols.length} stocks)
              </h3>
              
              {/* New symbols */}
              {newSymbols.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-success mb-2">
                    ✅ Will be added ({newSymbols.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {newSymbols.map(symbol => (
                      <span 
                        key={symbol} 
                        className="px-3 py-1 bg-success text-white rounded-full text-xs font-semibold"
                      >
                        {symbol}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Already existing */}
              {existingInPreview.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-600 mb-2">
                    ⚠️ Already in watchlist (will skip): {existingInPreview.length}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {existingInPreview.map(symbol => (
                      <span 
                        key={symbol} 
                        className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold"
                      >
                        {symbol}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button 
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2 bg-success text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleAdd}
            disabled={newSymbols.length === 0 || isAdding}
          >
            {isAdding ? 'Adding...' : `Add ${newSymbols.length} Stock${newSymbols.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkAddStocksModal;
