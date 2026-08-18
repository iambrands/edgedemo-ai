/**
 * Plaid Link button for B2C account aggregation.
 * In mock/sandbox mode (when PLAID_CLIENT_ID is not set server-side),
 * the link_token starts with "link-sandbox-mock-" and we simulate the
 * Link flow by immediately calling onSuccess with a fake public token.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from 'react-plaid-link';
import { b2cApi, type PlaidExchangeResponse } from '../../services/b2cApi';

interface Props {
  onLinked: (result: PlaidExchangeResponse) => void;
}

function RealPlaidButton({
  linkToken,
  onLinked,
}: {
  linkToken: string;
  onLinked: (result: PlaidExchangeResponse) => void;
}) {
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState('');

  const onSuccess = useCallback(
    async (publicToken: string | null, metadata: PlaidLinkOnSuccessMetadata) => {
      if (!publicToken) return;
      setExchanging(true);
      setError('');
      try {
        const result = await b2cApi.exchangePlaidToken({
          public_token: publicToken,
          institution_id: metadata.institution?.institution_id ?? undefined,
          institution_name: metadata.institution?.name ?? undefined,
        });
        onLinked(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Link failed');
      } finally {
        setExchanging(false);
      }
    },
    [onLinked],
  );

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess });

  return (
    <div>
      <button
        type="button"
        disabled={!ready || exchanging}
        onClick={() => open()}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
      >
        {exchanging ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
        {exchanging ? 'Linking…' : 'Connect account'}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function MockPlaidButton({ onLinked }: { onLinked: (result: PlaidExchangeResponse) => void }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await b2cApi.exchangePlaidToken({
        public_token: 'link-sandbox-mock-00000000',
        institution_name: 'Demo Bank',
      });
      onLinked(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
      title="Demo mode — Plaid not configured"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
      {loading ? 'Linking…' : 'Connect account (demo)'}
    </button>
  );
}

export function PlaidLinkButton({ onLinked }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    b2cApi
      .createPlaidLinkToken()
      .then((res) => {
        if (!cancelled) setLinkToken(res.link_token);
      })
      .catch((err) => {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : 'Could not initialize');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <button disabled className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600/50 text-white text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </button>
    );
  }

  if (fetchError || !linkToken) {
    return <p className="text-xs text-red-600">{fetchError || 'Could not load Plaid'}</p>;
  }

  if (linkToken.startsWith('link-sandbox-mock-')) {
    return <MockPlaidButton onLinked={onLinked} />;
  }

  return <RealPlaidButton linkToken={linkToken} onLinked={onLinked} />;
}
