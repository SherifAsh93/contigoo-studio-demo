import { mkdir, readFile, writeFile, copyFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.dirname(fileURLToPath(import.meta.url));
export const output = path.join(root, 'dist');
export const publicFiles = [
  'index.html', 'app.js', 'model.js', 'builder-model.js', 'studio-ui.js', 'styles.css', 'studio.css',
  'assets/logo.png', 'assets/inter.woff2', 'assets/fraunces.woff2', 'assets/Inter-OFL.txt', 'assets/Fraunces-OFL.txt', '.nojekyll',
];

export async function build() {
  await mkdir(path.join(output, 'assets'), { recursive: true });
  // Refuse unexpected output rather than publishing unrelated files from an existing directory.
  async function checkDirectory(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      if (entry.isDirectory() && relative === 'assets') await checkDirectory(path.join(directory, entry.name), 'assets/');
      else if (!entry.isFile() || !publicFiles.includes(relative)) throw new Error(`Unexpected file in generated output: ${relative}`);
    }
  }
  await checkDirectory(output);
  const sources = ['index.html', 'app.mjs', 'model.mjs', 'builder-model.mjs', 'studio-ui.mjs', 'styles.css', 'studio.css'];
  for (const name of sources) {
    let text = await readFile(path.join(root, name), 'utf8');
    // Relative asset URLs work both at a domain root (Vercel) and a repository subpath (GitHub Pages).
    text = text.replaceAll('src="/', 'src="./').replaceAll('href="/', 'href="./').replaceAll("url('/assets/", "url('./assets/");
    text = text.replace(/(["']\.\/[^"']+)\.mjs(["'])/g, '$1.js$2');
    if (name === 'index.html') text = text.replace('src="./app.mjs"', 'src="./app.js"');
    await writeFile(path.join(output, name.replace(/\.mjs$/, '.js')), text);
  }
  for (const name of ['logo.png', 'inter.woff2', 'fraunces.woff2', 'Inter-OFL.txt', 'Fraunces-OFL.txt']) await copyFile(path.join(root, 'assets', name), path.join(output, 'assets', name));
  await writeFile(path.join(output, '.nojekyll'), '');
  console.log(`Static presentation build: ${publicFiles.length} allowlisted files in dist/.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
