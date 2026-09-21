import { modules, templates, initialState, createClient, publishClient, toggleApp, addEntity, addField, STORAGE_KEY } from './model.mjs';
import { catalog, enhanceState, quoteFor, definitionFor } from './builder-model.mjs';
import { createStudioUI } from './studio-ui.mjs';

const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  box: '<path d="m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 10 9-5M3 8l9 5v9M7.5 5.5l9 5"/>',
  bag: '<path d="M5 8h14l1 13H4L5 8Zm3 0V6a4 4 0 0 1 8 0v2"/>',
  workflow: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M9 6h6a3 3 0 0 1 3 3v6M6 9v9h9"/>',
  board: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m6-16v16M5.5 8h1M11.5 8h1M17.5 8h1m-13 4h1m5-1h1"/>',
  chart: '<path d="M4 3v18h17M8 16v-5m5 5V7m5 9V4"/>',
  chat: '<path d="M21 11a9 9 0 0 1-9 9H4l-3 2 2-7a9 9 0 1 1 18-4Z"/><path d="M7 10h10M7 14h6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  spark: '<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3Z"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  sliders: '<path d="M4 7h7m5 0h4M4 17h3m5 0h8"/><circle cx="13" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
};
const icon = (name, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let state;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  state = saved?.schema === 1 && Array.isArray(saved.clients) && saved.clients.length ? saved : initialState();
} catch { state = initialState(); }
try {
  const previous = localStorage.getItem(STORAGE_KEY);
  if (previous && !state.builderVersion && !localStorage.getItem(`${STORAGE_KEY}-before-builder-v2`)) localStorage.setItem(`${STORAGE_KEY}-before-builder-v2`, previous);
} catch { /* Continue in memory if browser storage is unavailable. */ }
enhanceState(state);
let view = 'overview';
let tab = 'apps';
let selectedId = state.clients.find(client => client.id === 'atlas')?.id || state.clients[0].id;
let query = '';
let category = 'All apps';
let toastTimer;
const current = () => state.clients.find(client => client.id === selectedId) || state.clients[0];
const allModules = () => catalog(state);
const moduleById = id => allModules().find(module => module.id === id);
const safeColor = color => /^#[0-9a-f]{6}$/i.test(color) ? color : '#916b3d';
const logo = (config, cls = '') => config.logo?.startsWith('data:image/') ? `<img class="client-logo ${cls}" src="${esc(config.logo)}" alt="${esc(config.name)} logo">` : `<span class="client-monogram ${cls}" style="background:${safeColor(config.color)}">${esc(config.name.slice(0, 1).toUpperCase())}</span>`;
const studio = createStudioUI({ state, current, save, render, navigate, toast, icon, esc, openDialog });

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { toast('Browser storage is full. Changes remain in this tab; try a smaller logo.'); }
}
function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message; element.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('visible'), 5000);
}
function activity(title, detail) {
  state.activity.unshift({ title, detail }); state.activity = state.activity.slice(0, 8); save();
}

