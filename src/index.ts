/**
 * scrapper-web — CLI entry point
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npm run dev -- --rubro "opticas" --max 20
 *   ANTHROPIC_API_KEY=sk-... npm run dev -- --rubro "veterinarias" --max 10 --out ./results
 */

import { chromium } from 'playwright';
import { findBusinessesByRubro } from './directory-scraper.js';
import { scrapeContactInfo } from './contact-scraper.js';
import { exportToCSV, exportToJSON } from './exporter.js';
import type { ScrapeResult } from './types.js';

function parseArgs(): { rubro: string; max: number; out: string } {
  const args = process.argv.slice(2);
  let rubro = '';
  let max = 20;
  let out = './output';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--rubro' && args[i + 1]) rubro = args[++i];
    if (args[i] === '--max' && args[i + 1]) max = parseInt(args[++i], 10);
    if (args[i] === '--out' && args[i + 1]) out = args[++i];
  }

  if (!rubro) {
    console.error('Usage: npm run dev -- --rubro "opticas" [--max 20] [--out ./output]');
    process.exit(1);
  }

  return { rubro, max, out };
}

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error('Error: GROQ_API_KEY environment variable is required');
    process.exit(1);
  }

  const { rubro, max, out } = parseArgs();

  console.log(`\n=== scrapper-web ===`);
  console.log(`Rubro: ${rubro}`);
  console.log(`Max results: ${max}`);
  console.log(`Output dir: ${out}`);
  console.log('');

  // Step 1: Find businesses in Uruguay directories
  console.log(`[step 1] Finding "${rubro}" businesses in Uruguay...`);
  const businesses = await findBusinessesByRubro(rubro, max);
  console.log(`[step 1] Found ${businesses.length} businesses\n`);

  if (businesses.length === 0) {
    console.log('No businesses found. Try a different rubro.');
    process.exit(0);
  }

  // Step 2: Scrape contact info for each business
  console.log(`[step 2] Scraping contact info for ${businesses.length} businesses...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const results: ScrapeResult[] = [];

  for (let i = 0; i < businesses.length; i++) {
    const business = businesses[i];
    console.log(`[${i + 1}/${businesses.length}] ${business.name}`);

    if (!business.website && !business.instagram) {
      console.log(`  [skip] No website or Instagram found`);
      results.push({ business, contact: null, error: 'No website or Instagram available' });
      continue;
    }

    try {
      const contact = await scrapeContactInfo(business, context);
      results.push({ business, contact });
      console.log(
        `  emails: ${contact.emails.length > 0 ? contact.emails.join(', ') : 'none'} | ` +
          `phones: ${contact.phones.length > 0 ? contact.phones.join(', ') : 'none'}`
      );
    } catch (err) {
      const error = (err as Error).message;
      console.warn(`  [error] ${error}`);
      results.push({ business, contact: null, error });
    }

    // Small delay to be respectful to servers
    await new Promise((r) => setTimeout(r, 1000));
  }

  await context.close();
  await browser.close();

  // Step 3: Export results
  console.log(`\n[step 3] Exporting results...`);
  const safeName = rubro.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);
  const prefix = `${out}/${safeName}_${timestamp}`;

  // Ensure output directory exists
  const { mkdir } = await import('fs/promises');
  await mkdir(out, { recursive: true });

  await exportToCSV(results, `${prefix}.csv`);
  await exportToJSON(results, `${prefix}.json`);

  // Summary
  const withEmail = results.filter((r) => (r.contact?.emails.length ?? 0) > 0).length;
  const withPhone = results.filter((r) => (r.contact?.phones.length ?? 0) > 0).length;

  console.log(`\n=== Summary ===`);
  console.log(`Total businesses: ${results.length}`);
  console.log(`With email:       ${withEmail}`);
  console.log(`With phone:       ${withPhone}`);
  console.log(`Output:           ${prefix}.csv / .json`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
