import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createPrototypeServer } from './server.mjs';
import { createClient, initialState, publishClient, addEntity, addField, toggleApp, templates, modules, STORAGE_KEY } from './model.mjs';
import { enhanceState, catalog, quoteFor, moneyToCents, setProjectPrice, setQuoteSettings, definitionFor, createCustomApp, addAppField, addWorkflow, saveDemoRecord, recordsFor, reusableTemplate } from './builder-model.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const shots = path.join(root, 'screenshots');
await mkdir(shots, { recursive: true });
const results = [];
const check = (name, action) => { action(); results.push({ name, status: 'passed' }); };

check('Sample registry: module identifiers are unique and the twelve starter modules are available', () => {
  assert.equal(modules.length, 12); assert.equal(new Set(modules.map(module => module.id)).size, modules.length);
});

check('Starters: blank is default, categories use valid distinct modules, legacy projects remain compatible', () => {
  assert.equal(templates[0].id, 'blank'); assert.equal(createClient('Blank by default').draft.apps.length, 0);
  assert(!templates.some(item => ['restaurant', 'company', 'store'].includes(item.id)));
  for (const starter of templates) {
    assert.equal(new Set(starter.apps).size, starter.apps.length);
    assert(starter.apps.every(id => modules.some(module => module.id === id)));
    assert.deepEqual(createClient('Framework project', starter.id).draft.apps, starter.apps);
  }
  assert.equal(createClient('Legacy restaurant', 'restaurant').industry, 'Restaurant');
  assert.equal(createClient('Legacy company', 'company').draft.fields[0].label, 'Branch');
});

check('Model: client configurations are independent and templates are not mutated', () => {
  const a = createClient('A', 'company'); const b = createClient('B', 'company');
  addEntity(a, 'Shipment'); toggleApp(a, 'crm'); a.draft.fields[0].label = 'Changed only for A';
  assert(!b.draft.entities.includes('Shipment')); assert(!b.draft.apps.includes('crm'));
  assert.equal(b.draft.fields[0].label, 'Branch');
  assert.equal(createClient('C', 'company').draft.fields[0].label, 'Branch');
});
check('Model: publish creates an immutable-by-copy snapshot and requires an app', () => {
  const a = createClient('A', 'company'); publishClient(a); a.draft.name = 'Draft name';
  assert.equal(a.published.name, 'A'); assert.equal(a.version, 1);
  assert.throws(() => publishClient(createClient('Empty', 'blank')), /Select at least/);
});
check('Model: entities and fields reject duplicates and invalid references/types', () => {
  const a = createClient('A', 'company');
  assert.throws(() => addEntity(a, 'request'), /already exists/);
  assert.throws(() => addField(a, { label: 'X', entity: 'Missing', type: 'Text' }), /existing entity/);
  assert.throws(() => addField(a, { label: 'X', entity: 'Request', type: 'Script' }), /supported/);
  addField(a, { label: 'Delivery', entity: 'Request', type: 'Date', required: true });
  assert.throws(() => addField(a, { label: 'delivery', entity: 'Request', type: 'Date' }), /already/);
});

