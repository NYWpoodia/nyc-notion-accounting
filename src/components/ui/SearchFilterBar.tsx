import React from 'react';
import { Search, Filter, X } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  categories?: FilterOption[];
  selectedStatus?: string;
  onStatusChange?: (status: string) => void;
  statuses?: FilterOption[];
  viewMode?: 'table' | 'grid';
  onViewModeChange?: (mode: 'table' | 'grid') => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  selectedStatus,
  onStatusChange,
  statuses,
  placeholder = 'ค้นหาด้วยชื่อ, สัญญา, เบอร์โทร...',
  children,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-notion-card-light dark:bg-notion-card-dark p-3 rounded-xl border border-notion-border-light dark:border-notion-border-dark shadow-notion-sm">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-notion-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain placeholder-notion-text-muted focus:outline-none focus:ring-1 focus:ring-notion-accent-blue"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-notion-text-muted hover:text-notion-text-main"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Dropdowns & Children Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {onCategoryChange && (
          <select
            value={selectedCategory || ''}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain focus:outline-none cursor-pointer shrink-0"
          >
            <option value="">ทุกหมวดสินค้า</option>
            {categories
              ? categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))
              : [
                  <option key="มือถือ" value="มือถือ">มือถือ</option>,
                  <option key="รถมอเตอร์ไซด์" value="รถมอเตอร์ไซด์">รถมอเตอร์ไซด์</option>,
                  <option key="เครื่องใช้ไฟฟ้า" value="เครื่องใช้ไฟฟ้า">เครื่องใช้ไฟฟ้า</option>,
                ]}
          </select>
        )}

        {onStatusChange && (
          <select
            value={selectedStatus || ''}
            onChange={(e) => onStatusChange(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg bg-notion-sidebar-light dark:bg-notion-sidebar-dark border border-notion-border-light dark:border-notion-border-dark text-notion-text-main dark:text-notion-text-darkMain focus:outline-none cursor-pointer shrink-0"
          >
            <option value="">ทุกสถานะ D-Bucket</option>
            {statuses
              ? statuses.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))
              : [
                  <option key="D0" value="D0 ชำระปกติ">D0 ชำระปกติ</option>,
                  <option key="D1" value="D1 ค้างชำระ 1 เดือน">D1 ค้างชำระ 1 เดือน</option>,
                  <option key="D2" value="D2 ค้างชำระ 2 เดือน">D2 ค้างชำระ 2 เดือน</option>,
                  <option key="D3" value="D3 ค้างชำระ 3 เดือน">D3 ค้างชำระ 3 เดือน</option>,
                  <option key="D4" value="D4 ค้างชำระ 4 เดือน">D4 ค้างชำระ 4 เดือน</option>,
                  <option key="D5" value="D5 ค้างชำระ 5 เดือน">D5 ค้างชำระ 5 เดือน</option>,
                  <option key="D6" value="D6 ค้างชำระ 6 เดือน">D6 ค้างชำระ 6 เดือน</option>,
                ]}
          </select>
        )}

        {children}
      </div>
    </div>
  );
};
