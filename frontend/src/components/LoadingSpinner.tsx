import { Loader2 } from 'lucide-react';

interface Props {
  message?: string;
}

const LoadingSpinner: React.FC<Props> = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
    <p className="text-slate-500 text-sm">{message}</p>
  </div>
);

export default LoadingSpinner;
