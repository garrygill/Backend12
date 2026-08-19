import PocketBase from 'pocketbase';
import { config } from './config.js';

export const pb = new PocketBase(config.pocketbaseUrl);

let authPromise: Promise<void> | null = null;

export function authenticateAdmin(): Promise<void> {
  if (pb.authStore.isValid) {
    return Promise.resolve();
  }
  if (!authPromise) {
    authPromise = pb.admins
      .authWithPassword(config.pbAdminEmail, config.pbAdminPassword)
      .then(() => undefined)
      .finally(() => {
        authPromise = null;
      });
  }
  return authPromise;
}
