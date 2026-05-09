import { Actor, log } from 'apify';
import { PlaywrightCrawler, createPlaywrightRouter, Dataset } from 'crawlee';

import type { ActorInput, JobListing, ScraperConfig } from './types.js';
import { scrapeLinkedIn } from './scrapers/linkedin.js';
import { scrapeNaukri } from './scrapers/naukri.js';
import { dedupeAndSort } from './utils/helpers.js';
import { linkedInUrl, naukriUrl } from './utils/urlBuilder.js';

await Actor.init();

// ── Input ─────────────────────────────────────────────────────────────────────

const rawInput = (await Actor.getInput<Partial<ActorInput>>()) ?? {};

const input: ActorInput = {
  jobRole: rawInput.jobRole ?? 'Software Engineer',
  skills: rawInput.skills ?? [],
  yearsOfExperience: rawInput.yearsOfExperience ?? 3,
  location: rawInput.location ?? 'Bangalore',
  maxDaysOld: rawInput.maxDaysOld ?? 10,
  jobsPerPortal: rawInput.jobsPerPortal ?? 15,
  portals: rawInput.portals?.length ? rawInput.portals : ['linkedin', 'naukri'],
  useProxy: rawInput.useProxy ?? true,
  fetchFullDescription: rawInput.fetchFullDescription ?? false,
};

log.info('Starting job aggregation', {
  jobRole: input.jobRole,
  location: input.location,
  skills: input.skills,
  yearsOfExperience: input.yearsOfExperience,
  maxDaysOld: input.maxDaysOld,
  portals: input.portals,
});

const config: ScraperConfig = {
  jobRole: input.jobRole,
  skills: input.skills,
  yearsOfExperience: input.yearsOfExperience,
  location: input.location,
  maxDaysOld: input.maxDaysOld,
  maxJobs: input.jobsPerPortal,
  fetchFullDescription: input.fetchFullDescription,
};

// ── Proxy ─────────────────────────────────────────────────────────────────────
// APIFY_PROXY_PASSWORD is read from the environment automatically.
// • Locally:   set it in your .env file
// • On Apify:  injected automatically — no config needed

const proxyConfiguration = input.useProxy
  ? await Actor.createProxyConfiguration({ groups: ['RESIDENTIAL'] }).catch(() => {
      log.warning('Proxy unavailable (APIFY_PROXY_PASSWORD not set?). Running without proxy.');
      return undefined;
    })
  : undefined;

if (proxyConfiguration) log.info('Proxy: residential proxy active');

// ── Router ────────────────────────────────────────────────────────────────────

const router = createPlaywrightRouter();
const allResults: JobListing[] = [];

router.addHandler('LINKEDIN', async ({ page }) => {
  log.info('[LinkedIn] Starting scrape…');
  const jobs = await scrapeLinkedIn(page, config);
  log.info(`[LinkedIn] Collected ${jobs.length} jobs`);
  allResults.push(...jobs);
});

router.addHandler('NAUKRI', async ({ page }) => {
  log.info('[Naukri] Starting scrape…');
  const jobs = await scrapeNaukri(page, config);
  log.info(`[Naukri] Collected ${jobs.length} jobs`);
  allResults.push(...jobs);
});

// ── Start requests ────────────────────────────────────────────────────────────

const PORTAL_SEED: Record<string, () => string> = {
  linkedin: () => linkedInUrl(config),
  naukri: () => naukriUrl(config),
};

const startRequests = input.portals
  .filter((p) => p in PORTAL_SEED)
  .map((portal) => ({
    url: PORTAL_SEED[portal](),
    label: portal.toUpperCase(),
    userData: { portal },
  }));

if (!startRequests.length) {
  log.error('No valid portals selected. Exiting.');
  await Actor.exit();
  process.exit(0);
}

// ── Crawler ───────────────────────────────────────────────────────────────────

const crawler = new PlaywrightCrawler({
  requestHandler: router,
  proxyConfiguration,
  headless: true,
  maxConcurrency: 2,
  requestHandlerTimeoutSecs: 600,
  maxRequestRetries: 1,
  browserPoolOptions: {
    useFingerprints: true,
  },
  launchContext: {
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    },
  },
});

await crawler.run(startRequests);

// ── Save & summarise ──────────────────────────────────────────────────────────

const finalJobs = dedupeAndSort(allResults);

log.info(`Saving ${finalJobs.length} unique jobs to dataset…`);
await Dataset.pushData(finalJobs);

const summary: Record<string, number> = {};
for (const job of finalJobs) {
  summary[job.source] = (summary[job.source] ?? 0) + 1;
}

log.info('── Aggregation complete ──────────────────');
for (const [portal, count] of Object.entries(summary)) {
  log.info(`  ${portal.padEnd(14)}: ${count} jobs`);
}
log.info(`  ${'TOTAL'.padEnd(14)}: ${finalJobs.length} jobs`);
log.info('─────────────────────────────────────────');

await Actor.exit();