check('Migration: existing client IDs, branding, shared fields and published snapshots survive', () => {
  const previous = initialState(); const client = createClient('Owner-created client', 'company', 'preserve-me');
  client.draft.logo = 'data:image/png;base64,demo'; addField(client, { entity: 'Request', label: 'Owner field', type: 'Text' });
  previous.clients.push(client); const beforePublished = JSON.stringify(previous.clients[0].published);
  enhanceState(previous); enhanceState(previous);
  assert.equal(previous.clients.length, 4); assert.equal(previous.clients[3].id, 'preserve-me');
  assert.equal(previous.clients[3].draft.logo, 'data:image/png;base64,demo');
  assert(previous.clients[3].draft.fields.some(field => field.label === 'Owner field'));
  assert.equal(JSON.stringify(previous.clients[0].published), beforePublished);
});
check('Pricing: additive minor-unit totals, removal, discounts and invalid values', () => {
  const state = enhanceState(initialState()); const client = state.clients[1]; client.draft.apps = ['crm', 'inventory']; enhanceState(state);
  setProjectPrice(state, client, 'crm', '19.99', '12.50'); setProjectPrice(state, client, 'inventory', '9.99', '0');
  setQuoteSettings(client, '5.50', '2', '10');
  assert.deepEqual([quoteFor(client.draft).subtotal, quoteFor(client.draft).discount, quoteFor(client.draft).monthly, quoteFor(client.draft).setup, quoteFor(client.draft).firstPayment], [3548, 355, 3193, 1450, 4643]);
  toggleApp(client, 'inventory'); assert.equal(quoteFor(client.draft).subtotal, 2549);
  toggleApp(client, 'inventory'); assert.equal(quoteFor(client.draft).subtotal, 3548);
  for (const value of ['-1', 'NaN', '1.001', 'Infinity']) assert.throws(() => moneyToCents(value));
  assert.throws(() => setQuoteSettings(client, '0', '0', '101'));
});
check('Pricing: catalog edits and draft edits do not change existing or published quotes', () => {
  const state = enhanceState(initialState()); const client = state.clients[1];
  const original = quoteFor(client.draft).monthly; publishClient(client);
  state.priceBook.inventory.monthly += 50000; enhanceState(state);
  assert.equal(quoteFor(client.draft).monthly, original);
  setProjectPrice(state, client, 'inventory', '22', '33');
  assert.equal(quoteFor(client.published).monthly, original);
  const newClient = createClient('New', 'company'); state.clients.push(newClient); enhanceState(state);
  assert.equal(newClient.draft.quote.prices.inventory.monthly, state.priceBook.inventory.monthly);
});
check('App runtime: required/type validation, create rules, notes, edits and client isolation', () => {
  const state = enhanceState(initialState()); const client = state.clients[1];
  const app = createCustomApp(state, client, { name: 'Test rentals', entityName: 'Rental', monthly: '10', setup: '20' });
  const def = definitionFor(state, client, app.id);
  const qty = addAppField(def, { entityId: 'records', label: 'Deposit', type: 'Number', required: true });
  addWorkflow(def, { name: 'Finish new', entityId: 'records', conditionField: 'status', conditionValue: 'New', action: 'set', targetField: 'status', value: 'Complete' });
  addWorkflow(def, { name: 'Audit note', entityId: 'records', action: 'note', value: 'Rental received' });
  assert.throws(() => saveDemoRecord(client, app.id, def, 'records', { name: '', status: 'New', [qty.id]: 1 }), /required/);
  assert.throws(() => saveDemoRecord(client, app.id, def, 'records', { name: 'Camera', status: 'New', [qty.id]: 'bad' }), /number/);
  assert.equal(recordsFor(client, app.id, 'records').length, 0);
  const record = saveDemoRecord(client, app.id, def, 'records', { name: 'Camera', status: 'New', [qty.id]: '200' });
  assert.equal(record.values.status, 'Complete'); assert.equal(record.values[qty.id], 200); assert.equal(client.workflowLog.length, 1);
  saveDemoRecord(client, app.id, def, 'records', { name: 'Camera edit', status: 'New', [qty.id]: 250 }, record.id);
  assert.equal(recordsFor(client, app.id, 'records').length, 1); assert.equal(client.workflowLog.length, 1);
  assert.equal(recordsFor(state.clients[0], app.id, 'records').length, 0);
  reusableTemplate(state, client, app.id);
  const other = state.clients[0]; toggleApp(other, app.id, catalog(state)); enhanceState(state);
  const copy = definitionFor(state, other, app.id); copy.entities[0].fields[0].label = 'Other label';
  assert.equal(def.entities[0].fields[0].label, 'Rental name');
  assert.equal(recordsFor(other, app.id, 'records').length, 0);
});

