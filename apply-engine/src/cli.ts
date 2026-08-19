import { authenticateAdmin, pb } from './pocketbase.js';
import { runPipelineForUser } from './pipeline.js';

interface PbUser {
  id: string;
}

async function main(): Promise<void> {
  await authenticateAdmin();
  const users = await pb.collection('users').getFullList<PbUser>();

  for (const user of users) {
    try {
      const result = await runPipelineForUser(user.id);
      console.log(`user ${user.id}: scanned=${result.scanned} matched=${result.matched} created=${result.created}`);
      if (result.errors.length > 0) {
        console.warn(`user ${user.id} had ${result.errors.length} error(s):`, result.errors);
      }
    } catch (err) {
      console.error(`user ${user.id} pipeline failed:`, err);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
