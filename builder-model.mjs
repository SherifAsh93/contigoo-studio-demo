import { modules, clone } from './model.mjs';

export const fieldTypes = ['Text', 'Email', 'Number', 'Date', 'Yes / No', 'Choice'];
export const pageTypes = ['Dashboard', 'List', 'Form', 'Content'];
const demoMonthly = { crm: 1500, inventory: 1200, commerce: 2000, management: 1000, projects: 800, finance: 1500, hr: 1000, helpdesk: 700, appointments: 500, website: 600, marketing: 800, analytics: 500 };
export const catalog = state => [...modules, ...(state.customApps || [])];

export function moneyToCents(value) {
  const text = String(value).trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) throw new Error('Enter a non-negative amount with up to two decimal places.');
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
function assertCents(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 999999999) throw new Error('Invalid price amount.');
}
function cleanLabel(value, limit = 60) {
  const text = String(value ?? '').trim();
  if (!text || text.length > limit) throw new Error(`Enter a name between 1 and ${limit} characters.`);
  return text;
}
export function defaultPrice(id) { return { monthly: (demoMonthly[id] || 0) * 100, setup: 0 }; }

export function enhanceState(state) {
  state.customApps ??= [];
  state.priceBook ??= {};
  for (const app of catalog(state)) state.priceBook[app.id] ??= defaultPrice(app.id);
  for (const client of state.clients) {
    client.draft.appDefinitions ??= {};
    client.draft.quote ??= { currency: 'EGP', baseMonthly: 0, baseSetup: 0, discountPercent: 0, prices: {} };
    client.draft.quote.prices ??= {};
    client.demoRecords ??= {};
    client.workflowLog ??= [];
    for (const id of client.draft.apps) client.draft.quote.prices[id] ??= clone(state.priceBook[id] || defaultPrice(id));
  }
  // Keep the existing schema/key and old published versions intact; additions are backward-compatible.
  state.builderVersion = 2;
  return state;
}

export function quoteFor(config) {
  const quote = config.quote || { currency: 'EGP', baseMonthly: 0, baseSetup: 0, discountPercent: 0, prices: {} };
  assertCents(quote.baseMonthly); assertCents(quote.baseSetup);
  if (!Number.isFinite(quote.discountPercent) || quote.discountPercent < 0 || quote.discountPercent > 100) throw new Error('Discount must be between 0 and 100.');
  const lines = [...new Set(config.apps)].map(id => {
    const price = quote.prices[id] || defaultPrice(id);
    assertCents(price.monthly); assertCents(price.setup);
    return { id, ...price };
  });
  const subtotal = quote.baseMonthly + lines.reduce((sum, line) => sum + line.monthly, 0);
  const setup = quote.baseSetup + lines.reduce((sum, line) => sum + line.setup, 0);
  const discount = Math.round(subtotal * quote.discountPercent / 100);
  return { currency: quote.currency, lines, baseMonthly: quote.baseMonthly, baseSetup: quote.baseSetup, subtotal, discount, monthly: subtotal - discount, setup, firstPayment: subtotal - discount + setup };
}

export function setProjectPrice(state, client, appId, monthly, setup) {
  enhanceState(state);
  if (!catalog(state).some(app => app.id === appId)) throw new Error('Unknown app.');
  const price = { monthly: moneyToCents(monthly), setup: moneyToCents(setup) };
  client.draft.quote.prices[appId] = price;
  client.dirty = true;
}

export function setQuoteSettings(client, monthly, setup, discount) {
  const baseMonthly = moneyToCents(monthly); const baseSetup = moneyToCents(setup);
  const discountPercent = Number(discount);
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) throw new Error('Discount must be between 0 and 100.');
  Object.assign(client.draft.quote, { baseMonthly, baseSetup, discountPercent }); client.dirty = true;
}

