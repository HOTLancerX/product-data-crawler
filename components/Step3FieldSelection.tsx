'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import type { CrawlerItem, DynamicFieldConfig, ProductData } from '../types/product-crawler';

interface Step3FieldSelectionProps {
  selectedUrls: CrawlerItem[];
  fields: DynamicFieldConfig[];
  setFields: React.Dispatch<React.SetStateAction<DynamicFieldConfig[]>>;
  onNext: () => void;
  onBack: () => void;
}

const DEFAULT_CORE_KEYS = [
  'name',
  'slug',
  'sku',
  'short_description',
  'description',
  'sale_price',
  'regular_price',
  'images',
  'gallery',
];

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function Step3FieldSelection({
  selectedUrls,
  fields,
  setFields,
  onNext,
  onBack,
}: Step3FieldSelectionProps) {
  const [sampleUrl, setSampleUrl] = useState<string>(selectedUrls[0]?.url || '');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<ProductData | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSource, setExtractSource] = useState<string | null>(null);
  const [showJsonPreview, setShowJsonPreview] = useState<boolean>(false);
  const [fieldSearch, setFieldSearch] = useState<string>('');
  const [customFieldKey, setCustomFieldKey] = useState<string>('');

  // Extract complete sample data from URL
  const extractSampleData = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;

    setIsExtracting(true);
    setExtractError(null);

    const matchedItem = selectedUrls.find((u) => u.url === targetUrl);
    const slug = matchedItem?.slug || '';

    try {
      const res = await fetch('/api/product-data-crawler/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          slug,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Failed to extract complete data from this sample URL');
      }

      const data: ProductData = json.data;
      setExtractedData(data);
      setExtractSource(json.source);

      // Dynamically discover all keys from the extracted data and guarantee 100% unique keys
      setFields((prev) => {
        const fieldMap = new Map<string, DynamicFieldConfig>();

        // 1. Keep existing fields and update their sampleValue
        for (const f of prev) {
          fieldMap.set(f.key, {
            ...f,
            sampleValue: (data as any)[f.key] !== undefined ? (data as any)[f.key] : f.sampleValue ?? null,
          });
        }

        // 2. Add newly discovered fields only if the key does not already exist
        Object.keys(data).forEach((key) => {
          // Skip internal/heavy metadata keys
          if (['_links', 'extensions', 'crawled_at', 'raw_images'].includes(key)) return;

          if (!fieldMap.has(key)) {
            fieldMap.set(key, {
              key,
              label: formatLabel(key),
              description: `Discovered from product data (${typeof (data as any)[key]})`,
              enabled: false,
              sampleValue: (data as any)[key],
            });
          }
        });

        return Array.from(fieldMap.values());
      });
    } catch (err: any) {
      setExtractError(err.message || 'Error extracting sample product data');
    } finally {
      setIsExtracting(false);
    }
  };

  // Auto-extract on mount if sampleUrl is available and no extractedData yet
  useEffect(() => {
    if (sampleUrl && !extractedData && !isExtracting) {
      extractSampleData(sampleUrl);
    }
  }, [sampleUrl]);

  // Toggle single field
  const toggleField = (key: string) => {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f))
    );
  };

  // Toggle All fields
  const enabledCount = fields.filter((f) => f.enabled).length;
  const isAllEnabled = fields.length > 0 && enabledCount === fields.length;
  const isSomeEnabled = enabledCount > 0 && enabledCount < fields.length;

  const toggleAllFields = () => {
    const targetState = !isAllEnabled;
    setFields((prev) => prev.map((f) => ({ ...f, enabled: targetState })));
  };

  // Add custom manual field
  const handleAddCustomField = () => {
    const trimmed = customFieldKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!trimmed) return;
    if (fields.some((f) => f.key === trimmed)) {
      alert(`Field "${trimmed}" already exists.`);
      return;
    }

    const newField: DynamicFieldConfig = {
      key: trimmed,
      label: formatLabel(trimmed),
      description: 'Custom user-added field',
      enabled: true,
      sampleValue: extractedData ? (extractedData as any)[trimmed] : null,
    };

    setFields((prev) => [...prev, newField]);
    setCustomFieldKey('');
  };

  // Filtered fields list with defensive deduplication
  const filteredFields = React.useMemo(() => {
    const uniqueMap = new Map<string, DynamicFieldConfig>();
    fields.forEach((f) => {
      if (!uniqueMap.has(f.key)) {
        uniqueMap.set(f.key, f);
      }
    });
    const uniqueList = Array.from(uniqueMap.values());

    if (!fieldSearch.trim()) return uniqueList;
    const term = fieldSearch.toLowerCase();
    return uniqueList.filter(
      (f) => f.key.toLowerCase().includes(term) || f.label.toLowerCase().includes(term)
    );
  }, [fields, fieldSearch]);

  // Live filtered preview JSON of selected fields for the sample product
  const livePreviewObject = React.useMemo(() => {
    if (!extractedData) return null;
    const result: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.enabled) {
        result[f.key] = (extractedData as any)[f.key];
      }
    });
    return result;
  }, [extractedData, fields]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 text-xs font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Step 3 of 5
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Dynamic Fields & Sample Data
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Complete data has been extracted from a sample URL. <strong>The fields you select below will be used to collect data</strong> for all products.
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
              disabled={enabledCount === 0}
              className="px-6 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Next: Crawl Products with {enabledCount} Selected Fields</span>
              <Icon icon="solar:arrow-right-bold" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sample URL Tester Bar */}
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 shrink-0 flex items-center gap-1.5">
              <Icon icon="solar:link-bold" className="w-4 h-4 text-orange-500" />
              <span>Sample URL:</span>
            </span>

            <select
              value={sampleUrl}
              onChange={(e) => {
                setSampleUrl(e.target.value);
                extractSampleData(e.target.value);
              }}
              className="flex-1 py-1.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-orange-500 truncate"
            >
              {selectedUrls.map((u) => (
                <option key={u.id} value={u.url}>
                  {u.slug || u.url}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isExtracting}
              onClick={() => extractSampleData(sampleUrl)}
              className="px-3.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Icon
                icon={isExtracting ? "solar:spinner-line" : "solar:restart-bold"}
                className={`w-3.5 h-3.5 ${isExtracting ? 'animate-spin text-orange-500' : ''}`}
              />
              <span>{isExtracting ? 'Extracting...' : 'Re-extract Sample'}</span>
            </button>

            {extractedData && (
              <button
                type="button"
                onClick={() => setShowJsonPreview(!showJsonPreview)}
                className="px-3.5 py-1.5 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/60 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Icon icon="solar:code-square-bold" className="w-3.5 h-3.5" />
                <span>{showJsonPreview ? 'Hide Sample JSON' : 'Preview Sample JSON'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Source Status Alert */}
        {extractSource && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
            <Icon icon="solar:check-circle-bold" className="w-3.5 h-3.5" />
            <span>
              Sample data extracted via{' '}
              <strong>{extractSource === 'wc-store-api' ? 'WooCommerce Store API (/wp-json/wc/store/v1/products)' : 'HTML JSON-LD Fallback'}</strong>
            </span>
          </div>
        )}

        {extractError && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <Icon icon="solar:danger-triangle-bold" className="w-4 h-4 shrink-0" />
            <span>{extractError}</span>
          </div>
        )}
      </div>

      {/* JSON Live Preview Drawer if toggled */}
      {showJsonPreview && livePreviewObject && (
        <div className="p-4 rounded-2xl bg-gray-950 text-gray-100 border border-gray-800 font-mono text-xs shadow-md">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800 text-[11px] text-gray-400">
            <span>Live Sample Output with Selected Fields ({enabledCount})</span>
            <button
              type="button"
              onClick={() => setShowJsonPreview(false)}
              className="text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <pre className="max-h-64 overflow-auto text-emerald-400 leading-relaxed">
            {JSON.stringify(livePreviewObject, null, 2)}
          </pre>
        </div>
      )}

      {/* Dynamic Fields List with Checkboxes */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        {/* Fields Top Controls with "All" Checkbox & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Icon icon="solar:checklist-bold" className="w-5 h-5 text-orange-500" />
              <span>Select Fields to Collect ({enabledCount} / {fields.length})</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Only checked fields will be collected and output in the final JSON.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Icon
                icon="solar:magnifer-linear"
                className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"
              />
              <input
                type="text"
                placeholder="Search fields..."
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-500 w-36 sm:w-44"
              />
            </div>

            <label className="inline-flex items-center gap-2.5 text-xs font-bold text-gray-900 dark:text-white cursor-pointer select-none bg-gray-50 dark:bg-gray-800 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
              <input
                type="checkbox"
                checked={isAllEnabled}
                ref={(el) => {
                  if (el) el.indeterminate = isSomeEnabled;
                }}
                onChange={toggleAllFields}
                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
              <span>All Fields</span>
            </label>
          </div>
        </div>

        {/* Add Custom Field Inline */}
        <div className="flex items-center gap-2 my-4 p-3 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/60">
          <Icon icon="solar:add-circle-bold" className="w-4 h-4 text-orange-500 shrink-0" />
          <input
            type="text"
            placeholder="Add custom field key (e.g. brand, weight, category)..."
            value={customFieldKey}
            onChange={(e) => setCustomFieldKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomField();
              }
            }}
            className="flex-1 bg-transparent text-xs text-gray-900 dark:text-gray-100 focus:outline-none placeholder-gray-400"
          />
          <button
            type="button"
            onClick={handleAddCustomField}
            disabled={!customFieldKey.trim()}
            className="px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Add Field
          </button>
        </div>

        {/* Fields List */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {filteredFields.map((f) => {
            const isImageField = f.key === 'images';
            const isGalleryField = f.key === 'gallery';
            const isHtmlField = f.key === 'short_description' || f.key === 'description';
            const isCore = DEFAULT_CORE_KEYS.includes(f.key);
            const sampleVal = f.sampleValue;

            return (
              <div
                key={f.key}
                onClick={() => toggleField(f.key)}
                className={`py-3.5 px-3 sm:px-4 rounded-xl transition-all cursor-pointer select-none ${
                  f.enabled
                    ? 'bg-orange-50/25 dark:bg-orange-950/15'
                    : 'opacity-50 hover:opacity-75'
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <input
                    type="checkbox"
                    checked={f.enabled}
                    onChange={() => {}}
                    className="w-4 h-4 mt-1 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                          "{f.key}"
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded-full font-medium ${
                            isCore
                              ? 'bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-400 font-semibold'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {f.label}
                        </span>
                        {f.enabled && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Icon icon="solar:check-circle-bold" className="w-3 h-3" />
                            <span>Will collect</span>
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-mono text-gray-400">
                        {isImageField
                          ? 'Main image URL (1st)'
                          : isGalleryField
                          ? 'Remaining images array'
                          : isHtmlField
                          ? 'HTML snippet'
                          : typeof sampleVal === 'number'
                          ? 'Number'
                          : Array.isArray(sampleVal)
                          ? `Array (${sampleVal.length})`
                          : typeof sampleVal === 'object' && sampleVal !== null
                          ? 'Object'
                          : 'String'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {f.description}
                    </p>

                    {/* Live Sample Value Display */}
                    {sampleVal !== undefined && sampleVal !== null && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700/60 text-xs">
                        {isImageField ? (
                          <div className="flex items-center gap-3">
                            {sampleVal ? (
                              <img
                                src={sampleVal}
                                alt="Main"
                                className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700 bg-white"
                              />
                            ) : (
                              <span className="text-gray-400 italic">No image URL found</span>
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-gray-400 block">
                                If 1 image, shown here; if &gt;1, first image shown here:
                              </span>
                              <span className="font-mono text-[11px] text-gray-600 dark:text-gray-300 truncate block mt-0.5">
                                {sampleVal || '""'}
                              </span>
                            </div>
                          </div>
                        ) : isGalleryField ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-semibold text-gray-700 dark:text-gray-300 text-[11px]">
                                Gallery Images Array (remaining images):
                              </span>
                              <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">
                                {Array.isArray(sampleVal) ? `${sampleVal.length} images` : '0 images'}
                              </span>
                            </div>

                            {Array.isArray(sampleVal) && sampleVal.length > 0 ? (
                              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {sampleVal.map((imgUrl: string, idx: number) => (
                                  <img
                                    key={idx}
                                    src={imgUrl}
                                    alt={`Gallery ${idx}`}
                                    className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700 shrink-0 bg-white"
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-gray-400 italic">
                                [] (If product only has 1 image, the rest will not be shown in the gallery)
                              </span>
                            )}
                          </div>
                        ) : isHtmlField ? (
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                              <span>Raw HTML:</span>
                            </div>
                            <div className="font-mono text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-800 max-h-24 overflow-y-auto">
                              {sampleVal || '""'}
                            </div>
                          </div>
                        ) : typeof sampleVal === 'object' ? (
                          <div>
                            <span className="text-[10px] text-gray-400 block mb-0.5">Value (JSON):</span>
                            <pre className="font-mono text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-800 max-h-20 overflow-y-auto">
                              {JSON.stringify(sampleVal, null, 2)}
                            </pre>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-[11px]">Extracted:</span>
                            <span className="font-mono font-bold text-gray-800 dark:text-gray-200 truncate">
                              {String(sampleVal)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
