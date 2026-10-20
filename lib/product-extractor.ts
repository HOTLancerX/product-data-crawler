import type { ProductData } from '../types/product-crawler';

/**
 * Extracts origin and slug from a product URL.
 * Supports:
 * - https://example.com/product/slug-name/
 * - https://example.com/item/slug-name
 * - https://example.com/p/slug-name/
 * - https://example.com/slug-name/
 */
export function extractSlugAndOrigin(url: string): { origin: string; slug: string } {
  try {
    const parsed = new URL(url.trim());
    const origin = parsed.origin;
    
    // Split path segments and remove empty ones
    const segments = parsed.pathname.split('/').filter(Boolean);
    
    if (segments.length === 0) {
      return { origin, slug: '' };
    }
    
    // If the URL is like /product/slug/ -> take the last segment
    let slug = segments[segments.length - 1];
    
    // Clean trailing .html if any
    slug = slug.replace(/\.html?$/i, '');
    
    return { origin, slug };
  } catch {
    const trimmed = url.trim().replace(/\/+$/, '');
    const parts = trimmed.split('/');
    const slug = parts[parts.length - 1] || '';
    return { origin: '', slug };
  }
}

/**
 * Sanitizes and cleans HTML content for short_description and description.
 * Strips data-* attributes (e.g. data-path-to-node, data-index-in-node),
 * removes class attributes (e.g. class="citation-..."), unwraps citation spans,
 * and removes inline event/id attributes.
 */
export function cleanHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let cleaned = html;

  // 1. Remove comments, scripts, styles
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // 2. Remove all data-* attributes (data-path-to-node, data-index-in-node, etc.)
  cleaned = cleaned.replace(/\s+data-[a-zA-Z0-9_\-]+="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+data-[a-zA-Z0-9_\-]+='[^']*'/gi, '');
  cleaned = cleaned.replace(/\s+data-[a-zA-Z0-9_\-]+=[^\s>]+/gi, '');

  // 3. Remove class attributes
  cleaned = cleaned.replace(/\s+class="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+class='[^']*'/gi, '');
  cleaned = cleaned.replace(/\s+class=[^\s>]+/gi, '');

  // 4. Remove tracking / event / id attributes
  cleaned = cleaned.replace(/\s+on[a-zA-Z]+="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+id="[^"]*"/gi, '');

  // 5. Unwrap empty or citation spans
  for (let i = 0; i < 3; i++) {
    cleaned = cleaned.replace(/<span\s*>([\s\S]*?)<\/span>/gi, '$1');
  }

  // 6. Clean up tag spaces like <b > -> <b>, <li > -> <li>
  cleaned = cleaned.replace(/<([a-zA-Z0-9]+)\s+>/g, '<$1>');

  // 7. Clean up empty tags
  cleaned = cleaned.replace(/<(span|p|div)\s*>\s*<\/\1>/gi, '');

  return cleaned.trim();
}

/**
 * Transforms WooCommerce Store API raw product JSON into the target ProductData shape.
 */
export function parseWooCommerceStoreApiProduct(rawProduct: any, fallbackSlug?: string): ProductData {
  const imagesArray = Array.isArray(rawProduct.images) ? rawProduct.images : [];
  
  let mainImage = '';
  let gallery: string[] = [];

  if (imagesArray.length === 1) {
    mainImage = imagesArray[0]?.src || '';
    gallery = []; // 1 image -> rest will not be shown in gallery
  } else if (imagesArray.length > 1) {
    mainImage = imagesArray[0]?.src || '';
    gallery = imagesArray.slice(1).map((img: any) => img.src || '').filter(Boolean);
  }

  // Handle prices cleanly
  const prices = rawProduct.prices || {};
  let regularPrice = prices.regular_price || prices.price || '';
  let salePrice = prices.sale_price || prices.price || '';

  // In WC Store API, if minor_unit is given, check whether price was an integer string (e.g. 12100 with minor_unit 2 = 121.00)
  // But many currencies (like KES) have minor_unit 0 (12100 = 12100).
  // If regular_price and sale_price are already string numbers, preserve as string
  if (typeof regularPrice === 'number') regularPrice = regularPrice.toString();
  if (typeof salePrice === 'number') salePrice = salePrice.toString();

  return {
    ...rawProduct,
    id: rawProduct.id,
    name: rawProduct.name || '',
    slug: rawProduct.slug || fallbackSlug || '',
    sku: rawProduct.sku || '',
    short_description: cleanHtml(rawProduct.short_description || ''),
    description: cleanHtml(rawProduct.description || ''),
    sale_price: salePrice,
    regular_price: regularPrice,
    images: mainImage,
    gallery,
    
    // Extra useful metadata
    permalink: rawProduct.permalink || '',
    type: rawProduct.type || 'simple',
    currency: prices.currency_code || '',
    currency_symbol: prices.currency_symbol || '',
    on_sale: Boolean(rawProduct.on_sale),
    is_in_stock: Boolean(rawProduct.is_in_stock),
    categories: Array.isArray(rawProduct.categories)
      ? rawProduct.categories.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug }))
      : [],
    tags: Array.isArray(rawProduct.tags)
      ? rawProduct.tags.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug }))
      : [],
    brands: Array.isArray(rawProduct.brands)
      ? rawProduct.brands.map((b: any) => ({ id: b.id, name: b.name, slug: b.slug }))
      : [],
    raw_images: imagesArray.map((img: any) => ({
      id: img.id,
      src: img.src,
      alt: img.alt || '',
      name: img.name || '',
    })),
    crawled_at: new Date().toISOString(),
  };
}

