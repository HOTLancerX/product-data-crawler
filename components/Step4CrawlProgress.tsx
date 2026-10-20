'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@iconify/react';
import type { CrawlerItem, ProductData, DynamicFieldConfig } from '../types/product-crawler';
import { cleanHtml } from '../lib/product-extractor';

interface Step4CrawlProgressProps {
  urls: CrawlerItem[];
  setUrls: React.Dispatch<React.SetStateAction<CrawlerItem[]>>;
  fields: DynamicFieldConfig[];
  concurrency: number;
  setConcurrency: (val: number) => void;
  delayMs: number;
  setDelayMs: (val: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step4CrawlProgress({
  urls,
  setUrls,
  fields,
  concurrency,
  setConcurrency,
  delayMs,
  setDelayMs,
  onNext,
  onBack,
}: Step4CrawlProgressProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<CrawlerItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'error' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const stopSignalRef = useRef(false);
  const pauseSignalRef = useRef(false);

  useEffect(() => {
    pauseSignalRef.current = isPaused;
  }, [isPaused]);

  // Selected items to crawl
  const selectedItems = useMemo(() => urls.filter((u) => u.selected), [urls]);

  // Stats
  const totalCount = selectedItems.length;
  const successCount = selectedItems.filter((u) => u.status === 'success').length;
  const errorCount = selectedItems.filter((u) => u.status === 'error').length;
  const completedCount = successCount + errorCount;
  const pendingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Single URL crawler
  const crawlSingleUrl = async (item: CrawlerItem): Promise<void> => {
    setUrls((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'crawling', error: undefined } : i))
    );

    const startTime = Date.now();
    try {
      const res = await fetch('/api/product-data-crawler/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: item.url,
          slug: item.slug,
        }),
      });

      const json = await res.json();
      const durationMs = json.durationMs || Date.now() - startTime;

      if (json.success && json.data) {
        const enabledKeys = fields.filter((f) => f.enabled).map((f) => f.key);
        const filteredProductData: Record<string, any> = {};
        enabledKeys.forEach((k) => {
          let val = (json.data as any)[k];
          if ((k === 'short_description' || k === 'description') && typeof val === 'string') {
            val = cleanHtml(val);
          }
          filteredProductData[k] = val;
        });

        setUrls((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'success',
                  data: filteredProductData as ProductData,
                  source: json.source,
                  durationMs,
                  error: undefined,
                }
              : i
          )
        );
      } else {
        setUrls((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'error',
                  error: json.error || 'Failed to crawl product data',
                  durationMs,
                }
              : i
          )
        );
      }
    } catch (err: any) {
      setUrls((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: 'error',
                error: err.message || 'Network fetch failure',
                durationMs: Date.now() - startTime,
              }
            : i
        )
      );
    }
  };

  // Main runner loop
  const startCrawling = async (retryOnlyErrors = false) => {
    stopSignalRef.current = false;
    pauseSignalRef.current = false;
    setIsRunning(true);
    setIsPaused(false);

    const toProcess = urls.filter((i) => {
      if (!i.selected) return false;
      if (retryOnlyErrors) return i.status === 'error';
      return i.status === 'idle' || i.status === 'error';
    });

    if (toProcess.length === 0) {
      setIsRunning(false);
      return;
    }

    let currentIndex = 0;
    const workerCount = Math.max(1, Math.min(concurrency, 8));

    const worker = async () => {
      while (currentIndex < toProcess.length) {
        if (stopSignalRef.current) break;

        while (pauseSignalRef.current && !stopSignalRef.current) {
          await new Promise((r) => setTimeout(r, 400));
        }
        if (stopSignalRef.current) break;

        const itemIndex = currentIndex++;
        if (itemIndex >= toProcess.length) break;

        const currentItem = toProcess[itemIndex];
        await crawlSingleUrl(currentItem);

        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    };

    const workers = Array.from({ length: workerCount }).map(() => worker());
    await Promise.all(workers);

    setIsRunning(false);
    setIsPaused(false);
  };

  const handlePauseResume = () => {
    setIsPaused((prev) => !prev);
  };

  const handleStop = () => {
    stopSignalRef.current = true;
    setIsRunning(false);
    setIsPaused(false);
  };

  // Filtered view items
  const displayItems = useMemo(() => {
    return selectedItems.filter((i) => {
      if (filterStatus === 'success' && i.status !== 'success') return false;
      if (filterStatus === 'error' && i.status !== 'error') return false;
      if (filterStatus === 'pending' && (i.status === 'success' || i.status === 'error')) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          i.url.toLowerCase().includes(term) ||
          i.slug.toLowerCase().includes(term) ||
          (i.data?.name && i.data.name.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [selectedItems, filterStatus, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Controller Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 text-xs font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Step 4 of 5
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Crawl Products from URLs
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Data is collected directly via WooCommerce Store API (with HTML fallback) and persisted in browser storage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isRunning}
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <Icon icon="solar:arrow-left-bold" className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={completedCount === 0}
              className="px-6 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next: View & Download JSON ({successCount})</span>
              <Icon icon="solar:arrow-right-bold" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Big Counters */}
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              {isRunning ? (
                <>
                  <Icon icon="solar:spinner-line" className="w-4 h-4 text-orange-500 animate-spin" />
                  <span>Crawling in progress...</span>
                </>
              ) : isPaused ? (
                <>
                  <Icon icon="solar:pause-circle-bold" className="w-4 h-4 text-amber-500" />
                  <span>Crawling paused</span>
                </>
              ) : completedCount === totalCount && totalCount > 0 ? (
                <>
                  <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    All products crawled successfully!
                  </span>
                </>
              ) : (
                <span>Ready to crawl</span>
              )}
            </span>
            <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">
              {progressPercent}% ({completedCount} / {totalCount})
            </span>
          </div>

          <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                completedCount === totalCount && totalCount > 0
                  ? 'bg-emerald-500'
                  : 'bg-linear-to-r from-amber-500 to-orange-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 text-center">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Total</span>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{totalCount}</p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-center">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Success</span>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{successCount}</p>
            </div>

            <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-center">
              <span className="text-[11px] text-red-600 dark:text-red-400 uppercase font-semibold">Failed</span>
              <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-0.5">{errorCount}</p>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-center">
              <span className="text-[11px] text-blue-600 dark:text-blue-400 uppercase font-semibold">Pending</span>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">{pendingCount}</p>
            </div>
          </div>

          {/* Action Buttons & Concurrency Settings */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              {!isRunning ? (
                <button
                  type="button"
                  onClick={() => startCrawling(false)}
                  disabled={pendingCount === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Icon icon="solar:play-bold" className="w-4 h-4" />
                  <span>{completedCount > 0 ? 'Resume / Start Crawling' : 'Start Crawling'}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handlePauseResume}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Icon icon={isPaused ? "solar:play-bold" : "solar:pause-bold"} className="w-4 h-4" />
                    <span>{isPaused ? 'Resume' : 'Pause'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStop}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md shadow-red-600/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Icon icon="solar:stop-bold" className="w-4 h-4" />
                    <span>Stop</span>
                  </button>
                </>
              )}

              {errorCount > 0 && !isRunning && (
                <button
                  type="button"
                  onClick={() => startCrawling(true)}
                  className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Icon icon="solar:restart-bold" className="w-4 h-4" />
                  <span>Retry {errorCount} Failed</span>
                </button>
              )}
            </div>

            {/* Workers / Throttle Tuning */}
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span>Concurrency:</span>
                <select
                  value={concurrency}
                  disabled={isRunning}
                  onChange={(e) => setConcurrency(Number(e.target.value))}
                  className="py-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-200"
                >
                  <option value={1}>1 Worker (Gentle)</option>
                  <option value={2}>2 Workers</option>
                  <option value={3}>3 Workers (Default)</option>
                  <option value={5}>5 Workers (Fast)</option>
                  <option value={8}>8 Workers (Turbo)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span>Delay:</span>
                <select
                  value={delayMs}
                  disabled={isRunning}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  className="py-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-200"
                >
                  <option value={0}>0ms (Instant)</option>
                  <option value={200}>200ms</option>
                  <option value={500}>500ms</option>
                  <option value={1000}>1000ms</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Stream & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Items Stream */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-950/40">
            <div className="flex items-center gap-1.5">
              {(['all', 'success', 'error', 'pending'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`text-xs capitalize font-semibold px-2.5 py-1 rounded-lg transition-all ${
                    filterStatus === st
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative">
              <Icon
                icon="solar:magnifer-linear"
                className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"
              />
              <input
                type="text"
                placeholder="Search crawled..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500 w-36 sm:w-48"
              />
            </div>
          </div>

          {/* Items List */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-125 overflow-y-auto">
            {displayItems.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">No items to display.</div>
            ) : (
              displayItems.map((item) => {
                const isSelected = selectedDetail?.id === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedDetail(item)}
                    className={`p-3 sm:px-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-orange-50/60 dark:bg-orange-950/30'
                        : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Status Icon */}
                      <div className="shrink-0">
                        {item.status === 'crawling' ? (
                          <Icon icon="solar:spinner-line" className="w-5 h-5 text-orange-500 animate-spin" />
                        ) : item.status === 'success' ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Icon icon="solar:check-read-bold" className="w-3.5 h-3.5" />
                          </div>
                        ) : item.status === 'error' ? (
                          <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center">
                            <Icon icon="solar:close-circle-bold" className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Thumbnail if available */}
                      {item.data?.images ? (
                        <img
                          src={item.data.images}
                          alt={item.data.name || item.slug}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                          <Icon icon="solar:gallery-minimalistic-bold" className="w-5 h-5" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {item.data?.name || item.slug}
                          </span>
                          {item.data?.sku && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0">
                              SKU: {item.data.sku}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-gray-400 truncate mt-0.5">
                          {item.url}
                        </p>
                      </div>
                    </div>

                    {/* Price & Badge */}
                    <div className="text-right shrink-0">
                      {item.data?.sale_price ? (
                        <div>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {item.data.currency_symbol || ''} {item.data.sale_price}
                          </span>
                          {item.data.regular_price && item.data.regular_price !== item.data.sale_price && (
                            <span className="text-[10px] text-gray-400 line-through block">
                              {item.data.regular_price}
                            </span>
                          )}
                        </div>
                      ) : item.status === 'error' ? (
                        <span className="text-[10px] text-red-500 font-medium max-w-30 truncate block">
                          {item.error || 'Failed'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 capitalize">{item.status}</span>
                      )}

                      {item.durationMs && (
                        <span className="text-[10px] text-gray-400 font-mono block">
                          {(item.durationMs / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Live Item Details Preview */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Icon icon="solar:eye-bold" className="w-4 h-4 text-orange-500" />
              <span>Product Preview</span>
            </h3>
            {selectedDetail && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {selectedDetail.status}
              </span>
            )}
          </div>

          {!selectedDetail ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              Click any product in the list to preview its extracted data.
            </div>
          ) : selectedDetail.data ? (
            <div className="mt-4 space-y-4">
              {/* Product Thumbnail & Basic Info */}
              <div className="flex items-start gap-3">
                {selectedDetail.data.images ? (
                  <img
                    src={selectedDetail.data.images}
                    alt={selectedDetail.data.name}
                    className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-gray-800 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                    <Icon icon="solar:gallery-minimalistic-bold" className="w-8 h-8" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                    {selectedDetail.data.name}
                  </h4>
                  <p className="text-[11px] font-mono text-gray-500 mt-1">
                    Slug: {selectedDetail.data.slug}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    SKU: {selectedDetail.data.sku || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Price Details */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Sale Price</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedDetail.data.sale_price || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Regular Price</span>
                  <p className="font-semibold text-gray-700 dark:text-gray-300">
                    {selectedDetail.data.regular_price || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Gallery Images Preview */}
              <div>
                <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                  Gallery Images ({selectedDetail.data.gallery?.length || 0})
                </span>
                {selectedDetail.data.gallery && selectedDetail.data.gallery.length > 0 ? (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {selectedDetail.data.gallery.map((imgUrl, i) => (
                      <img
                        key={i}
                        src={imgUrl}
                        alt={`Gallery ${i}`}
                        className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">No remaining gallery images</p>
                )}
              </div>

              {/* Short Description Preview */}
              {selectedDetail.data.short_description && (
                <div>
                  <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Short Description (HTML)
                  </span>
                  <div
                    className="text-xs text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 prose prose-xs dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: selectedDetail.data.short_description }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-xs text-red-600 dark:text-red-400">
              {selectedDetail.error || 'Product has not been crawled yet.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
