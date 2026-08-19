import { JobCriteria, JobListing } from './types.js';

export interface MatchResult {
  isMatch: boolean;
  score: number;
  reasons: string[];
}

export function matchJob(job: JobListing, criteria: JobCriteria): MatchResult {
  const titleLower = job.title.toLowerCase();

  const titleHit = criteria.titleKeywords.some((kw) => titleLower.includes(kw.toLowerCase()));
  if (!titleHit) {
    return { isMatch: false, score: 0, reasons: ['title does not match any target keyword'] };
  }

  const excludeHit = criteria.excludeKeywords.some((kw) => titleLower.includes(kw.toLowerCase()));
  if (excludeHit) {
    return { isMatch: false, score: 0, reasons: ['title contains an excluded keyword'] };
  }

  const locationLower = job.location.toLowerCase();
  const remoteHit = criteria.remoteOk && job.remote;
  const locationHit = remoteHit || criteria.locations.some((loc) => locationLower.includes(loc.toLowerCase()));
  if (!locationHit) {
    return { isMatch: false, score: 0, reasons: ['location does not match any target location'] };
  }

  const reasons: string[] = ['title matches target keywords', remoteHit ? 'remote-friendly' : 'location matches'];
  let score = 70;

  if (criteria.salaryMin) {
    const jobCeiling = job.salaryMax ?? job.salaryMin;
    if (jobCeiling !== undefined) {
      if (jobCeiling < criteria.salaryMin) {
        return { isMatch: false, score: 0, reasons: [...reasons, 'posted salary range is below minimum expectation'] };
      }
      score += 20;
      reasons.push('salary range meets expectation');
    } else {
      reasons.push('salary not posted, could not verify against expectation');
    }
  }

  score += 10;
  return { isMatch: true, score: Math.min(score, 100), reasons };
}
