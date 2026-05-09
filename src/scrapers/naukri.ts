/**
 * Naukri.com scraper — India's largest job portal.
 * React-rendered; requires waitForSelector before parsing.
 */
import type { Page } from 'playwright';
import { load } from 'cheerio';
import type { JobListing, ScraperConfig } from '../types.js';
import { naukriUrl } from '../utils/urlBuilder.js';
import { parseRelativeDate, getDaysAgo } from '../utils/dateParser.js';
import { generateId, calculateMatchScore, cleanText } from '../utils/helpers.js';
import { fetchJobDescription } from '../utils/descriptionFetcher.js';

const BASE = 'https://www.naukri.com';

export async function scrapeNaukri(page: Page, config: ScraperConfig): Promise<JobListing[]> {
  const jobs: JobListing[] = [];

  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-IN,en;q=0.9' });

  let pageNum = 1;
  while (jobs.length < config.maxJobs && pageNum <= 3) {
    const url = pageNum === 1 ? naukriUrl(config) : `${naukriUrl(config)}&pageNo=${pageNum}`;

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35_000 });
      await page.waitForSelector('.srp-jobtuple-wrapper, .jobTuple', { timeout: 15_000 }).catch(() => null);
      await page.waitForTimeout(1200 + Math.random() * 800);

      const html = await page.content();
      const $ = load(html);

      const cards = $('.srp-jobtuple-wrapper, .jobTuple');
      if (!cards.length) break;

      let added = 0;
      cards.each((_, el) => {
        if (jobs.length >= config.maxJobs) return false as unknown as void;

        const titleEl = $(el).find('.title, a.title, .jobTitle').first();
        const title = cleanText(titleEl.text());
        const rawHref = titleEl.attr('href') ?? '';
        const jobUrl = rawHref.startsWith('http') ? rawHref : `${BASE}${rawHref}`;

        const company = cleanText($(el).find('.comp-name, .companyInfo .name').first().text());
        const location = cleanText($(el).find('.loc, .locWdth, .location').first().text());
        const experience = cleanText($(el).find('.expwdth, .experience').first().text());
        const salary = cleanText($(el).find('.salary, .sal').first().text());

        const skills = $(el)
          .find('.tags-gt li, .skill-badge span, .tag-li')
          .map((_, s) => cleanText($(s).text()))
          .get()
          .filter(Boolean);

        // Naukri cards sometimes show a short description snippet
        const snippet = cleanText(
          $(el).find('.job-description, .job-desc, [class*="snippet"]').first().text(),
        );

        const rawDate = cleanText($(el).find('.job-post-day, .postDays, .postedDate').first().text());
        const postedDate = parseRelativeDate(rawDate);
        const postedDaysAgo = postedDate ? getDaysAgo(postedDate) : 0;
        if (postedDaysAgo > config.maxDaysOld) return;

        if (!title || !company) return;

        jobs.push({
          id: generateId('naukri', jobUrl),
          title,
          company,
          location,
          description: snippet,
          requiredSkills: skills,
          experience,
          salary,
          jobUrl,
          source: 'Naukri',
          postedDate: postedDate?.toISOString() ?? rawDate,
          postedDaysAgo,
          matchScore: calculateMatchScore(title, skills.join(' ') + ' ' + snippet, config.skills),
          scrapedAt: new Date().toISOString(),
        });
        added++;
      });

      if (added === 0) break;
      pageNum++;
    } catch (err) {
      console.error(`[Naukri] Error at page=${pageNum}: ${err}`);
      break;
    }
  }

  if (config.fetchFullDescription) {
    for (const job of jobs) {
      const desc = await fetchJobDescription(page, job.jobUrl, 'naukri');
      if (desc) job.description = desc;
    }
  }

  return jobs;
}
