import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ShieldCheck,
  Award,
  FileCheck2,
  Layers,
  ExternalLink,
  Tag,
  Landmark,
  HelpCircle,
  FileSearch,
  History
} from 'lucide-react';
import { RecommendedStandard, CertificationType } from '../types/standards';
import { AlliedStandards } from './AlliedStandards';

interface StandardCardProps {
  standard: RecommendedStandard;
  rank: number;
}

export const StandardCard: React.FC<StandardCardProps> = ({ standard, rank }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyStandardNumber = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(standard.standard_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Relevance percentage calculation
  const scorePercent = Math.round(
    standard.similarity_score > 1.0 
      ? standard.similarity_score 
      : standard.similarity_score * 100
  );

  // Dynamic colors for relevance score following Uber Base semantic palette
  const getScoreColorInfo = (score: number) => {
    if (score >= 85) {
      return {
        barBg: 'bg-uber-green',
        text: 'text-uber-green',
        bg: 'bg-uber-greenLight',
        border: 'border-emerald-300',
        label: 'High Match',
      };
    }
    if (score >= 70) {
      return {
        barBg: 'bg-uber-blue',
        text: 'text-uber-blue',
        bg: 'bg-uber-blueLight',
        border: 'border-blue-200',
        label: 'Strong Match',
      };
    }
    return {
      barBg: 'bg-uber-gray600',
      text: 'text-uber-gray700',
      bg: 'bg-uber-gray100',
      border: 'border-uber-gray300',
      label: 'Supplementary Match',
    };
  };

  const scoreInfo = getScoreColorInfo(scorePercent);

  // Badge styling based on official BIS certification schemes (enlarged text)
  const renderCertificationBadge = (cert: CertificationType | string) => {
    switch (cert) {
      case 'BIS Product Certification':
        return (
          <span 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs sm:text-sm font-bold bg-uber-black text-white border border-black shadow-xs"
            title="Conforms to Scheme I: BIS Product Certification (ISI Mark)"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>BIS ISI Product Certification</span>
          </span>
        );
      case 'CRS':
        return (
          <span 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs sm:text-sm font-bold bg-purple-900 text-white border border-purple-950 shadow-xs"
            title="Conforms to Scheme II: Compulsory Registration Scheme for Electronics & IT"
          >
            <Award className="w-4 h-4 text-purple-300" />
            <span>CRS (Compulsory Registration)</span>
          </span>
        );
      case 'Hallmarking':
        return (
          <span 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs sm:text-sm font-bold bg-amber-500 text-black border border-amber-600 shadow-xs"
            title="Conforms to Scheme IV: Hallmarking of Precious Metals with HUID"
          >
            <FileCheck2 className="w-4 h-4 text-black" />
            <span>Hallmarking (HUID Certified)</span>
          </span>
        );
      case 'None':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs sm:text-sm font-semibold bg-uber-gray100 text-uber-gray700 border border-uber-gray300"
            title="Confirmed outside any BIS Quality Control Order"
          >
            <Layers className="w-4 h-4 text-uber-gray500" />
            <span>Voluntary Standard</span>
          </span>
        );
      case 'Not determined':
      default:
        // Deliberately NOT styled like the pass/voluntary badge above --
        // this means nobody has checked, not that a check came back clear.
        return (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs sm:text-sm font-semibold bg-amber-50 text-amber-900 border-2 border-dashed border-amber-300"
            title="Certification requirement has not been assessed for this standard"
          >
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>Certification: Not Determined</span>
          </span>
        );
    }
  };

  return (
    <article className="bg-uber-white rounded-xl border-2 border-uber-gray200 hover:border-uber-black shadow-card hover:shadow-card-hover transition-all duration-200 overflow-hidden">
      <div className="p-5 sm:p-7">
        
        {/* Top Header Row: Rank, Standard Number, Category, Pub Year, Certification Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-uber-gray200">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Rank badge */}
            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-uber-black text-white font-extrabold text-sm shadow-xs">
              #{rank}
            </span>

            {/* Standard Number with copy button - ENLARGED */}
            <div className="flex items-center bg-uber-gray100 hover:bg-uber-gray200 px-3 py-1.5 rounded-lg border border-uber-gray300 transition-colors">
              <span className="font-mono text-base sm:text-lg font-bold text-uber-black tracking-tight">
                {standard.standard_number}
              </span>
              <button
                onClick={handleCopyStandardNumber}
                className="ml-2.5 text-uber-gray500 hover:text-uber-black p-1 rounded transition-colors cursor-pointer"
                title="Copy standard number to clipboard"
                aria-label="Copy standard number"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-uber-green" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Category tag - ENLARGED */}
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold bg-uber-gray50 text-uber-black px-3 py-1.5 rounded-md border border-uber-gray300">
              <Tag className="w-3.5 h-3.5 text-uber-gray500" />
              {standard.category}
            </span>

            {standard.year_published && (
              <span className="text-xs sm:text-sm text-uber-gray600 font-mono font-medium">
                Published: {standard.year_published}
              </span>
            )}
          </div>

          {/* Certification Badge */}
          <div className="self-start sm:self-center shrink-0">
            {renderCertificationBadge(standard.certification_badge)}
          </div>
        </div>

        {/* Title - ENLARGED */}
        <div className="mt-4">
          <h3 className="text-lg sm:text-xl font-extrabold text-uber-black leading-snug tracking-tight">
            {standard.title}
          </h3>

          {/* Scope description - ENLARGED */}
          {standard.scope_description && (
            <p className="mt-2.5 text-sm sm:text-base text-uber-gray700 leading-relaxed font-normal">
              {standard.scope_description}
            </p>
          )}
        </div>

        {/* Source section -- only what the dataset actually supplied. No
            constructed portal URL, no fabricated issuing authority: a dead
            link presented as an official source is worse than no link. */}
        {(standard.source || standard.source_url) && (
          <div className="mt-4 p-3.5 sm:p-4 bg-uber-gray50 rounded-lg border border-uber-gray300">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2 text-xs sm:text-sm">
                <Landmark className="w-4 h-4 text-uber-black mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-uber-black">Source:</span>{' '}
                  <span className="text-uber-gray700">{standard.source || 'Bureau of Indian Standards catalogue'}</span>
                </div>
              </div>

              {standard.source_url && (
                <a
                  href={standard.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-uber-blue hover:text-uber-blueHover hover:underline shrink-0"
                >
                  <span>View source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Provenance strip -- compact and secondary by design. The
            recommendation comes first; these are what to check on
            inspection, not the headline of the card. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] sm:text-xs text-uber-gray600">
          {standard.scope_source && (
            <span className="inline-flex items-center gap-1" title={
              standard.scope_source === 'scraped'
                ? 'Scope text extracted from the original standard document'
                : standard.scope_source === 'drafted'
                ? 'Scope text written by a human reviewer; the original could not be scraped'
                : 'No independent scope text found -- falls back to the title'
            }>
              <FileSearch className="w-3.5 h-3.5 shrink-0" />
              <span>
                Scope: {standard.scope_source === 'scraped' ? 'scraped from source' : standard.scope_source === 'drafted' ? 'human-drafted' : 'title fallback'}
              </span>
            </span>
          )}

          {standard.latest_version && (
            <span className="inline-flex items-center gap-1" title="Published edition on record, derived from the year_published field -- not a check for a newer revision">
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>Edition on record: {standard.latest_version}</span>
            </span>
          )}

          {standard.certification_source && standard.certification_source !== 'not_assessed' && (
            <span className="inline-flex items-center gap-1" title={standard.qco_reference || undefined}>
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>
                Certification basis: {standard.certification_source.replace(/_/g, ' ')}
                {standard.qco_reference ? ` — ${standard.qco_reference}` : ''}
              </span>
            </span>
          )}
        </div>

        {/* Similarity Score Bar */}
        <div className="mt-4 pt-3.5 border-t border-uber-gray200 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">

          {/* Similarity / Relevance Score Gauge */}
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
              <span className="font-bold text-uber-black">Relevance Match Score</span>
              <div className="flex items-center gap-1.5 font-bold">
                <span className={`${scoreInfo.text} text-sm sm:text-base`}>{scorePercent}%</span>
                <span className={`text-xs px-2 py-0.5 rounded-md border font-bold ${scoreInfo.bg} ${scoreInfo.text} ${scoreInfo.border}`}>
                  {scoreInfo.label}
                </span>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-uber-gray200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${scoreInfo.barBg}`}
                style={{ width: `${Math.max(6, scorePercent)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Action Button: Expand Allied & Normative Standards */}
        <div className="mt-4 pt-3 border-t border-uber-gray100 flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-uber-black hover:bg-uber-gray100 active:bg-uber-gray200 px-4 py-2 rounded-lg border border-uber-gray300 transition-all cursor-pointer"
            aria-expanded={isExpanded}
          >
            <Layers className="w-4 h-4 text-uber-blue" />
            <span>
              {isExpanded ? 'Hide Allied & Normative Standards' : 'View Allied & Normative Standards'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <span className="text-xs text-uber-gray500 font-mono">
            Catalogue Ref: <strong className="text-uber-black">{standard.standard_number}</strong>
          </span>
        </div>

        {/* Expandable Allied & Normative Standards Section */}
        <AlliedStandards
          standardNumber={standard.standard_number}
          isExpanded={isExpanded}
        />

      </div>
    </article>
  );
};
