import type { CrawlerSessionState } from '../types/product-crawler';

const STORAGE_KEY = 'cms_product_crawler_session_v1';

/**
 * Saves current session state to browser localStorage.
 */
export function saveSessionToStorage(state: CrawlerSessionState): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const dataToSave = {
      ...state,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    return true;
  } catch (err: any) {
    console.warn('Failed to save crawler session to localStorage:', err);
    // If quota exceeded, try stripping heavy debug fields
    try {
      const lightweightUrls = state.urls.map(u => ({
        ...u,
        data: u.data ? {
          name: u.data.name,
          slug: u.data.slug,
          sku: u.data.sku,
          short_description: u.data.short_description,
          sale_price: u.data.sale_price,
          regular_price: u.data.regular_price,
          images: u.data.images,
          gallery: u.data.gallery,
        } : undefined,
      }));
      const reducedState = {
        ...state,
        urls: lightweightUrls,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedState));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Loads saved session state from localStorage.
 */
export function loadSessionFromStorage(): CrawlerSessionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CrawlerSessionState;
    if (!parsed || !Array.isArray(parsed.urls)) return null;

    // Reset any items that were left in 'crawling' or 'pending' state during crash/reboot to 'idle'
    parsed.urls = parsed.urls.map(item => {
      if (item.status === 'crawling' || item.status === 'pending') {
        return { ...item, status: 'idle' };
      }
      return item;
    });

    return parsed;
  } catch (err) {
    console.error('Failed to parse saved crawler session:', err);
    return null;
  }
}

/**
 * Clears the saved session from localStorage.
 */
export function clearSessionFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
}

/**
 * Exports current session as a downloadable JSON file backup.
 */
export function exportSessionBackup(state: CrawlerSessionState): void {
  const jsonStr = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `product-crawler-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
