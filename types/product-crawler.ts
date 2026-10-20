export type ProductCrawlerStep = 1 | 2 | 3 | 4 | 5;

export interface ProductData {
  name: string;
  slug: string;
  sku: string;
  short_description: string; // html
  description?: string; // html
  sale_price: string | number;
  regular_price: string | number;
  images: string; // If 1 image: 1st image URL. If >1: 1st image URL.
  gallery: string[]; // If 1 image: []. If >1: remaining images array.
  
  // Optional extra metadata collected from source
  id?: number | string;
  permalink?: string;
  type?: string;
  currency?: string;
  currency_symbol?: string;
  on_sale?: boolean;
  is_in_stock?: boolean;
  categories?: { id?: number; name: string; slug?: string }[];
  tags?: { id?: number; name: string; slug?: string }[];
  brands?: { id?: number; name: string; slug?: string }[];
  attributes?: { id?: number; name: string; terms?: { id?: number; name: string }[] }[];
  raw_images?: { id?: number; src: string; alt?: string; name?: string }[];
  crawled_at?: string;
  [key: string]: any;
}

export interface CrawlerItem {
  id: string;
  url: string;
  slug: string;
  selected: boolean;
  status: 'idle' | 'pending' | 'crawling' | 'success' | 'error';
  data?: ProductData;
  error?: string;
  durationMs?: number;
  httpStatus?: number;
  source?: 'wc-store-api' | 'html-jsonld' | 'html-dom' | 'direct';
}

export interface DynamicFieldConfig {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  isDefault?: boolean;
  sampleValue?: any;
}

export interface CrawlerSessionState {
  version: number;
  lastUpdated: number;
  currentStep: ProductCrawlerStep;
  sitemapInput: string;
  urls: CrawlerItem[];
  fields: DynamicFieldConfig[];
  concurrency: number;
  delayMs: number;
}
