import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createPrototypeServer } from './server.mjs';
import { createClient, createProject, saveClientProfile, deleteClientProfile, updateProjectDetails, initialState as freshState, publishClient, publicationHistory, setProjectArchived, deleteProject, addEntity, addField, toggleApp, templates, modules, STORAGE_KEY } from './model.mjs';
import { legacyDemoState as initialState } from './test-fixtures.mjs';
import { enhanceState, catalog, quoteFor, moneyToCents, setProjectPrice, setQuoteSettings, definitionFor, createCustomApp, addAppField, addWorkflow, saveDemoRecord, recordsFor, reusableTemplate } from './builder-model.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const shots = path.join(root, 'screenshots');
await mkdir(shots, { recursive: true });
const results = [];
const check = (name, action) => { action(); results.push({ name, status: 'passed' }); };

check('Fresh workspace starts empty with no fabricated clients, projects or activity', () => {
  const state = enhanceState(freshState());
  assert.deepEqual(state.clientProfiles, []); assert.deepEqual(state.clients, []); assert.deepEqual(state.activity, []);
});

check('Project publications retain earlier configuration and quote snapshots, including legacy versions', () => {
  const state = enhanceState(initialState()); const project = state.clients[0];
  const old = structuredClone(project.published);
  const before = structuredClone(project);
  assert.equal(publicationHistory(project).length, 1); assert.deepEqual(project, before);
  setProjectPrice(state, project, 'crm', '99', '12'); publishClient(project);
  setProjectPrice(state, project, 'crm', '200', '50'); publishClient(project);
  const history = publicationHistory(project);
  assert.deepEqual(history.map(item => item.version), [3, 2, 1]);
  assert.deepEqual(history[2].config, old);
  assert.equal(history[1].config.quote.prices.crm.monthly, 9900);
  assert.equal(history[0].config.quote.prices.crm.monthly, 20000);
  project.draft.quote.prices.crm.monthly = 55000;
  assert.equal(project.published.quote.prices.crm.monthly, 20000);
  assert.equal(history[0].config.quote.prices.crm.monthly, 20000);
});

check('Project archive/reactivation and deletion preserve the client, other projects, data and shared assets', () => {
  const state = enhanceState(initialState()); const project = state.clients[1];
  saveDemoRecord(project, 'inventory', definitionFor(state, project, 'inventory'), 'records', { name: 'Kept record', quantity: 5, status: 'New' });
  publishClient(project);
  const original = structuredClone(project);
  assert.throws(() => setProjectArchived(project, 'yes'), /archive or reactivate/);
  setProjectArchived(project, true); assert.throws(() => publishClient(project), /Reactivate/);
  setProjectArchived(project, false);
  const { archived, ...rest } = project; assert.equal(archived, false); assert.deepEqual(rest, original);
  const clients = structuredClone(state.clientProfiles); const prices = structuredClone(state.priceBook);
  const other = structuredClone(state.clients.filter(item => item.id !== project.id));
  assert.throws(() => deleteProject(state, 'missing'), /Project not found/);
  deleteProject(state, project.id); enhanceState(state);
  assert.deepEqual(state.clients, other); assert.deepEqual(state.clientProfiles, clients); assert.deepEqual(state.priceBook, prices);
});

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
check('Client directory migration: repeatable linking preserves complete project data, including records and published quotes', () => {
  const state = enhanceState(initialState()); const project = state.clients[1];
  const def = definitionFor(state, project, 'inventory');
  saveDemoRecord(project, 'inventory', def, 'records', { name: 'Original stock', status: 'New', quantity: 8 });
  setProjectPrice(state, project, 'inventory', '23', '45'); publishClient(project);
  for (const item of state.clients) { delete item.clientId; delete item.name; delete item.description; }
  delete state.clientProfiles; delete state.directoryVersion;
  const before = structuredClone(state.clients);
  enhanceState(state); enhanceState(state);
  assert.equal(state.clientProfiles.length, 3);
  for (const [index, item] of state.clients.entries()) {
    const { clientId, name, description, ...original } = item;
    assert.deepEqual(original, before[index]);
    assert.equal(name, before[index].draft.name);
    assert.equal(state.clientProfiles.find(client => client.id === clientId).name, name);
    assert.equal(description, '');
  }
});
check('Client profiles: create without projects, validate atomic edits, keep project names and branding separate', () => {
  const state = enhanceState({ schema: 1, clients: [], activity: [] });
  assert.throws(() => saveClientProfile(state, { name: '  ' }), /client name/);
  assert.throws(() => saveClientProfile(state, { name: 'Test', email: 'bad' }), /valid contact email/);
  assert.equal(state.clientProfiles.length, 0);
  const owner = saveClientProfile(state, { name: ' Demo Client ', email: 'demo@example.test', notes: 'Some notes' });
  assert.equal(owner.name, 'Demo Client'); assert.equal(state.clients.length, 0);
  assert.throws(() => createProject(state, { name: 'Orphan', clientId: 'missing' }), /existing client/);
  assert.throws(() => createProject(state, { name: '   ', clientId: owner.id }), /project name/);
  assert.throws(() => createProject(state, { name: 'Too long', clientId: owner.id, description: 'x'.repeat(501) }), /description/);
  assert.equal(state.clients.length, 0);
  const project = createProject(state, { name: 'Operations', clientId: owner.id });
  const before = structuredClone(owner);
  assert.throws(() => saveClientProfile(state, { name: 'Invalid edit', email: 'broken' }, owner.id), /valid contact email/);
  assert.deepEqual(owner, before);
  saveClientProfile(state, { ...owner, name: 'Renamed client' }, owner.id);
  updateProjectDetails(project, { name: 'Operations v2', description: 'Internal tools' });
  assert.equal(project.draft.name, 'Demo Client'); assert.equal(project.name, 'Operations v2');
  assert.equal(project.clientId, owner.id); assert.equal(project.draft.apps.length, 0);
});
check('Multiple projects per client: app edits, records, quotes and publications are independent', () => {
  const state = enhanceState(initialState()); const owner = state.clientProfiles[1];
  const a = createProject(state, { name: 'Portal', clientId: owner.id, templateId: 'crm-framework' });
  const b = createProject(state, { name: 'Support', clientId: owner.id, templateId: 'crm-framework' });
  enhanceState(state);
  const def = definitionFor(state, a, 'crm');
  addAppField(def, { entityId: 'records', label: 'Region', type: 'Text' });
  saveDemoRecord(a, 'crm', def, 'records', { name: 'Synthetic contact', status: 'New' });
  setProjectPrice(state, a, 'crm', '44', '7'); publishClient(a); a.draft.color = '#123456';
  assert.equal(a.clientId, b.clientId); assert.notEqual(a.id, b.id);
  assert(!definitionFor(state, b, 'crm').entities[0].fields.some(field => field.label === 'Region'));
  assert.equal(recordsFor(b, 'crm', 'records').length, 0); assert.equal(b.published, null);
  assert.equal(b.draft.quote.prices.crm.monthly, 150000); assert.notEqual(b.draft.color, a.draft.color);
  assert.equal(a.published.quote.prices.crm.monthly, 4400);
});