const server = createPrototypeServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await puppeteer.launch({ executablePath, headless: true });
const errors = [];
try {
  const page = await browser.newPage();
  const fill = async (selector, value) => {
    await page.focus(selector);
    await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
    await page.keyboard.press('Backspace'); await page.keyboard.type(value);
  };
  page.on('pageerror', error => { errors.push(error.message); console.error('Browser runtime error:', error.message); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.$$eval('.client-card', nodes => nodes.length), 3);
  await page.screenshot({ path: path.join(shots, '01-studio-overview.png'), fullPage: true });
  results.push({ name: 'Overview loads three demo clients and local branding assets', status: 'passed' });

  await page.click('[data-action="new-client"]');
  assert.equal(await page.$eval('#new-client-template', node => node.value), 'blank');
  const starterNames = await page.$$eval('#new-client-template option', nodes => nodes.map(node => node.textContent));
  assert(!starterNames.some(name => /restaurant|clothing/i.test(name)));
  assert(starterNames.some(name => name === 'ERP / Business suite'));
  assert(await page.$eval('#starter-detail', node => node.textContent.includes('No apps or app charges yet')));
  await page.screenshot({ path: path.join(shots, '10-blank-first-project.png'), fullPage: true });
  await page.select('#new-client-template', 'erp-framework');
  assert(await page.$eval('#starter-detail', node => node.textContent.includes('5 modules preselected') && node.textContent.includes('Finance')));
  await page.click('[data-action="close-dialog"]');
  results.push({ name: 'New project defaults to blank and explains category starter module/price selections', status: 'passed' });

  await page.click('[data-nav="builder"]');
  assert.equal(await page.$eval('#client-select', node => node.value), 'atlas');
  assert.equal(await page.$$eval('.module-select.selected', nodes => nodes.length), 4);
  await page.screenshot({ path: path.join(shots, '02-solution-builder.png'), fullPage: true });
  await page.click('[data-toggle-app="analytics"]');
  assert.equal(await page.$eval('[data-toggle-app="analytics"]', node => node.getAttribute('aria-pressed')), 'false');
  await page.click('[data-toggle-app="crm"]');
  assert.equal(await page.$eval('[data-toggle-app="crm"]', node => node.getAttribute('aria-pressed')), 'true');
  assert(await page.$eval('#live-preview', node => node.textContent.includes('CRM')));
  results.push({ name: 'App selection changes only the selected client draft and live preview', status: 'passed' });

  await page.click('[data-tab="brand"]');
  await fill('#brand-name', 'Atlas Custom');
  await page.click('[data-color="#79658b"]');
  assert(await page.$eval('#live-preview', node => node.textContent.includes('Atlas Custom')));
  await page.select('#client-select', 'noura');
  assert.equal(await page.$eval('#brand-name', node => node.value), 'Noura Restaurant');
  await page.select('#client-select', 'atlas');
  assert.equal(await page.$eval('#brand-name', node => node.value), 'Atlas Custom');
  assert.equal(await page.$eval('#brand-color', node => node.value), '#79658b');
  results.push({ name: 'Brand edits persist per client without changing another demo client', status: 'passed' });

  await page.click('[data-tab="fields"]');
  await page.type('#entity-name', 'Shipment'); await page.click('#entity-form button');
  await page.select('#field-entity', 'Shipment');
  await page.select('#field-type', 'Date'); await page.type('#field-name', 'Delivery date');
  await page.click('#field-required'); await page.click('#field-form button[type="submit"]');
  assert(await page.$eval('#live-preview', node => node.textContent.includes('Delivery date *')));
  await page.screenshot({ path: path.join(shots, '03-data-and-forms.png'), fullPage: true });
  results.push({ name: 'Entity/field creation updates the client form preview', status: 'passed' });

  await page.click('[data-action="publish"]');
  assert((await page.$eval('#draft-badge', node => node.textContent)).includes('Demo version 1'));
  const published = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).clients.find(client => client.id === 'atlas').published, STORAGE_KEY);
  assert.equal(published.name, 'Atlas Custom'); assert(published.fields.some(field => field.label === 'Delivery date'));
  await page.click('[data-tab="brand"]');
  await fill('#brand-name', 'Unpublished change');
  const snapshotName = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).clients.find(client => client.id === 'atlas').published.name, STORAGE_KEY);
  assert.equal(snapshotName, 'Atlas Custom');
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('[data-nav="builder"]'); await page.click('[data-tab="brand"]');
  assert.equal(await page.$eval('#brand-name', node => node.value), 'Unpublished change');
  results.push({ name: 'Demo publication snapshots config; subsequent edits and reload preserve draft/published separation', status: 'passed' });

  await page.click('[data-nav="templates"]'); await page.click('[data-template="erp-framework"]');
  await page.type('#new-client-name', 'Horizon Logistics'); await page.click('#new-client-form button[type="submit"]');
  assert.equal(await page.$$eval('.module-select.selected', nodes => nodes.length), 5);
  assert(await page.$eval('#client-select', node => node.selectedOptions[0].textContent.includes('Horizon')));
  const newConfig = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).clients.find(client => client.draft.name === 'Horizon Logistics'), STORAGE_KEY);
  assert(!newConfig.draft.entities.includes('Shipment')); assert.equal(newConfig.version, 0); assert.equal(newConfig.published, null);
  results.push({ name: 'New client starts from pristine template config without another client’s customizations', status: 'passed' });

  await page.click('[data-nav="apps"]'); await page.click('[data-category="Commerce"]');
  assert.equal(await page.$$eval('.library-card', nodes => nodes.length), 2);
  await page.type('#global-search', 'Horizon'); await page.keyboard.press('Enter');
  assert.equal(await page.$$eval('.client-card', nodes => nodes.length), 1);
  results.push({ name: 'App category filters and client search work', status: 'passed' });

  // Use pristine synthetic data for the remaining visual samples.
  await page.evaluate((key, initial) => localStorage.setItem(key, JSON.stringify(initial)), STORAGE_KEY, initialState());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('[data-preview="thread"]');
  assert(await page.$eval('#dialog .storefront', node => node.textContent.includes('Thread & Co.')));
  await page.screenshot({ path: path.join(shots, '04-client-storefront.png'), fullPage: true });
  await page.click('[data-action="close-dialog"]');
  await page.click('[data-action="platform-site"]');
  assert(await page.$eval('.public-site', node => node.textContent.includes('Built for your business.')));
  await page.screenshot({ path: path.join(shots, '05-platform-website.png'), fullPage: true });
  await page.click('[data-action="enter-studio"]');
  results.push({ name: 'Customer storefront and standalone platform website previews open and navigate', status: 'passed' });

  await page.click('[data-nav="builder"]'); await page.select('#client-select', 'thread');
  await page.click('[data-tab="brand"]');
  await (await page.$('#brand-logo')).uploadFile(path.join(root, 'assets', 'logo.png'));
  await page.waitForSelector('#live-preview .store-header .client-logo');
  assert(await page.$eval('#live-preview .store-header .client-logo', node => node.complete && node.naturalWidth > 0));
  await page.select('#client-select', 'noura');
  assert.equal(await page.$('#live-preview .client-logo'), null);
  results.push({ name: 'Uploaded logo renders on the storefront and remains client-specific', status: 'passed' });

  await page.evaluate((key, initial) => { localStorage.setItem(key, JSON.stringify(initial)); localStorage.removeItem(`${key}-before-builder-v2`); }, STORAGE_KEY, initialState());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('[data-nav="builder"]');
  assert.equal(await page.$eval('#project-monthly', node => node.textContent), 'EGP 3,500');
  assert(await page.$('[data-edit-app="inventory"]'));
  await page.click('[data-new-custom-app]');
  await page.type('#custom-app-name', 'Equipment Rentals'); await page.type('#custom-app-entity', 'Rental');
  await fill('#custom-app-monthly', '900.50'); await fill('#custom-app-setup', '250');
  await page.click('#custom-app-form button[type="submit"]');
  await page.waitForSelector('.designer-panel');
  const customId = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).customApps[0].id, STORAGE_KEY);
  await page.type('#app-field-label', 'Deposit'); await page.select('#app-field-type', 'Number'); await page.click('#app-field-required');
  await page.click('#app-field-form button[type="submit"]');
  const depositId = await page.evaluate((key, id) => JSON.parse(localStorage.getItem(key)).clients.find(client => client.id === 'atlas').draft.appDefinitions[id].entities[0].fields.find(field => field.label === 'Deposit').id, STORAGE_KEY, customId);
  await page.screenshot({ path: path.join(shots, '07-visual-app-builder.png'), fullPage: true });
  results.push({ name: 'Create custom app and design a typed required field without code or prompts', status: 'passed' });

  await page.click('[data-designer-tab="pages"]');
  await page.type('#app-page-name', 'Rental policy'); await page.select('#app-page-kind', 'Content');
  await page.type('#app-page-form textarea', 'Please return equipment on time. <script>window.bad = true</script>');
  await page.click('#app-page-form button[type="submit"]');
  await page.click('[data-designer-tab="workflow"]');
  await page.type('#workflow-name', 'Complete new rentals'); await page.select('#workflow-target', 'status');
  await page.type('#workflow-value', 'Complete'); await page.click('#app-workflow-form button[type="submit"]');
  await page.type('#workflow-name', 'Log rental'); await page.select('#workflow-action', 'note');
  await page.type('#workflow-value', 'Rental created through the visual app'); await page.click('#app-workflow-form button[type="submit"]');
  await page.click(`[data-run-app="${customId}"]`);
  await page.click('[data-runtime-page="form"]');
  await page.type('#runtime-record-form input[name="name"]', 'Camera rental');
  await page.select('#runtime-record-form select[name="status"]', 'New');
  await page.type(`#runtime-record-form input[name="${depositId}"]`, '250');
  await page.click('#runtime-record-form button[type="submit"]');
  assert(await page.$eval('.runtime-table', node => node.textContent.includes('Camera rental') && node.textContent.includes('Complete')));
  assert(await page.$eval('.runtime-log', node => node.textContent.includes('Rental created through the visual app')));
  await page.screenshot({ path: path.join(shots, '08-working-app-preview.png'), fullPage: true });
  await page.click('[data-runtime-edit]'); await fill('#runtime-record-form input[name="name"]', 'Camera rental updated');
  await page.click('#runtime-record-form button[type="submit"]');
  assert(await page.$eval('.runtime-table', node => node.textContent.includes('Camera rental updated')));
  const contentPageId = await page.evaluate((key, id) => JSON.parse(localStorage.getItem(key)).clients.find(client => client.id === 'atlas').draft.appDefinitions[id].pages.find(page => page.name === 'Rental policy').id, STORAGE_KEY, customId);
  await page.click(`[data-runtime-page="${contentPageId}"]`);
  assert(await page.$eval('.runtime-content-text', node => node.textContent.includes('<script>')));
  assert.equal(await page.evaluate(() => window.bad), undefined);
  await page.click('[data-action="close-dialog"]');
  results.push({ name: 'Visual pages render safely; forms save/edit records and on-create rules execute', status: 'passed' });

  await page.click('[data-save-app-template]');
  await page.click('[data-nav="templates"]'); await page.click('[data-template="blank"]');
  await page.type('#new-client-name', 'Second Rental Client'); await page.click('#new-client-form button[type="submit"]');
  assert.equal(await page.$$eval('.module-select.selected', nodes => nodes.length), 0);
  assert.equal(await page.$eval('#project-monthly', node => node.textContent), 'EGP 0');
  await page.click(`[data-toggle-app="${customId}"]`);
  assert.equal(await page.$eval('#project-monthly', node => node.textContent), 'EGP 900.5');
  await page.click(`[data-run-app="${customId}"]`); await page.click('[data-runtime-page="list"]');
  assert(await page.$eval('.runtime-table', node => node.textContent.includes('No records yet')));
  await page.click('[data-action="close-dialog"]');
  results.push({ name: 'Reusable custom app brings schema/rules to another client without copying records', status: 'passed' });

  await page.click('[data-open-pricing]');
  await fill(`[data-project-price="${customId}"] input[name="monthly"]`, '1200.75');
  await fill(`[data-project-price="${customId}"] input[name="setup"]`, '350');
  await page.click(`[data-project-price="${customId}"] button[type="submit"]`);
  await fill('#quote-settings input[name="monthly"]', '100.25'); await fill('#quote-settings input[name="setup"]', '50'); await fill('#quote-settings input[name="discount"]', '10');
  await page.click('#quote-settings button[type="submit"]');
  assert.equal(await page.$eval('#project-monthly', node => node.textContent), 'EGP 1,170.9');
  assert.equal(await page.$eval('#project-setup', node => node.textContent), 'EGP 400');
  await page.screenshot({ path: path.join(shots, '09-project-pricing.png'), fullPage: true });
  await page.click('[data-tab="apps"]'); await page.click('[data-toggle-app="crm"]');
  assert.equal(await page.$eval('#project-monthly', node => node.textContent), 'EGP 2,520.9');
  await page.click('[data-toggle-app="crm"]');
  assert.equal(await page.$eval('#project-monthly', node => node.textContent), 'EGP 1,170.9');
  await page.click('[data-action="publish"]');
  const secondId = await page.$eval('#client-select', node => node.value);
  const publishedAmount = await page.evaluate((key, id) => JSON.parse(localStorage.getItem(key)).clients.find(client => client.id === id).published.quote.prices, STORAGE_KEY, secondId);
  assert.equal(publishedAmount[customId].monthly, 120075);
  await page.select('#client-select', 'atlas');
  assert.equal(await page.$eval('#project-monthly', node => node.textContent), 'EGP 4,400.5');
  await page.reload({ waitUntil: 'networkidle0' }); await page.click('[data-nav="builder"]');
  assert.equal(await page.$eval('#project-monthly', node => node.textContent), 'EGP 4,400.5');
  assert(await page.evaluate(key => localStorage.getItem(`${key}-before-builder-v2`) !== null, STORAGE_KEY));
  results.push({ name: 'Project totals react to selection, overrides and discounts; quotes publish and survive reload independently', status: 'passed' });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  for (const next of ['overview', 'builder', 'templates', 'apps']) {
    await page.click(`[data-nav="${next}"]`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow in ${next}`);
  }
  await page.click('[data-nav="builder"]'); await page.click(`[data-edit-app="${customId}"]`);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow in app designer');
  await page.click('[data-nav="overview"]');
  await page.screenshot({ path: path.join(shots, '06-mobile-overview.png'), fullPage: true });
  results.push({ name: 'Overview, builder, templates and app library fit a 390px mobile viewport', status: 'passed' });

  assert.equal((await fetch(url + '/PROJECT_CONTEXT.md')).status, 404);
  assert.equal((await fetch(url + '/app.mjs', { method: 'POST' })).status, 404);
  assert.deepEqual(errors, []);
  results.push({ name: 'Local server limits exposed files/methods; no browser runtime errors', status: 'passed' });
  await writeFile(path.join(root, 'validation-report.json'), JSON.stringify({ date: new Date().toISOString(), scope: 'Local visual builder, generic record runtime and illustrative quotation checks only; no production authentication, server tenancy, payment, AI integration or deployment validation.', viewport: { desktop: '1440x1080', mobile: '390x844' }, results, browserErrors: errors, screenshots: 10 }, null, 2) + '\n');
  console.log(`PASS: ${results.length} catalog/model/browser checks. Ten screenshots saved under prototype/screenshots.`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
