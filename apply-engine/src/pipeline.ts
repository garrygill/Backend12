import { authenticateAdmin, pb } from './pocketbase.js';
import { fetchGreenhouseJobs } from './sources/greenhouse.js';
import { fetchLeverJobs } from './sources/lever.js';
import { matchJob } from './matching.js';
import { tailorApplication } from './tailor.js';
import { ApplicantProfile, ApplicationRecord, JobCriteria, JobListing } from './types.js';

export interface PipelineResult {
  scanned: number;
  matched: number;
  created: number;
  errors: string[];
}

export async function runPipelineForUser(userId: string): Promise<PipelineResult> {
  await authenticateAdmin();

  const criteriaList = await pb.collection('job_criteria').getFullList<JobCriteria>({
    filter: `user = "${userId}" && active = true`,
  });

  if (criteriaList.length === 0) {
    return { scanned: 0, matched: 0, created: 0, errors: ['no active job_criteria records for this user'] };
  }

  const profile = await pb
    .collection('applicant_profiles')
    .getFirstListItem<ApplicantProfile>(`user = "${userId}"`)
    .catch(() => null);

  if (!profile) {
    return { scanned: 0, matched: 0, created: 0, errors: ['no applicant_profiles record for this user'] };
  }

  const result: PipelineResult = { scanned: 0, matched: 0, created: 0, errors: [] };

  for (const criteria of criteriaList) {
    const jobs = await fetchJobsForCriteria(criteria, result.errors);
    result.scanned += jobs.length;

    for (const job of jobs) {
      try {
        if (await hasExistingApplication(userId, job)) continue;

        const match = matchJob(job, criteria);
        if (!match.isMatch) continue;
        result.matched += 1;

        const tailored = await tailorApplication(profile, job);

        const record: Omit<ApplicationRecord, 'id'> = {
          user: userId,
          criteria: criteria.id,
          company: job.company,
          title: job.title,
          location: job.location,
          url: job.url,
          sourceBoard: job.sourceBoard,
          externalId: job.externalId,
          applyEmail: job.applyEmail,
          matchScore: match.score,
          matchReasons: match.reasons,
          tailoredResume: tailored.resumeSummary,
          tailoredCoverLetter: tailored.coverLetter,
          status: 'pending_review',
          submissionMethod: job.applyEmail ? 'email' : 'manual',
        };

        await pb.collection('applications').create(record);
        result.created += 1;
      } catch (err) {
        result.errors.push(`${job.sourceBoard}/${job.boardToken}/${job.externalId}: ${(err as Error).message}`);
      }
    }
  }

  return result;
}

async function fetchJobsForCriteria(criteria: JobCriteria, errors: string[]): Promise<JobListing[]> {
  const results: JobListing[] = [];
  for (const board of criteria.boardTokens) {
    try {
      const jobs = board.board === 'greenhouse' ? await fetchGreenhouseJobs(board.token) : await fetchLeverJobs(board.token);
      results.push(...jobs);
    } catch (err) {
      errors.push(`failed to fetch ${board.board}/${board.token}: ${(err as Error).message}`);
    }
  }
  return results;
}

async function hasExistingApplication(userId: string, job: JobListing): Promise<boolean> {
  try {
    await pb
      .collection('applications')
      .getFirstListItem(`user = "${userId}" && sourceBoard = "${job.sourceBoard}" && externalId = "${job.externalId}"`);
    return true;
  } catch {
    return false;
  }
}