function shell() {
  document.querySelector('#app').innerHTML = `
  <aside class="sidebar">
    <a class="brand" href="#overview" aria-label="Contigoo Studio home"><img src="/assets/logo.png" alt="Contigoo"><span>STUDIO</span></a>
    <div class="workspace-switch"><span class="studio-icon">${icon('layers')}</span><div><strong>Contigoo workspace</strong><small>Platform administrator</small></div></div>
    <div class="nav-label">YOUR PLATFORM</div>
    <nav aria-label="Primary navigation">${[['overview', 'grid', 'Overview'], ['clients', 'people', 'Clients'], ['builder', 'sliders', 'Solution builder'], ['apps', 'box', 'App library'], ['templates', 'layers', 'Framework starters']].map(([id, glyph, label]) => `<button class="nav-item" data-nav="${id}">${icon(glyph)}<span>${label}</span>${id === 'clients' ? `<span class="nav-count">${state.clients.length}</span>` : ''}</button>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="prototype-card"><span class="live-dot"></span> INTERACTIVE CONCEPT<p>Explore the experience.<br>Shape what comes next.</p><small>Demo data · Saved in this browser</small></div><div class="admin-profile"><span class="avatar">C</span><div><strong>Contigoo admin</strong><small>Builder & developer</small></div>${icon('lock', 16)}</div></div>
  </aside>
  <div class="main-shell"><header class="topbar"><div class="breadcrumb">Workspace <span>/</span> <strong id="breadcrumb">Overview</strong></div><div class="topbar-actions"><label class="global-search">${icon('search', 17)}<input id="global-search" placeholder="Find a client…" aria-label="Find a client"><kbd>↵</kbd></label><button class="icon-button" data-action="platform-site" title="Preview the standalone platform website" aria-label="Preview platform website">${icon('globe')}</button><span class="avatar small">C</span></div></header><main id="content"></main><footer class="app-footer"><span>Made for your clients. Built on Contigoo.</span><span>Concept sample · No live accounts or deployment</span></footer></div>`;
  document.querySelector('#global-search').addEventListener('keydown', event => {
    if (event.key === 'Enter') { query = event.target.value.trim(); navigate('clients', false); }
  });
  render();
}

function navigate(next, clear = true) {
  view = next;
  if (clear) { query = ''; const search = document.querySelector('#global-search'); if (search) search.value = ''; }
  render(); window.scrollTo({ top: 0, behavior: 'instant' });
}

function render() {
  document.querySelectorAll('[data-nav]').forEach(button => {
    const active = button.dataset.nav === view || (view === 'designer' && button.dataset.nav === 'builder');
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  document.querySelector('.nav-count').textContent = state.clients.length;
  document.querySelector('#breadcrumb').textContent = ({ overview: 'Overview', clients: 'Clients', builder: 'Solution builder', apps: 'App library', templates: 'Framework starters', designer: 'Visual app builder' })[view];
  document.querySelector('#content').innerHTML = view === 'designer' ? studio.editorView() : ({ overview, clientsView, builder, appsView, templatesView })[({ clients: 'clientsView', apps: 'appsView', templates: 'templatesView' })[view] || view]();
  bindView();
  studio.bind();
}

function pageTitle(eyebrow, title, description, action = '') {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}
const newButton = '<button class="button primary" data-action="new-client">' + icon('plus', 18) + ' Create client solution</button>';

function clientCard(client) {
  const config = client.draft;
  return `<article class="client-card"><div class="client-card-top">${logo(config)}<span class="badge ${client.dirty ? 'draft' : 'published'}">${client.dirty ? 'Draft' : 'Demo published'}</span></div><h3>${esc(config.name)}</h3><p>${esc(client.industry)} <span>·</span> ${config.apps.length} apps</p><div class="app-icon-stack">${config.apps.slice(0, 5).map(id => { const app = moduleById(id); return app ? `<span class="module-icon ${app.color}" title="${esc(app.name)}">${icon(app.icon, 17)}</span>` : ''; }).join('')}${!config.apps.length ? '<small>Ready for your first app</small>' : ''}</div><div class="client-card-footer"><button class="text-button" data-edit="${client.id}">Open in Studio ${icon('arrow', 16)}</button><button class="icon-button" data-preview="${client.id}" aria-label="Preview ${esc(config.name)}">${icon('external', 17)}</button></div></article>`;
}

function overview() {
  const published = state.clients.filter(client => client.published).length;
  return `${pageTitle('YOUR BUSINESS, CONNECTED', 'A home for every possibility.', 'One platform. Distinct solutions. Built around your clients.', newButton)}
    <section class="hero-panel"><div class="hero-copy"><span class="badge outline">MEET YOUR SOLUTION STUDIO</span><h2>Their business.<br><em>Your building blocks.</em></h2><p>Combine apps, shape workflows and make it theirs.<br>From a neighborhood restaurant to a growing enterprise.</p><button class="button dark" data-nav="builder">Build a solution ${icon('arrow', 17)}</button></div><div class="hero-composition" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="floating-module float-crm">${icon('people')}<span>CRM</span></div><div class="floating-module float-stock">${icon('box')}<span>Inventory</span></div><div class="floating-module float-shop">${icon('bag')}<span>E-commerce</span></div><div class="floating-module float-work">${icon('workflow')}<span>Management</span></div><div class="studio-center">${icon('layers', 32)}<strong>contigoo</strong><small>ONE FOUNDATION</small></div><div class="composition-note">Designed to work together.</div></div></section>
    <section class="metrics" aria-label="Demo platform summary">${[[state.clients.length, 'Client workspaces', 'people'], [published, 'Demo published', 'globe'], [allModules().length, 'Available apps', 'box'], [templates.length, 'Starting templates', 'layers']].map(([value, title, glyph]) => `<div class="metric"><span class="metric-icon">${icon(glyph, 19)}</span><div><strong>${value.toString().padStart(2, '0')}</strong><span>${title}</span></div></div>`).join('')}</section>
    <div class="section-heading"><div><h2>Your client solutions</h2><p>Different businesses. The same dependable foundation.</p></div><button class="text-button" data-nav="clients">View all clients ${icon('arrow', 17)}</button></div><section class="client-grid">${state.clients.slice(0, 3).map(clientCard).join('')}</section>
    <div class="lower-grid"><section class="quiet-panel"><span class="module-icon sage">${icon('layers')}</span><div><h3>Start with what already works.</h3><p>Reuse a template, then make it unique to the next client.</p></div><button class="text-button" data-nav="templates">Explore templates ${icon('arrow', 16)}</button></section><section class="activity-panel"><div class="activity-icon">${icon('clock')}</div><div><h3>${esc(state.activity[0].title)}</h3><p>${esc(state.activity[0].detail)}</p></div></section></div>`;
}

function clientsView() {
  const filtered = state.clients.filter(client => `${client.draft.name} ${client.industry}`.toLowerCase().includes(query.toLowerCase()));
  return `${pageTitle('CLIENT DIRECTORY', 'Different clients. One Studio.', 'Configure each solution independently, with reusable apps and templates.', newButton)}<div class="list-toolbar"><span>${filtered.length} client workspaces${query ? ` matching “${esc(query)}”` : ''}</span><span class="muted">Synthetic demonstration workspaces</span></div><div class="client-grid">${filtered.map(clientCard).join('') || '<div class="empty-state">No matching clients. Try a different search or create a solution.</div>'}</div>`;
}

function appCard(app, selectable = false) {
  const chosen = current().draft.apps.includes(app.id);
  const inner = `<span class="module-icon ${app.color}">${icon(app.icon, 22)}</span><div class="module-card-copy"><strong>${esc(app.name)}</strong><p>${esc(app.description)}</p></div>${selectable ? `<span class="selection-indicator">${chosen ? icon('check', 14) : icon('plus', 14)}</span>` : `<span class="category-tag">${esc(app.category)}</span>`}`;
  const controls = `<div class="app-direct-actions"><button class="text-button" data-edit-app="${app.id}" ${chosen ? '' : 'disabled'}>${icon('sliders', 14)} Edit app</button><button class="text-button" data-run-app="${app.id}" ${chosen ? '' : 'disabled'}>${icon('eye', 14)} Preview app</button></div>`;
  return selectable ? `<article class="app-selection-tile ${chosen ? 'included' : ''}"><button class="module-select ${chosen ? 'selected' : ''}" data-toggle-app="${app.id}" aria-pressed="${chosen}" aria-label="${chosen ? 'Remove' : 'Add'} ${esc(app.name)}">${inner}</button><div class="app-tile-price">${studio.appPrice(app.id)}</div>${controls}</article>` : `<article class="library-card">${inner}<div class="library-price">${studio.appPrice(app.id)}</div><button class="text-button" data-add-app="${app.id}">${chosen ? 'Open project' : 'Add to selected client'} ${icon('arrow', 16)}</button>${chosen ? controls : ''}</article>`;
}

function appsView() {
  const filtered = allModules().filter(app => (category === 'All apps' || app.category === category) && `${app.name} ${app.description}`.toLowerCase().includes(query.toLowerCase()));
  return `${pageTitle('REUSABLE CAPABILITIES', 'Choose an app. Or build your own.', `${allModules().length} apps. Current project: ${esc(current().draft.name)}. Prices below are illustrative and editable.`, '<div class="heading-actions"><button class="button secondary" data-price-book>Default price list</button><button class="button primary" data-new-custom-app>+ Create custom app</button></div>')}<div class="filter-pills">${['All apps', 'Customer', 'Operations', 'Commerce', 'People', 'Custom'].map(label => `<button class="filter-pill ${category === label ? 'active' : ''}" data-category="${label}">${label}</button>`).join('')}</div><section class="library-grid">${filtered.map(app => appCard(app)).join('')}</section>`;
}

function templatesView() {
  return `${pageTitle('YOUR DEVELOPMENT WORKSPACE', 'Start blank. Or start with a framework.', 'Framework starters preselect modules. You control the apps, data, components, properties, roles and price afterward.', '<button class="button primary" data-template="blank">+ Start from scratch</button>')}
    <div class="framework-explainer"><strong>Studio → Client project → Frameworks → Modules → Components & properties</strong><p>These are editable starting selections, not fixed industry products. In this sample, framework names describe configuration presets; complete domain engines and the planned AI copilot are not connected.</p></div>
    <section class="template-grid">${templates.map(template => `<article class="template-card ${template.id === 'blank' ? 'recommended-starter' : ''}"><div class="template-art" style="background:${template.tint};color:${template.color}"><span class="template-stamp">${icon(template.icon, 42)}</span><div class="template-art-label">${template.id === 'blank' ? 'Entirely your own.' : 'A foundation to build on.'}</div></div><div class="template-copy"><span class="eyebrow">${template.id === 'blank' ? 'RECOMMENDED DEFAULT' : 'OPTIONAL FRAMEWORK STARTER'}</span><h3>${esc(template.name)}</h3><p>${esc(template.description)}</p><div class="small-app-tags">${template.apps.map(id => `<span>${esc(moduleById(id).name)}</span>`).join('') || '<span>No apps preselected · choose freely</span>'}</div><button class="button ${template.id === 'blank' ? 'primary' : 'secondary'}" data-template="${template.id}">${template.id === 'blank' ? 'Start from scratch' : 'Use this framework starter'} ${icon('arrow', 16)}</button></div></article>`).join('')}</section>`;
}

function builder() {
  const client = current();
  enhanceState(state);
  return `${pageTitle('CONTIGOO STUDIO', 'Build their business. Their way.', 'Choose the capabilities. Shape the details. Preview the result.', `<div class="heading-actions"><button class="button secondary" data-preview="${client.id}">${icon('eye', 17)} Preview</button><button id="publish-button" class="button primary" data-action="publish">${icon('upload', 17)} Publish solution</button></div>`)}
  <section class="solution-bar"><div class="solution-identity">${logo(client.draft, 'small-logo')}<label class="client-picker"><span>YOU’RE BUILDING FOR</span><select id="client-select" aria-label="Select client">${state.clients.map(item => `<option value="${item.id}" ${item.id === client.id ? 'selected' : ''}>${esc(item.draft.name)}</option>`).join('')}</select></label></div><div class="solution-status"><span id="draft-badge" class="badge ${client.dirty ? 'draft' : 'published'}">${client.dirty ? 'Draft changes' : `Demo version ${client.version}`}</span><span class="muted">${client.industry}</span><span class="separator"></span><span>${icon('lock', 14)} Client-specific configuration</span></div></section>
  ${studio.quoteBanner()}
  <div class="builder-grid"><section class="configuration-panel"><div class="builder-tabs" role="tablist" aria-label="Solution configuration">${[['apps', 'Apps'], ['brand', 'Branding'], ['fields', 'Shared data'], ['access', 'Access'], ['pricing', 'Pricing']].map(([id, label]) => `<button role="tab" aria-selected="${tab === id}" class="${tab === id ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}</div><div class="configuration-body">${({ apps: appConfig, brand: brandConfig, fields: fieldConfig, access: accessConfig, pricing: studio.pricingView })[tab]()}</div></section><aside class="preview-panel"><div class="preview-label"><span><span class="live-dot"></span> SOLUTION APPEARANCE</span><button class="text-button" data-preview="${client.id}" aria-label="Expand preview">${icon('external', 16)}</button></div><div id="live-preview">${solutionPreview(client, true)}</div><div class="preview-footnote">${icon('eye', 15)} For working forms and lists, use Preview app on its card.</div><div class="foundation-note">${icon('layers', 20)}<div><strong>Your apps, your solution</strong><span>Use Edit app for app-specific data, pages and workflows. Shared data above preserves your earlier client-wide fields.</span></div></div></aside></div>`;
}

function appConfig() {
  return `<div class="panel-heading"><h3>Choose apps or build your own</h3><span class="count-pill">${current().draft.apps.length} selected</span></div><p class="muted config-intro">1. Select an app → 2. Edit app → 3. Preview app. Each selection updates the system price above.</p><button class="button primary create-app-button" data-new-custom-app>${icon('plus', 17)} Create custom app — no code</button><div class="selectable-app-grid">${allModules().map(app => appCard(app, true)).join('')}</div><div class="inline-note">${icon('sliders', 17)} Each app has its own visual builder. Configure fields, pages and simple rules instead of writing a prompt.</div>`;
}

function brandConfig() {
  const config = current().draft;
  return `<h3>A familiar face for their business</h3><p class="muted config-intro">These settings belong to this client only.</p><label class="field-label" for="brand-name">Business name</label><input id="brand-name" class="input" value="${esc(config.name)}" maxlength="60"><label class="field-label" for="brand-tagline">Tagline</label><input id="brand-tagline" class="input" value="${esc(config.tagline)}" maxlength="100"><label class="field-label" for="brand-color">Brand color</label><div class="color-row"><input id="brand-color" type="color" value="${safeColor(config.color)}"><span id="color-value">${safeColor(config.color).toUpperCase()}</span><div class="color-swatches">${['#64785b', '#537078', '#936753', '#79658b', '#916b3d', '#30312e'].map(color => `<button class="swatch" style="background:${color}" data-color="${color}" aria-label="Use color ${color}"></button>`).join('')}</div></div><label class="field-label" for="brand-logo">Client logo</label><label class="upload-zone" for="brand-logo">${icon('upload', 25)}<strong>Choose a logo</strong><span>PNG, JPEG or WebP · up to 1 MB</span><input id="brand-logo" type="file" accept="image/png,image/jpeg,image/webp"></label>${config.logo ? '<button class="text-button" data-action="remove-logo">Remove uploaded logo</button>' : ''}<div class="inline-note">${icon('check', 17)} Saved locally as a draft. Publish when you are happy with the preview.</div>`;
}

function fieldConfig() {
  const config = current().draft;
  return `<h3>Shape the data around the business</h3><p class="muted config-intro">Create an entity, then add fields to its sample form.</p><form id="entity-form" class="inline-form"><label class="sr-only" for="entity-name">New entity name</label><input id="entity-name" class="input" placeholder="New entity, e.g. Branch" maxlength="35" required><button class="button secondary" type="submit">${icon('plus', 16)} Entity</button></form><div class="small-app-tags entity-tags">${config.entities.map(entity => `<span>${esc(entity)}</span>`).join('')}</div><form id="field-form"><div class="form-row"><div><label class="field-label" for="field-entity">Entity</label><select id="field-entity" class="input">${config.entities.map(entity => `<option>${esc(entity)}</option>`).join('')}</select></div><div><label class="field-label" for="field-type">Field type</label><select id="field-type" class="input"><option>Text</option><option>Number</option><option>Date</option><option>Yes / No</option></select></div></div><label class="field-label" for="field-name">Field label</label><input id="field-name" class="input" placeholder="e.g. Delivery instructions" maxlength="45" required><div class="form-submit-row"><label class="checkbox-label"><input type="checkbox" id="field-required"> Required field</label><button class="button primary" type="submit">${icon('plus', 16)} Add field</button></div></form><div class="field-list">${config.fields.map(field => `<div class="custom-field-item"><span class="field-type-icon">${field.type === 'Number' ? '#' : field.type === 'Date' ? icon('calendar', 15) : 'Aa'}</span><div><strong>${esc(field.label)}${field.required ? ' *' : ''}</strong><small>${esc(field.entity)} · ${esc(field.type)}</small></div><button class="icon-button" data-delete-field="${field.id}" aria-label="Remove ${esc(field.label)}">${icon('trash', 16)}</button></div>`).join('') || '<p class="muted">No custom fields yet. Create the first one above.</p>'}</div><div class="inline-note">${icon('code', 17)} This sample renders configuration in the browser. Server validation and real record storage come with the platform implementation.</div>`;
}

function accessConfig() {
  return `<h3>The right tools for the right people</h3><p class="muted config-intro">Preview the roles you could assign in this solution.</p>${[['Administrator', 'Manage this client’s people, apps and delegated settings.', 'sliders'], ['Member', 'Work with the records and actions assigned to their role.', 'person'], ['Viewer', 'Read permitted information without making changes.', 'eye']].map(([name, description, glyph]) => `<button class="role-card ${current().draft.role === name ? 'selected' : ''}" data-role="${name}" aria-pressed="${current().draft.role === name}"><span class="module-icon sage">${icon(glyph)}</span><span><strong>${name}</strong><small>${description}</small></span>${current().draft.role === name ? icon('check', 17) : ''}</button>`).join('')}<div class="access-explanation"><strong>${icon('lock', 17)} Preview configuration, not live authorization</strong><p>Real user invitations, authentication and server-enforced permissions are not connected in this prototype. No invitation emails are sent.</p></div>`;
}

function garment(kind, color) {
  const shape = kind === 'shirt' ? '<path d="m73 31-26 16-25 38 28 16 10-19v106h100V82l10 19 28-16-25-38-26-16c-9 17-35 17-44 0Z"/><path class="garment-line" d="M89 34c5 12 18 12 23 0M65 95h90"/>' : kind === 'coat' ? '<path d="m78 26-29 23-22 109 28 5 13-63-2 109h88l-2-109 13 63 28-5-22-109-29-23-32 20-32-20Z"/><path class="garment-line" d="m78 26 32 38 32-38M110 64v145M77 129h19m28 0h19"/>' : '<path d="M78 27h18l14 16 14-16h18l10 56-13 15 38 106H43L81 98 68 83l10-56Z"/><path class="garment-line" d="M81 98h58M85 110l-8 80m58-80 8 80"/>';
  return `<svg class="garment" viewBox="0 0 220 230" aria-hidden="true"><ellipse cx="110" cy="213" rx="62" ry="7" fill="#000" opacity=".07"/><g fill="${color}" stroke="#00000017" stroke-width="1.5">${shape}</g></svg>`;
}

function storefront(config, mini) {
  return `<div class="storefront" style="--client-color:${safeColor(config.color)}"><div class="store-shipping">A LITTLE EVERYDAY LUXURY · DEMO STOREFRONT</div><header class="store-header"><strong>${config.logo ? logo(config, 'small-logo') : ''}${esc(config.name)}</strong><nav><span>New arrivals</span><span>Collections</span><span>Our story</span></nav><span>${icon('bag', 18)}</span></header><div class="store-hero"><div><span class="store-eyebrow">THE EVERYDAY COLLECTION</span><h2>Less, but<br><em>better.</em></h2><p>${esc(config.tagline)}</p><button class="store-cta" data-action="shop-collection">Explore the collection ${icon('arrow', 14)}</button></div><div class="hero-garment">${garment('coat', '#a49179')}</div></div><div class="store-section-heading"><h3>Made for your everyday.</h3><span>View the edit ↗</span></div><div class="products">${[['shirt', '#e5dfd3', 'The everyday tee', 'EGP 690'], ['coat', '#a49179', 'The relaxed overshirt', 'EGP 1,490'], ['dress', '#697568', 'The effortless dress', 'EGP 1,890']].map(([kind, color, name, price]) => `<div class="product"><div class="product-image">${garment(kind, color)}</div><strong>${name}</strong><span>${price}</span></div>`).join('')}</div><div class="store-demo-note">Illustrative catalog and prices · Checkout is not connected</div>${!mini ? '<div class="store-bottom">Thoughtfully made. Beautifully connected.<span>Powered by Contigoo</span></div>' : ''}</div>`;
}

function workspacePreview(config, mini) {
  const enabled = config.apps.map(moduleById).filter(Boolean);
  const stock = config.apps.includes('inventory');
  const relationship = config.apps.includes('crm');
  const stats = stock ? [['128', 'Products'], ['3', 'Locations'], ['12', 'Requests']] : relationship ? [['248', 'Customers'], ['18', 'Follow-ups'], ['32', 'Bookings']] : [['12', 'Open tasks'], ['4', 'In review'], ['86%', 'On track']];
  const rows = stock ? [['Cotton essentials', 'Central warehouse', 'In stock'], ['Packaging supplies', 'Downtown branch', 'Low stock'], ['Seasonal collection', 'Central warehouse', 'In stock']] : relationship ? [['Maya Hassan', 'Private dining enquiry', 'Follow up'], ['Omar Adel', 'Returning guest', 'Active'], ['Leila Mostafa', 'Weekend reservation', 'Confirmed']] : [['Supplier approval', 'Operations', 'In review'], ['New branch setup', 'Projects', 'Active'], ['Team onboarding', 'People', 'Planned']];
  return `<div class="workspace-preview ${mini ? 'mini' : 'full'}" style="--client-color:${safeColor(config.color)}"><header class="client-top">${logo(config, 'small-logo')}<strong>${esc(config.name)}</strong><span class="client-avatar">${config.role === 'Viewer' ? 'V' : 'M'}</span></header><div class="client-nav">${enabled.slice(0, 4).map(app => `<span>${icon(app.icon, 13)}${app.name}</span>`).join('') || '<span>Choose an app to get started</span>'}</div><div class="client-main"><span class="client-kicker">YOUR WORKSPACE</span><h2>A clearer view of your day.</h2><p>${esc(config.tagline)}</p><div class="client-stats">${stats.map(([number, label]) => `<div><strong>${number}</strong><span>${label}</span></div>`).join('')}</div><div class="client-table-head"><strong>${stock ? 'Inventory overview' : relationship ? 'Customer activity' : 'Your work at a glance'}</strong><span>View all ↗</span></div><div class="client-table">${rows.map(([title, detail, status]) => `<div><span class="record-dot"></span><div><strong>${title}</strong><small>${detail}</small></div><span class="record-status ${status === 'Low stock' ? 'low' : ''}">${status}</span></div>`).join('')}</div>${config.fields.length ? `<div class="client-custom-form"><div class="client-table-head"><strong>Configured fields</strong><span>Your custom form</span></div>${config.fields.slice(-3).map(field => `<label>${esc(field.label)}${field.required ? ' *' : ''}<span class="preview-input">${esc(field.type)} · ${esc(field.entity)}</span></label>`).join('')}</div>` : ''}<p class="illustration-label">Illustrative records and metrics · Role preview: ${esc(config.role)}</p></div></div>`;
}

function solutionPreview(client, mini, published = false) {
  const config = published ? client.published : client.draft;
  if (!config) return '<div class="empty-state">No published demo version yet. Publish from the builder first.</div>';
  return `<div class="browser-frame"><div class="browser-chrome"><span class="browser-dots"><i></i><i></i><i></i></span><span>${icon('lock', 10)} ${mini ? 'Client experience · preview' : `${esc(config.name)} · ${published ? `demo published v${client.version}` : 'draft preview'}`}</span><span></span></div>${config.apps.includes('commerce') ? storefront(config, mini) : workspacePreview(config, mini)}</div>`;
}

function updateDraft() {
  current().dirty = true; save();
  const preview = document.querySelector('#live-preview');
  if (preview) preview.innerHTML = solutionPreview(current(), true);
  const badge = document.querySelector('#draft-badge');
  if (badge) { badge.className = 'badge draft'; badge.textContent = 'Draft changes'; }
}

function bindView() {
  document.querySelector('#client-select')?.addEventListener('change', event => { selectedId = event.target.value; render(); });
  for (const [id, property] of [['brand-name', 'name'], ['brand-tagline', 'tagline'], ['brand-color', 'color']]) {
    document.querySelector(`#${id}`)?.addEventListener('input', event => {
      current().draft[property] = event.target.value;
      if (property === 'color') document.querySelector('#color-value').textContent = event.target.value.toUpperCase();
      updateDraft();
    });
  }
  document.querySelector('#brand-logo')?.addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) return toast('Choose a PNG, JPEG or WebP logo smaller than 1 MB.');
    const selectedClient = current();
    const reader = new FileReader();
    reader.onload = async () => {
      const image = new Image(); image.src = reader.result;
      try { await image.decode(); } catch { toast('That file could not be read as an image.'); return; }
      selectedClient.draft.logo = reader.result; selectedClient.dirty = true; save();
      if (selectedClient.id === current().id) render();
      toast('Client logo added to the local draft.');
    };
    reader.readAsDataURL(file);
  });
  document.querySelector('#entity-form')?.addEventListener('submit', event => {
    event.preventDefault();
    try { addEntity(current(), document.querySelector('#entity-name').value); save(); render(); toast('Entity added to this client’s configuration.'); } catch (error) { toast(error.message); }
  });
  document.querySelector('#field-form')?.addEventListener('submit', event => {
    event.preventDefault();
    try {
      addField(current(), { label: document.querySelector('#field-name').value, entity: document.querySelector('#field-entity').value, type: document.querySelector('#field-type').value, required: document.querySelector('#field-required').checked });
      save(); render(); toast('Custom field added. See it in the preview.');
    } catch (error) { toast(error.message); }
  });
}

