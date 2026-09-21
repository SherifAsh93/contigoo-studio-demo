export const STORAGE_KEY = 'contigoo-studio-concept-v1';
export const modules = [
  { id: 'crm', name: 'CRM', icon: 'people', category: 'Customer', color: 'sage', description: 'Relationships, leads and every next conversation.' },
  { id: 'inventory', name: 'Inventory', icon: 'box', category: 'Operations', color: 'sand', description: 'Products, stock and locations, connected.' },
  { id: 'commerce', name: 'E-commerce', icon: 'bag', category: 'Commerce', color: 'rose', description: 'A beautiful storefront. A connected business.' },
  { id: 'management', name: 'Management', icon: 'workflow', category: 'Operations', color: 'blue', description: 'Custom requests, approvals and everyday work.' },
  { id: 'projects', name: 'Projects', icon: 'board', category: 'Operations', color: 'lilac', description: 'Bring people, tasks and milestones together.' },
  { id: 'finance', name: 'Finance', icon: 'chart', category: 'Operations', color: 'sand', description: 'Invoices, expenses and financial workflows.' },
  { id: 'hr', name: 'People & HR', icon: 'person', category: 'People', color: 'rose', description: 'Employee experiences, from joining to growing.' },
  { id: 'helpdesk', name: 'Helpdesk', icon: 'chat', category: 'Customer', color: 'blue', description: 'Customer requests, routed to the right people.' },
  { id: 'appointments', name: 'Appointments', icon: 'calendar', category: 'Customer', color: 'sage', description: 'Bookings, availability and thoughtful reminders.' },
  { id: 'website', name: 'Website & CMS', icon: 'globe', category: 'Commerce', color: 'sand', description: 'A branded home for every client business.' },
  { id: 'marketing', name: 'Marketing', icon: 'spark', category: 'Customer', color: 'lilac', description: 'Campaigns and journeys built around customers.' },
  { id: 'analytics', name: 'Analytics', icon: 'chart', category: 'Operations', color: 'sage', description: 'Turn connected information into a clearer view.' },
];

// Retained only for existing demo projects and compatibility. Not presented as primary starters.
const legacyTemplates = [
  { id: 'restaurant', name: 'Restaurant relationships', industry: 'Restaurant', description: 'Know your guests. Make every visit more personal.', apps: ['crm', 'appointments', 'marketing'], color: '#64785b', symbol: 'N', entities: ['Guest', 'Enquiry'], fields: [{ id: 'guest-preference', entity: 'Guest', label: 'Dining preference', type: 'Text', required: false }] },
  { id: 'company', name: 'Business operations', industry: 'Company', description: 'Requests, projects and stock in one organized place.', apps: ['management', 'inventory', 'projects', 'analytics'], color: '#537078', symbol: 'A', entities: ['Request', 'Item'], fields: [{ id: 'request-branch', entity: 'Request', label: 'Branch', type: 'Text', required: true }] },
  { id: 'store', name: 'Modern commerce', industry: 'Retail & fashion', description: 'A storefront your customers love. Operations you control.', apps: ['commerce', 'inventory', 'website'], color: '#936753', symbol: 'T', entities: ['Product', 'Order'], fields: [{ id: 'product-material', entity: 'Product', label: 'Material', type: 'Text', required: false }] },
];