function clientManagementFixture() {
  const state = enhanceState(initialState());
  const atlas = state.clients[1]; const other = state.clients[0];
  createProject(state, { name: 'Atlas support', clientId: atlas.clientId, templateId: 'service-framework' });
  const app = createCustomApp(state, atlas, { name: 'Shared rentals', entityName: 'Rental', monthly: '12', setup: '34' });
  saveDemoRecord(atlas, app.id, definitionFor(state, atlas, app.id), 'records', { name: 'Atlas rental', status: 'New' });
  reusableTemplate(state, atlas, app.id); publishClient(atlas);
  toggleApp(other, app.id, catalog(state)); enhanceState(state);
  saveDemoRecord(other, app.id, definitionFor(state, other, app.id), 'records', { name: 'Keep other rental', status: 'New' });
  return state;
}

check('Client deletion: explicit related-project confirmation, atomic rejection and preservation of unrelated clients and shared templates', () => {
  const state = clientManagementFixture(); const before = structuredClone(state);
  assert.throws(() => deleteClientProfile(state, 'missing'), /Client not found/);
  assert.throws(() => deleteClientProfile(state, 'client-atlas'), /Confirm deletion/);
  assert.throws(() => deleteClientProfile(state, 'client-atlas', { deleteProjects: 'true' }), /Confirm deletion/);
  assert.deepEqual(state, before);
  const result = deleteClientProfile(state, 'client-atlas', { deleteProjects: true });
  assert.equal(result.projectCount, 2);
  assert.deepEqual(state.clients, before.clients.filter(project => project.clientId !== 'client-atlas'));
  assert.deepEqual(state.clientProfiles, before.clientProfiles.filter(client => client.id !== 'client-atlas'));
  assert.deepEqual(state.customApps, before.customApps); assert.deepEqual(state.priceBook, before.priceBook);
  const reloaded = enhanceState(JSON.parse(JSON.stringify(state)));
  assert(!reloaded.clientProfiles.some(client => client.id === 'client-atlas'));
  assert(!reloaded.clients.some(project => project.clientId === 'client-atlas'));
});
check('Client deletion: standalone clients and the last client can be removed without reseeding', () => {
  const state = enhanceState({ schema: 1, clients: [], activity: [] });
  const client = saveClientProfile(state, { name: 'Only client' });
  assert.equal(deleteClientProfile(state, client.id).projectCount, 0);
  enhanceState(state);
  assert.equal(state.clientProfiles.length, 0); assert.equal(state.clients.length, 0);
  assert.throws(() => deleteClientProfile(state, client.id), /Client not found/);
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
  const assertClientDialogFits = async () => {
    const layout = await page.evaluate(() => {
      const dialog = document.querySelector('#dialog');
      const header = document.querySelector('.client-dialog-header').getBoundingClientRect();
      const body = document.querySelector('.client-dialog-body').getBoundingClientRect();
      const footer = document.querySelector('.client-dialog-footer').getBoundingClientRect();
      const controls = [...dialog.querySelectorAll('.client-dialog-header button, .client-dialog-footer button')];
      const input = document.querySelector('#client-name');
      const style = getComputedStyle(input);
      return {
        actionsVisible: controls.every(button => {
          const r = button.getBoundingClientRect();
          return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && button.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
        }),
        bodyBetweenHeaderAndFooter: body.top >= header.bottom - 1 && body.bottom <= footer.top + 1,
        noOuterScroll: dialog.scrollHeight <= dialog.clientHeight + 1 && dialog.scrollWidth <= dialog.clientWidth + 1,
        focusGap: input.getBoundingClientRect().top - parseFloat(style.outlineWidth) - parseFloat(style.outlineOffset) - document.querySelector('label[for="client-name"]').getBoundingClientRect().bottom,
      };
    });
    assert(layout.actionsVisible, 'Client dialog close/cancel/save controls must be visible and clickable');
    assert(layout.bodyBetweenHeaderAndFooter, 'Only the field area should scroll between fixed header/footer');
    assert(layout.noOuterScroll, 'Client dialog shell must not overflow');
    assert(layout.focusGap >= 1, 'Input focus outline must not overlap its label');
  };
  page.on('pageerror', error => { errors.push(error.message); console.error('Browser runtime error:', error.message); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const openProject = async (id = 'atlas') => { await page.click('[data-nav="builder"]'); await page.click(`[data-edit="${id}"]`); };
  assert.equal(await page.$$eval('.sidebar [data-nav]', nodes => nodes.length), 4);
  assert.equal(await page.$('[data-nav="templates"]'), null);
  assert(await page.$eval('.workspace-onboarding', node => node.textContent.includes('No fictional clients')));
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).clients.length, STORAGE_KEY), 0);
  await page.screenshot({ path: path.join(shots, '01-studio-overview.png'), fullPage: true });
  await page.click('[data-nav="builder"]'); await page.click('[data-action="new-project"]');
  assert.equal(await page.$eval('#new-project-template', node => node.value), 'blank');
  assert.equal(await page.$eval('#new-project-client', node => node.options.length), 1);
  await page.click('[data-action="close-dialog"]');
  results.push({ name: 'Fresh browser shows empty management overview and one creation flow with optional frameworks, without sample clients', status: 'passed' });
  // Legacy examples exist only as explicitly injected compatibility fixtures, never application defaults.
  await page.evaluate((key, fixture) => localStorage.setItem(key, JSON.stringify(fixture)), STORAGE_KEY, initialState());
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(await page.$$eval('.home-client-item', nodes => nodes.length), 3);
  results.push({ name: 'Management overview preserves saved legacy clients and projects during upgrade', status: 'passed' });

  await page.click('[data-nav="apps"]');
  assert.equal(await page.$eval('#library-project', node => node.value), '');
  assert(await page.$eval('[data-new-custom-app]', node => node.disabled));
  assert(await page.$$eval('[data-add-app]', nodes => nodes.every(node => node.disabled)));
  await page.select('#library-project', 'noura');
  await page.click('[data-add-app="inventory"]');
  assert.equal(await page.$eval('#client-select', node => node.value), 'noura');
  assert(await page.$eval('[data-toggle-app="inventory"]', node => node.getAttribute('aria-pressed') === 'true'));
  results.push({ name: 'App library requires explicit project selection and adds apps to the chosen project', status: 'passed' });

  await page.click('[data-nav="clients"]');
  assert.equal(await page.$$eval('[data-client-row]', nodes => nodes.length), 3);
  await page.click('[data-action="new-client"]');
  assert.equal(await page.$('#new-project-template'), null);
  await page.type('#client-name', 'Layout draft'); await page.type('#client-notes', 'Keep this while scrolling');
  for (const viewport of [{ width: 1440, height: 1080 }, { width: 1024, height: 664 }, { width: 667, height: 830 }, { width: 390, height: 844 }, { width: 390, height: 500 }]) {
    await page.setViewport(viewport);
    await page.focus('#client-name'); await assertClientDialogFits();
    await page.focus('#client-notes'); await assertClientDialogFits();
    assert.equal(await page.$eval('#client-name', node => node.value), 'Layout draft');
    assert.equal(await page.$eval('#client-notes', node => node.value), 'Keep this while scrolling');
    if (viewport.width === 1024) await page.screenshot({ path: path.join(shots, '17-client-dialog-desktop.png') });
    if (viewport.width === 390 && viewport.height === 844) await page.screenshot({ path: path.join(shots, '18-client-dialog-mobile.png') });
  }
  await fill('#client-name', ''); await fill('#client-notes', '');
  await page.click('#client-details-form button[type="submit"]');
  assert.equal(await page.$eval('#dialog', node => node.open), true);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'client-name');
  await assertClientDialogFits();
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1 });
  results.push({ name: 'Client dialogs keep header/actions clickable across short, narrow and mobile viewports; fields scroll without losing values or hiding validation', status: 'passed' });
  await page.type('#client-name', 'Horizon Logistics');
  await page.type('#client-industry', 'Logistics'); await page.type('#client-contact', 'Demo Owner');
  await page.type('#client-email', 'demo@example.test'); await page.type('#client-phone', '+20 000 000');
  await page.type('#client-address', 'Synthetic office'); await page.type('#client-notes', '<script>window.profileXss = true</script>');
  await page.click('#client-details-form button[type="submit"]');
  assert(await page.$eval('.client-details', node => node.textContent.includes('demo@example.test') && node.textContent.includes('<script>')));
  assert.equal(await page.evaluate(() => window.profileXss), undefined);
  assert.equal(await page.$$eval('[data-project-row]', nodes => nodes.length), 0);
  const horizonId = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).clientProfiles.find(client => client.name === 'Horizon Logistics').id, STORAGE_KEY);
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).clients.length, STORAGE_KEY), 3);
  await page.click('[data-edit-client]'); await fill('#client-phone', '+20 111 111');
  await fill('#client-notes', 'Plan an operations portal and a separate support project.');
  await page.click('#client-details-form button[type="submit"]');
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('[data-nav="clients"]');
  await page.type('#client-search', 'demo@example.test');
  assert.equal(await page.$$eval('[data-client-row]', nodes => nodes.length), 1);
  await page.click(`[data-client-profile="${horizonId}"]`);
  assert(await page.$eval('.client-details', node => node.textContent.includes('+20 111 111')));
  await page.screenshot({ path: path.join(shots, '11-client-profile.png'), fullPage: true });
  results.push({ name: 'Client directory creates standalone profiles, edits details, safely renders notes, searches contacts and persists reloads', status: 'passed' });

  await page.click('[data-nav="builder"]');
  assert.equal(await page.$('#client-select'), null);
  assert.equal(await page.$$eval('[data-project-row]', nodes => nodes.length), 3);
  await page.screenshot({ path: path.join(shots, '12-studio-projects.png'), fullPage: true });
  await page.click('[data-action="new-project"]');
  assert.equal(await page.$eval('#new-project-template', node => node.value), 'blank');
  assert.equal(await page.$eval('#new-project-client', node => node.value), '');
  const starterNames = await page.$$eval('#new-project-template option', nodes => nodes.map(node => node.textContent));
  assert(!starterNames.some(name => /restaurant|clothing/i.test(name)));
  assert(starterNames.some(name => name === 'ERP / Business suite'));
  assert(await page.$eval('#starter-detail', node => node.textContent.includes('No apps or app charges yet')));
  await page.screenshot({ path: path.join(shots, '10-blank-first-project.png'), fullPage: true });
  await page.select('#new-project-template', 'erp-framework');
  assert(await page.$eval('#starter-detail', node => node.textContent.includes('5 modules preselected') && node.textContent.includes('Finance')));
  await page.click('[data-action="close-dialog"]');
  results.push({ name: 'New project defaults to blank and explains category starter module/price selections', status: 'passed' });

  await openProject();
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
  await openProject(); await page.click('[data-tab="brand"]');
  assert.equal(await page.$eval('#brand-name', node => node.value), 'Unpublished change');
  results.push({ name: 'Demo publication snapshots config; subsequent edits and reload preserve draft/published separation', status: 'passed' });

  await page.click('[data-nav="builder"]'); await page.click('[data-action="new-project"]');
  await page.select('#new-project-template', 'erp-framework');
  await page.select('#new-project-client', horizonId);
  await page.type('#new-project-name', 'Horizon Operations'); await page.click('#new-project-form button[type="submit"]');
  assert.equal(await page.$$eval('.module-select.selected', nodes => nodes.length), 5);
  assert(await page.$eval('#client-select', node => node.selectedOptions[0].textContent.includes('Horizon')));
  const newConfig = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).clients.find(client => client.name === 'Horizon Operations'), STORAGE_KEY);
  assert(!newConfig.draft.entities.includes('Shipment')); assert.equal(newConfig.version, 0); assert.equal(newConfig.published, null);
  assert.equal(newConfig.clientId, horizonId);
  results.push({ name: 'New project links to an existing client and starts from a pristine framework without other project customizations', status: 'passed' });

  await page.click('[data-action="project-details"]');
  await fill('#project-details-form input[name="name"]', 'Horizon Operations v2');
  await page.type('#project-details-form textarea', 'Internal operations');
  await page.click('#project-details-form button[type="submit"]');
  assert.equal(await page.$eval('h1', node => node.textContent), 'Horizon Operations v2');
  await page.click('[data-nav="clients"]'); await page.click(`[data-client-profile="${horizonId}"]`);
  assert.equal(await page.$$eval('[data-project-row]', nodes => nodes.length), 1);
  await page.click(`[data-new-project-for="${horizonId}"]`);
  assert.equal(await page.$eval('#new-project-client', node => node.value), horizonId);
  await page.type('#new-project-name', 'Horizon Support'); await page.click('#new-project-form button[type="submit"]');
  assert.equal(await page.$$eval('.module-select.selected', nodes => nodes.length), 0);
  await page.click('[data-toggle-app="helpdesk"]');
  const secondProjectId = await page.$eval('#client-select', node => node.value);
  await page.click('[data-nav="builder"]'); await page.select('#project-client-filter', horizonId);
  assert.equal(await page.$$eval('[data-project-row]', nodes => nodes.length), 2);
  await page.type('#project-search', 'v2');
  assert.equal(await page.$$eval('[data-project-row]', nodes => nodes.length), 1);
  await page.click(`[data-edit="${newConfig.id}"]`);
  assert.equal(await page.$$eval('.module-select.selected', nodes => nodes.length), 5);
  assert.equal(await page.$eval('[data-toggle-app="helpdesk"]', node => node.getAttribute('aria-pressed')), 'false');
  await page.click('[data-toggle-app="crm"]');
  await page.select('#client-select', secondProjectId);
  assert.equal(await page.$$eval('.module-select.selected', nodes => nodes.length), 1);
  await page.click('[data-nav="builder"]'); await page.click('[data-clear-project-search]');
  results.push({ name: 'One client has multiple independent projects; project search, metadata editing and reopening update only the selected project', status: 'passed' });

  await page.click('[data-nav="apps"]'); await page.click('[data-category="Commerce"]');
  assert.equal(await page.$$eval('.library-card', nodes => nodes.length), 2);
  await page.type('#global-search', 'Horizon'); await page.keyboard.press('Enter');
  assert.equal(await page.$$eval('[data-client-row]', nodes => nodes.length), 1);
  await page.screenshot({ path: path.join(shots, '13-client-directory.png'), fullPage: true });
  results.push({ name: 'App category filters and client search work', status: 'passed' });

  // Use pristine synthetic data for the remaining visual samples.
  await page.evaluate((key, initial) => localStorage.setItem(key, JSON.stringify(initial)), STORAGE_KEY, initialState());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('[data-nav="builder"]');
  await page.click('[data-preview="thread"]');
  assert(await page.$eval('#dialog .storefront', node => node.textContent.includes('Thread & Co.')));
  await page.screenshot({ path: path.join(shots, '04-client-storefront.png'), fullPage: true });
  await page.click('[data-action="close-dialog"]');
  await page.click('[data-action="platform-site"]');
  assert(await page.$eval('.public-site', node => node.textContent.includes('Built for your business.')));
  await page.screenshot({ path: path.join(shots, '05-platform-website.png'), fullPage: true });
  await page.click('[data-action="enter-studio"]');
  results.push({ name: 'Customer storefront and standalone platform website previews open and navigate', status: 'passed' });

  await openProject('thread');
  await page.click('[data-tab="brand"]');
  await (await page.$('#brand-logo')).uploadFile(path.join(root, 'assets', 'logo.png'));
  await page.waitForSelector('#live-preview .store-header .client-logo');
  assert(await page.$eval('#live-preview .store-header .client-logo', node => node.complete && node.naturalWidth > 0));
  await page.select('#client-select', 'noura');
  assert.equal(await page.$('#live-preview .client-logo'), null);
  results.push({ name: 'Uploaded logo renders on the storefront and remains client-specific', status: 'passed' });

  await page.evaluate((key, initial) => { localStorage.setItem(key, JSON.stringify(initial)); localStorage.removeItem(`${key}-before-builder-v2`); }, STORAGE_KEY, initialState());
  await page.reload({ waitUntil: 'networkidle0' });
  await openProject();
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
  await page.click('[data-nav="builder"]'); await page.click('[data-action="new-project"]');
  await page.type('#new-project-name', 'Rentals portal');
  await page.type('#new-project-description', 'Customer rentals');
  await page.click('#project-create-client');
  await page.click('#cancel-client');
  assert.equal(await page.$eval('#new-project-name', node => node.value), 'Rentals portal');
  await page.click('#project-create-client');
  await page.type('#client-name', 'Second Rental Client'); await page.click('#client-details-form button[type="submit"]');
  assert.equal(await page.$eval('#new-project-name', node => node.value), 'Rentals portal');
  assert.equal(await page.$eval('#new-project-description', node => node.value), 'Customer rentals');
  assert(await page.$eval('#new-project-client', node => node.selectedOptions[0].textContent === 'Second Rental Client'));
  await page.click('#new-project-form button[type="submit"]');
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
  await page.reload({ waitUntil: 'networkidle0' }); await openProject();
  assert.equal(await page.$eval('#project-monthly', node => node.textContent), 'EGP 4,400.5');
  assert(await page.evaluate(key => localStorage.getItem(`${key}-before-builder-v2`) !== null, STORAGE_KEY));
  const directoryBackup = await page.evaluate(key => JSON.parse(localStorage.getItem(`${key}-before-client-directory-v1`)), STORAGE_KEY);
  assert.equal(directoryBackup.directoryVersion, undefined);
  assert.equal(directoryBackup.clients.length, 3);
  assert.equal(directoryBackup.clients[1].draft.name, 'Atlas Trading');
  results.push({ name: 'Project totals react to selection, overrides and discounts; quotes publish and survive reload independently', status: 'passed' });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  for (const next of ['overview', 'clients', 'builder', 'apps']) {
    await page.click(`[data-nav="${next}"]`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow in ${next}`);
  }
  await page.click('[data-nav="clients"]'); await page.click('[data-client-profile="client-atlas"]');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow in client profile');
  await page.click('[data-edit-client]');
  await assertClientDialogFits();
  assert(await page.$eval('#dialog', node => node.scrollWidth <= node.clientWidth + 1), 'Horizontal overflow in client dialog');
  await page.click('[data-action="close-dialog"]');
  await openProject();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow in project editor');
  await page.click(`[data-edit-app="${customId}"]`);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow in app designer');
  await page.click('[data-nav="overview"]');
  await page.screenshot({ path: path.join(shots, '06-mobile-overview.png'), fullPage: true });
  results.push({ name: 'Management overview, client profile/dialog, project hub/editor, library and app designer fit a 390px mobile viewport', status: 'passed' });

  // A legitimate empty directory must not be silently replaced with seed clients.
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ schema: 1, clients: [], clientProfiles: [], activity: [] })), STORAGE_KEY);
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(await page.$$eval('.home-client-item', nodes => nodes.length), 0);
  await page.click('[data-nav="apps"]'); assert(await page.$eval('[data-new-custom-app]', node => node.disabled));
  await page.click('[data-nav="builder"]'); await page.click('[data-action="new-project"]');
  await page.type('#new-project-name', 'First portal'); await page.click('#project-create-client');
  await page.type('#client-name', 'First client'); await page.click('#client-details-form button[type="submit"]');
  await page.click('#new-project-form button[type="submit"]');
  assert.equal(await page.$eval('h1', node => node.textContent), 'First portal');
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).clientProfiles.length, STORAGE_KEY), 1);
  results.push({ name: 'Empty directory survives reload and nested client creation resumes project setup without losing inputs', status: 'passed' });

  const firstProjectId = await page.$eval('#client-select', node => node.value);
  await page.click('[data-nav="clients"]'); await page.click('[data-action="new-client"]');
  await page.type('#client-name', 'Temporary client'); await page.click('#client-details-form button[type="submit"]');
  const temporaryId = await page.$eval('[data-edit-client]', node => node.dataset.editClient);
  await page.click('[data-nav="clients"]'); await page.click(`[data-edit-client="${temporaryId}"]`);
  await fill('#client-name', 'Cancelled name'); await page.click('#cancel-client');
  assert(await page.$eval(`[data-client-row="${temporaryId}"]`, node => node.textContent.includes('Temporary client')));
  await page.click(`[data-edit-client="${temporaryId}"]`);
  await fill('#client-name', 'Updated temporary client'); await fill('#client-email', 'updated@example.test');
  await page.click('#client-details-form button[type="submit"]');
  assert.equal(await page.$eval('h1', node => node.textContent), 'Updated temporary client');
  await page.click('[data-nav="clients"]');
  const beforeCancel = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  await page.click(`[data-delete-client="${temporaryId}"]`);
  assert.equal(await page.$('#delete-client-projects'), null);
  await page.click('#delete-client-form [data-action="close-dialog"]');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY), beforeCancel);
  await page.click(`[data-delete-client="${temporaryId}"]`); await page.click('#delete-client-form button[type="submit"]');
  assert.equal(await page.$(`[data-client-row="${temporaryId}"]`), null);
  await page.click('[data-nav="apps"]');
  assert.equal(await page.$eval('#library-project', node => node.value), firstProjectId);
  await page.reload({ waitUntil: 'networkidle0' }); await page.click('[data-nav="clients"]');
  assert.equal(await page.$$eval('[data-client-row]', nodes => nodes.length), 1);
  results.push({ name: 'Client list provides direct editing and deletion; cancelling keeps data, standalone deletion persists and preserves the active unrelated project', status: 'passed' });

  const deleteFixture = clientManagementFixture();
  await page.evaluate((key, fixture) => localStorage.setItem(key, JSON.stringify(fixture)), STORAGE_KEY, deleteFixture);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('[data-nav="builder"]'); await page.select('#project-client-filter', 'client-atlas');
  await page.click('[data-edit="atlas"]');
  await page.click('[data-client-profile="client-atlas"]'); await page.click('[data-delete-client="client-atlas"]');
  assert(await page.$eval('.delete-project-summary', node => node.textContent.includes('2 related projects') && node.textContent.includes('Atlas support') && node.textContent.includes('published')));
  assert(await page.$eval('#dialog', node => node.scrollWidth <= node.clientWidth + 1), 'Horizontal overflow in delete confirmation');
  await page.click('#delete-client-form button[type="submit"]');
  assert(await page.$eval('#dialog', node => node.open));
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).clients.length, STORAGE_KEY), 4);
  await page.click('#delete-client-projects');
  // A real persistence failure must not delete in memory or falsely report success.
  await page.evaluate(() => { window.originalStorageSet = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); }; });
  await page.click('#delete-client-form button[type="submit"]');
  assert(await page.$eval('#delete-client-form .form-error', node => node.textContent.includes('have been kept')));
  await page.evaluate(() => { Storage.prototype.setItem = window.originalStorageSet; delete window.originalStorageSet; });
  await page.click('#delete-client-form [data-action="close-dialog"]');
  assert.equal(await page.$$eval('[data-project-row]', nodes => nodes.length), 2);
  await page.click('[data-delete-client="client-atlas"]'); await page.click('#delete-client-projects');
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 1 });
  await page.screenshot({ path: path.join(shots, '14-client-delete.png'), fullPage: true });
  await page.click('#delete-client-form button[type="submit"]');
  assert.equal(await page.$('[data-client-row="client-atlas"]'), null);
  assert.equal(await page.$eval('.nav-count', node => node.textContent), '2');
  const afterDelete = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
  assert.deepEqual(afterDelete.clients, deleteFixture.clients.filter(project => project.clientId !== 'client-atlas'));
  assert.deepEqual(afterDelete.customApps, deleteFixture.customApps); assert.deepEqual(afterDelete.priceBook, deleteFixture.priceBook);
  await page.click('[data-nav="apps"]');
  assert.equal(await page.$eval('#library-project', node => node.value), '');
  assert(await page.$eval('[data-new-custom-app]', node => node.disabled));
  await page.click('[data-nav="builder"]');
  assert.equal(await page.$eval('#project-client-filter', node => node.value), '');
  assert.equal(await page.$$eval('[data-project-row]', nodes => nodes.length), 2);
  await page.reload({ waitUntil: 'networkidle0' }); await page.click('[data-nav="clients"]');
  assert.equal(await page.$('[data-client-row="client-atlas"]'), null);
  results.push({ name: 'Client deletion requires project confirmation, survives storage errors atomically, clears stale selections and preserves other clients and reusable apps after reload', status: 'passed' });

  for (const id of ['client-noura', 'client-thread']) {
    await page.click(`[data-delete-client="${id}"]`); await page.click('#delete-client-projects');
    await page.click('#delete-client-form button[type="submit"]');
  }
  await page.reload({ waitUntil: 'networkidle0' }); await page.click('[data-nav="clients"]');
  assert.equal(await page.$$eval('[data-client-row]', nodes => nodes.length), 0);
  await page.click('[data-nav="builder"]'); assert.equal(await page.$$eval('[data-project-row]', nodes => nodes.length), 0);
  results.push({ name: 'Deleting every client and project leaves a usable empty directory after reload without restoring demo seeds', status: 'passed' });

  await page.evaluate((key, fixture) => localStorage.setItem(key, JSON.stringify(fixture)), STORAGE_KEY, initialState());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('[data-nav="builder"]'); await page.click('[data-manage-project="atlas"]');
  assert.equal(await page.$eval('.publication-list', node => node.textContent.includes('No publications yet')), true);
  await page.click('[data-edit="atlas"]');
  await page.evaluate(() => { window.originalStorageSet = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); }; });
  await page.click('[data-action="publish"]');
  assert(await page.$eval('#toast', node => node.textContent.includes('kept unchanged')));
  await page.evaluate(() => { Storage.prototype.setItem = window.originalStorageSet; delete window.originalStorageSet; });
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).clients.find(project => project.id === 'atlas').version, STORAGE_KEY), 0);
  await page.click('[data-action="publish"]');
  await page.click('[data-tab="brand"]'); await fill('#brand-name', 'Updated project branding');
  await page.click('[data-action="publish"]');
  await page.click('[data-manage-project="atlas"]');
  assert.equal(await page.$$eval('.publication-item', nodes => nodes.length), 2);
  await page.click('[data-preview-version="1"]');
  assert(await page.$eval('#dialog .browser-chrome', node => node.textContent.includes('v1')));
  assert(await page.$eval('#dialog .client-top', node => node.textContent.includes('Atlas Trading')));
  await page.click('[data-action="close-dialog"]');
  await page.click('[data-preview-version="2"]');
  assert(await page.$eval('#dialog .client-top', node => node.textContent.includes('Updated project branding')));
  await page.click('[data-action="close-dialog"]');
  await page.click('[data-run-app="inventory"]'); await page.click('[data-runtime-page="form"]');
  await page.type('#runtime-record-form input[name="name"]', 'Managed stock item');
  await page.select('#runtime-record-form select[name="status"]', 'New');
  await page.type('#runtime-record-form input[name="quantity"]', '4');
  await page.click('#runtime-record-form button[type="submit"]'); await page.click('[data-action="close-dialog"]');
  assert.equal(await page.$eval('.metrics .metric:nth-child(2) strong', node => node.textContent), '1');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: path.join(shots, '15-project-management.png'), fullPage: true });
  const managedProject = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).clients.find(project => project.id === 'atlas'), STORAGE_KEY);
  await page.click('[data-archive-project="atlas"]');
  assert.equal(await page.$('[data-edit="atlas"]'), null);
  await page.click('[data-nav="apps"]');
  assert.equal(await page.$eval('#library-project', node => node.value), '');
  assert.equal(await page.$('#library-project option[value="atlas"]'), null);
  await page.click('[data-nav="builder"]');
  assert.equal(await page.$('[data-project-row="atlas"]'), null);
  await page.select('#project-status-filter', 'archived');
  assert.equal(await page.$$eval('[data-project-row]', nodes => nodes.length), 1);
  await page.reload({ waitUntil: 'networkidle0' }); await page.click('[data-nav="builder"]');
  await page.select('#project-status-filter', 'archived'); await page.click('[data-manage-project="atlas"]');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow in project management');
  await page.screenshot({ path: path.join(shots, '16-mobile-project-management.png'), fullPage: true });
  await page.click('[data-archive-project="atlas"]');
  const reactivated = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).clients.find(project => project.id === 'atlas'), STORAGE_KEY);
  const { archived, ...unchanged } = reactivated;
  assert.equal(archived, false); assert.deepEqual(unchanged, managedProject);
  await page.click('[data-edit="atlas"]'); await page.click('[data-tab="brand"]');
  await fill('#brand-name', 'Next draft update');
  await page.click('[data-nav="builder"]'); await page.select('#project-status-filter', 'changes');
  assert.equal(await page.$$eval('[data-project-row]', nodes => nodes.length), 1);
  await page.click('[data-manage-project="atlas"]');
  await page.click('[data-delete-project="atlas"]');
  await page.click('#delete-project-form [data-action="close-dialog"]');
  assert.equal(await page.$eval('h1', node => node.textContent), 'Atlas Trading');
  await page.click('[data-delete-project="atlas"]');
  await page.click('#delete-project-form button[type="submit"]');
  await page.reload({ waitUntil: 'networkidle0' }); await page.click('[data-nav="clients"]');
  await page.click('[data-client-profile="client-atlas"]');
  assert.equal(await page.$$eval('[data-project-row]', nodes => nodes.length), 0);
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).clientProfiles.length, STORAGE_KEY), 3);
  results.push({ name: 'Project management supports daily app use, retained version previews, archive/reactivate, pending-change filters and independent project deletion on desktop/mobile', status: 'passed' });

  assert.equal((await fetch(url + '/PROJECT_CONTEXT.md')).status, 404);
  assert.equal((await fetch(url + '/test-fixtures.mjs')).status, 404);
  assert.equal((await fetch(url + '/app.mjs', { method: 'POST' })).status, 404);
  assert.deepEqual(errors, []);
  results.push({ name: 'Local server limits exposed files/methods; no browser runtime errors', status: 'passed' });
  await writeFile(path.join(root, 'validation-report.json'), JSON.stringify({ date: new Date().toISOString(), scope: 'Local empty-first workspace, client/project management, publication history, visual builder, generic record runtime and illustrative quotation checks only; no production authentication, server tenancy, payment, AI integration or deployment validation.', viewport: { desktop: '1440x1080', mobile: '390x844', dialog: ['1024x664', '667x830', '390x500'] }, results, browserErrors: errors, screenshots: 18 }, null, 2) + '\n');
  console.log(`PASS: ${results.length} catalog/model/browser checks. Eighteen screenshots saved under prototype/screenshots.`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
