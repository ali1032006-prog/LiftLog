// Vercel never uploads folders named "node_modules", but `expo export` puts icon fonts and
// images under dist/assets/node_modules. Rename that folder and rewrite references to it.
const fs = require('fs');
const path = require('path');

const dist = path.resolve('dist'); // run from the project root (npm run build:web)
const from = path.join(dist, 'assets', 'node_modules');
const to = path.join(dist, 'assets', 'pkg');

if (fs.existsSync(from)) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.renameSync(from, to);
}

let rewritten = 0;
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|html|json|css)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      if (text.includes('assets/node_modules/')) {
        fs.writeFileSync(full, text.split('assets/node_modules/').join('assets/pkg/'));
        rewritten++;
      }
    }
  }
})(dist);

console.log(`fix-web-assets: moved assets/node_modules -> assets/pkg, rewrote ${rewritten} file(s)`);