export const templates = [
  { id: 'blank', name: 'Start from scratch', industry: 'Custom project', description: 'Your own starting point. Choose every module, page and component yourself.', apps: [], color: '#916b3d', tint: '#ece6d9', icon: 'plus', entities: ['Record'], fields: [] },
  { id: 'crm-framework', name: 'CRM', industry: 'CRM framework', description: 'A starting selection for customer data, relationships and communication.', apps: ['crm', 'marketing', 'appointments'], color: '#64785b', tint: '#dfe8d8', icon: 'people', entities: ['Customer', 'Lead'], fields: [] },
  { id: 'erp-framework', name: 'ERP / Business suite', industry: 'ERP framework', description: 'Compose operations, inventory, finance, projects and reporting. Keep only what you need.', apps: ['management', 'inventory', 'finance', 'projects', 'analytics'], color: '#537078', tint: '#dae4e4', icon: 'layers', entities: ['Organization', 'Department'], fields: [] },
  { id: 'finance-framework', name: 'Finance', industry: 'Finance framework', description: 'Start with financial workspaces and reporting, then configure the processes.', apps: ['finance', 'analytics'], color: '#916b3d', tint: '#ede1cd', icon: 'chart', entities: ['Account', 'Document'], fields: [] },
  { id: 'inventory-framework', name: 'Inventory & Operations', industry: 'Inventory framework', description: 'Products, stock workspaces, operational requests and reports.', apps: ['inventory', 'management', 'analytics'], color: '#8b6d3c', tint: '#ebe2d0', icon: 'box', entities: ['Product', 'Location'], fields: [] },
  { id: 'hr-framework', name: 'HR & People', industry: 'HR framework', description: 'Build employee records and internal people-management workflows.', apps: ['hr', 'management'], color: '#79658b', tint: '#e3dfea', icon: 'person', entities: ['Employee', 'Team'], fields: [] },
  { id: 'commerce-framework', name: 'Website & E-commerce', industry: 'Commerce framework', description: 'Combine a website, online store and inventory according to your project.', apps: ['website', 'commerce', 'inventory'], color: '#936753', tint: '#e8dbd0', icon: 'globe', entities: ['Product', 'Order'], fields: [] },
  { id: 'service-framework', name: 'Service & Support', industry: 'Service framework', description: 'Customer support, appointments and relationship workspaces.', apps: ['helpdesk', 'appointments', 'crm'], color: '#587781', tint: '#dce5e7', icon: 'chat', entities: ['Ticket', 'Service request'], fields: [] },
  { id: 'workflow-framework', name: 'Custom workflows', industry: 'Workflow framework', description: 'A flexible starting point for requests, approvals, projects and custom processes.', apps: ['management', 'projects'], color: '#6d7d66', tint: '#e1e7dc', icon: 'workflow', entities: ['Request', 'Task'], fields: [] },
];

export const clone = value => structuredClone(value);

export function createClient(name, templateId = 'blank', id = crypto.randomUUID()) {
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 60) throw new Error('Use a client name between 1 and 60 characters.');
  const template = [...templates, ...legacyTemplates].find(item => item.id === templateId);
  if (!template) throw new Error('Choose a valid template.');
  const draft = {
    name: cleanName,
    color: template.color,
    logo: '',
    tagline: templateId === 'store' ? 'Considered essentials. Made for everyday.' : 'A connected way to work.',
    apps: [...template.apps],
    entities: [...template.entities],
    fields: clone(template.fields),
    role: 'Member',
  };
  return { id, template: template.id, industry: template.industry, draft, published: null, version: 0, dirty: true };
}

export function initialState() {
  const clients = [createClient('Noura Restaurant', 'restaurant', 'noura'), createClient('Atlas Trading', 'company', 'atlas'), createClient('Thread & Co.', 'store', 'thread')];
  for (const client of [clients[0], clients[2]]) {
    client.published = clone(client.draft);
    client.version = 1;
    client.dirty = false;
  }
  return { schema: 1, clients, activity: [{ title: 'Your Studio is ready', detail: 'Three illustrative client solutions. One shared foundation.' }] };
}

export function publishClient(client) {
  if (!client.draft.name.trim()) throw new Error('Add a business name before publishing.');
  if (!client.draft.apps.length) throw new Error('Select at least one app before publishing.');
  client.published = clone(client.draft);
  client.version += 1;
  client.dirty = false;
}

export function addEntity(client, name) {
  const clean = name.trim();
  if (!clean || clean.length > 35) throw new Error('Use an entity name between 1 and 35 characters.');
  if (client.draft.entities.some(entity => entity.toLowerCase() === clean.toLowerCase())) throw new Error('That entity already exists.');
  client.draft.entities.push(clean);
  client.dirty = true;
}

export function addField(client, input) {
  const label = input.label.trim();
  if (!label || label.length > 45) throw new Error('Use a field label between 1 and 45 characters.');
  if (!client.draft.entities.includes(input.entity)) throw new Error('Choose an existing entity.');
  if (!['Text', 'Number', 'Date', 'Yes / No'].includes(input.type)) throw new Error('Choose a supported field type.');
  if (client.draft.fields.some(field => field.entity === input.entity && field.label.toLowerCase() === label.toLowerCase())) throw new Error('That entity already has a field with this label.');
  client.draft.fields.push({ id: crypto.randomUUID(), label, entity: input.entity, type: input.type, required: Boolean(input.required) });
  client.dirty = true;
}

export function toggleApp(client, id, catalog = modules) {
  if (!catalog.some(item => item.id === id)) throw new Error('Unknown app.');
  const selected = client.draft.apps.includes(id);
  client.draft.apps = selected ? client.draft.apps.filter(item => item !== id) : [...client.draft.apps, id];
  client.dirty = true;
}
