/**
 * Finds Uruguayan businesses by rubro using DuckDuckGo.
 * No LLM needed here — plain Playwright extracts the result links directly.
 */

import { chromium } from 'playwright';
import type { Business } from './types.js';

// Domains that are not real business homepages
const SKIP_DOMAINS = [
  'google.', 'youtube.', 'facebook.', 'wikipedia.', 'twitter.',
  'tiktok.', 'instagram.', 'linkedin.', 'tripadvisor.', 'yelp.',
  'duckduckgo.', 'bing.', 'yahoo.', 'mercadolibre.', 'infobae.',
  'eldiariony.', 'clarin.', 'lanacion.',
];

function isUsableUrl(url: string): boolean {
  return url.startsWith('http') && !SKIP_DOMAINS.some((d) => url.includes(d));
}

function domainToName(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

export async function findBusinessesByRubro(
  rubro: string,
  maxResults = 20
): Promise<Business[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'es-UY',
  });

  const urls = new Set<string>();

  const queries = [
    `${rubro} Uruguay`,
    `${rubro} Montevideo contacto`,
  ];

  try {
    for (const query of queries) {
      if (urls.size >= maxResults) break;

      const page = await context.newPage();
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&kl=uy-es`;
      console.log(`[directory] DuckDuckGo: "${query}"`);

      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        // DuckDuckGo renders results as <a> tags with data-testid="result-title-a"
        // Fallback: grab any <a> with an href that looks like a real site
        const links = await page.evaluate(() => {
          const anchors = Array.from(
            document.querySelectorAll('[data-testid="result-title-a"], .result__a')
          );
          return anchors
            .map((a) => (a as HTMLAnchorElement).href)
            .filter((h) => h.startsWith('http'));
        });

        let added = 0;
        for (const link of links) {
          if (isUsableUrl(link) && !urls.has(link)) {
            urls.add(link);
            added++;
          }
        }
        console.log(`[directory] +${added} URLs (total: ${urls.size})`);
      } catch (err) {
        console.warn(`[directory] Search failed:`, (err as Error).message);
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  return Array.from(urls)
    .slice(0, maxResults)
    .map((url) => ({ name: domainToName(url), website: url }));
}