function openDialog(html, className = '') {
  const dialog = document.querySelector('#dialog');
  if (dialog.open) dialog.close();
  dialog.className = className; dialog.innerHTML = html; dialog.showModal();
}

function newClient(templateId = 'blank') {
  openDialog(`<div class="dialog-heading"><div><div class="eyebrow">CONTIGOO STUDIO / NEW PROJECT</div><h2>Create a client project</h2></div><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><p class="muted">Start with an empty workspace, or an editable framework starter. Choose the exact sub-apps on the next screen.</p><form id="new-client-form"><label class="field-label" for="new-client-name">Client / project name</label><input class="input" id="new-client-name" placeholder="e.g. Client X — Operations" maxlength="60" required autofocus><label class="field-label" for="new-client-template">Starting point — optional framework</label><select id="new-client-template" class="input">${templates.map(template => `<option value="${template.id}" ${template.id === templateId ? 'selected' : ''}>${esc(template.name)}${template.id === 'blank' ? ' (recommended)' : ''}</option>`).join('')}</select><div id="starter-detail" class="starter-detail"></div><div class="dialog-note">${icon('layers', 19)} Next: select modules → edit apps/components → branding and access → preview and price. This sample saves locally.</div><div class="dialog-actions"><button type="button" class="button secondary" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Continue to module selection ${icon('arrow', 17)}</button></div></form>`);
  const updateStarterDetail = () => {
    const starter = templates.find(item => item.id === document.querySelector('#new-client-template').value);
    const total = starter.apps.reduce((sum, id) => sum + state.priceBook[id].monthly, 0);
    document.querySelector('#starter-detail').innerHTML = `<strong>${starter.apps.length ? `${starter.apps.length} modules preselected` : 'An empty project. Full choice.'}</strong><p>${esc(starter.description)}</p><div class="small-app-tags">${starter.apps.map(id => `<span>${esc(moduleById(id).name)}</span>`).join('')}</div><small>${starter.apps.length ? `${studio.money(total)} / month at current demo defaults, before setup or overrides. Remove or customize any module next.` : 'No apps or app charges yet. Your quote updates as you add modules.'}</small>`;
  };
  document.querySelector('#new-client-template').addEventListener('change', updateStarterDetail);
  updateStarterDetail();
  document.querySelector('#new-client-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const client = createClient(document.querySelector('#new-client-name').value, document.querySelector('#new-client-template').value);
      state.clients.push(client); selectedId = client.id; tab = 'apps';
      activity('A new solution is taking shape', `${client.draft.name} · ${client.industry}`);
      document.querySelector('#dialog').close(); navigate('builder'); toast('Client configuration created locally. Make it theirs.');
    } catch (error) { toast(error.message); }
  });
}

