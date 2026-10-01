import { execFileSync } from 'node:child_process';
import path from 'node:path';

/** Starts the throwaway, seeded Strapi on :1342 (fresh SQLite; never the dev database). */
export default function globalSetup() {
  execFileSync(path.join(__dirname, '../../server/scripts/test-server.sh'), ['start'], { stdio: 'inherit' });
}
