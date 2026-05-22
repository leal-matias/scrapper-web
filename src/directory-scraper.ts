/**
 * Finds Uruguayan businesses by rubro using Google Search.
 */

import { chromium } from 'playwright';
import LLMScraper from 'llm-scraper';
import { createOpenAI } from '@ai-sdk/openai';
import { Output } from 'ai';
import { z } from 'zod';
import type { Business } from './types.js';

const searchResultsSchema = z.object({
  results: z.array(
    z.object({
      title: z.string().describe('Page or business title'),
      url: z.string().describe('Full URL of the result'),
    })
  ),
});

// Domains that are not real business homepages
const SKIP_DOMAINS = [
  'google.', 'youtube.', 'facebook.', 'wikipedia.', 'twitter.',
  'tiktok.', 'instagram.', 'linkedin.', 'tripadvisor.',
  'maps.google', 'support.google', 'accounts.google',
];

function isUsableUrl(url: string): boolean {
  return url.startsWith('http') && !SKIP_DOMAINS.some((d) => url.includes(d));
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

  const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
  });
  const llm = new LLMScraper(groq('llama-3.3-70b-versatile'));

  const urls: string[] = [];

  // Two searches to get more coverage
  const queries = [
    `${rubro} Uruguay`,
    `${rubro} Montevideo contacto`,
  ];

  try {
    for (const query of queries) {
      if (urls.length >= maxResults) break;

      const page = await context.newPage();
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=uy&hl=es&num=20`;
      console.log(`[directory] Searching: "${query}"`);

      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        const { data } = await llm.run(
          page,
          Output.object({ schema: searchResultsSchema }),
          {
            format: 'html',
            system: `Extract all organic search result links from this Google search page.
Return the title and full URL of each result.
Skip ads, Google internal pages, and generic platforms (Facebook, Instagram, YouTube, TikTok, Wikipedia, LinkedIn).
Only keep real business websites.`,
          }
        );

        if (data?.results) {
          for (const r of data.results) {
            if (isUsableUrl(r.url) && !urls.includes(r.url)) {
              urls.push(r.url);
            }
          }
          console.log(`[directory] Got ${urls.length} business URLs so far`);
        }
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

  // Convert URLs to Business objects — name is derived from the domain
  return urls.slice(0, maxResults).map((url) => ({
    name: new URL(url).hostname.replace('www.', ''),
    website: url,
  }));
}
