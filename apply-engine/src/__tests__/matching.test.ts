import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchJob } from '../matching.js';
import { JobCriteria, JobListing } from '../types.js';

function job(overrides: Partial<JobListing> = {}): JobListing {
  return {
    sourceBoard: 'greenhouse',
    boardToken: 'acme',
    externalId: '1',
    title: 'Senior Backend Engineer',
    company: 'acme',
    location: 'New York, NY',
    remote: false,
    url: 'https://boards.greenhouse.io/acme/jobs/1',
    description: 'Build backend services.',
    ...overrides,
  };
}

function criteria(overrides: Partial<JobCriteria> = {}): JobCriteria {
  return {
    id: 'c1',
    user: 'u1',
    titleKeywords: ['backend engineer'],
    excludeKeywords: [],
    locations: ['New York'],
    remoteOk: false,
    boardTokens: [],
    active: true,
    ...overrides,
  };
}

test('rejects when title has no keyword match', () => {
  const result = matchJob(job({ title: 'Product Designer' }), criteria());
  assert.equal(result.isMatch, false);
});

test('matches on title + location', () => {
  const result = matchJob(job(), criteria());
  assert.equal(result.isMatch, true);
  assert.ok(result.score > 0);
});

test('rejects when title contains excluded keyword', () => {
  const result = matchJob(job({ title: 'Staff Backend Engineer' }), criteria({ excludeKeywords: ['staff'] }));
  assert.equal(result.isMatch, false);
});

test('rejects when location does not match and remote not ok', () => {
  const result = matchJob(job({ location: 'London, UK' }), criteria({ locations: ['New York'], remoteOk: false }));
  assert.equal(result.isMatch, false);
});

test('matches remote job when remoteOk is true, regardless of listed location', () => {
  const result = matchJob(job({ location: 'Anywhere (Remote)', remote: true }), criteria({ locations: ['New York'], remoteOk: true }));
  assert.equal(result.isMatch, true);
  assert.ok(result.reasons.includes('remote-friendly'));
});

test('rejects when posted salary ceiling is below minimum expectation', () => {
  const result = matchJob(job({ salaryMax: 100000 }), criteria({ salaryMin: 150000 }));
  assert.equal(result.isMatch, false);
});

test('accepts when posted salary ceiling meets minimum expectation', () => {
  const result = matchJob(job({ salaryMin: 140000, salaryMax: 170000 }), criteria({ salaryMin: 150000 }));
  assert.equal(result.isMatch, true);
});

test('accepts and flags unverifiable salary when none is posted', () => {
  const result = matchJob(job(), criteria({ salaryMin: 150000 }));
  assert.equal(result.isMatch, true);
  assert.ok(result.reasons.some((r) => r.includes('could not verify')));
});
