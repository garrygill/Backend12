import express from 'express';
import { config } from './config.js';
import { authenticateAdmin, pb } from './pocketbase.js';
import { runPipelineForUser } from './pipeline.js';
import { submitApplicationByEmail } from './submit.js';
import { ApplicantProfile, ApplicationRecord } from './types.js';

const app = express();
app.use(express.json());

app.post('/run', async (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }
  try {
    const result = await runPipelineForUser(userId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/applications', async (req, res) => {
  const { userId, status } = req.query as { userId?: string; status?: string };
  if (!userId) {
    res.status(400).json({ error: 'userId query param is required' });
    return;
  }
  try {
    await authenticateAdmin();
    const filterParts = [`user = "${userId}"`];
    if (status) filterParts.push(`status = "${status}"`);
    const records = await pb.collection('applications').getFullList<ApplicationRecord>({
      filter: filterParts.join(' && '),
      sort: '-created',
    });
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Human-in-the-loop approval. Nothing is ever sent to an employer without
// this endpoint being called for that specific application.
app.post('/applications/:id/approve', async (req, res) => {
  try {
    await authenticateAdmin();
    const application = await pb.collection('applications').getOne<ApplicationRecord & { id: string }>(req.params.id);

    if (application.status !== 'pending_review') {
      res.status(409).json({ error: `application is in status "${application.status}", not "pending_review"` });
      return;
    }

    if (application.submissionMethod === 'email' && application.applyEmail) {
      const profile = await pb.collection('applicant_profiles').getFirstListItem<ApplicantProfile>(`user = "${application.user}"`);
      try {
        await submitApplicationByEmail(application, profile);
        const updated = await pb.collection('applications').update(application.id, { status: 'submitted' });
        res.json(updated);
      } catch (err) {
        const updated = await pb
          .collection('applications')
          .update(application.id, { status: 'error', errorMessage: (err as Error).message });
        res.status(502).json(updated);
      }
      return;
    }

    // No known auto-submit path (e.g. no apply email on the posting) -
    // hand the applicant the direct listing URL to finish it themselves.
    const updated = await pb.collection('applications').update(application.id, { status: 'manual_required' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/applications/:id/reject', async (req, res) => {
  try {
    await authenticateAdmin();
    const updated = await pb.collection('applications').update(req.params.id, { status: 'rejected' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(config.port, () => {
  console.log(`apply-engine listening on port ${config.port}`);
});
