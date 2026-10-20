'use client';

import React, { useMemo } from 'react';
import { Icon } from '@iconify/react';
import type { CrawlerItem, DynamicFieldConfig } from '../types/product-crawler';
import JsonCodeViewer from './JsonCodeViewer';
import { cleanHtml } from '../lib/product-extractor';

interface Step5JsonViewerDownloadProps {
  urls: CrawlerItem[];
  fields: DynamicFieldConfig[];
  onBackToStep4: () => void;
  onResetAll: () => void;
}

export default function Step5JsonViewerDownload({
  urls,
  fields,
  onBackToStep4,
  onResetAll,
}: Step5JsonViewerDownloadProps) {
  // Successfully scraped products filtered strictly to the fields enabled in Step 3
  const products: Record<string, any>[] = useMemo(() => {
    const enabledFields = fields.filter((f) => f.enabled);

    return urls
      .filter((u) => u.status === 'success' && u.data)
      .map((u) => {
        const item = u.data!;
        const result: Record<string, any> = {};

        // Only include the fields that were selected by the user
        enabledFields.forEach((f) => {
          let val = (item as any)[f.key];
          if ((f.key === 'short_description' || f.key === 'description') && typeof val === 'string') {
            val = cleanHtml(val);
          }
          result[f.key] = val;
        });

        return result;
      });
  }, [urls, fields]);

  // Download Consolidated JSON
  const handleDownloadAllJson = () => {
    const jsonStr = JSON.stringify(products, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-all-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Step 5 of 5
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Display & Download JSON Files
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Collected <strong className="text-emerald-600 dark:text-emerald-400">{products.length}</strong> products with the <strong className="text-orange-600 dark:text-orange-400">{fields.filter((f) => f.enabled).length}</strong> selected fields.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadAllJson}
              disabled={products.length === 0}
              className="px-5 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              title="Download all products as JSON"
            >
              <Icon icon="solar:file-download-bold" className="w-4 h-4" />
              <span>Download JSON ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={onBackToStep4}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Icon icon="solar:arrow-left-bold" className="w-4 h-4" />
              <span>Back to Step 4</span>
            </button>
          </div>
        </div>
      </div>

      {/* JSON Code Viewer */}
      <JsonCodeViewer
        data={products}
        title={`Products Output JSON (${products.length} items)`}
        maxHeight="700px"
      />
    </div>
  );
}
