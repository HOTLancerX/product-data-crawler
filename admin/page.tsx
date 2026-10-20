'use client';

import React, { useState, useEffect } from 'react';
import StepperHeader from '../components/StepperHeader';
import Step1SitemapInput from '../components/Step1SitemapInput';
import Step2UrlSelection from '../components/Step2UrlSelection';
import Step3FieldSelection from '../components/Step3FieldSelection';
import Step4CrawlProgress from '../components/Step4CrawlProgress';
import Step5JsonViewerDownload from '../components/Step5JsonViewerDownload';
import type {
  ProductCrawlerStep,
  CrawlerItem,
  DynamicFieldConfig,
  CrawlerSessionState,
} from '../types/product-crawler';
import {
  saveSessionToStorage,
  loadSessionFromStorage,
  clearSessionFromStorage,
} from '../lib/storage';

const DEFAULT_SITEMAPS_INPUT = `https://exelicgadgets.co.ke/product-sitemap.xml
https://exelicgadgets.co.ke/product-sitemap2.xml`;

const INITIAL_FIELDS: DynamicFieldConfig[] = [
  {
    key: 'name',
    label: 'Product Title',
    description: 'Clean product title string (e.g. "JBL Junior 470NC")',
    enabled: true,
    isDefault: true,
  },
  {
    key: 'slug',
    label: 'Product Slug',
    description: 'Unique URL slug identifier (e.g. "jbl-junior-470nc")',
    enabled: true,
    isDefault: true,
  },
  {
    key: 'sku',
    label: 'SKU / Identifier',
    description: 'Stock Keeping Unit or product code',
    enabled: true,
    isDefault: true,
  },
  {
    key: 'short_description',
    label: 'Short Description (HTML)',
    description: 'Formatted HTML snippet of product features & highlights',
    enabled: true,
    isDefault: true,
  },
  {
    key: 'description',
    label: 'Description (HTML)',
    description: 'Full product description HTML content',
    enabled: true,
    isDefault: true,
  },
  {
    key: 'sale_price',
    label: 'Sale Price',
    description: 'Current or discounted selling price string',
    enabled: true,
    isDefault: true,
  },
  {
    key: 'regular_price',
    label: 'Regular Price',
    description: 'Standard regular price before discount',
    enabled: true,
    isDefault: true,
  },
  {
    key: 'images',
    label: 'Main Image (First Image)',
    description: 'Primary product image URL. If 1 image, shown here. If multiple, first shown here.',
    enabled: true,
    isDefault: true,
  },
  {
    key: 'gallery',
    label: 'Gallery (Array of Images)',
    description: 'Remaining images array. If only 1 image, empty []. If >1, remaining images here.',
    enabled: true,
    isDefault: true,
  },
];

