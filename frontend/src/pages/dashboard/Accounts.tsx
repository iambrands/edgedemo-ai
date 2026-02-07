import { useState, useEffect } from 'react';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { accountsApi, householdsApi, type Account, type Household } from '../../services/api';
import { clsx } from 'clsx';

type SortKey = 'name' | 'custodian' | 'balance' | 'fees';
type SortOrder = 'asc' | 'desc';

export function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountsData, householdsData] = await Promise.all([
        accountsApi.list(),
        householdsApi.list(),
      ]);
      setAccounts(accountsData);
      setHouseholds(householdsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'high-fee':
        return <Badge variant="red">High Fee</Badge>;
      case 'concentrated':
        return <Badge variant="amber">Concentrated</Badge>;
      case 'rebalance':
        return <Badge variant="amber">Rebalance</Badge>;
      case 'good':
        return <Badge variant="green">Healthy</Badge>;
      default:
        return <Badge variant="gray">{status}</Badge>;
    }
  };

  const getHouseholdName = (householdId: string) => {
    const household = households.find((h) => h.id === householdId);
    return household?.name || 'Unknown';
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedAccounts = [...accounts].sort((a, b) => {
    let comparison = 0;
    switch (sortKey) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'custodian':
        comparison = a.custodian.localeCompare(b.custodian);
        break;
      case 'balance':
        comparison = a.balance - b.balance;
        break;
      case 'fees':
        comparison = parseFloat(a.fees || '0') - parseFloat(b.fees || '0');
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const SortableHeader = ({
    children,
    sortKeyValue,
  }: {
    children: React.ReactNode;
    sortKeyValue: SortKey;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(sortKeyValue)}
    >
      <div className="flex items-center gap-2">
        {children}
        <ArrowUpDown
          size={14}
          className={clsx(
            'transition-opacity',
            sortKey === sortKeyValue ? 'opacity-100' : 'opacity-30'
          )}
        />
      </div>
    </TableHead>
  );

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
        <p className="text-gray-500">{accounts.length} accounts across all households</p>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader sortKeyValue="name">Account Name</SortableHeader>
              <SortableHeader sortKeyValue="custodian">Custodian</SortableHeader>
              <TableHead>Type</TableHead>
              <TableHead>Tax Status</TableHead>
              <SortableHeader sortKeyValue="balance">Balance</SortableHeader>
              <SortableHeader sortKeyValue="fees">Fees</SortableHeader>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAccounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{account.name}</p>
                    <p className="text-xs text-gray-500">
                      {getHouseholdName(account.householdId)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{account.custodian}</TableCell>
                <TableCell>{account.type}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      account.taxType === 'Tax-Free'
                        ? 'green'
                        : account.taxType === 'Tax-Deferred'
                        ? 'blue'
                        : 'gray'
                    }
                  >
                    {account.taxType}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(account.balance)}
                </TableCell>
                <TableCell
                  className={clsx(
                    parseFloat(account.fees || '0') > 1 ? 'text-red-500 font-medium' : 'text-gray-700'
                  )}
                >
                  {account.fees}
                </TableCell>
                <TableCell>{getStatusBadge(account.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
