export interface ActorInput {
  jobRole: string;
  skills: string[];
  yearsOfExperience: number;
  location: string;
  maxDaysOld: number;
  jobsPerPortal: number;
  portals: string[];
  useProxy: boolean;
  fetchFullDescription: boolean;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requiredSkills: string[];
  experience: string;
  salary: string;
  jobUrl: string;
  source: string;
  postedDate: string;
  postedDaysAgo: number;
  matchScore: number;
  scrapedAt: string;
}

export interface ScraperConfig {
  jobRole: string;
  skills: string[];
  yearsOfExperience: number;
  location: string;
  maxDaysOld: number;
  maxJobs: number;
  fetchFullDescription: boolean;
}
