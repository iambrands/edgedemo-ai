import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  message: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<Props> = ({ message, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
    <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
    <p className="text-red-700 font-medium">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-3 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    )}
  </div>
);

export default ErrorMessage;
