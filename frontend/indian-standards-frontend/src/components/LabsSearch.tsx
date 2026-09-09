import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Building2, 
  Phone, 
  Mail, 
  User, 
  Calendar, 
  ExternalLink, 
  Filter, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  Table as TableIcon,
  LayoutGrid,
  CheckCircle2
} from 'lucide-react';
import { ALL_BIS_LABS, BisLab } from '../data/bisLabsData';
import { BisLabsMapSection } from './BisLabsMapSection';

interface LabsSearchProps {
  onOpenMapModal?: () => void;
  selectedStateFromMap?: string;
  onClearStateSelection?: () => void;
}

const ITEMS_PER_PAGE = 12;

const POPULAR_HUBS = [
  'Delhi',
  'Noida',
  'Gurugram',
  'Mumbai',
  'Pune',
  'Bengaluru',
  'Chennai',
  'Ahmedabad',
  'Hyderabad',
  'Kolkata',
  'Faridabad',
  'Sonipat',
  'Jaipur',
  'Ludhiana',
  'Kanpur',
  'Bhopal',
];

export const LabsSearch: React.FC<LabsSearchProps> = ({
  selectedStateFromMap,
  onClearStateSelection,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>(selectedStateFromMap || 'all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sync state if selected from map
  React.useEffect(() => {
    if (selectedStateFromMap) {
      setSelectedState(selectedStateFromMap);
      setCurrentPage(1);
    }
  }, [selectedStateFromMap]);

  // Extract unique states with lab counts
  const stateCounts = useMemo(() => {
    const map = new Map<string, number>();
    ALL_BIS_LABS.forEach((lab) => {
      const st = lab.state || 'Other';
      map.set(st, (map.get(st) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, []);

  // Filtered labs
  const filteredLabs = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return ALL_BIS_LABS.filter((lab) => {
      // State filter
      if (selectedState !== 'all' && lab.state !== selectedState) {
        return false;
      }
      // Text search: matches name, code, address, city, state, contact person, email, phone
      if (q) {
        const matchesName = lab.name.toLowerCase().includes(q);
        const matchesCode = lab.code.toLowerCase().includes(q);
        const matchesAddress = lab.address.toLowerCase().includes(q);
        const matchesCity = lab.city.toLowerCase().includes(q);
        const matchesState = lab.state.toLowerCase().includes(q);
        const matchesContact = (lab.contactPerson || '').toLowerCase().includes(q);
        const matchesEmail = (lab.email || '').toLowerCase().includes(q);
        const matchesPincode = (lab.pincode || '').includes(q);
        return matchesName || matchesCode || matchesAddress || matchesCity || matchesState || matchesContact || matchesEmail || matchesPincode;
      }
      return true;
    });
  }, [searchTerm, selectedState]);

  // Pagination
  const totalPages = Math.ceil(filteredLabs.length / ITEMS_PER_PAGE);
  const paginatedLabs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLabs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLabs, currentPage]);

  const handleStateChange = (st: string) => {
    setSelectedState(st);
    setCurrentPage(1);
    if (st === 'all' && onClearStateSelection) {
      onClearStateSelection();
    }
  };

  const handleLocationChipClick = (city: string) => {
    setSearchTerm(city);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedState('all');
    setCurrentPage(1);
    if (onClearStateSelection) {
      onClearStateSelection();
    }
  };

  return (
    <div className="space-y-8 my-6">
      
      {/* 1. Interactive BIS Labs Map Section — Minimized by default, visible & can be maximized anytime */}
      <BisLabsMapSection
        selectedState={selectedState !== 'all' ? selectedState : undefined}
        onStateSelect={(st) => {
          setSelectedState(st);
          setCurrentPage(1);
        }}
      />

      {/* 2. Search & Location Filter Toolbar (Uber Base Design System) */}
      <div className="bg-uber-white rounded-xl border-2 border-uber-gray200 p-5 sm:p-7 shadow-card space-y-5">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-uber-gray200">
          <div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-uber-black tracking-tight">
              Laboratory Search &amp; Location Directory
            </h3>
            <p className="text-sm sm:text-base text-uber-gray600 mt-0.5 font-medium">
              Search recognized facilities by city, state, district, pin code, or specific lab code
            </p>
          </div>

          {/* Table vs Card View Toggle (Uber Base Data Table pattern) */}
          <div className="inline-flex p-1 bg-uber-gray100 rounded-lg border border-uber-gray300 text-xs sm:text-sm font-semibold self-start md:self-center">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-uber-black text-white shadow-base font-bold'
                  : 'text-uber-gray700 hover:text-uber-black'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Card View</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-uber-black text-white shadow-base font-bold'
                  : 'text-uber-gray700 hover:text-uber-black'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Data Table</span>
            </button>
          </div>
        </div>

        {/* Search Input and State Selector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Main Search Input - Enlarged */}
          <div className="md:col-span-8 relative">
            <Search className="w-5 h-5 text-uber-gray500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Enter location (e.g. Noida, Sonipat, Chennai, Mumbai) or Lab Code (e.g. 8102006)..."
              className="w-full pl-12 pr-10 py-3.5 bg-uber-gray50 hover:bg-white focus:bg-white border-2 border-uber-gray300 focus:border-uber-black rounded-lg text-base sm:text-lg text-uber-black placeholder-uber-gray400 focus:outline-none transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-uber-gray400 hover:text-uber-black rounded"
                title="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* State Select Dropdown - Enlarged */}
          <div className="md:col-span-4">
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full py-3.5 px-4 bg-uber-gray50 hover:bg-white focus:bg-white border-2 border-uber-gray300 focus:border-uber-black rounded-lg text-base sm:text-lg font-bold text-uber-black focus:outline-none cursor-pointer transition-all"
            >
              <option value="all">All India (431 Labs)</option>
              {stateCounts.map(([st, count]) => (
                <option key={st} value={st}>
                  {st} ({count} Labs)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Location Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-uber-gray200 text-xs sm:text-sm">
          <span className="text-uber-gray700 font-extrabold uppercase tracking-wider text-xs flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-uber-black" />
            <span>Popular Testing Hubs:</span>
          </span>
          {POPULAR_HUBS.map((hub) => (
            <button
              key={hub}
              onClick={() => handleLocationChipClick(hub)}
              className={`px-3 py-1.5 rounded-md border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                searchTerm.toLowerCase() === hub.toLowerCase()
                  ? 'bg-uber-black text-white border-uber-black font-bold'
                  : 'bg-uber-gray50 text-uber-black border-uber-gray300 hover:border-uber-black'
              }`}
            >
              {hub}
            </button>
          ))}

          {(searchTerm || selectedState !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="ml-auto text-xs sm:text-sm text-uber-blue hover:text-uber-blueHover hover:underline font-bold cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>

      </div>

      {/* Results Count & Meta Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm sm:text-base">
        <div className="text-uber-gray700 font-medium">
          Showing <strong className="text-uber-black font-extrabold text-lg">{filteredLabs.length}</strong> recognized laboratories
          {selectedState !== 'all' && (
            <span> in <strong className="text-uber-black font-bold">{selectedState}</strong></span>
          )}
          {searchTerm && (
            <span> matching <strong className="text-uber-black font-bold">"{searchTerm}"</strong></span>
          )}
        </div>

        <div className="text-xs sm:text-sm text-uber-gray600 font-mono font-bold">
          Page {currentPage} of {totalPages || 1}
        </div>
      </div>

      {/* 3A. DATA TABLE VIEW (Uber Base System guidance for dense tabular data) */}
      {viewMode === 'table' && (
        <div className="bg-uber-white rounded-xl border-2 border-uber-gray200 shadow-card overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-uber-black text-white text-xs sm:text-sm font-extrabold tracking-wide uppercase">
                <th className="py-3.5 px-4 font-mono">Code</th>
                <th className="py-3.5 px-4">Laboratory Name</th>
                <th className="py-3.5 px-4">State / Location</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Validity</th>
                <th className="py-3.5 px-4 text-right">Testing Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-uber-gray200 text-sm sm:text-base text-uber-black">
              {paginatedLabs.map((lab) => (
                <tr key={lab.id || lab.code} className="hover:bg-uber-gray50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-uber-black text-sm whitespace-nowrap">
                    {lab.code || 'BIS-REC'}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-uber-black min-w-[260px]">
                    <div>{lab.name}</div>
                    <div className="text-xs text-uber-gray600 mt-1 font-normal line-clamp-1">{lab.address}</div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-bold text-uber-black">{lab.city || 'City N/A'}</span>
                    <span className="text-uber-gray600 text-xs block font-medium">{lab.state}</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs sm:text-sm whitespace-nowrap">
                    {lab.contactPerson && <div className="font-medium text-uber-black">{lab.contactPerson}</div>}
                    {lab.phone && <div className="text-uber-gray600 font-mono">{lab.phone}</div>}
                    {lab.email && <div className="text-uber-blue font-mono text-xs">{lab.email}</div>}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {lab.validity && lab.validity !== '-' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-uber-green bg-uber-greenLight px-2 py-1 rounded border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{lab.validity}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-uber-gray500 font-medium">Active Record</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {lab.scopeUrl ? (
                      <a
                        href={lab.scopeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-uber-black text-white hover:bg-uber-gray800 rounded text-xs sm:text-sm font-bold transition-colors"
                      >
                        <span>View Scope</span>
                        <ExternalLink className="w-3 h-3 text-amber-400" />
                      </a>
                    ) : (
                      <span className="text-xs text-uber-gray400">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3B. CARD VIEW */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {paginatedLabs.map((lab) => (
            <article 
              key={lab.id || lab.code}
              className="bg-uber-white rounded-xl border-2 border-uber-gray200 hover:border-uber-black shadow-card hover:shadow-card-hover p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between space-y-4"
            >
              <div>
                {/* Top Row: Lab Code, State & City, Validity */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-uber-gray200">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs sm:text-sm font-bold bg-uber-gray100 text-uber-black px-2.5 py-1 rounded-md border border-uber-gray300">
                      Code: {lab.code || 'BIS-REC'}
                    </span>
                    
                    <span className="text-xs sm:text-sm font-bold bg-uber-black text-white px-2.5 py-1 rounded-md flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>{lab.city ? `${lab.city}, ` : ''}{lab.state}</span>
                    </span>
                  </div>

                  {lab.validity && lab.validity !== '-' && (
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-uber-green bg-uber-greenLight px-3 py-1 rounded-md border border-emerald-300 shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Valid: {lab.validity}</span>
                    </div>
                  )}
                </div>

                {/* Lab Name - Enlarged */}
                <h4 className="text-lg sm:text-xl font-extrabold text-uber-black leading-snug tracking-tight mt-3">
                  {lab.name}
                </h4>
                
                {/* Full Address */}
                <p className="mt-2 text-xs sm:text-sm text-uber-gray700 leading-relaxed font-normal flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-uber-gray500 mt-0.5 shrink-0" />
                  <span>{lab.address}</span>
                </p>
              </div>

              {/* Contact Details & Scope Action */}
              <div className="pt-3.5 border-t border-uber-gray100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="space-y-1 text-uber-gray700 font-medium">
                  {lab.contactPerson && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-uber-gray500 shrink-0" />
                      <span className="font-semibold text-uber-black">{lab.contactPerson}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 flex-wrap">
                    {lab.phone && (
                      <a
                        href={`tel:${lab.phone.replace(/[^0-9+]/g, '')}`}
                        className="flex items-center gap-1.5 text-uber-blue hover:underline font-semibold"
                      >
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{lab.phone}</span>
                      </a>
                    )}

                    {lab.email && (
                      <a
                        href={`mailto:${lab.email}`}
                        className="flex items-center gap-1.5 text-uber-blue hover:underline font-semibold"
                      >
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-[200px]">{lab.email}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Official BIS Scope Button */}
                {lab.scopeUrl && (
                  <a
                    href={lab.scopeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-uber-black hover:bg-uber-gray800 text-white rounded-lg font-bold text-xs sm:text-sm transition-colors shrink-0 shadow-base cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Official Testing Scope (PDF)</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Empty Filter State */}
      {filteredLabs.length === 0 && (
        <div className="bg-uber-white rounded-xl border-2 border-uber-gray200 p-12 text-center text-uber-gray700 text-base font-medium shadow-card space-y-3">
          <p className="font-bold text-lg text-uber-black">No laboratories found matching your criteria.</p>
          <p className="text-uber-gray600">Try searching for a nearby district, clearing your keywords, or switching to "All India".</p>
          <button
            onClick={handleClearFilters}
            className="px-5 py-2.5 bg-uber-black text-white rounded-lg font-bold text-sm shadow-base hover:bg-uber-gray800 cursor-pointer"
          >
            Reset Filters &amp; View All 431 Labs
          </button>
        </div>
      )}

      {/* Pagination Controls - Enlarged & Crisp */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-5 border-t-2 border-uber-gray200">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm sm:text-base font-bold border-2 transition-all cursor-pointer ${
              currentPage === 1
                ? 'border-uber-gray200 text-uber-gray400 cursor-not-allowed'
                : 'border-uber-gray300 hover:border-uber-black text-uber-black bg-white shadow-base'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-sm sm:text-base font-bold text-uber-black font-mono">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm sm:text-base font-bold border-2 transition-all cursor-pointer ${
              currentPage === totalPages
                ? 'border-uber-gray200 text-uber-gray400 cursor-not-allowed'
                : 'border-uber-gray300 hover:border-uber-black text-uber-black bg-white shadow-base'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
