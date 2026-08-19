import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, DollarSign, ChevronDown } from 'lucide-react';
import {
  b2cApi,
  type B2CAdvisorListing,
  type AdvisorSpecialty,
  type AdvisorFeeType,
} from '../../services/b2cApi';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SPECIALTY_LABELS: Record<AdvisorSpecialty, string> = {
  retirement: 'Retirement',
  tax_planning: 'Tax Planning',
  estate_planning: 'Estate Planning',
  investing_basics: 'Investing Basics',
  wealth_building: 'Wealth Building',
};

const SPECIALTY_COLORS: Record<AdvisorSpecialty, string> = {
  retirement: 'bg-blue-100 text-blue-700',
  tax_planning: 'bg-amber-100 text-amber-700',
  estate_planning: 'bg-violet-100 text-violet-700',
  investing_basics: 'bg-emerald-100 text-emerald-700',
  wealth_building: 'bg-cyan-100 text-cyan-700',
};

const FEE_TYPE_LABELS: Record<AdvisorFeeType, string> = {
  flat: 'Flat fee',
  aum_pct: 'AUM-based',
};

const MIN_AUM_BUCKETS = [
  { label: 'Any minimum', max: Infinity },
  { label: 'Under $100K', max: 100000 },
  { label: '$100K – $500K', max: 500000 },
  { label: '$500K+', max: Infinity, min: 500000 },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Star rating component
// ─────────────────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < Math.round(rating) ? 'text-amber-400 fill-current' : 'text-slate-200 fill-current'
          }`}
        />
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Advisor card
// ─────────────────────────────────────────────────────────────────────────────

function AdvisorCard({
  advisor,
  onRequest,
}: {
  advisor: B2CAdvisorListing;
  onRequest: (advisor: B2CAdvisorListing) => void;
}) {
  return (
    <article className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
          style={{ backgroundColor: advisor.avatar_color }}
        >
          {advisor.avatar_initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 leading-tight">{advisor.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{advisor.title}</p>
          <p className="text-xs text-slate-500 truncate">{advisor.firm}</p>
        </div>
        {!advisor.accepting_clients && (
          <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex-shrink-0">
            Waitlist
          </span>
        )}
      </div>

      {/* Bio */}
      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{advisor.bio}</p>

      {/* Specialties */}
      <div className="flex flex-wrap gap-1.5">
        {advisor.specialties.map((s) => (
          <span
            key={s}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SPECIALTY_COLORS[s]}`}
          >
            {SPECIALTY_LABELS[s]}
          </span>
        ))}
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">{advisor.fee_range}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">{advisor.location}</span>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-2">
        <Stars rating={advisor.rating} />
        <span className="text-xs font-semibold text-slate-700">{advisor.rating.toFixed(1)}</span>
        <span className="text-xs text-slate-400">({advisor.review_count} reviews)</span>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={() => onRequest(advisor)}
        disabled={!advisor.accepting_clients}
        className="mt-auto w-full py-2 rounded-xl text-sm font-medium transition-colors
          bg-blue-600 text-white hover:bg-blue-700
          disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
      >
        {advisor.accepting_clients ? 'Request Consultation' : 'Join Waitlist'}
      </button>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter pill
// ─────────────────────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

type SpecialtyFilter = AdvisorSpecialty | 'all';
type FeeFilter = AdvisorFeeType | 'all';
type AumBucketIdx = 0 | 1 | 2 | 3;

export default function AdvisorMarketplace() {
  const navigate = useNavigate();
  const [advisors, setAdvisors] = useState<B2CAdvisorListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [specFilter, setSpecFilter] = useState<SpecialtyFilter>('all');
  const [feeFilter, setFeeFilter] = useState<FeeFilter>('all');
  const [aumIdx, setAumIdx] = useState<AumBucketIdx>(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await b2cApi.getAdvisors();
        if (!cancelled) setAdvisors(res.advisors);
      } catch {
        if (!cancelled) setError('Unable to load advisors. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = advisors;
    if (specFilter !== 'all') {
      list = list.filter((a) => a.specialties.includes(specFilter));
    }
    if (feeFilter !== 'all') {
      list = list.filter((a) => a.fee_type === feeFilter);
    }
    const bucket = MIN_AUM_BUCKETS[aumIdx];
    if (aumIdx !== 0) {
      const min = 'min' in bucket ? (bucket.min as number) : 0;
      const max = bucket.max;
      list = list.filter((a) => a.min_aum >= min && a.min_aum < max);
    }
    return list;
  }, [advisors, specFilter, feeFilter, aumIdx]);

  const handleRequest = (advisor: B2CAdvisorListing) => {
    navigate('/client/connect-advisor', {
      state: { advisorId: advisor.id, advisorName: advisor.name, advisorFirm: advisor.firm },
    });
  };

  const allSpecialties: AdvisorSpecialty[] = [
    'retirement',
    'tax_planning',
    'estate_planning',
    'investing_basics',
    'wealth_building',
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Find an Advisor</h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse Firmum-vetted advisors. Request a consultation — your data stays private until you
          approve the connection.
        </p>
      </div>

      {/* Filter controls */}
      <div className="mb-6">
        {/* Mobile toggle */}
        <button
          type="button"
          className="sm:hidden flex items-center gap-2 text-sm font-medium text-slate-700 mb-3"
          onClick={() => setShowFilters((v) => !v)}
        >
          Filters
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>

        <div className={`space-y-3 ${showFilters ? 'block' : 'hidden sm:block'}`}>
          {/* Specialty */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-20 flex-shrink-0">
              Specialty
            </span>
            <FilterPill
              label="All"
              active={specFilter === 'all'}
              onClick={() => setSpecFilter('all')}
            />
            {allSpecialties.map((s) => (
              <FilterPill
                key={s}
                label={SPECIALTY_LABELS[s]}
                active={specFilter === s}
                onClick={() => setSpecFilter(s)}
              />
            ))}
          </div>

          {/* Fee type */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-20 flex-shrink-0">
              Fee type
            </span>
            <FilterPill
              label="All"
              active={feeFilter === 'all'}
              onClick={() => setFeeFilter('all')}
            />
            {(['flat', 'aum_pct'] as AdvisorFeeType[]).map((f) => (
              <FilterPill
                key={f}
                label={FEE_TYPE_LABELS[f]}
                active={feeFilter === f}
                onClick={() => setFeeFilter(f)}
              />
            ))}
          </div>

          {/* Min AUM */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-20 flex-shrink-0">
              Min AUM
            </span>
            {MIN_AUM_BUCKETS.map((b, idx) => (
              <FilterPill
                key={b.label}
                label={b.label}
                active={aumIdx === idx}
                onClick={() => setAumIdx(idx as AumBucketIdx)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      {!loading && !error && (
        <p className="text-xs text-slate-400 mb-4">
          {filtered.length} advisor{filtered.length !== 1 ? 's' : ''} match your filters
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <p className="text-slate-500 font-medium">No advisors match these filters.</p>
          <button
            type="button"
            onClick={() => { setSpecFilter('all'); setFeeFilter('all'); setAumIdx(0); }}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <AdvisorCard key={a.id} advisor={a} onRequest={handleRequest} />
          ))}
        </div>
      )}

      {/* Disclosure */}
      <p className="mt-10 text-[11px] text-slate-400 text-center max-w-2xl mx-auto">
        Advisor profiles are for demonstration purposes only. Ratings, reviews, and bios are mock
        data. Firmum does not make investment or advisor recommendations.
      </p>
    </div>
  );
}
