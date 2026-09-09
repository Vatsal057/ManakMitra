import React, { useState, useMemo } from 'react';
import {
  Filter,
  ArrowUpDown,
  Download,
  FlaskConical,
  CheckSquare,
  AlertTriangle,
  SearchX,
  ShieldAlert
} from 'lucide-react';
import { RecommendedStandard } from '../types/standards';
import { StandardCard } from './StandardCard';

interface ResultsListProps {
  standards: RecommendedStandard[];
  query: string;
  onNavigateToLabs?: () => void;
  isDemoFallback?: boolean;
  // Backend's abstention verdict for the query as a whole (dense-cosine
  // signal, not the fused RRF score -- see RetrievalIndex.compute_confidence).
  abstained?: boolean;
  abstainReason?: string | null;
  confidenceSignal?: number;
  // Graded band from the same gate: "high" | "moderate" | "low". `abstained`
  // is true only for "low" -- "moderate" must still render as its own
  // visibly distinct state, not fall back to looking like "high" just
  // because it isn't a hard abstention.
  confidenceBand?: 'high' | 'moderate' | 'low';
}

export const ResultsList: React.FC<ResultsListProps> = ({
  standards,
  query,
  onNavigateToLabs,
  isDemoFallback = false,
  abstained = false,
  abstainReason = null,
  confidenceSignal,
  confidenceBand = 'high',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCert, setSelectedCert] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'number'>('relevance');

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    standards.forEach(s => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [standards]);

  // Extract unique certification badges
  const certBadges = useMemo(() => {
    const set = new Set<string>();
    standards.forEach(s => {
      if (s.certification_badge) set.add(s.certification_badge);
    });
    return Array.from(set);
  }, [standards]);

  // Filtered & Sorted list
  const filteredStandards = useMemo(() => {
    return standards
      .filter(s => {
        if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
        if (selectedCert !== 'all' && s.certification_badge !== selectedCert) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'number') {
          return a.standard_number.localeCompare(b.standard_number);
        }
        return (b.similarity_score || 0) - (a.similarity_score || 0);
      });
  }, [standards, selectedCategory, selectedCert, sortBy]);

  const handleExportJson = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      portal: 'Manak Mitra - Bureau of Indian Standards Intelligence',
      specification_query: query,
      total_recommendations: filteredStandards.length,
      recommendations: filteredStandards,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Manak_Mitra_Standards_Schedule_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-5 my-8">

      {/* Demo-data banner -- persistent for as long as fallback results are
          shown. Must never be mistaken for live backend output; not a
          toast, not a console warning, stays on screen. */}
      {isDemoFallback && (
        <div
          role="alert"
          className="bg-amber-400 text-amber-950 rounded-xl p-4 shadow-card flex items-center gap-3 border-2 border-amber-500"
        >
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div className="text-sm sm:text-base font-extrabold">
            Demo data — backend unreachable. These results are illustrative sample standards, not a live catalogue match.
          </div>
        </div>
      )}

      {/* Abstention state -- shown above the results, not folded into them.
          Near-misses stay listed below (a procurement officer may want to
          see them) but are visibly marked as "no strong match" rather than
          presented as confident recommendations. */}
      {abstained && !isDemoFallback && (
        <div
          role="alert"
          className="bg-uber-gray100 border-2 border-dashed border-uber-gray400 rounded-xl p-4 shadow-base flex items-start gap-3"
        >
          <SearchX className="w-5 h-5 text-uber-gray600 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm sm:text-base font-extrabold text-uber-black">
              No strong match in our corpus
            </div>
            <p className="text-xs sm:text-sm text-uber-gray700 mt-0.5">
              {abstainReason || 'None of the indexed standards scored above our confidence threshold for this query.'}
              {' '}The standards below are the closest matches found, shown for reference -- treat them as
              leads to verify, not as a confirmed recommendation.
              {typeof confidenceSignal === 'number' && (
                <span className="font-mono text-uber-gray500"> (best match confidence: {(confidenceSignal * 100).toFixed(0)}%)</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Moderate-confidence state -- distinct from both the "high" success
          header below (black) and the "low" no-match state above (grey,
          dashed border). Amber signals "worth a second look," not "no
          match" and not "confirmed" -- results are still shown at full
          strength, just flagged for review. */}
      {confidenceBand === 'moderate' && !abstained && !isDemoFallback && (
        <div
          role="status"
          className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 shadow-base flex items-start gap-3"
        >
          <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm sm:text-base font-extrabold text-amber-900">
              Moderate confidence — review these against your requirement
            </div>
            <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
              These results are plausible matches but scored below our high-confidence bar.
              {typeof confidenceSignal === 'number' && (
                <span className="font-mono text-amber-700"> (best match confidence: {(confidenceSignal * 100).toFixed(0)}%)</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Procurement Compliance Banner (Uber Base styling) */}
      <div className="bg-uber-black text-white rounded-xl p-5 sm:p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-5 border border-uber-gray700">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-black uppercase tracking-widest text-amber-400">
              Procurement Audit Summary
            </span>
            <span className="bg-uber-gray800 text-white text-xs px-2.5 py-0.5 rounded-full font-mono border border-uber-gray600">
              {standards.length} Standards Identified
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1.5 tracking-tight">
            Mandated Indian Standards &amp; Quality Specifications
          </h2>
          <p className="text-sm text-uber-gray300 mt-1 max-w-2xl leading-relaxed">
            Public tenders must stipulate relevant IS specifications. Standards under mandatory Quality Control Orders (QCO) require valid BIS certification prior to supply.
          </p>
        </div>

        {/* Actions button group */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-center shrink-0">
          {onNavigateToLabs && (
            <button
              onClick={onNavigateToLabs}
              className="flex items-center gap-2 px-4 py-2.5 bg-uber-blue hover:bg-uber-blueHover text-white text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer shadow-base"
              title="Find BIS recognized laboratories for testing"
            >
              <FlaskConical className="w-4 h-4" />
              <span>Find Testing Labs</span>
            </button>
          )}

          <button
            onClick={handleExportJson}
            className="flex items-center gap-2 px-4 py-2.5 bg-uber-gray800 hover:bg-uber-gray700 text-white text-xs sm:text-sm font-bold rounded-lg border border-uber-gray600 transition-colors cursor-pointer"
            title="Export recommendations to JSON"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export Schedule</span>
          </button>
        </div>
      </div>

      {/* Filter and Sorting Toolbar - ENLARGED */}
      <div className="bg-uber-white rounded-xl border-2 border-uber-gray200 p-4 sm:p-5 shadow-base flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-sm">
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-uber-black font-bold">
            <Filter className="w-4 h-4 text-uber-black" />
            <span>Filter By:</span>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-uber-gray50 border-2 border-uber-gray300 hover:border-uber-black text-uber-black rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">All Disciplines ({standards.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Certification Badge Filter */}
          <select
            value={selectedCert}
            onChange={(e) => setSelectedCert(e.target.value)}
            className="bg-uber-gray50 border-2 border-uber-gray300 hover:border-uber-black text-uber-black rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">All Certification Schemes</option>
            {certBadges.map((cert) => (
              <option key={cert} value={cert}>
                {cert}
              </option>
            ))}
          </select>

          {(selectedCategory !== 'all' || selectedCert !== 'all') && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedCert('all');
              }}
              className="text-xs sm:text-sm text-uber-blue hover:text-uber-blueHover underline font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Sort & Count */}
        <div className="flex items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-uber-gray200">
          <span className="text-uber-gray600 text-xs sm:text-sm">
            Showing <strong className="text-uber-black font-bold">{filteredStandards.length}</strong> of {standards.length} standards
          </span>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-uber-gray500" />
            <span className="text-uber-black font-bold text-xs sm:text-sm">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-uber-gray50 border-2 border-uber-gray300 hover:border-uber-black text-uber-black rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none cursor-pointer"
            >
              <option value="relevance">Similarity Score (High to Low)</option>
              <option value="number">IS Standard Number (A to Z)</option>
            </select>
          </div>
        </div>

      </div>

      {/* Standards Card List */}
      <div className="space-y-4">
        {filteredStandards.map((standard, index) => (
          <StandardCard
            key={`${standard.standard_number}-${index}`}
            standard={standard}
            rank={index + 1}
          />
        ))}

        {filteredStandards.length === 0 && (
          <div className="bg-uber-white rounded-xl border-2 border-uber-gray200 p-10 text-center text-uber-gray600 text-sm">
            No standards match the selected category or certification filter.
          </div>
        )}
      </div>

    </section>
  );
};