export default function ProductDataCrawlerAdminPage() {
  const [currentStep, setCurrentStep] = useState<ProductCrawlerStep>(1);
  const [sitemapInput, setSitemapInput] = useState<string>(DEFAULT_SITEMAPS_INPUT);
  const [urls, setUrls] = useState<CrawlerItem[]>([]);
  const [fields, setFields] = useState<DynamicFieldConfig[]>(INITIAL_FIELDS);
  const [concurrency, setConcurrency] = useState<number>(3);
  const [delayMs, setDelayMs] = useState<number>(200);
  const [isLoadingSitemap, setIsLoadingSitemap] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [hasSavedSession, setHasSavedSession] = useState<boolean>(false);

  // 1. Restore from browser localStorage on initial mount
  useEffect(() => {
    const saved = loadSessionFromStorage();
    if (saved && Array.isArray(saved.urls) && saved.urls.length > 0) {
      setUrls(saved.urls);
      if (saved.sitemapInput) setSitemapInput(saved.sitemapInput);
      if (saved.fields && saved.fields.length > 0) {
        const uniqueFieldMap = new Map<string, DynamicFieldConfig>();
        for (const f of saved.fields) {
          if (!uniqueFieldMap.has(f.key)) {
            uniqueFieldMap.set(f.key, f);
          }
        }
        setFields(Array.from(uniqueFieldMap.values()));
      }
      if (saved.concurrency) setConcurrency(saved.concurrency);
      if (typeof saved.delayMs === 'number') setDelayMs(saved.delayMs);
      if (saved.currentStep) setCurrentStep(saved.currentStep);
      setHasSavedSession(true);
    }
    setIsInitialized(true);
  }, []);

  // 2. Persist state to localStorage on every change
  useEffect(() => {
    if (!isInitialized) return;

    const stateToSave: CrawlerSessionState = {
      version: 1,
      lastUpdated: Date.now(),
      currentStep,
      sitemapInput,
      urls,
      fields,
      concurrency,
      delayMs,
    };

    saveSessionToStorage(stateToSave);
    if (urls.length > 0) {
      setHasSavedSession(true);
    }
  }, [currentStep, sitemapInput, urls, fields, concurrency, delayMs, isInitialized]);

  // When sitemaps or URLs are parsed in Step 1
  const handleUrlsLoaded = (newItems: CrawlerItem[]) => {
    setUrls(newItems);
    setCurrentStep(2);
  };

  const selectedUrls = urls.filter((u) => u.selected);
  const completedCount = urls.filter((u) => u.status === 'success' || u.status === 'error').length;
  const enabledFieldsCount = fields.filter((f) => f.enabled).length;

  // Step navigation rules
  const canNavigateTo = (targetStep: ProductCrawlerStep): boolean => {
    if (targetStep === 1) return true;
    if (targetStep === 2) return urls.length > 0;
    if (targetStep === 3) return selectedUrls.length > 0;
    if (targetStep === 4) return selectedUrls.length > 0 && enabledFieldsCount > 0;
    if (targetStep === 5) return completedCount > 0;
    return false;
  };

  const handleStepClick = (targetStep: ProductCrawlerStep) => {
    if (canNavigateTo(targetStep)) {
      setCurrentStep(targetStep);
    }
  };

  const handleResetSession = () => {
    if (confirm('Are you sure you want to reset all crawler data and start fresh?')) {
      clearSessionFromStorage();
      setUrls([]);
      setCurrentStep(1);
      setHasSavedSession(false);
    }
  };

  const handleContinueExisting = () => {
    if (completedCount > 0) {
      setCurrentStep(4);
    } else if (urls.length > 0) {
      setCurrentStep(2);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-50/50 dark:bg-gray-950/40">
      <div className="max-w-7xl mx-auto">
        {/* Stepper Header */}
        <StepperHeader
          currentStep={currentStep}
          onStepClick={handleStepClick}
          canNavigateTo={canNavigateTo}
          totalUrlCount={urls.length}
          selectedUrlCount={selectedUrls.length}
          enabledFieldsCount={enabledFieldsCount}
          completedCount={completedCount}
          hasSavedSession={hasSavedSession}
          onResetSession={handleResetSession}
        />

        {/* Step 1: Sitemap / Link Input */}
        {currentStep === 1 && (
          <Step1SitemapInput
            sitemapInput={sitemapInput}
            setSitemapInput={setSitemapInput}
            onUrlsLoaded={handleUrlsLoaded}
            isLoading={isLoadingSitemap}
            setIsLoading={setIsLoadingSitemap}
            existingItemCount={urls.length}
            onContinueExisting={handleContinueExisting}
          />
        )}

        {/* Step 2: URL Selection with "All" checkbox */}
        {currentStep === 2 && (
          <Step2UrlSelection
            urls={urls}
            setUrls={setUrls}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {/* Step 3: Sample URL Extraction & Field Selection */}
        {currentStep === 3 && (
          <Step3FieldSelection
            selectedUrls={selectedUrls}
            fields={fields}
            setFields={setFields}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {/* Step 4: Batch Crawling Engine */}
        {currentStep === 4 && (
          <Step4CrawlProgress
            urls={urls}
            setUrls={setUrls}
            fields={fields}
            concurrency={concurrency}
            setConcurrency={setConcurrency}
            delayMs={delayMs}
            setDelayMs={setDelayMs}
            onNext={() => setCurrentStep(5)}
            onBack={() => setCurrentStep(3)}
          />
        )}

        {/* Step 5: JSON Viewer & Download */}
        {currentStep === 5 && (
          <Step5JsonViewerDownload
            urls={urls}
            fields={fields}
            onBackToStep4={() => setCurrentStep(4)}
            onResetAll={handleResetSession}
          />
        )}
      </div>
    </div>
  );
}
