/**
 * Scrapes a business website or Instagram page to extract contact info.
 */

import { Page, BrowserContext } from 'playwright';
import LLMScraper from 'llm-scraper';
import { anthropic } from '@ai-sdk/anthropic';
import { Output } from 'ai';
import { z } from 'zod';
import type { Business, ContactInfo } from './types.js';

const contactSchema = z.object({
  emails: z
    .array(z.string())
    .describe('All email addresses found on the page'),
  phones: z
    .array(z.string())
    .describe('All phone numbers found, including WhatsApp numbers'),
});

const llm = new LLMScraper(anthropic('claude-sonnet-4-5'));

async function scrapeContactFromPage(
  page: Page,
  url: string
): Promise<{ emails: string[]; phones: string[] }> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Try to find and navigate to a contact/about page
  const contactLink = await page
    .locator('a')
    .filter({ hasText: /contacto|contact|about|nosotros|comunícate/i })
    .first()
    .getAttribute('href')
    .catch(() => null);

  if (contactLink && !contactLink.startsWith('http')) {
    const base = new URL(url);
    const contactUrl = new URL(contactLink, base).toString();
    if (contactUrl !== url) {
      await page
        .goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 20000 })
        .catch(() => {});
      await page.waitForTimeout(1000);
    }
  }

  const { data } = await llm.run(
    page,
    Output.object({ schema: contactSchema }),
    {
      format: 'html',
      system: `Extract all contact information from this business website.
Look for:
- Email addresses (in text, mailto: links, or obfuscated like "info [at] example.com")
- Phone numbers (including Uruguayan format: 2xxx-xxxx for Montevideo, 09x-xxx-xxx for mobile, WhatsApp numbers)
Return empty arrays if nothing is found. Do not invent data.`,
    }
  );

  return {
    emails: data?.emails ?? [],
    phones: data?.phones ?? [],
  };
}

async function scrapeInstagram(
  page: Page,
  instagramSource: string
): Promise<{ emails: string[]; phones: string[] }> {
  const handle = instagramSource.replace(/^@/, '').replace(/.*instagram\.com\//, '');
  const url = `https://www.instagram.com/${handle}/`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const { data } = await llm.run(
      page,
      Output.object({ schema: contactSchema }),
      {
        format: 'html',
        system: `This is an Instagram profile page for a Uruguayan business.
Extract any contact information visible in the bio or profile:
- Email addresses
- Phone numbers (including WhatsApp)
Return empty arrays if nothing found.`,
      }
    );

    return {
      emails: data?.emails ?? [],
      phones: data?.phones ?? [],
    };
  } catch {
    return { emails: [], phones: [] };
  }
}

export async function scrapeContactInfo(
  business: Business,
  context: BrowserContext
): Promise<ContactInfo> {
  const emails = new Set<string>();
  const phones = new Set<string>();

  // Try website first
  if (business.website) {
    const page = await context.newPage();
    try {
      console.log(`  [contact] Scraping website: ${business.website}`);
      const result = await scrapeContactFromPage(page, business.website);
      result.emails.forEach((e) => emails.add(e.toLowerCase().trim()));
      result.phones.forEach((p) => phones.add(p.trim()));
    } catch (err) {
      console.warn(`  [contact] Website scrape failed: ${(err as Error).message}`);
    } finally {
      await page.close();
    }
  }

  // Try Instagram if we still need data
  const instagramSource = business.instagram;
  if (instagramSource && (emails.size === 0 || phones.size === 0)) {
    const page = await context.newPage();
    try {
      console.log(`  [contact] Scraping Instagram: ${instagramSource}`);
      const result = await scrapeInstagram(page, instagramSource);
      result.emails.forEach((e) => emails.add(e.toLowerCase().trim()));
      result.phones.forEach((p) => phones.add(p.trim()));
    } catch (err) {
      console.warn(`  [contact] Instagram scrape failed: ${(err as Error).message}`);
    } finally {
      await page.close();
    }
  }

  // Include phone from directory listing if present
  if (business.phone && !phones.has(business.phone)) {
    phones.add(business.phone);
  }

  return {
    businessName: business.name,
    sourceUrl: business.website ?? business.instagram ?? '',
    emails: [...emails],
    phones: [...phones],
  };
}
