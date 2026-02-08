import { FileText, LucideIcon } from 'lucide-react';

interface Props {
  message: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<Props> = ({
  message,
  description,
  icon: Icon = FileText,
  action,
}) => (
  <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
    <Icon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
    <h3 className="font-medium text-slate-900">{message}</h3>
    {description && (
      <p className="text-sm text-slate-500 mt-1">{description}</p>
    )}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);

export default EmptyState;