/**
 * Fallback HTML parser: Extracts product info from HTML when WooCommerce API is inaccessible
 * Uses JSON-LD schema (schema.org/Product) or OpenGraph meta tags.
 */
export function parseProductFromHtml(html: string, pageUrl: string, fallbackSlug: string): ProductData {
  let name = '';
  let sku = '';
  let short_description = '';
  let sale_price: string | number = '';
  let regular_price: string | number = '';
  const allImages: string[] = [];

  // 1. Try to find JSON-LD Product schema
  const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const target = item['@graph'] ? item['@graph'].find((g: any) => g['@type'] === 'Product') : item;
        if (target && (target['@type'] === 'Product' || target['@type'] === 'IndividualProduct')) {
          if (!name && target.name) name = target.name;
          if (!sku && target.sku) sku = target.sku;
          if (!short_description && (target.description || target.disambiguatingDescription)) {
            short_description = `<p>${target.description || target.disambiguatingDescription}</p>`;
          }
          if (target.offers) {
            const offer = Array.isArray(target.offers) ? target.offers[0] : target.offers;
            if (offer?.price) sale_price = offer.price.toString();
            if (offer?.price) regular_price = offer.price.toString();
          }
          if (target.image) {
            if (Array.isArray(target.image)) {
              for (const img of target.image) {
                const src = typeof img === 'string' ? img : img.url;
                if (src) allImages.push(src);
              }
            } else {
              const src = typeof target.image === 'string' ? target.image : target.image.url;
              if (src) allImages.push(src);
            }
          }
        }
      }
    } catch {
      // ignore invalid json-ld
    }
  }

  // 2. Fallback to OpenGraph / Meta tags
  if (!name) {
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) name = titleMatch[1].trim();
  }

  if (!short_description) {
    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (descMatch) short_description = `<p>${descMatch[1].trim()}</p>`;
  }

  if (allImages.length === 0) {
    const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImgMatch) allImages.push(ogImgMatch[1].trim());
  }

  // Check for standard WooCommerce short description HTML
  const shortDescMatch = html.match(/<div class=["']woocommerce-product-details__short-description["'][^>]*>([\s\S]*?)<\/div>/i);
  if (shortDescMatch) {
    short_description = shortDescMatch[1].trim();
  }

  // Check for standard WooCommerce title
  const h1Match = html.match(/<h1[^>]*class=["'][^"']*product_title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    name = h1Match[1].replace(/<[^>]+>/g, '').trim();
  }

  // Check for SKU
  if (!sku) {
    const skuMatch = html.match(/<span class=["']sku["'][^>]*>([^<]+)<\/span>/i);
    if (skuMatch) sku = skuMatch[1].trim();
  }

  // Check for prices in HTML
  if (!sale_price || !regular_price) {
    const delMatch = html.match(/<del[^>]*>[\s\S]*?<bdi>[\s\S]*?([0-9,.]+)\s*<\/bdi>[\s\S]*?<\/del>/i);
    const insMatch = html.match(/<ins[^>]*>[\s\S]*?<bdi>[\s\S]*?([0-9,.]+)\s*<\/bdi>[\s\S]*?<\/ins>/i);
    if (delMatch && insMatch) {
      regular_price = delMatch[1].replace(/,/g, '');
      sale_price = insMatch[1].replace(/,/g, '');
    } else {
      const bdiMatch = html.match(/<bdi>[\s\S]*?([0-9,.]+)\s*<\/bdi>/i);
      if (bdiMatch) {
        regular_price = bdiMatch[1].replace(/,/g, '');
        sale_price = regular_price;
      }
    }
  }

  // Deduplicate images
  const uniqueImages = Array.from(new Set(allImages));
  let mainImage = '';
  let gallery: string[] = [];

  if (uniqueImages.length === 1) {
    mainImage = uniqueImages[0];
    gallery = [];
  } else if (uniqueImages.length > 1) {
    mainImage = uniqueImages[0];
    gallery = uniqueImages.slice(1);
  }

  // Check for full description tab
  let description = '';
  const descTabMatch = html.match(/<div[^>]*id=["']tab-description["'][^>]*>([\s\S]*?)<\/div>/i) ||
                        html.match(/<div class=["']woocommerce-Tabs-panel--description["'][^>]*>([\s\S]*?)<\/div>/i);
  if (descTabMatch) {
    description = descTabMatch[1].trim();
  }

  return {
    name: name || fallbackSlug,
    slug: fallbackSlug,
    sku,
    short_description: cleanHtml(short_description),
    description: cleanHtml(description || short_description),
    sale_price,
    regular_price,
    images: mainImage,
    gallery,
    permalink: pageUrl,
    crawled_at: new Date().toISOString(),
  };
}
