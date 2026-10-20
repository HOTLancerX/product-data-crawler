'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import type { ProductCrawlerStep } from '../types/product-crawler';

interface StepperHeaderProps {
  currentStep: ProductCrawlerStep;
  onStepClick: (step: ProductCrawlerStep) => void;
  canNavigateTo: (step: ProductCrawlerStep) => boolean;
  totalUrlCount: number;
  selectedUrlCount: number;
  enabledFieldsCount: number;
  completedCount: number;
  hasSavedSession: boolean;
  onResetSession: () => void;
}

const STEPS = [
  {
    step: 1 as ProductCrawlerStep,
    title: 'Sitemaps',
    subtitle: 'Input Links',
    icon: 'solar:link-circle-bold',
  },
  {
    step: 2 as ProductCrawlerStep,
    title: 'Select URLs',
    subtitle: 'Checkboxes & All',
    icon: 'solar:checklist-minimalistic-bold',
  },
  {
    step: 3 as ProductCrawlerStep,
    title: 'Select Fields',
    subtitle: 'Sample Extraction',
    icon: 'solar:code-file-bold',
  },
  {
    step: 4 as ProductCrawlerStep,
    title: 'Crawl Data',
    subtitle: 'Store API Engine',
    icon: 'solar:cloud-download-bold',
  },
  {
    step: 5 as ProductCrawlerStep,
    title: 'JSON & Download',
    subtitle: 'Files & ZIP',
    icon: 'solar:file-download-bold',
  },
];

export default function StepperHeader({
  currentStep,
  onStepClick,
  canNavigateTo,
  totalUrlCount,
  selectedUrlCount,
  enabledFieldsCount,
  completedCount,
  hasSavedSession,
  onResetSession,
}: StepperHeaderProps) {
  return (
    <div className="mb-8">
      {/* Top Banner / Session Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Icon icon="solar:cart-large-minimalistic-bold" className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Product Data Crawler
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                WooCommerce Store API
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Automated product crawler with sitemap extraction, dynamic field discovery, and JSON export.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasSavedSession && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs">
              <Icon icon="solar:shield-check-bold" className="w-4 h-4 text-blue-500 animate-pulse" />
              <span>Session Saved</span>
            </div>
          )}

          {totalUrlCount > 0 && (
            <button
              type="button"
              onClick={onResetSession}
              className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              title="Reset crawler session and start fresh"
            >
              <Icon icon="solar:restart-bold" className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
        {STEPS.map((s) => {
          const isActive = currentStep === s.step;
          const isCompleted = currentStep > s.step;
          const isAccessible = canNavigateTo(s.step);

          let stepBadge = '';
          if (s.step === 2 && totalUrlCount > 0) {
            stepBadge = `${selectedUrlCount}/${totalUrlCount}`;
          } else if (s.step === 3 && enabledFieldsCount > 0) {
            stepBadge = `${enabledFieldsCount} fields`;
          } else if ((s.step === 4 || s.step === 5) && completedCount > 0) {
            stepBadge = `${completedCount} done`;
          }

          return (
            <button
              key={s.step}
              type="button"
              disabled={!isAccessible}
              onClick={() => onStepClick(s.step)}
              className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-500 shadow-sm ring-1 ring-orange-500/30'
                  : isCompleted
                  ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-800 cursor-pointer'
                  : 'bg-gray-50/50 dark:bg-gray-900/40 border-gray-200/60 dark:border-gray-800/60 opacity-60 cursor-not-allowed'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Icon icon="solar:check-read-bold" className="w-4 h-4" />
                ) : (
                  <span>{s.step}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-xs font-semibold truncate ${
                      isActive
                        ? 'text-orange-600 dark:text-orange-400'
                        : isCompleted
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {s.title}
                  </span>
                  {stepBadge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {stepBadge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                  {s.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
