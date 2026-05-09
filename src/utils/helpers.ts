import { createHash } from 'node:crypto';
import type { JobListing } from '../types.js';
import { parseRelativeDate, getDaysAgo } from './dateParser.js';

export function generateId(source: string, url: string): string {
  const hash = createHash('md5').update(url).digest('hex').slice(0, 12);
  return `${source}-${hash}`;
}

export function calculateMatchScore(title: string, description: string, skills: string[]): number {
  if (!skills.length) return 0;
  const haystack = `${title} ${description}`.toLowerCase();
  const matched = skills.filter((s) => haystack.includes(s.toLowerCase())).length;
  return Math.round((matched / skills.length) * 100);
}

export function cleanText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Deduplicates jobs by URL and sorts by match score desc, then days ago asc. */
export function dedupeAndSort(jobs: JobListing[]): JobListing[] {
  const seen = new Set<string>();
  const unique = jobs.filter((j) => {
    if (seen.has(j.jobUrl)) return false;
    seen.add(j.jobUrl);
    return true;
  });
  return unique.sort((a, b) => b.matchScore - a.matchScore || a.postedDaysAgo - b.postedDaysAgo);
}

export function resolveDaysAgo(rawDate: string): number {
  const d = parseRelativeDate(rawDate);
  return d ? getDaysAgo(d) : 0;
}
