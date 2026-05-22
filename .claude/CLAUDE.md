# scrapper-web

## Tech Stack

- **Runtime:** Node.js 20 + TypeScript (ESM)
- **Scraping:** [llm-scraper v2](https://github.com/mishushakov/llm-scraper) + Playwright (Chromium headless)
- **LLM:** Anthropic Claude via `@ai-sdk/anthropic` (model: `claude-sonnet-4-5`)
- **Schema validation:** Zod v4
- **Output formats:** CSV + JSON

## File Placement Guide

| File Type | Location Pattern | Example |
|-----------|------------------|---------|
| Source files | `src/` | `src/directory-scraper.ts` |
| Entry point | `src/index.ts` | CLI with `--rubro`, `--max`, `--out` flags |
| Types | `src/types.ts` | Shared interfaces |
| Config files | Root | `tsconfig.json`, `package.json` |
| Environment template | `.env.example` (root) | `ANTHROPIC_API_KEY=...` |

## Directory Structure

```
src/
  index.ts              # CLI entry point
  types.ts              # Shared types (Business, ContactInfo, ScrapeResult)
  directory-scraper.ts  # Finds businesses by rubro (Páginas Amarillas + Google Maps)
  contact-scraper.ts    # Extracts email/phone from websites + Instagram
  exporter.ts           # Writes CSV and JSON output
output/                 # Scrape results (gitignored)
.env.example            # Required env vars template
tsconfig.json
package.json
```

## Essential Commands

| Task | Command |
|------|---------|
| Run scraper | `ANTHROPIC_API_KEY=sk-... npm run dev -- --rubro "opticas" --max 20` |
| Build | `npm run build` |
| Type-check | `npx tsc --noEmit` |
| Install browsers | `npx playwright install chromium` |

## How It Works

1. **Directory phase** — visits Páginas Amarillas UY and Google Maps, uses LLM to extract a list of businesses with name, website, phone, Instagram handle
2. **Contact phase** — for each business, visits their website (trying to find a `/contacto` page) and/or Instagram profile, uses LLM to extract emails and phone numbers
3. **Export phase** — writes `output/{rubro}_{date}.csv` and `.json`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for LLM extraction |
