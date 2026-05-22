/**
 * Exports scrape results to CSV and JSON formats.
 */

import { writeFile } from 'fs/promises';
import type { ScrapeResult } from './types.js';

export async function exportToCSV(results: ScrapeResult[], outputPath: string): Promise<void> {
  const header = 'Nombre,Emails,Teléfonos,Website,Instagram,Error';

  const rows = results.map((r) => {
    const emails = r.contact?.emails.join(' | ') ?? '';
    const phones = r.contact?.phones.join(' | ') ?? '';
    const website = r.business.website ?? '';
    const instagram = r.business.instagram ?? '';
    const error = r.error ?? '';

    // Escape CSV fields
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [
      escape(r.business.name),
      escape(emails),
      escape(phones),
      escape(website),
      escape(instagram),
      escape(error),
    ].join(',');
  });

  await writeFile(outputPath, [header, ...rows].join('\n'), 'utf-8');
  console.log(`[export] CSV written to ${outputPath}`);
}

export async function exportToJSON(results: ScrapeResult[], outputPath: string): Promise<void> {
  const data = results.map((r) => ({
    name: r.business.name,
    website: r.business.website,
    instagram: r.business.instagram,
    address: r.business.address,
    emails: r.contact?.emails ?? [],
    phones: r.contact?.phones ?? [],
    error: r.error,
  }));

  await writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[export] JSON written to ${outputPath}`);
}
