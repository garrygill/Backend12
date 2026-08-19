export type SourceBoard = 'greenhouse' | 'lever';

export interface JobListing {
  sourceBoard: SourceBoard;
  boardToken: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  applyEmail?: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  postedAt?: string;
}

export interface BoardTokenConfig {
  board: SourceBoard;
  token: string;
}

export interface JobCriteria {
  id: string;
  user: string;
  label?: string;
  titleKeywords: string[];
  excludeKeywords: string[];
  locations: string[];
  remoteOk: boolean;
  salaryMin?: number;
  boardTokens: BoardTokenConfig[];
  active: boolean;
}

export interface ApplicantProfile {
  id: string;
  user: string;
  fullName: string;
  email: string;
  phone?: string;
  baseResumeText: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  notes?: string;
}

export type ApplicationStatus =
  | 'found'
  | 'tailoring'
  | 'pending_review'
  | 'approved'
  | 'submitted'
  | 'manual_required'
  | 'rejected'
  | 'error';

export interface ApplicationRecord {
  id?: string;
  user: string;
  criteria?: string;
  company: string;
  title: string;
  location: string;
  url: string;
  sourceBoard: SourceBoard;
  externalId: string;
  applyEmail?: string;
  matchScore: number;
  matchReasons: string[];
  tailoredResume?: string;
  tailoredCoverLetter?: string;
  status: ApplicationStatus;
  submissionMethod?: 'email' | 'manual';
  errorMessage?: string;
}