const field = (id, label, type = 'Text', required = false, options = []) => ({ id, label, type, required, options, visible: true });
export function defaultDefinition(app) {
  if (app.templateDefinition) return clone(app.templateDefinition);
  const entityNames = { crm: 'Customer', inventory: 'Product', commerce: 'Order', management: 'Request', projects: 'Task', finance: 'Invoice', hr: 'Employee', helpdesk: 'Ticket', appointments: 'Booking', website: 'Article', marketing: 'Campaign', analytics: 'Metric' };
  const name = entityNames[app.id] || 'Record';
  const fields = [field('name', `${name} name`, 'Text', true), field('status', 'Status', 'Choice', true, ['New', 'In progress', 'Complete'])];
  if (app.id === 'inventory') fields.push(field('quantity', 'Quantity', 'Number', true));
  if (['crm', 'hr', 'helpdesk'].includes(app.id)) fields.push(field('email', 'Email', 'Email'));
  if (['finance', 'commerce'].includes(app.id)) fields.push(field('amount', 'Amount', 'Number'));
  return {
    name: app.name,
    entities: [{ id: 'records', name, fields }],
    pages: [{ id: 'overview', name: 'Overview', kind: 'Dashboard', entityId: 'records', body: '' }, { id: 'list', name: `${name}s`, kind: 'List', entityId: 'records', body: '' }, { id: 'form', name: `New ${name.toLowerCase()}`, kind: 'Form', entityId: 'records', body: '' }],
    workflows: [],
  };
}

export function definitionFor(state, client, appId) {
  enhanceState(state);
  const app = catalog(state).find(item => item.id === appId);
  if (!app) throw new Error('App not found.');
  if (!client.draft.appDefinitions[appId]) {
    const definition = defaultDefinition(app);
    // Preserve existing client-wide metadata in a separate editable legacy entity, without guessing its app ownership.
    client.draft.appDefinitions[appId] = definition;
  }
  return client.draft.appDefinitions[appId];
}

export function createCustomApp(state, client, input) {
  const name = cleanLabel(input.name);
  if (catalog(state).some(app => app.name.toLowerCase() === name.toLowerCase())) throw new Error('An app with that name already exists.');
  const entityName = cleanLabel(input.entityName, 35);
  const price = { monthly: moneyToCents(input.monthly), setup: moneyToCents(input.setup) };
  const app = { id: `custom-${crypto.randomUUID()}`, name, icon: 'code', category: 'Custom', color: 'lilac', description: 'Your reusable, visually configured app.', custom: true };
  app.templateDefinition = defaultDefinition(app);
  app.templateDefinition.entities[0].name = entityName;
  app.templateDefinition.entities[0].fields[0].label = `${entityName} name`;
  app.templateDefinition.pages[1].name = `${entityName}s`;
  app.templateDefinition.pages[2].name = `New ${entityName.toLowerCase()}`;
  state.customApps.push(app); state.priceBook[app.id] = price;
  client.draft.apps.push(app.id); client.draft.quote.prices[app.id] = clone(price);
  client.draft.appDefinitions[app.id] = clone(app.templateDefinition); client.dirty = true;
  return app;
}

export function addAppEntity(definition, name) {
  const label = cleanLabel(name, 35);
  if (definition.entities.some(entity => entity.name.toLowerCase() === label.toLowerCase())) throw new Error('That entity already exists in this app.');
  const entity = { id: crypto.randomUUID(), name: label, fields: [field(crypto.randomUUID(), `${label} name`, 'Text', true)] };
  definition.entities.push(entity);
  definition.pages.push({ id: crypto.randomUUID(), name: `${label}s`, kind: 'List', entityId: entity.id, body: '' });
  return entity;
}

export function addAppField(definition, input) {
  const entity = definition.entities.find(item => item.id === input.entityId);
  if (!entity) throw new Error('Choose an entity.');
  const label = cleanLabel(input.label, 45);
  if (entity.fields.some(item => item.label.toLowerCase() === label.toLowerCase())) throw new Error('That field label already exists in this entity.');
  if (!fieldTypes.includes(input.type)) throw new Error('Unsupported field type.');
  const options = input.type === 'Choice' ? [...new Set(String(input.options || '').split(',').map(text => text.trim()).filter(Boolean))] : [];
  if (input.type === 'Choice' && !options.length) throw new Error('Add comma-separated choices.');
  const result = field(crypto.randomUUID(), label, input.type, Boolean(input.required), options);
  entity.fields.push(result); return result;
}

