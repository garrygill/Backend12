import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { ApplicantProfile, JobListing } from './types.js';

let anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic();
  }
  return anthropic;
}

export interface TailoredMaterials {
  resumeSummary: string;
  coverLetter: string;
}

export async function tailorApplication(profile: ApplicantProfile, job: JobListing): Promise<TailoredMaterials> {
  const prompt = `You are helping a job applicant tailor their application materials for one specific role.
Only use facts present in the base resume below - never invent experience, employers, titles, or skills.

APPLICANT NAME: ${profile.fullName}

APPLICANT BASE RESUME:
${profile.baseResumeText}

TARGET JOB TITLE: ${job.title}
TARGET COMPANY: ${job.company}
JOB DESCRIPTION:
${job.description.slice(0, 6000)}

Produce two things, clearly separated:
1. A tailored 3-4 sentence resume summary/headline that highlights the applicant's most relevant real experience for this specific role.
2. A concise, specific cover letter (under 300 words) addressed to the hiring team at ${job.company}, referencing 2-3 concrete points from the job description and how the applicant's actual background meets them.

Format your response exactly as:
RESUME_SUMMARY:
<text>

COVER_LETTER:
<text>`;

  const message = await getClient().messages.create({
    model: config.anthropicModel,
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  return parseTailoredText(text);
}

export function parseTailoredText(text: string): TailoredMaterials {
  const resumeMatch = text.match(/RESUME_SUMMARY:\s*([\s\S]*?)\n\s*COVER_LETTER:/i);
  const coverMatch = text.match(/COVER_LETTER:\s*([\s\S]*)/i);
  return {
    resumeSummary: resumeMatch?.[1]?.trim() ?? text.trim(),
    coverLetter: coverMatch?.[1]?.trim() ?? '',
  };
}
