import { JobListing } from '../types.js';

const BASE = 'https://api.lever.co/v0/postings';

interface LeverJob {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt?: number;
  descriptionPlain?: string;
  lists?: { text?: string; content?: string }[];
  categories?: { location?: string; commitment?: string };
}

export async function fetchLeverJobs(boardToken: string): Promise<JobListing[]> {
  const res = await fetch(`${BASE}/${boardToken}?mode=json`);
  if (!res.ok) {
    throw new Error(`Lever fetch failed for board "${boardToken}": ${res.status}`);
  }
  const jobs = (await res.json()) as LeverJob[];
  return jobs.map((job) => normalizeJob(boardToken, job));
}

function normalizeJob(boardToken: string, job: LeverJob): JobListing {
  const listContent = (job.lists ?? []).map((l) => l.content ?? '').join(' ');
  const description = stripHtml([job.descriptionPlain, listContent].filter(Boolean).join(' '));
  const location = job.categories?.location ?? 'Unknown';
  return {
    sourceBoard: 'lever',
    boardToken,
    externalId: job.id,
    title: job.text,
    company: boardToken,
    location,
    remote: /remote/i.test(location) || job.categories?.commitment === 'Remote',
    url: job.hostedUrl,
    description,
    postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : undefined,
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
