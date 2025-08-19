import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { createR2Storage } from '../storage/r2-storage';

(async () => {
  const r2 = createR2Storage();
  if (!r2) {
    console.error('R2 not configured.');
    process.exit(1);
  }
  const uploads = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploads)) {
    console.log('No local uploads dir; nothing to migrate.');
    process.exit(0);
  }
  const files = fs.readdirSync(uploads);
  let ok = 0, fail = 0;
  for (const f of files) {
    const p = path.join(uploads, f);
    if (!fs.statSync(p).isFile()) continue;
    try {
      const buf = fs.readFileSync(p);
      await r2.putBuffer(f, buf, (mime.lookup(f) || 'application/octet-stream') as string);
      ok++;
      console.log('Uploaded:', f);
    } catch (e) {
      fail++; console.warn('Failed:', f, e);
    }
  }
  console.log(`Done. Success=${ok} Fail=${fail}`);
})();
