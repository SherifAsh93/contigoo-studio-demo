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
  { id: 'mobile', name: 'Mobile app', icon: 'phone', category: 'Mobile', color: 'blue', description: 'Mobile-first pages and forms with a phone-sized browser preview.' },
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
  { id: 'mobile-framework', name: 'Mobile app', industry: 'Mobile app framework', description: 'Start mobile-first pages and forms with a phone-sized browser preview. Native app delivery is not connected.', apps: ['mobile'], color: '#537078', tint: '#dae4e4', icon: 'phone', entities: ['Record'], fields: [] },
];

export const clone = value => structuredClone(value);

// `clients` remains the persisted project collection for compatibility with earlier demos.
// Client/contact records live separately; existing project IDs and snapshots stay intact.
export function enhanceClientDirectory(state) {
  state.clientProfiles ??= [];
  for (const project of state.clients) {
    project.name ??= project.draft.name;
    project.description ??= '';
    project.clientId ??= `client-${project.id}`;
    if (!state.clientProfiles.some(client => client.id === project.clientId)) {
      state.clientProfiles.push({ id: project.clientId, name: project.draft.name, industry: project.industry || '', contact: '', email: '', phone: '', address: '', notes: '' });
    }
  }
  state.directoryVersion = 1;
  return state;
}

function clientDetails(input) {
  const result = {};
  for (const [key, limit] of Object.entries({ name: 60, industry: 60, contact: 80, email: 120, phone: 40, address: 240, notes: 2000 })) {
    result[key] = String(input[key] ?? '').trim();
    if (result[key].length > limit) throw new Error(`${key} must be at most ${limit} characters.`);
  }
  if (!result.name) throw new Error('Enter a client name.');
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error('Enter a valid contact email.');
  return result;
}

export function saveClientProfile(state, input, id = '') {
  const details = clientDetails(input);
  const existing = id ? state.clientProfiles.find(client => client.id === id) : null;
  if (id && !existing) throw new Error('Client not found.');
  if (existing) { Object.assign(existing, details); return existing; }
  const client = { id: crypto.randomUUID(), ...details };
  state.clientProfiles.push(client);
  return client;
}

export function deleteClientProfile(state, id, { deleteProjects = false } = {}) {
  const client = state.clientProfiles.find(item => item.id === id);
  if (!client) throw new Error('Client not found.');
  const projects = state.clients.filter(project => project.clientId === id);
  if (projects.length && deleteProjects !== true) throw new Error('Confirm deletion of the related projects before deleting this client.');
  // All client-specific records, quotes and snapshots belong to these project objects.
  // Shared app templates and prices belong to the platform and are kept.
  state.clients = state.clients.filter(project => project.clientId !== id);
  state.clientProfiles = state.clientProfiles.filter(item => item.id !== id);
  return { client, projectCount: projects.length };
}

export function updateProjectDetails(project, input) {
  const name = String(input.name ?? '').trim();
  const description = String(input.description ?? '').trim();
  if (!name || name.length > 60) throw new Error('Use a project name between 1 and 60 characters.');
  if (description.length > 500) throw new Error('Use a project description of at most 500 characters.');
  Object.assign(project, { name, description });
}

export function createProject(state, input) {
  const owner = state.clientProfiles.find(client => client.id === input.clientId);
  if (!owner) throw new Error('Choose an existing client for this project.');
  const project = createClient(String(input.name ?? ''), input.templateId || 'blank');
  updateProjectDetails(project, input);
  project.clientId = owner.id;
  project.draft.name = owner.name;
  state.clients.push(project);
  return project;
}

export function createClient(name, templateId = 'blank', id = crypto.randomUUID()) {
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 60) throw new Error('Use a project name between 1 and 60 characters.');
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
  return { schema: 1, clients: [], clientProfiles: [], activity: [] };
}

export function publicationHistory(project) {
  const history = [...(project.publications || [])];
  if (project.published && !history.some(item => item.version === project.version)) {
    history.push({ version: project.version, publishedAt: null, config: project.published });
  }
  return history.sort((a, b) => b.version - a.version);
}

export function setProjectArchived(project, archived) {
  if (typeof archived !== 'boolean') throw new Error('Choose archive or reactivate.');
  project.archived = archived;
}

export function deleteProject(state, id) {
  const project = state.clients.find(item => item.id === id);
  if (!project) throw new Error('Project not found.');
  state.clients = state.clients.filter(item => item.id !== id);
  return project;
}

export function publishClient(client) {
  if (client.archived) throw new Error('Reactivate the project before publishing.');
  if (!client.draft.name.trim()) throw new Error('Add a business name before publishing.');
  if (!client.draft.apps.length) throw new Error('Select at least one app before publishing.');
  const history = clone(publicationHistory(client));
  client.published = clone(client.draft);
  client.version += 1;
  history.unshift({ version: client.version, publishedAt: new Date().toISOString(), config: clone(client.published) });
  client.publications = history;
  client.dirty = false;
}

export function addEntity(client, name) {
  const clean = name.trim();
  if (!clean || clean.length > 35) throw new Error('Use an entity name between 1 and 35 characters.');
  if (client.draft.entities.some(entity => entity.toLowerCase() === clean.toLowerCase())) throw new Error('That entity already exists.');
  client.draft.entities.push(clean);
  client.dirty = true;
}

export function deleteEntity(project, name, { deleteFields = false } = {}) {
  if (project.archived) throw new Error('Reactivate the project before changing its shared data.');
  if (!project.draft.entities.includes(name)) throw new Error('Shared entity not found.');
  const fields = project.draft.fields.filter(field => field.entity === name);
  if (fields.length && deleteFields !== true) throw new Error('Confirm deletion of this entity and its shared fields.');
  project.draft.entities = project.draft.entities.filter(entity => entity !== name);
  project.draft.fields = project.draft.fields.filter(field => field.entity !== name);
  project.dirty = true;
  return fields.length;
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
