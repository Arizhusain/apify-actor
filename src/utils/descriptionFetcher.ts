/**
 * Fetches the full job description for a listing.
 *
 * LinkedIn special-case: the regular /jobs/view/ page blocks unauthenticated
 * requests. We use the public guest API instead:
 *   https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{jobId}
 * which returns an HTML fragment with the full description — no login needed.
 */
import type { Page } from 'playwright';
import { load } from 'cheerio';
import { cleanText } from './helpers.js';

const SELECTORS: Record<string, string[]> = {
  linkedin: [
    '.description__text--rich',
    '.show-more-less-html__markup',
    '.description__text',
    '[class*="description"]',
  ],
  indeed: [
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    '[data-testid="jobDescriptionText"]',
    '[class*="jobDescription"]',
  ],
  naukri: [
    '.job-desc',
    '.dang-inner-html',
    '[class*="jobDescription"]',
    '.jd-desc',
    '[class*="job-desc"]',
  ],
  shine: [
    '.jobDesc',
    '.job-description',
    '[class*="jobDesc"]',
    '[class*="description"]',
  ],
  monster: [
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '.job-desc',
    '[class*="description"]',
  ],
};

export async function fetchJobDescription(
  page: Page,
  jobUrl: string,
  source: string,
): Promise<string> {
  if (!jobUrl) return '';
  if (source.toLowerCase().includes('google')) return '';

  const src = source.toLowerCase();

  try {
    if (src === 'linkedin') {
      return await fetchLinkedInDescription(page, jobUrl);
    }

    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await page.waitForTimeout(700 + Math.random() * 500);

    const html = await page.content();
    const $ = load(html);

    const selectors = SELECTORS[src] ?? [];
    for (const sel of selectors) {
      const text = cleanText($(sel).first().text());
      if (text.length > 80) return text;
    }

    // Generic fallback: largest element whose id/class contains "description"
    let best = '';
    $('[id*="escription"], [class*="escription"]').each((_, el) => {
      const t = cleanText($(el).text());
      if (t.length > best.length) best = t;
    });
    return best.slice(0, 5000);
  } catch (err) {
    console.warn(`[descriptionFetcher] Failed for ${jobUrl}: ${err}`);
    return '';
  }
}

/**
 * LinkedIn guest job-posting API.
 * Extracts the numeric job ID from any linkedin.com/jobs/view/ URL, then
 * calls the unauthenticated fragment API which returns the full description.
 */
async function fetchLinkedInDescription(page: Page, jobUrl: string): Promise<string> {
  const jobId = extractLinkedInJobId(jobUrl);
  if (!jobId) {
    console.warn(`[descriptionFetcher] Could not extract LinkedIn job ID from: ${jobUrl}`);
    return '';
  }

  const apiUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;

  try {
    await page.goto(apiUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await page.waitForTimeout(600 + Math.random() * 400);

    const html = await page.content();
    const $ = load(html);

    for (const sel of SELECTORS.linkedin) {
      const text = cleanText($(sel).first().text());
      if (text.length > 80) return text;
    }

    // The fragment sometimes wraps everything in a single <div class="show-more-less-html">
    const fallback = cleanText($('body').text());
    return fallback.length > 80 ? fallback.slice(0, 5000) : '';
  } catch (err) {
    console.warn(`[descriptionFetcher] LinkedIn guest API failed for job ${jobId}: ${err}`);
    return '';
  }
}

/** Extracts the trailing numeric ID from LinkedIn job URLs.
 *  Works for both www.linkedin.com and in.linkedin.com variants.
 *  e.g. ".../react-developer-at-siemens-4409710608" → "4409710608"
 */
function extractLinkedInJobId(url: string): string | null {
  const match = url.match(/(\d+)\/?$/);
  return match ? match[1] : null;
}
