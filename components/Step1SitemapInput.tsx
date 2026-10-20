'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import type { CrawlerItem } from '../types/product-crawler';

interface Step1SitemapInputProps {
  sitemapInput: string;
  setSitemapInput: (val: string) => void;
  onUrlsLoaded: (items: CrawlerItem[]) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  existingItemCount: number;
  onContinueExisting: () => void;
}

const DEFAULT_EXAMPLE = `https://exelicgadgets.co.ke/product-sitemap.xml
https://exelicgadgets.co.ke/product-sitemap2.xml`;

export default function Step1SitemapInput({
  sitemapInput,
  setSitemapInput,
  onUrlsLoaded,
  isLoading,
  setIsLoading,
  existingItemCount,
  onContinueExisting,
}: Step1SitemapInputProps) {
  const [error, setError] = useState<string | null>(null);
  const [xmlMode, setXmlMode] = useState(false);
  const [xmlContent, setXmlContent] = useState('');

  const handleNext = async () => {
    setError(null);

    // If in raw XML paste mode
    if (xmlMode) {
      if (!xmlContent.trim()) {
        setError('Please paste raw XML sitemap content or switch to URL mode');
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch('/api/product-data-crawler/sitemap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customXml: xmlContent }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to parse XML content');
        }
        onUrlsLoaded(data.items);
      } catch (err: any) {
        setError(err.message || 'Failed to parse XML sitemap');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Standard URL mode
    const lines = sitemapInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && (l.startsWith('http://') || l.startsWith('https://')));

    if (lines.length === 0) {
      setError('Please enter at least one valid sitemap or product URL starting with http:// or https://');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/product-data-crawler/sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitemaps: lines }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch and parse sitemaps');
      }

      if (!data.items || data.items.length === 0) {
        throw new Error('No product URLs found in the provided sitemaps');
      }

      onUrlsLoaded(data.items);
    } catch (err: any) {
      setError(err.message || 'Error loading sitemaps');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadExample = () => {
    setSitemapInput(DEFAULT_EXAMPLE);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Existing Session Resume Banner */}
      {existingItemCount > 0 && (
        <div className="p-4 rounded-2xl bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
              <Icon icon="solar:history-bold" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Saved Crawler Session Found
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You have <span className="font-bold text-blue-600 dark:text-blue-400">{existingItemCount}</span> products preserved in browser storage.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onContinueExisting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <span>Resume Saved Session</span>
            <Icon icon="solar:arrow-right-bold" className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* Step Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 text-xs font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Step 1 of 4
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Enter Sitemap or Product Links
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              List your XML sitemaps or individual product URLs in the textarea below (one per line).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadExample}
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800/80 bg-orange-50/50 dark:bg-orange-950/30 transition-all flex items-center gap-1.5"
            >
              <Icon icon="solar:magic-stick-3-bold" className="w-4 h-4" />
              <span>Load Prompt Example</span>
            </button>

            <button
              type="button"
              onClick={() => setXmlMode(!xmlMode)}
              className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-1.5"
            >
              <Icon icon={xmlMode ? "solar:link-bold" : "solar:code-bold"} className="w-4 h-4" />
              <span>{xmlMode ? 'URL Mode' : 'Paste Raw XML'}</span>
            </button>
          </div>
        </div>

        {/* Textarea Input Form */}
        <div className="mt-6 space-y-4">
          {!xmlMode ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Icon icon="solar:document-text-bold" className="w-4 h-4 text-orange-500" />
                  <span>Sitemap Links (One per line)</span>
                </label>
                <span className="text-[11px] text-gray-400">
                  {sitemapInput.split('\n').filter((l) => l.trim().length > 0).length} link(s) entered
                </span>
              </div>

              <textarea
                rows={8}
                value={sitemapInput}
                onChange={(e) => {
                  setSitemapInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={`https://exelicgadgets.co.ke/product-sitemap.xml\nhttps://exelicgadgets.co.ke/product-sitemap2.xml`}
                className="w-full font-mono text-xs sm:text-sm p-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-950/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all leading-relaxed"
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Icon icon="solar:code-bold" className="w-4 h-4 text-orange-500" />
                  <span>Paste Raw Sitemap XML Content</span>
                </label>
              </div>

              <textarea
                rows={8}
                value={xmlContent}
                onChange={(e) => {
                  setXmlContent(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://exelicgadgets.co.ke/product/jbl-junior-470nc/</loc>\n  </url>\n</urlset>`}
                className="w-full font-mono text-xs sm:text-sm p-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-950/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all leading-relaxed"
              />
            </div>
          )}

          {/* Quick Info Box */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 flex items-start gap-3 text-xs text-gray-600 dark:text-gray-400">
            <Icon icon="solar:info-circle-bold" className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-normal">
              <p>
                <strong>Supported formats:</strong> Standard XML sitemaps, WooCommerce product sitemaps, Yoast/RankMath sitemaps, or direct individual product links.
              </p>
              <p className="text-gray-500">
                Data will be extracted dynamically from the WooCommerce Store API (<code>/wp-json/wc/store/v1/products?slug=...</code>) with HTML JSON-LD fallback.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs flex items-center gap-3">
              <Icon icon="solar:danger-triangle-bold" className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Next Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Icon icon="solar:spinner-line" className="w-5 h-5 animate-spin" />
                  <span>Fetching Sitemaps...</span>
                </>
              ) : (
                <>
                  <span>Next: Select URLs & Fields</span>
                  <Icon icon="solar:arrow-right-bold" className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
