import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  ShieldAlert, 
  BookOpen, 
  Wrench, 
  FileText, 
  Loader2, 
  AlertCircle, 
  Copy, 
  Check, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { AlliedStandardsGrouped, AlliedStandard, RelationshipType } from '../types/standards';
import { fetchAlliedStandards } from '../services/api';

interface AlliedStandardsProps {
  standardNumber: string;
  isExpanded: boolean;
}

interface GroupMetadata {
  id: RelationshipType;
  title: string;
  description: string;
  icon: React.ElementType;
  badgeBg: string;
  badgeText: string;
  borderAccent: string;
}

const GROUPS: GroupMetadata[] = [
  {
    id: 'test_method',
    title: 'Test Method Standards',
    description: 'Protocols for testing, laboratory sampling, chemical analysis, and verification.',
    icon: FlaskConical,
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    borderAccent: 'border-l-blue-500',
  },
  {
    id: 'safety',
    title: 'Safety & Protection Standards',
    description: 'Mandatory fire resistance, dielectric limits, hazard safeguards, and PPE.',
    icon: ShieldAlert,
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    borderAccent: 'border-l-rose-500',
  },
  {
    id: 'terminology',
    title: 'Terminology & Definitions',
    description: 'Standardized engineering vocabulary, classifications, and nomenclature.',
    icon: BookOpen,
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    borderAccent: 'border-l-amber-500',
  },
  {
    id: 'installation',
    title: 'Installation & Code of Practice',
    description: 'Engineering codes for on-site laying, mounting, workmanship, and commissioning.',
    icon: Wrench,
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-800',
    borderAccent: 'border-l-teal-500',
  },
  {
    id: 'normative_reference',
    title: 'Normative References',
    description: 'Foundational parent standards and raw material specifications cited in the code.',
    icon: FileText,
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    borderAccent: 'border-l-purple-500',
  },
];

export const AlliedStandards: React.FC<AlliedStandardsProps> = ({
  standardNumber,
  isExpanded,
}) => {
  const [data, setData] = useState<AlliedStandardsGrouped | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<RelationshipType | 'all'>('all');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!isExpanded) return;
    if (data) return; // Already loaded

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchAlliedStandards(standardNumber)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to fetch allied standards');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isExpanded, standardNumber, data]);

  const handleCopy = (num: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 1800);
  };

  if (!isExpanded) return null;

  const totalCount = data
    ? Object.values(data).reduce((acc, curr) => acc + curr.length, 0)
    : 0;

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50/60 rounded-b-xl -mx-5 -mb-5 p-5 transition-all">
      {/* Top Banner with Relationship Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h4 className="text-sm font-bold text-gov-900 flex items-center gap-2">
            <span>Allied & Normative Standards for {standardNumber}</span>
            <span className="text-[11px] font-semibold bg-gov-100 text-gov-800 px-2 py-0.5 rounded-full border border-gov-200">
              {loading ? 'Fetching...' : `${totalCount} Standards Referenced`}
            </span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Classified under Section 10 of Bureau of Indian Standards Rules for comprehensive procurement compliance.
          </p>
        </div>

        {/* Group Filter Chips */}
        {data && totalCount > 0 && (
          <div className="flex items-center flex-wrap gap-1">
            <button
              onClick={() => setActiveGroup('all')}
              className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${
                activeGroup === 'all'
                  ? 'bg-gov-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              All ({totalCount})
            </button>
            {GROUPS.map((grp) => {
              const count = data[grp.id]?.length || 0;
              if (count === 0) return null;
              return (
                <button
                  key={grp.id}
                  onClick={() => setActiveGroup(grp.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                    activeGroup === grp.id
                      ? 'bg-gov-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <grp.icon className="w-3 h-3" />
                  <span>{grp.title.split(' ')[0]}</span>
                  <span className="opacity-70 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-8 flex flex-col items-center justify-center text-center bg-white rounded-lg border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin text-gov-700 mb-2" />
          <p className="text-xs font-semibold text-slate-700">
            Querying technical relationships for <span className="font-mono">{standardNumber}</span>...
          </p>
          <span className="text-[11px] text-slate-400 mt-1">
            Inspecting test methods, safety specs, terminology & normative citations via /allied/{standardNumber}
          </span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Unable to fetch allied standards from backend</p>
            <p className="text-rose-700 mt-0.5">{error}</p>
            <button
              onClick={() => {
                setData(null);
                setLoading(true);
                fetchAlliedStandards(standardNumber).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
              }}
              className="mt-2 text-[11px] font-semibold underline text-rose-900 hover:text-rose-950"
            >
              Retry request
            </button>
          </div>
        </div>
      )}

      {/* Grouped Standards Listing */}
      {data && !loading && (
        <div className="space-y-4">
          {GROUPS.map((grp) => {
            if (activeGroup !== 'all' && activeGroup !== grp.id) {
              return null;
            }

            const items: AlliedStandard[] = data[grp.id] || [];
            if (items.length === 0) return null;

            const IconComponent = grp.icon;

            return (
              <div key={grp.id} className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                {/* Group Sub-Header */}
                <div className={`px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between border-l-4 ${grp.borderAccent}`}>
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800 tracking-tight">
                      {grp.title}
                    </span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      — {grp.description}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${grp.badgeBg} ${grp.badgeText}`}>
                    {items.length} {items.length === 1 ? 'standard' : 'standards'}
                  </span>
                </div>

                {/* Items in this group */}
                <div className="divide-y divide-slate-100">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="p-3.5 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-gov-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.standard_number}
                          </span>

                          <button
                            onClick={(e) => handleCopy(item.standard_number, e)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-200 transition-colors"
                            title="Copy standard code"
                          >
                            {copiedNumber === item.standard_number ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>

                          {item.is_mandatory && (
                            <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
                              Mandatory Verification
                            </span>
                          )}
                        </div>

                        <h5 className="text-xs font-semibold text-slate-800 mt-1 leading-snug">
                          {item.title}
                        </h5>

                        {item.description && (
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Right relationship indicator */}
                      <div className="sm:self-center shrink-0">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1">
                          <ChevronRight className="w-2.5 h-2.5" />
                          {item.relationship_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
