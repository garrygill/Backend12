import nodemailer, { Transporter } from 'nodemailer';
import { config } from './config.js';
import { ApplicantProfile, ApplicationRecord } from './types.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    throw new Error('SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) - cannot auto-submit by email');
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

export async function submitApplicationByEmail(application: ApplicationRecord, profile: ApplicantProfile): Promise<void> {
  if (!application.applyEmail) {
    throw new Error('application has no applyEmail on record');
  }
  const transport = getTransporter();
  await transport.sendMail({
    from: `"${profile.fullName}" <${profile.email}>`,
    to: application.applyEmail,
    subject: `Application for ${application.title} - ${profile.fullName}`,
    text: `${application.tailoredCoverLetter}\n\n---\n${application.tailoredResume}\n\n${profile.linkedinUrl ?? ''}\n${profile.portfolioUrl ?? ''}`,
  });
}
