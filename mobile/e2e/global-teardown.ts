import { execFileSync } from 'node:child_process';
import path from 'node:path';

export default function globalTeardown() {
  execFileSync(path.join(__dirname, '../../server/scripts/test-server.sh'), ['stop'], { stdio: 'inherit' });
}