export function addAppPage(definition, input) {
  const name = cleanLabel(input.name, 45);
  if (!pageTypes.includes(input.kind)) throw new Error('Choose a supported page type.');
  if (!definition.entities.some(entity => entity.id === input.entityId)) throw new Error('Choose a page entity.');
  const page = { id: crypto.randomUUID(), name, kind: input.kind, entityId: input.entityId, body: String(input.body || '').slice(0, 2000) };
  definition.pages.push(page); return page;
}

export function moveItem(items, id, direction) {
  const index = items.findIndex(item => item.id === id); const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target], items[index]];
}

function typedValue(field, value) {
  if (field.type === 'Yes / No') return value === true || value === 'true' || value === 'on';
  if (value === undefined || value === null || value === '') {
    if (field.required) throw new Error(`${field.label} is required.`);
    return '';
  }
  const text = String(value).trim();
  if (field.required && !text) throw new Error(`${field.label} is required.`);
  if (field.type === 'Number') {
    const number = Number(text);
    if (!text || !Number.isFinite(number)) throw new Error(`${field.label} must be a number.`);
    return number;
  }
  if (field.type === 'Email' && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new Error(`${field.label} must be a valid email.`);
  if (field.type === 'Date' && text && (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text)) || new Date(text).toISOString().slice(0, 10) !== text)) throw new Error(`${field.label} must be a valid date.`);
  if (field.type === 'Choice' && !field.options.includes(text)) throw new Error(`Choose an allowed ${field.label} value.`);
  return text;
}

export function addWorkflow(definition, input) {
  const entity = definition.entities.find(item => item.id === input.entityId);
  if (!entity) throw new Error('Choose an entity.');
  if (input.conditionField && !entity.fields.some(field => field.id === input.conditionField)) throw new Error('Choose a valid condition field.');
  if (!['set', 'note'].includes(input.action)) throw new Error('Choose a supported workflow action.');
  let value = String(input.value || '').trim();
  if (input.action === 'set') {
    const target = entity.fields.find(field => field.id === input.targetField);
    if (!target) throw new Error('Choose a target field.');
    value = typedValue(target, value);
  } else if (!value) throw new Error('Enter an activity note.');
  definition.workflows.push({ id: crypto.randomUUID(), name: cleanLabel(input.name), entityId: entity.id, conditionField: input.conditionField || '', conditionValue: String(input.conditionValue || ''), action: input.action, targetField: input.targetField || '', value, enabled: true });
}

export function recordsFor(client, appId, entityId) { return client.demoRecords?.[appId]?.[entityId] || []; }
export function saveDemoRecord(client, appId, definition, entityId, input, recordId = '') {
  if (!client.draft.apps.includes(appId)) throw new Error('Add this app to the project before using it.');
  const entity = definition.entities.find(item => item.id === entityId);
  if (!entity) throw new Error('Entity not found.');
  const values = {};
  for (const field of entity.fields) values[field.id] = typedValue(field, input[field.id]);
  const notes = [];
  if (!recordId) {
    for (const workflow of definition.workflows.filter(item => item.entityId === entityId && item.enabled)) {
      if (workflow.conditionField && String(values[workflow.conditionField]) !== workflow.conditionValue) continue;
      if (workflow.action === 'set') {
        const target = entity.fields.find(field => field.id === workflow.targetField);
        if (!target) throw new Error('Workflow references a missing field.');
        values[target.id] = typedValue(target, workflow.value);
      } else notes.push(workflow.value);
    }
  }
  // Mutate only after all validation and workflow actions succeed.
  client.demoRecords ??= {}; client.demoRecords[appId] ??= {}; client.demoRecords[appId][entityId] ??= [];
  const records = client.demoRecords[appId][entityId];
  const existing = recordId ? records.find(item => item.id === recordId) : null;
  if (recordId && !existing) throw new Error('Record not found.');
  const record = { id: recordId || crypto.randomUUID(), values };
  if (existing) records[records.indexOf(existing)] = record; else records.push(record);
  client.workflowLog ??= [];
  for (const note of notes) client.workflowLog.push({ appId, entityId, recordId: record.id, note });
  return record;
}

export function reusableTemplate(state, client, appId) {
  const app = state.customApps.find(item => item.id === appId);
  if (!app) throw new Error('Only custom apps can be saved as reusable app templates in this sample.');
  app.templateDefinition = clone(definitionFor(state, client, appId));
  // Existing client instances remain untouched. The template contains no demo records or quotes.
}
