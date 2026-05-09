import type { ScraperConfig } from '../types.js';

const enc = encodeURIComponent;

export function linkedInUrl(config: ScraperConfig, start = 0): string {
  const tprSeconds = config.maxDaysOld * 86400;
  return (
    `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search` +
    `?keywords=${enc(config.jobRole)}` +
    `&location=${enc(config.location)}` +
    `&f_TPR=r${tprSeconds}` +
    `&sortBy=DD&count=25&start=${start}`
  );
}

export function naukriUrl(config: ScraperConfig): string {
  const role = slug(config.jobRole);
  const loc = slug(config.location);
  const expMin = config.yearsOfExperience;
  const expMax = expMin + 3;
  return `https://www.naukri.com/${role}-jobs-in-${loc}-${expMin}to${expMax}years?experience=${expMin}`;
}

export function indeedDetailUrl(jk: string): string {
  return `https://in.indeed.com/viewjob?jk=${jk}`;
}

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '-');
}
