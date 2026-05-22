/**
 * Scrapes Uruguayan business directories to find businesses by rubro.
 * Primary source: paginasamarillas.com.uy and Google Maps.
 */

import { chromium } from 'playwright';
import LLMScraper from 'llm-scraper';
import { createOpenAI } from '@ai-sdk/openai';
import { Output } from 'ai';
import { z } from 'zod';
import type { Business } from './types.js';

const businessListSchema = z.object({
  businesses: z.array(
    z.object({
      name: z.string().describe('Business name'),
      website: z.string().optional().describe('Official website URL'),
      address: z.string().optional().describe('Physical address'),
      phone: z.string().optional().describe('Phone number'),
      instagram: z.string().optional().describe('Instagram handle or URL'),
    })
  ),
});

export async function findBusinessesByRubro(
  rubro: string,
  maxResults = 20
): Promise<Business[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
  });
  const llm = new LLMScraper(groq('llama-3.3-70b-versatile'));

  const allBusinesses: Business[] = [];

  try {
    // Source 1: Páginas Amarillas Uruguay
    const page1 = await context.newPage();
    const paginasUrl = `https://www.paginasamarillas.com.uy/buscar/${encodeURIComponent(rubro)}`;
    console.log(`[directory] Searching Páginas Amarillas: ${paginasUrl}`);

    try {
      await page1.goto(paginasUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page1.waitForTimeout(2000);

      const { data: data1 } = await llm.run(
        page1,
        Output.object({ schema: businessListSchema }),
        {
          format: 'html',
          system: `Extract a list of Uruguayan businesses related to "${rubro}" from this directory page.
For each business collect: name, website URL, address, phone number, Instagram handle if visible.
Only include real businesses, skip ads or unrelated content. Extract up to ${maxResults} entries.`,
        }
      );

      if (data1?.businesses) {
        allBusinesses.push(...data1.businesses);
        console.log(`[directory] Páginas Amarillas: found ${data1.businesses.length} businesses`);
      }
    } catch (err) {
      console.warn(`[directory] Páginas Amarillas failed:`, (err as Error).message);
    } finally {
      await page1.close();
    }

    // Source 2: Google Maps search (Uruguay)
    if (allBusinesses.length < maxResults) {
      const page2 = await context.newPage();
      const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(rubro + ' Uruguay')}`;
      console.log(`[directory] Searching Google Maps: ${mapsUrl}`);

      try {
        await page2.goto(mapsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page2.waitForTimeout(3000);

        const { data: data2 } = await llm.run(
          page2,
          Output.object({ schema: businessListSchema }),
          {
            format: 'html',
            system: `Extract a list of businesses related to "${rubro}" in Uruguay from this Google Maps page.
For each business collect: name, website URL, address, phone number, Instagram handle if visible.
Only include real businesses. Extract up to ${maxResults - allBusinesses.length} entries.`,
          }
        );

        if (data2?.businesses) {
          const existingNames = new Set(allBusinesses.map((b) => b.name.toLowerCase()));
          const newBusinesses = data2.businesses.filter(
            (b: Business) => !existingNames.has(b.name.toLowerCase())
          );
          allBusinesses.push(...newBusinesses);
          console.log(`[directory] Google Maps: found ${newBusinesses.length} additional businesses`);
        }
      } catch (err) {
        console.warn(`[directory] Google Maps failed:`, (err as Error).message);
      } finally {
        await page2.close();
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  return allBusinesses.slice(0, maxResults);
}