function previewClient(id, published = false) {
  const client = state.clients.find(item => item.id === id);
  const config = published ? client.published : client.draft;
  const quote = config?.quote ? quoteFor(config) : null;
  const launcher = !published ? `<div class="preview-app-launcher">${client.draft.apps.map(appId => `<button class="button secondary" data-app-client="${client.id}" data-run-app="${appId}">${icon('external', 14)} Open ${esc(moduleById(appId)?.name || appId)}</button>`).join('')}</div>` : '';
  openDialog(`<div class="dialog-heading preview-dialog-heading"><div><span class="eyebrow">CLIENT EXPERIENCE</span><h2>${esc(client.draft.name)}</h2></div><div class="heading-actions"><button class="button secondary" data-preview-mode="${published ? 'draft' : 'published'}" data-client="${client.id}">${published ? 'Show draft' : 'Show published demo'}</button><button class="icon-button" data-action="close-dialog" aria-label="Close preview">${icon('close')}</button></div></div>${quote ? `<div class="quote-preview-readonly"><strong>${published ? 'Published quote snapshot' : 'Draft quote'}</strong><span>${studio.money(quote.monthly)} / month</span><span>${studio.money(quote.setup)} one-time setup</span><small>Illustrative pricing</small></div>` : ''}${launcher}${solutionPreview(client, false, published)}`, 'preview-dialog');
}

