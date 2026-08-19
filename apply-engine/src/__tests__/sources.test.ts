import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { fetchGreenhouseJobs } from '../sources/greenhouse.js';
import { fetchLeverJobs } from '../sources/lever.js';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function fakeFetch(body: unknown, ok = true): typeof fetch {
  return (async () =>
    ({
      ok,
      status: ok ? 200 : 500,
      json: async () => body,
    }) as Response) as typeof fetch;
}

test('normalizes a Greenhouse job, marks it remote, and extracts the apply email', async () => {
  global.fetch = fakeFetch({
    jobs: [
      {
        id: 42,
        title: 'Remote Backend Engineer',
        absolute_url: 'https://boards.greenhouse.io/acme/jobs/42',
        updated_at: '2026-01-01T00:00:00Z',
        location: { name: 'Remote - US' },
        content: '<p>Great role.</p><p>To apply, email us at jobs@acme.example.</p>',
      },
    ],
  });

  const jobs = await fetchGreenhouseJobs('acme');
  assert.equal(jobs.length, 1);
  const [job] = jobs;
  assert.equal(job.sourceBoard, 'greenhouse');
  assert.equal(job.externalId, '42');
  assert.equal(job.remote, true);
  assert.equal(job.applyEmail, 'jobs@acme.example');
  assert.ok(!job.description.includes('<p>'), 'html tags should be stripped');
});

test('throws with a clear message when the Greenhouse board fetch fails', async () => {
  global.fetch = fakeFetch({}, false);
  await assert.rejects(() => fetchGreenhouseJobs('missing-board'), /Greenhouse fetch failed/);
});

test('normalizes a Lever job and combines description parts', async () => {
  global.fetch = fakeFetch([
    {
      id: 'job-1',
      text: 'Staff Product Designer',
      hostedUrl: 'https://jobs.lever.co/acme/job-1',
      createdAt: 1700000000000,
      descriptionPlain: 'We design things.',
      lists: [{ content: '<ul><li>Ship features</li></ul>' }],
      categories: { location: 'New York', commitment: 'Full-time' },
    },
  ]);

  const jobs = await fetchLeverJobs('acme');
  assert.equal(jobs.length, 1);
  const [job] = jobs;
  assert.equal(job.sourceBoard, 'lever');
  assert.equal(job.title, 'Staff Product Designer');
  assert.equal(job.remote, false);
  assert.ok(job.description.includes('We design things.'));
  assert.ok(job.description.includes('Ship features'));
});
