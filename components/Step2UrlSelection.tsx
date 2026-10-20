'use client';

import React, { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import type { CrawlerItem } from '../types/product-crawler';

interface Step2UrlSelectionProps {
  urls: CrawlerItem[];
  setUrls: React.Dispatch<React.SetStateAction<CrawlerItem[]>>;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2UrlSelection({
  urls,
  setUrls,
  onNext,
  onBack,
}: Step2UrlSelectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filtered URLs
  const filteredUrls = useMemo(() => {
    if (!searchTerm.trim()) return urls;
    const term = searchTerm.toLowerCase();
    return urls.filter(
      (u) => u.url.toLowerCase().includes(term) || u.slug.toLowerCase().includes(term)
    );
  }, [urls, searchTerm]);

  // Selected counts
  const selectedCount = useMemo(() => urls.filter((u) => u.selected).length, [urls]);
  const isAllUrlsSelected = urls.length > 0 && selectedCount === urls.length;
  const isSomeUrlsSelected = selectedCount > 0 && selectedCount < urls.length;

  // Toggle single URL
  const toggleUrl = (id: string) => {
    setUrls((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Toggle All URLs
  const toggleAllUrls = () => {
    const targetState = !isAllUrlsSelected;
    if (searchTerm.trim()) {
      const matchIds = new Set(filteredUrls.map((u) => u.id));
      setUrls((prev) =>
        prev.map((item) => (matchIds.has(item.id) ? { ...item, selected: targetState } : item))
      );
    } else {
      setUrls((prev) => prev.map((item) => ({ ...item, selected: targetState })));
    }
  };

  // Quick URL selection helpers
  const selectFirstN = (n: number) => {
    setUrls((prev) =>
      prev.map((item, idx) => ({
        ...item,
        selected: idx < n,
      }))
    );
  };

  // Pagination
  const paginatedUrls = useMemo(() => {
    if (pageSize === -1) return filteredUrls;
    const start = (currentPage - 1) * pageSize;
    return filteredUrls.slice(start, start + pageSize);
  }, [filteredUrls, currentPage, pageSize]);

  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredUrls.length / pageSize);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 text-xs font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Step 2 of 5
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Select Product URLs
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Check or uncheck products with the <strong>All</strong> checkbox. Click Next to extract complete data from a sample URL and choose dynamic fields.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Icon icon="solar:arrow-left-bold" className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={selectedCount === 0}
              className="px-6 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next: Sample & Choose Fields ({selectedCount})</span>
              <Icon icon="solar:arrow-right-bold" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table / Checkbox List */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-950/40">
          {/* "All" Checkbox */}
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllUrlsSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isSomeUrlsSelected;
                }}
                onChange={toggleAllUrls}
                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
              <span className="text-sm">All</span>
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                ({selectedCount} / {urls.length} selected)
              </span>
            </label>

            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 hidden sm:block" />

            {/* Quick Select Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => selectFirstN(10)}
                className="text-[11px] font-medium px-2 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                First 10
              </button>
              <button
                type="button"
                onClick={() => selectFirstN(50)}
                className="text-[11px] font-medium px-2 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                First 50
              </button>
              <button
                type="button"
                onClick={() => selectFirstN(100)}
                className="text-[11px] font-medium px-2 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                First 100
              </button>
            </div>
          </div>

          {/* Search Filter & Page Size */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Icon
                icon="solar:magnifer-linear"
                className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                type="text"
                placeholder="Filter URLs or slug..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500 w-44 sm:w-56"
              />
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1.5 px-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={-1}>Show All</option>
            </select>
          </div>
        </div>

        {/* URL List */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-125 overflow-y-auto">
          {paginatedUrls.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              No URLs match your search filter.
            </div>
          ) : (
            paginatedUrls.map((item, index) => {
              const globalIndex =
                pageSize === -1 ? index : (currentPage - 1) * pageSize + index;

              return (
                <div
                  key={item.id}
                  onClick={() => toggleUrl(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${
                    item.selected
                      ? 'bg-orange-50/30 dark:bg-orange-950/10 hover:bg-orange-50/60 dark:hover:bg-orange-950/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/40 opacity-70'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0"
                  />

                  <span className="text-[11px] font-mono text-gray-400 w-8 text-right shrink-0">
                    #{globalIndex + 1}
                  </span>

                  <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 shrink-0">
                    {item.slug || 'no-slug'}
                  </span>

                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1 font-mono">
                    {item.url}
                  </span>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-gray-400 hover:text-orange-500 p-1"
                    title="Open URL in new tab"
                  >
                    <Icon icon="solar:square-top-down-bold" className="w-3.5 h-3.5" />
                  </a>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              Page {currentPage} of {totalPages} ({filteredUrls.length} items)
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