function platformSite() {
  openDialog(`<div class="dialog-heading"><span class="eyebrow">STANDALONE CONTIGOO WEBSITE · CONCEPT</span><button class="icon-button" data-action="close-dialog" aria-label="Close website preview">${icon('close')}</button></div><div class="public-site"><header><img src="/assets/logo.png" alt="Contigoo"><nav><a href="#site-apps">Apps</a><a href="#site-solutions">Solutions</a><button class="button dark" data-action="enter-studio">Open Studio ${icon('arrow', 16)}</button></nav></header><div class="public-hero"><span class="eyebrow">YOUR COMPLETE BUSINESS PLATFORM</span><h1>Built for your business.<br><em>Made to be yours.</em></h1><p>Bring your teams, operations and customers together.<br>Choose the apps you need. Shape the way you work.</p><button class="button primary" data-action="enter-studio">Explore the Studio ${icon('arrow', 17)}</button><div class="public-trust">One login <span>·</span> Connected apps <span>·</span> Your own identity</div></div><section id="site-apps" class="public-apps">${modules.slice(0, 6).map(app => `<div><span class="module-icon ${app.color}">${icon(app.icon, 24)}</span><strong>${app.name}</strong></div>`).join('')}</section><div id="site-solutions" class="public-bottom"><h2>One foundation.<br>Many ways to grow.</h2><p>A restaurant’s relationships. A company’s operations.<br>A retailer’s next collection. Connected by Contigoo.</p></div></div>`, 'website-dialog');
}

