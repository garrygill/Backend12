import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTailoredText } from '../tailor.js';

test('parses a well-formed Claude response into resume summary + cover letter', () => {
  const text = `RESUME_SUMMARY:
Backend engineer with 6 years building payments infrastructure.

COVER_LETTER:
Dear Hiring Team,

I'm excited to apply.

Best,
Jane`;

  const result = parseTailoredText(text);
  assert.equal(result.resumeSummary, 'Backend engineer with 6 years building payments infrastructure.');
  assert.ok(result.coverLetter.startsWith('Dear Hiring Team,'));
});

test('falls back to using the whole text as the resume summary if the format is unexpected', () => {
  const text = 'Some unstructured model output without the expected markers.';
  const result = parseTailoredText(text);
  assert.equal(result.resumeSummary, text);
  assert.equal(result.coverLetter, '');
});
