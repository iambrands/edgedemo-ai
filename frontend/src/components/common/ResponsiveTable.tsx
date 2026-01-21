import React from 'react';
import { useDevice } from '../../hooks/useDevice';

export interface ColumnDef {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface ResponsiveTableProps {
  data: any[];
  columns: ColumnDef[];
  mobileCardRenderer?: (item: any) => React.ReactNode;
  onRowClick?: (item: any) => void;
  className?: string;
  emptyMessage?: string;
}

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  data,
  columns,
  mobileCardRenderer,
  onRowClick,
  className = '',
  emptyMessage = 'No data available',
}) => {
  const { isMobile, isTablet } = useDevice();
  const shouldUseCards = isMobile || (isTablet && mobileCardRenderer);

  if (data.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  // Mobile/Tablet: Render as cards
  if (shouldUseCards && mobileCardRenderer) {
    return (
      <div className={`space-y-4 ${className}`}>
        {data.map((item, index) => (
          <div
            key={index}
            onClick={() => onRowClick?.(item)}
            className={`
              bg-white rounded-lg shadow p-4 border border-gray-200
              ${onRowClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
            `}
          >
            {mobileCardRenderer(item)}
          </div>
        ))}
      </div>
    );
  }

  // Desktop/Tablet: Render as table with horizontal scroll on tablet
  return (
    <div className={`${isTablet ? 'overflow-x-auto' : ''} ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`
                  px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                  ${column.className || ''}
                  ${isMobile ? 'px-2 py-2 text-xs' : ''}
                `}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => onRowClick?.(row)}
              className={`
                ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                transition-colors
              `}
            >
              {columns.map((column) => {
                const value = row[column.key];
                const renderedValue = column.render
                  ? column.render(value, row)
                  : value;

                return (
                  <td
                    key={column.key}
                    className={`
                      px-4 py-3 whitespace-nowrap text-sm text-gray-900
                      ${column.className || ''}
                      ${isMobile ? 'px-2 py-2 text-xs' : ''}
                    `}
                  >
                    {renderedValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResponsiveTable;

