import { NextRequest, NextResponse } from 'next/server';
import { DOMParser } from '@xmldom/xmldom';
import { extractSlugAndOrigin } from '@/plugin/product-data-crawler/lib/product-extractor';

export const maxDuration = 60;

/**
 * Helper to fetch a single XML sitemap and extract product URLs and sub-sitemaps
 */
async function fetchAndParseXml(sitemapUrl: string): Promise<{ urls: string[]; subSitemaps: string[] }> {
  let targetUrl = sitemapUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/xml,text/xml,*/*;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const xmlText = await res.text();
  const urls: string[] = [];
  const subSitemaps: string[] = [];

  try {
    const parser = new DOMParser({
      errorHandler: {
        warning: () => {},
        error: () => {},
        fatalError: () => {},
      } as any,
    });
    const doc = parser.parseFromString(xmlText, 'text/xml');

    // Sub-sitemaps in <sitemapindex>
    const sitemapNodes = doc.getElementsByTagName('sitemap');
    if (sitemapNodes && sitemapNodes.length > 0) {
      for (let i = 0; i < sitemapNodes.length; i++) {
        const locEl = sitemapNodes[i].getElementsByTagName('loc')[0];
        if (locEl && locEl.textContent) {
          const loc = locEl.textContent.trim();
          if (loc) subSitemaps.push(loc);
        }
      }
    }

    // URLs in <urlset>
    const urlNodes = doc.getElementsByTagName('url');
    if (urlNodes && urlNodes.length > 0) {
      for (let i = 0; i < urlNodes.length; i++) {
        const locEl = urlNodes[i].getElementsByTagName('loc')[0];
        if (locEl && locEl.textContent) {
          const loc = locEl.textContent.trim();
          if (loc) urls.push(loc);
        }
      }
    }
  } catch {
    // Regex fallback
  }

  // Regex fallback if parser returned empty
  if (urls.length === 0 && subSitemaps.length === 0) {
    const sitemapRegex = /<sitemap>[\s\S]*?<loc>\s*(https?:\/\/[^\s<>]+)\s*<\/loc>[\s\S]*?<\/sitemap>/gi;
    let match;
    while ((match = sitemapRegex.exec(xmlText)) !== null) {
      subSitemaps.push(match[1].trim());
    }

    const urlRegex = /<url>[\s\S]*?<loc>\s*(https?:\/\/[^\s<>]+)\s*<\/loc>[\s\S]*?<\/url>/gi;
    while ((match = urlRegex.exec(xmlText)) !== null) {
      urls.push(match[1].trim());
    }

    if (urls.length === 0 && subSitemaps.length === 0) {
      const rawLocRegex = /<loc>\s*(https?:\/\/[^\s<>]+)\s*<\/loc>/gi;
      while ((match = rawLocRegex.exec(xmlText)) !== null) {
        const found = match[1].trim();
        if (found.endsWith('.xml') || found.includes('sitemap')) {
          subSitemaps.push(found);
        } else {
          urls.push(found);
        }
      }
    }
  }

  return { urls, subSitemaps };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sitemaps, url, customXml } = body;

    // Handle direct XML text paste
    if (customXml && typeof customXml === 'string') {
      const urls: string[] = [];
      const rawLocRegex = /<loc>\s*(https?:\/\/[^\s<>]+)\s*<\/loc>/gi;
      let match;
      while ((match = rawLocRegex.exec(customXml)) !== null) {
        urls.push(match[1].trim());
      }
      const unique = Array.from(new Set(urls));
      const items = unique.map((u, idx) => {
        const { slug } = extractSlugAndOrigin(u);
        return {
          id: `item-${idx}-${Date.now()}`,
          url: u,
          slug,
          selected: true,
          status: 'idle' as const,
        };
      });

      return NextResponse.json({
        success: true,
        items,
        totalUrls: items.length,
      });
    }

    // Determine list of sitemap URLs to process
    let sitemapList: string[] = [];
    if (Array.isArray(sitemaps) && sitemaps.length > 0) {
      sitemapList = sitemaps.map(s => s.trim()).filter(Boolean);
    } else if (url && typeof url === 'string') {
      sitemapList = [url.trim()];
    }

    if (sitemapList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please provide at least one valid sitemap or product URL' },
        { status: 400 }
      );
    }

    const allUrls: string[] = [];
    const directProductUrls: string[] = [];
    const allSubSitemaps: string[] = [];
    const errors: { sitemap: string; error: string }[] = [];

    // Process each input line
    for (const link of sitemapList) {
      // If it looks like a direct product URL rather than an XML sitemap
      if (!link.endsWith('.xml') && !link.includes('sitemap')) {
        directProductUrls.push(link);
        continue;
      }

      try {
        const result = await fetchAndParseXml(link);
        allUrls.push(...result.urls);
        allSubSitemaps.push(...result.subSitemaps);
      } catch (err: any) {
        errors.push({ sitemap: link, error: err.message || 'Failed to fetch' });
      }
    }

    // Combine direct links + sitemap links
    const combinedUrls = [...allUrls, ...directProductUrls];
    const uniqueUrls = Array.from(new Set(combinedUrls));

    if (uniqueUrls.length === 0) {
      return NextResponse.json({
        success: false,
        error: errors.length > 0
          ? `Could not retrieve URLs: ${errors.map(e => `${e.sitemap} (${e.error})`).join('; ')}`
          : 'No product URLs found in the specified sitemap(s)',
        subSitemaps: Array.from(new Set(allSubSitemaps)),
      }, { status: 400 });
    }

    // Build standard items with extracted slug
    const items = uniqueUrls.map((u, idx) => {
      const { slug } = extractSlugAndOrigin(u);
      return {
        id: `prod-${idx}-${Date.now().toString(36)}`,
        url: u,
        slug,
        selected: true, // Default "All" selected
        status: 'idle' as const,
      };
    });

    return NextResponse.json({
      success: true,
      items,
      totalUrls: items.length,
      subSitemaps: Array.from(new Set(allSubSitemaps)),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to parse sitemaps' },
      { status: 500 }
    );
  }
}
