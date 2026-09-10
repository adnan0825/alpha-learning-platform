import fs from 'fs';
import path from 'path';

/**
 * Locate schema SQL files whether commands run from `backend/` (src) or use compiled `dist/`.
 */
export function resolveSqlFile(fileName: string): string {
  const candidates = [
    path.join(process.cwd(), 'src', 'config', fileName),
    path.join(process.cwd(), 'dist', 'config', fileName),
    path.join(__dirname, fileName),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    `Missing ${fileName}. Run npm scripts from the backend directory, or run "npm run build" so SQL is copied into dist/config.`
  );
}
