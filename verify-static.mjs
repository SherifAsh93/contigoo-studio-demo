import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { build, root, output, publicFiles } from './build.mjs';

await build();
const prefix = '/contigoo-studio-demo/';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = pathname.startsWith(prefix) ? pathname.slice(prefix.length) || 'index.html' : '';
  if (!publicFiles.includes(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'text/plain' });
  res.end(await readFile(path.join(output, file)));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
try {
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const address = `http://127.0.0.1:${server.address().port}${prefix}`;
  await page.goto(address, { waitUntil: 'networkidle0' }); await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.$$eval('.client-card', nodes => nodes.length), 3);
  assert(await page.$$eval('img', images => images.every(image => image.complete && image.naturalWidth > 0)));
  await page.click('[data-action="new-client"]');
  assert.equal(await page.$eval('#new-client-template', node => node.value), 'blank');
  await page.type('#new-client-name', 'Presentation Project');
  await page.click('#new-client-form button[type="submit"]');
  await page.click('[data-toggle-app="crm"]');
  assert.equal(await page.$eval('#project-monthly', node => node.textContent), 'EGP 1,500');
  await page.click('[data-edit-app="crm"]');
  await page.click('[data-run-app="crm"]'); await page.click('[data-runtime-page="form"]');
  await page.type('#runtime-record-form input[name="name"]', 'Presentation customer');
  await page.select('#runtime-record-form select[name="status"]', 'New');
  await page.click('#runtime-record-form button[type="submit"]');
  assert(await page.$eval('.runtime-table', node => node.textContent.includes('Presentation customer')));
  await page.click('[data-action="close-dialog"]');
  await page.click('[data-action="platform-site"]');
  assert(await page.$eval('.public-site img', image => image.complete && image.naturalWidth > 0));
  assert.deepEqual(errors, []);
  for (const privatePath of ['PROJECT_CONTEXT.md', '.env', 'package.json', 'verify.mjs']) assert.equal((await fetch(address + privatePath)).status, 404);
  const report = { verifiedAt: new Date().toISOString(), prefix, files: publicFiles, checks: ['Repository-subpath asset/module loading', 'Blank-first project creation', 'Module selection and pricing', 'Visual editing and record preview', 'Standalone website logo', 'No browser/asset errors', 'No private/development files exposed'], errors };
  await writeFile(path.join(root, 'static-validation-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('PASS: static deployment works beneath /contigoo-studio-demo/, including forms, pricing and assets.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
