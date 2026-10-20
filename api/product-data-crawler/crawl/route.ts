import { NextRequest, NextResponse } from 'next/server';
import {
  extractSlugAndOrigin,
  parseWooCommerceStoreApiProduct,
  parseProductFromHtml,
} from '@/plugin/product-data-crawler/lib/product-extractor';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { url, slug: providedSlug } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Product URL is required' },
        { status: 400 }
      );
    }

    const { origin, slug: derivedSlug } = extractSlugAndOrigin(url);
    const slug = providedSlug || derivedSlug;

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json,text/html,application/xhtml+xml,*/*;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    // ─── 1. Attempt WooCommerce Store API ──────────────────────────────────────
    if (origin && slug) {
      const storeApiUrl = `${origin}/wp-json/wc/store/v1/products?slug=${encodeURIComponent(slug)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const storeRes = await fetch(storeApiUrl, {
          signal: controller.signal,
          headers: {
            ...headers,
            'Accept': 'application/json',
          },
          cache: 'no-store',
        });
        clearTimeout(timeoutId);

        if (storeRes.ok) {
          const contentType = storeRes.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const rawData = await storeRes.json();
            if (Array.isArray(rawData) && rawData.length > 0) {
              const product = rawData[0];
              const normalized = parseWooCommerceStoreApiProduct(product, slug);
              return NextResponse.json({
                success: true,
                url,
                slug,
                data: normalized,
                source: 'wc-store-api',
                durationMs: Date.now() - startTime,
              });
            }
          }
        }
      } catch {
        clearTimeout(timeoutId);
        // Fall through to HTML fallback
      }
    }

    // ─── 2. Fallback: Fetch HTML Page & Extract via JSON-LD / DOM ──────────────
    const pageController = new AbortController();
    const pageTimeoutId = setTimeout(() => pageController.abort(), 15000);

    try {
      const pageRes = await fetch(url, {
        signal: pageController.signal,
        headers,
        cache: 'no-store',
        redirect: 'follow',
      });
      clearTimeout(pageTimeoutId);

      if (!pageRes.ok) {
        return NextResponse.json({
          success: false,
          url,
          slug,
          error: `HTTP ${pageRes.status}: ${pageRes.statusText}`,
          durationMs: Date.now() - startTime,
        });
      }

      const html = await pageRes.text();
      const normalized = parseProductFromHtml(html, url, slug);

      return NextResponse.json({
        success: true,
        url,
        slug,
        data: normalized,
        source: 'html-dom',
        durationMs: Date.now() - startTime,
      });
    } catch (err: any) {
      clearTimeout(pageTimeoutId);
      return NextResponse.json({
        success: false,
        url,
        slug,
        error: err.name === 'AbortError' ? 'Request timed out after 15s' : err.message,
        durationMs: Date.now() - startTime,
      });
    }
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Crawl failed',
      durationMs: Date.now() - startTime,
    });
  }
}