document.addEventListener('click', event => {
  const button = event.target.closest('button, a[data-nav]');
  if (!button) return;
  const data = button.dataset;
  if (data.appClient) selectedId = data.appClient;
  if ('openPricing' in data) { tab = 'pricing'; navigate('builder'); return; }
  if (studio.handle(data)) return;
  if (data.nav) return navigate(data.nav);
  if (data.edit) { selectedId = data.edit; tab = 'apps'; return navigate('builder'); }
  if (data.preview) return previewClient(data.preview);
  if (data.previewMode) return previewClient(data.client, data.previewMode === 'published');
  if (data.tab) { tab = data.tab; return render(); }
  if (data.category) { category = data.category; return render(); }
  if (data.template) return newClient(data.template);
  if (data.toggleApp) { toggleApp(current(), data.toggleApp, allModules()); enhanceState(state); if (current().draft.apps.includes(data.toggleApp)) definitionFor(state, current(), data.toggleApp); save(); return render(); }
  if (data.addApp) { if (!current().draft.apps.includes(data.addApp)) toggleApp(current(), data.addApp, allModules()); enhanceState(state); definitionFor(state, current(), data.addApp); save(); tab = 'apps'; navigate('builder'); return toast(`App ready in ${current().draft.name}'s draft. Use Edit app or Preview app.`); }
  if (data.role) { current().draft.role = data.role; updateDraft(); return render(); }
  if (data.color) { current().draft.color = data.color; updateDraft(); return render(); }
  if (data.deleteField) { current().draft.fields = current().draft.fields.filter(field => field.id !== data.deleteField); updateDraft(); return render(); }
  if (data.action === 'new-client') return newClient();
  if (data.action === 'close-dialog') return document.querySelector('#dialog').close();
  if (data.action === 'platform-site') return platformSite();
  if (data.action === 'enter-studio') { document.querySelector('#dialog').close(); return navigate('overview'); }
  if (data.action === 'shop-collection') { button.closest('.storefront').querySelector('.products').scrollIntoView({ behavior: 'smooth', block: 'center' }); return toast('Storefront concept: sample products only. Checkout is not connected.'); }
  if (data.action === 'remove-logo') { current().draft.logo = ''; updateDraft(); return render(); }
  if (data.action === 'publish') {
    try { publishClient(current()); activity('A solution is ready to share', `${current().draft.name} · demo version ${current().version}`); render(); toast(`Demo version ${current().version} saved locally. No public deployment has occurred.`); }
    catch (error) { toast(error.message); }
  }
});

document.addEventListener('click', event => {
  if (event.target.closest('.brand')) { event.preventDefault(); navigate('overview'); }
});
shell();
