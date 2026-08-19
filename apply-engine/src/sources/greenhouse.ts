import { JobListing } from '../types.js';

const BASE = 'https://boards-api.greenhouse.io/v1/boards';

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  location?: { name?: string };
  content?: string;
}

export async function fetchGreenhouseJobs(boardToken: string): Promise<JobListing[]> {
  const res = await fetch(`${BASE}/${boardToken}/jobs?content=true`);
  if (!res.ok) {
    throw new Error(`Greenhouse fetch failed for board "${boardToken}": ${res.status}`);
  }
  const data = (await res.json()) as { jobs: GreenhouseJob[] };
  return data.jobs.map((job) => normalizeJob(boardToken, job));
}

function normalizeJob(boardToken: string, job: GreenhouseJob): JobListing {
  const location = job.location?.name ?? 'Unknown';
  const description = stripHtml(job.content ?? '');
  return {
    sourceBoard: 'greenhouse',
    boardToken,
    externalId: String(job.id),
    title: job.title,
    company: boardToken,
    location,
    remote: /remote/i.test(location) || /remote/i.test(job.title),
    url: job.absolute_url,
    applyEmail: extractApplyEmail(description),
    description,
    postedAt: job.updated_at,
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractApplyEmail(text: string): string | undefined {
  const match = text.match(/apply[^.\n]{0,40}?([\w.+-]+@[\w-]+\.[\w.-]*\w)/i) ?? text.match(/[\w.+-]+@[\w-]+\.[\w.-]*\w/);
  return match?.[1] ?? match?.[0];
}
