import PocketBase from 'pocketbase';
import { config } from './config.js';

export const pb = new PocketBase(config.pocketbaseUrl);

let authPromise: Promise<void> | null = null;

export function authenticateAdmin(): Promise<void> {
  if (pb.authStore.isValid) {
    return Promise.resolve();
  }
  if (!authPromise) {
    if (!config.pbAdminEmail || !config.pbAdminPassword) {
      return Promise.reject(new Error('Missing PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD environment variables'));
    }
    authPromise = pb.admins
      .authWithPassword(config.pbAdminEmail, config.pbAdminPassword)
      .then(() => undefined)
      .finally(() => {
        authPromise = null;
      });
  }
  return authPromise;
}
