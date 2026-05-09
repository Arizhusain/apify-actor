/**
 * LinkedIn scraper — uses the public guest jobs API endpoint (no auth needed).
 * The API returns raw HTML fragments; each <li> is one job card.
 * Full descriptions require a detail page visit (login-wall for some roles,
 * but the guest detail page at /jobs/view/{id} usually shows the description).
 */
import type { Page } from 'playwright';
import { load } from 'cheerio';
import type { JobListing, ScraperConfig } from '../types.js';
import { linkedInUrl } from '../utils/urlBuilder.js';
import { parseRelativeDate, getDaysAgo } from '../utils/dateParser.js';
import { generateId, calculateMatchScore, cleanText } from '../utils/helpers.js';
import { fetchJobDescription } from '../utils/descriptionFetcher.js';

export async function scrapeLinkedIn(page: Page, config: ScraperConfig): Promise<JobListing[]> {
  const jobs: JobListing[] = [];
  let start = 0;

  while (jobs.length < config.maxJobs) {
    const url = linkedInUrl(config, start);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(800 + Math.random() * 600);
      const html = await page.content();
      const $ = load(html);

      const cards = $('li');
      if (!cards.length) break;

      let newThisPage = 0;
      cards.each((_, el) => {
        if (jobs.length >= config.maxJobs) return false as unknown as void;

        const title = cleanText($(el).find('.base-search-card__title').text());
        const company = cleanText($(el).find('.base-search-card__subtitle').text());
        const location = cleanText($(el).find('.job-search-card__location').text());
        const jobUrl = $(el).find('a.base-card__full-link').attr('href')?.split('?')[0] ?? '';

        const timeEl = $(el).find('time');
        const rawDate = timeEl.attr('datetime') ?? cleanText(timeEl.text());

        if (!title || !company || !jobUrl) return;

        const postedDate = parseRelativeDate(rawDate);
        const postedDaysAgo = postedDate ? getDaysAgo(postedDate) : 0;
        if (postedDaysAgo > config.maxDaysOld) return;

        jobs.push({
          id: generateId('linkedin', jobUrl),
          title,
          company,
          location,
          description: '',
          requiredSkills: [],
          experience: `${config.yearsOfExperience}+ years`,
          salary: '',
          jobUrl,
          source: 'LinkedIn',
          postedDate: postedDate?.toISOString() ?? rawDate,
          postedDaysAgo,
          matchScore: calculateMatchScore(title, '', config.skills),
          scrapedAt: new Date().toISOString(),
        });
        newThisPage++;
      });

      if (newThisPage === 0 || cards.length < 10) break;
      start += 25;
    } catch (err) {
      console.error(`[LinkedIn] Error at start=${start}: ${err}`);
      break;
    }
  }

  if (config.fetchFullDescription) {
    for (const job of jobs) {
      const desc = await fetchJobDescription(page, job.jobUrl, 'linkedin');
      if (desc) job.description = desc;
    }
  }

  return jobs;
}
