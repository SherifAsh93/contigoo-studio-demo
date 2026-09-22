import { modules, templates, initialState, createProject, saveClientProfile, deleteClientProfile, updateProjectDetails, publishClient, publicationHistory, setProjectArchived, deleteProject, toggleApp, addEntity, addField, STORAGE_KEY } from './model.mjs';
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
  state = saved?.schema === 1 && Array.isArray(saved.clients) ? saved : initialState();
} catch { state = initialState(); }
try {
  const previous = localStorage.getItem(STORAGE_KEY);
  if (previous && !state.builderVersion && !localStorage.getItem(`${STORAGE_KEY}-before-builder-v2`)) localStorage.setItem(`${STORAGE_KEY}-before-builder-v2`, previous);
  if (previous && !state.directoryVersion && !localStorage.getItem(`${STORAGE_KEY}-before-client-directory-v1`)) localStorage.setItem(`${STORAGE_KEY}-before-client-directory-v1`, previous);
} catch { /* Continue in memory if browser storage is unavailable. */ }
enhanceState(state);
let view = 'overview';
let tab = 'apps';
let selectedId = '';
let profileId = '';
let projectQuery = '';
let projectClientFilter = '';
let projectStatusFilter = 'active';
let query = '';
let category = 'All apps';
let toastTimer;
const current = () => state.clients.find(project => project.id === selectedId);
const editable = () => current() && !current().archived;
const projectStatus = project => project.archived ? 'Archived' : project.dirty ? (project.published ? 'Unpublished changes' : 'Draft') : `Published demo v${project.version}`;
const ownerFor = project => state.clientProfiles.find(client => client.id === project.clientId);
const projectsFor = clientId => state.clients.filter(project => project.clientId === clientId);
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
    <div class="brand-lockup"><a class="brand" href="#overview" aria-label="Contigoo Studio home"><img src="/assets/logo.png" alt="Contigoo"><span>STUDIO</span></a><p class="brand-subtitle">Internal Management &amp; Development Platform</p></div>
    <div class="workspace-switch"><span class="studio-icon">${icon('layers')}</span><div><strong>Contigoo workspace</strong><small>Platform administrator</small></div></div>
    <div class="nav-label">YOUR PLATFORM</div>
    <nav aria-label="Primary navigation">${[['overview', 'grid', 'Overview'], ['clients', 'people', 'Clients'], ['builder', 'layers', 'Projects & solutions'], ['apps', 'box', 'App library']].map(([id, glyph, label]) => `<button class="nav-item" data-nav="${id}">${icon(glyph)}<span>${label}</span>${id === 'clients' ? `<span class="nav-count">${state.clientProfiles.length}</span>` : ''}</button>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="prototype-card"><span class="live-dot"></span> INTERACTIVE CONCEPT<p>Explore the experience.<br>Shape what comes next.</p><small>Demo data · Saved in this browser</small></div><div class="admin-profile"><span class="avatar">C</span><div><strong>Contigoo admin</strong><small>Builder & developer</small></div>${icon('lock', 16)}</div></div>
  </aside>
  <div class="main-shell"><header class="topbar"><div class="breadcrumb">Workspace <span>/</span> <strong id="breadcrumb">Overview</strong></div><div class="topbar-actions"><label class="global-search">${icon('search', 17)}<input id="global-search" placeholder="Find a client…" aria-label="Find a client"><kbd>↵</kbd></label><button class="icon-button" data-action="platform-site" title="Preview the standalone platform website" aria-label="Preview platform website">${icon('globe')}</button><span class="avatar small">C</span></div></header><main id="content"></main><footer class="app-footer"><span>Made for your clients. Built on Contigoo.</span><span>Concept sample · No live accounts or deployment</span></footer></div>`;
  document.querySelector('#global-search').addEventListener('keydown', event => {
    if (event.key === 'Enter') { query = event.target.value.trim(); navigate('clients', false); }
  });
  render();
}

function navigate(next, clear = true) {
  if (next === 'apps' && current()?.archived) selectedId = '';
  view = ['project', 'designer', 'manage'].includes(next) && !current() ? 'builder' : ['project', 'designer'].includes(next) && current()?.archived ? 'manage' : next;
  if (clear) { query = ''; const search = document.querySelector('#global-search'); if (search) search.value = ''; }
  render(); window.scrollTo({ top: 0, behavior: 'instant' });
}

function render() {
  document.querySelectorAll('[data-nav]').forEach(button => {
    const active = button.dataset.nav === view || (['project', 'designer', 'manage'].includes(view) && button.dataset.nav === 'builder') || (view === 'client' && button.dataset.nav === 'clients');
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  document.querySelector('.nav-count').textContent = state.clientProfiles.length;
  document.querySelector('#breadcrumb').textContent = ({ overview: 'Overview', clients: 'Clients', client: 'Client profile', builder: 'Projects & solutions', manage: `Manage / ${current()?.name || ''}`, project: `Studio / ${current()?.name || ''}`, apps: 'App library', designer: `Studio / ${current()?.name || ''} / App editor` })[view];
  document.querySelector('#content').innerHTML = ({ overview, clients: clientsView, client: clientProfileView, builder: projectsView, manage: projectManagementView, project: builder, apps: appsView, designer: studio.editorView })[view]();
  bindView();
  studio.bind();
}

function pageTitle(eyebrow, title, description, action = '') {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}
const newButton = '<button class="button primary" data-action="new-client">' + icon('plus', 18) + ' Create client</button>';
const newProjectButton = '<button class="button primary" data-action="new-project">' + icon('plus', 18) + ' Create new project</button>';

function overview() {
  const active = state.clients.filter(project => !project.archived);
  const pending = active.filter(project => project.dirty);
  return `${pageTitle('CONTIGOO STUDIO', 'Build. Deliver. Keep managing.', 'Internal Management &amp; Development Platform', newProjectButton)}
    <section class="hero-panel"><div class="hero-copy"><span class="badge outline">MEET YOUR SOLUTION STUDIO</span><h2>Their business.<br><em>Your building blocks.</em></h2><p>Combine apps, shape workflows and manage your work.<br>One foundation for your internal operations.</p><button class="button dark" data-nav="builder">Build a solution ${icon('arrow', 17)}</button></div><div class="hero-composition" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="floating-module float-crm">${icon('people')}<span>CRM</span></div><div class="floating-module float-stock">${icon('box')}<span>Inventory</span></div><div class="floating-module float-shop">${icon('bag')}<span>E-commerce</span></div><div class="floating-module float-work">${icon('workflow')}<span>Management</span></div><div class="studio-center">${icon('layers', 32)}<strong>contigoo</strong><small>ONE FOUNDATION</small></div><div class="composition-note">Designed to work together.</div></div></section>
    <section class="metrics" aria-label="Workspace summary">${[[state.clientProfiles.length, 'Clients', 'people'], [active.length, 'Active projects', 'layers'], [pending.length, 'Drafts / pending changes', 'sliders'], [state.clients.filter(project => project.archived).length, 'Archived projects', 'box']].map(([value, title, glyph]) => `<div class="metric"><span class="metric-icon">${icon(glyph, 19)}</span><div><strong>${value.toString().padStart(2, '0')}</strong><span>${title}</span></div></div>`).join('')}</section>
    ${!state.clients.length ? `<section class="workspace-onboarding"><span class="eyebrow">YOUR WORKSPACE STARTS HERE</span><h2>${state.clientProfiles.length ? 'Ready for your first project?' : 'Start with your own clients and projects.'}</h2><p>No fictional clients are added automatically. Create a project for a person or organization; add the client during setup if needed.</p><div class="heading-actions">${newProjectButton}${newButton}</div><ol><li><strong>Define</strong>Choose the client and project name.</li><li><strong>Build</strong>Start blank or choose an optional framework, then edit apps in Studio.</li><li><strong>Manage</strong>Return for updates, pricing, publications and project lifecycle.</li></ol></section>` : `<div class="section-heading"><div><h2>Continue your work</h2><p>Open Studio to build; Manage to oversee the project after creation.</p></div><button class="text-button" data-nav="builder">All projects ${icon('arrow', 17)}</button></div>${projectTable(active.slice(0, 5))}`}
    <div class="management-home-grid"><section class="management-panel"><div class="section-heading"><div><h2>Clients</h2><p>People and organizations you work with.</p></div><button class="text-button" data-nav="clients">Manage clients ${icon('arrow', 16)}</button></div>${state.clientProfiles.length ? `<div class="home-client-list">${state.clientProfiles.slice(0, 5).map(client => `<button class="home-client-item" data-client-profile="${client.id}"><strong>${esc(client.name)}</strong><span>${projectsFor(client.id).length} projects</span></button>`).join('')}</div>` : '<p>No clients yet. Add your own client details when you are ready.</p>'}</section><section class="management-panel"><h2>Recent activity</h2><ul class="management-activity">${state.activity.map(item => `<li><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p></li>`).join('') || '<li>Your project and client management activity will appear here.</li>'}</ul></section></div>`;
}

function clientsView() {
  return `${pageTitle('CLIENT MANAGEMENT', 'Your clients', 'People and organizations you work with. Their apps and solutions belong under Projects.', newButton)}${state.clients.some(project => ['noura', 'atlas', 'thread'].includes(project.id)) ? '<div class="legacy-data-note">This browser has records carried over from the earlier demonstration. They are not a real customer directory. Review them using View, Edit or Delete; saved projects are preserved during upgrades.</div>' : ''}<form id="client-search-form" class="directory-toolbar"><label class="field-label" for="client-search">Search clients<input class="input" id="client-search" type="search" value="${esc(query)}" placeholder="Name, contact, email or industry"></label><button class="button secondary" type="submit">Search</button><button class="text-button" type="button" data-clear-client-search>Clear</button></form><div id="client-results">${clientResults()}</div>`;
}

function clientResults() {
  const filtered = state.clientProfiles.filter(client => [client.name, client.industry, client.contact, client.email, client.phone].join(' ').toLowerCase().includes(query.toLowerCase()));
  return `<div class="list-toolbar"><span>${filtered.length} of ${state.clientProfiles.length} clients</span><span class="muted">Browser-local demo directory</span></div><div class="directory-table-wrap"><table class="directory-table client-directory"><caption class="sr-only">Client list</caption><thead><tr><th>Client</th><th>Contact</th><th>Projects</th><th>Actions</th></tr></thead><tbody>${filtered.map(client => `<tr data-client-row="${client.id}"><td><button class="text-button" data-client-profile="${client.id}">${esc(client.name)}</button><small>${esc(client.industry || 'Industry not specified')}</small></td><td>${esc(client.contact || 'No contact yet')}<small>${esc(client.email || client.phone || '—')}</small></td><td>${projectsFor(client.id).length}</td><td><div class="row-actions"><button class="button secondary" data-client-profile="${client.id}" aria-label="View ${esc(client.name)}">View</button><button class="text-button" data-edit-client="${client.id}" aria-label="Edit ${esc(client.name)}">Edit</button><button class="text-button danger-text" data-delete-client="${client.id}" aria-label="Delete ${esc(client.name)}">Delete</button><button class="text-button" data-new-project-for="${client.id}" aria-label="Create project for ${esc(client.name)}">+ Project</button></div></td></tr>`).join('') || '<tr><td colspan="4"><div class="empty-state">No clients found. Clear the search or choose Create client.</div></td></tr>'}</tbody></table></div>`;
}

function clientProfileView() {
  const client = state.clientProfiles.find(item => item.id === profileId);
  if (!client) return clientsView();
  return `<button class="text-button back-link" data-nav="clients">← All clients</button>${pageTitle('CLIENT PROFILE', esc(client.name), 'Business details and related projects in one place.', `<div class="heading-actions client-management-actions"><button class="button secondary" data-edit-client="${client.id}">Edit client details</button><button class="button secondary danger-text" data-delete-client="${client.id}">Delete client</button><button class="button primary" data-new-project-for="${client.id}">+ Create new project</button></div>`)}<section class="client-detail-panel"><dl class="client-details">${[['Industry', client.industry], ['Contact person', client.contact], ['Email', client.email], ['Phone', client.phone], ['Address', client.address], ['Notes', client.notes]].map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value || 'Not provided')}</dd></div>`).join('')}</dl></section><div class="section-heading"><div><h2>Projects</h2><p>A single app or a complete solution. Each project has its own configuration, records and quote.</p></div><span class="count-pill">${projectsFor(client.id).length}</span></div>${projectTable(projectsFor(client.id), false)}`;
}

function projectTable(projects, showClient = true) {
  return `<div class="directory-table-wrap"><table class="directory-table project-directory"><caption class="sr-only">Projects</caption><thead><tr><th>Project</th>${showClient ? '<th>Client</th>' : ''}<th>Status / apps</th><th>Actions</th></tr></thead><tbody>${projects.map(project => `<tr data-project-row="${project.id}"><td><button class="text-button" data-manage-project="${project.id}">${esc(project.name)}</button><small>${esc(project.description || 'No description yet')}</small></td>${showClient ? `<td><button class="text-button" data-client-profile="${project.clientId}">${esc(ownerFor(project)?.name)}</button></td>` : ''}<td><span class="badge ${project.dirty || project.archived ? 'draft' : 'published'}">${projectStatus(project)}</span><small>${project.draft.apps.length} apps</small></td><td><div class="row-actions"><button class="button secondary" data-manage-project="${project.id}">Manage</button>${project.archived ? '' : `<button class="text-button" data-edit="${project.id}">Open in Studio</button>`}<button class="icon-button" data-preview="${project.id}" aria-label="Preview ${esc(project.name)}">${icon('eye', 17)}</button></div></td></tr>`).join('') || `<tr><td colspan="${showClient ? 4 : 3}"><div class="empty-state">No projects match this view. Create a project or change the filters.</div></td></tr>`}</tbody></table></div>`;
}

function projectResults() {
  const projects = state.clients.filter(project => (!projectClientFilter || project.clientId === projectClientFilter) && (projectStatusFilter === 'all' || (projectStatusFilter === 'archived' ? project.archived : !project.archived && (projectStatusFilter !== 'changes' || project.dirty))) && [project.name, project.description, ownerFor(project)?.name].join(' ').toLowerCase().includes(projectQuery.toLowerCase()));
  return `<div class="list-toolbar"><span>${projects.length} of ${state.clients.length} projects</span><span class="muted">Open a project to continue editing</span></div>${projectTable(projects)}`;
}

function projectsView() {
  return `${pageTitle('BUILD AND MANAGE', 'Projects & solutions', 'One place to create, continue development and manage every client solution.', newProjectButton)}<div class="studio-journey"><strong>New work:</strong> Create project → client & name → blank or optional framework → Studio.<br><strong>Ongoing work:</strong> Manage → review apps, pricing and versions → reopen Studio → publish an update.</div><form id="project-search-form" class="directory-toolbar"><label class="field-label" for="project-search">Search projects<input class="input" type="search" id="project-search" placeholder="Project or client name" value="${esc(projectQuery)}"></label><label class="field-label" for="project-client-filter">Client<select class="input" id="project-client-filter"><option value="">All clients</option>${state.clientProfiles.map(client => `<option value="${client.id}" ${projectClientFilter === client.id ? 'selected' : ''}>${esc(client.name)}</option>`).join('')}</select></label><label class="field-label" for="project-status-filter">Work status<select id="project-status-filter" class="input">${[['active', 'Active projects'], ['changes', 'Drafts / pending changes'], ['archived', 'Archived projects'], ['all', 'All projects']].map(([id, label]) => `<option value="${id}" ${projectStatusFilter === id ? 'selected' : ''}>${label}</option>`).join('')}</select></label><button class="button secondary" type="submit">Search</button><button class="text-button" type="button" data-clear-project-search>Clear</button></form><div id="project-results">${projectResults()}</div>`;
}

function projectManagementView() {
  const project = current();
  const quote = quoteFor(project.draft);
  const history = publicationHistory(project);
  const recordCount = Object.values(project.demoRecords || {}).reduce((sum, app) => sum + Object.values(app).reduce((total, rows) => total + rows.length, 0), 0);
  return `<div class="project-navigation"><button class="text-button" data-nav="builder">← All projects</button><button class="text-button" data-client-profile="${project.clientId}">Client: ${esc(ownerFor(project)?.name)}</button></div>${pageTitle('PROJECT MANAGEMENT', esc(project.name), esc(project.description || 'Manage this solution throughout its lifecycle.'), `<div class="heading-actions"><button class="button secondary" data-action="project-details">Edit project details</button>${project.archived ? `<button class="button primary" data-archive-project="${project.id}">Reactivate project</button>` : `<button class="button primary" data-edit="${project.id}">Open in Studio ${icon('arrow', 16)}</button>`}</div>`)}
    <div class="project-state-strip"><span class="badge ${project.dirty || project.archived ? 'draft' : 'published'}">${projectStatus(project)}</span><span>${project.archived ? 'Archived from active work. Reactivate to continue building.' : 'Changes are saved as drafts; publishing creates a versioned local snapshot.'}</span></div>
    <section class="metrics" aria-label="Project summary">${[[project.draft.apps.length, 'Selected apps', 'box'], [recordCount, 'Saved demo records', 'board'], [history.length, 'Retained publications', 'layers'], [project.version, 'Latest demo version', 'globe']].map(([value, label, glyph]) => `<div class="metric"><span class="metric-icon">${icon(glyph, 19)}</span><div><strong>${value}</strong><span>${label}</span></div></div>`).join('')}</section>
    <div class="management-home-grid"><section class="management-panel"><h2>Apps & daily use</h2><p>Use your configured apps or return to Studio to change their fields, pages and rules.</p><div class="managed-apps">${project.draft.apps.map(id => `<div class="managed-app"><strong>${esc(project.draft.appDefinitions[id]?.name || moduleById(id)?.name || id)}</strong>${project.archived ? '<span class="muted">Reactivate to use</span>' : `<div class="row-actions"><button class="text-button" data-edit-app="${id}">Edit app</button><button class="button secondary" data-run-app="${id}">Open app</button></div>`}</div>`).join('') || '<p>No apps selected. Open Studio to add or build the first app.</p>'}</div><p class="tiny-note muted">Browser-local app records; production users and services are not connected.</p></section>
    <section class="management-panel"><h2>Project quote</h2><dl class="management-quote"><div><dt>Draft recurring total</dt><dd>${studio.money(quote.monthly)} / month</dd></div><div><dt>Draft setup total</dt><dd>${studio.money(quote.setup)}</dd></div></dl>${project.archived ? '' : '<button class="text-button" data-open-pricing>Edit project pricing →</button>'}<p class="tiny-note muted">Illustrative EGP prices. Published quotes stay with their version snapshots.</p></section>
    <section class="management-panel publication-panel"><div class="section-heading"><div><h2>Publication history</h2><p>Preview retained versions while continuing work on your draft.</p></div><button class="text-button" data-preview="${project.id}">Preview draft</button></div><div class="publication-list">${history.map(item => `<div class="publication-item"><div><strong>Demo version ${item.version}${item.version === project.version ? ' · latest' : ''}</strong><p>${item.publishedAt ? esc(new Date(item.publishedAt).toLocaleString()) : 'Earlier publication · date not recorded'}</p><small>${item.config.apps.length} apps · ${studio.money(quoteFor(item.config).monthly)} / month</small></div><button class="button secondary" data-preview-version="${item.version}" data-project="${project.id}">Preview version</button></div>`).join('') || '<p>No publications yet. Build and preview in Studio, then publish your first demo version.</p>'}</div><p class="tiny-note muted">Publication snapshots contain configuration and quotes, not record backups or a production deployment. Earlier versions overwritten before this update cannot be recovered.</p></section>
    <section class="management-panel"><h2>Project lifecycle</h2><p>${project.archived ? 'Reactivate this project to put it back in active work. Its data and publications have been kept.' : 'Archive when work is paused or complete. The client, configuration, records and publications are kept.'}</p><div class="lifecycle-actions"><button class="button secondary" data-archive-project="${project.id}">${project.archived ? 'Reactivate project' : 'Archive project'}</button><button class="text-button danger-text" data-delete-project="${project.id}">Delete project</button></div></section></div>`;
}

function appCard(app, selectable = false) {
  const chosen = current()?.draft.apps.includes(app.id) || false;
  const inner = `<span class="module-icon ${app.color}">${icon(app.icon, 22)}</span><div class="module-card-copy"><strong>${esc(app.name)}</strong><p>${esc(app.description)}</p></div>${selectable ? `<span class="selection-indicator">${chosen ? icon('check', 14) : icon('plus', 14)}</span>` : `<span class="category-tag">${esc(app.category)}</span>`}`;
  const controls = `<div class="app-direct-actions"><button class="text-button" data-edit-app="${app.id}" ${chosen && editable() ? '' : 'disabled'}>${icon('sliders', 14)} Edit app</button><button class="text-button" data-run-app="${app.id}" ${chosen && editable() ? '' : 'disabled'}>${icon('eye', 14)} Preview app</button></div>`;
  return selectable ? `<article class="app-selection-tile ${chosen ? 'included' : ''}"><button class="module-select ${chosen ? 'selected' : ''}" data-toggle-app="${app.id}" aria-pressed="${chosen}" aria-label="${chosen ? 'Remove' : 'Add'} ${esc(app.name)}">${inner}</button><div class="app-tile-price">${studio.appPrice(app.id)}</div>${controls}</article>` : `<article class="library-card">${inner}<div class="library-price">${studio.appPrice(app.id)}</div><button class="text-button" data-add-app="${app.id}" ${editable() ? '' : 'disabled'}>${chosen ? 'Open project' : 'Add to selected project'} ${icon('arrow', 16)}</button>${chosen ? controls : ''}</article>`;
}

function projectOptions(placeholder = false) {
  return `${placeholder ? '<option value="">Choose a project…</option>' : ''}${state.clients.filter(project => !project.archived).map(project => `<option value="${project.id}" ${project.id === selectedId ? 'selected' : ''}>${esc(project.name)} — ${esc(ownerFor(project)?.name)}</option>`).join('')}`;
}

function appsView() {
  const filtered = allModules().filter(app => (category === 'All apps' || app.category === category) && `${app.name} ${app.description}`.toLowerCase().includes(query.toLowerCase()));
  return `${pageTitle('REUSABLE CAPABILITIES', 'Choose an app. Or build your own.', 'Select the project you want to work on. Apps and custom-app edits belong to that project.', `<div class="heading-actions"><button class="button secondary" data-price-book>Default price list</button><button class="button primary" data-new-custom-app ${current() ? '' : 'disabled'}>+ Create custom app</button></div>`)}<section class="library-project-context"><label class="field-label" for="library-project">Working project<select id="library-project" class="input">${projectOptions(true)}</select></label><button class="button secondary" data-action="new-project">+ New project</button>${current() ? `<button class="text-button" data-edit="${current().id}">Open project ${icon('arrow', 16)}</button>` : '<p>Choose or create a project above to add apps or build your own. Browsing shows default demo prices.</p>'}</section><div class="filter-pills">${['All apps', 'Customer', 'Operations', 'Commerce', 'People', 'Custom'].map(label => `<button class="filter-pill ${category === label ? 'active' : ''}" data-category="${label}">${label}</button>`).join('')}</div><section class="library-grid">${filtered.map(app => appCard(app)).join('')}</section>`;
}

function builder() {
  const client = current();
  enhanceState(state);
  return `<div class="project-navigation"><button class="text-button" data-nav="builder">← All projects</button><button class="text-button" data-manage-project="${client.id}">Manage project</button><button class="text-button" data-client-profile="${client.clientId}">Client: ${esc(ownerFor(client)?.name)}</button><button class="text-button" data-action="project-details">Edit project details</button></div>${pageTitle('STUDIO / SOLUTION BUILDER', esc(client.name), esc(client.description || 'Select an app or create your own. Configure, preview, then publish this project.'), `<div class="heading-actions"><button class="button secondary" data-preview="${client.id}">${icon('eye', 17)} Preview</button><button id="publish-button" class="button primary" data-action="publish">${icon('upload', 17)} Publish solution</button></div>`)}
  <section class="solution-bar"><div class="solution-identity">${logo(client.draft, 'small-logo')}<label class="client-picker"><span>CURRENT PROJECT</span><select id="client-select" aria-label="Select project">${projectOptions()}</select></label></div><div class="solution-status"><span id="draft-badge" class="badge ${client.dirty ? 'draft' : 'published'}">${client.dirty ? 'Draft changes' : `Demo version ${client.version}`}</span><span class="separator"></span><span>${icon('lock', 14)} Project-specific configuration</span></div></section>
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
  document.querySelector('#library-project')?.addEventListener('change', event => { selectedId = event.target.value; render(); });
  document.querySelector('#client-search')?.addEventListener('input', event => { query = event.target.value; document.querySelector('#client-results').innerHTML = clientResults(); });
  document.querySelector('#client-search-form')?.addEventListener('submit', event => { event.preventDefault(); query = document.querySelector('#client-search').value; document.querySelector('#client-results').innerHTML = clientResults(); });
  const filterProjects = () => {
    projectQuery = document.querySelector('#project-search').value;
    projectClientFilter = document.querySelector('#project-client-filter').value;
    projectStatusFilter = document.querySelector('#project-status-filter').value;
    document.querySelector('#project-results').innerHTML = projectResults();
  };
  document.querySelector('#project-search')?.addEventListener('input', filterProjects);
  document.querySelector('#project-client-filter')?.addEventListener('change', filterProjects);
  document.querySelector('#project-status-filter')?.addEventListener('change', filterProjects);
  document.querySelector('#project-search-form')?.addEventListener('submit', event => { event.preventDefault(); filterProjects(); });
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
      if (selectedClient.id === current()?.id) render();
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

function clientDialog(id = '', onSaved = null, onCancel = null) {
  const client = state.clientProfiles.find(item => item.id === id) || {};
  openDialog(`<div class="dialog-heading"><div><div class="eyebrow">CLIENT DIRECTORY</div><h2>${id ? 'Edit client details' : 'Create client'}</h2></div><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><p class="muted">Save the client’s details now. You can add projects whenever you are ready. Use synthetic details in this browser-local demo.</p><form id="client-details-form">${[['name', 'Client / business name', 60, 'text'], ['industry', 'Industry', 60, 'text'], ['contact', 'Contact person', 80, 'text'], ['email', 'Contact email', 120, 'email'], ['phone', 'Phone', 40, 'tel'], ['address', 'Address', 240, 'text']].map(([key, label, limit, type]) => `<label class="field-label" for="client-${key}">${label}${key === 'name' ? ' *' : ''}<input class="input" id="client-${key}" name="${key}" type="${type}" maxlength="${limit}" value="${esc(client[key] || '')}" ${key === 'name' ? 'required autofocus' : ''}></label>`).join('')}<label class="field-label" for="client-notes">Notes<textarea class="input" id="client-notes" name="notes" rows="3" maxlength="2000">${esc(client.notes || '')}</textarea></label><p class="form-error" role="alert"></p><div class="dialog-actions"><button class="button secondary" type="button" id="cancel-client">${onCancel ? 'Back to project setup' : 'Cancel'}</button><button class="button primary" type="submit">${id ? 'Save client details' : 'Create client'}</button></div></form>`);
  document.querySelector('#cancel-client').addEventListener('click', () => { document.querySelector('#dialog').close(); if (onCancel) onCancel(); });
  document.querySelector('#client-details-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const saved = saveClientProfile(state, Object.fromEntries(new FormData(event.target)), id);
      profileId = saved.id;
      activity(id ? 'Client details updated' : 'A client joined your directory', saved.name);
      document.querySelector('#dialog').close();
      if (onSaved) { render(); onSaved(saved); } else navigate('client');
      toast(id ? 'Client details saved.' : 'Client created. Add a project when you are ready.');
    } catch (error) { event.target.querySelector('.form-error').textContent = error.message; }
  });
}

function deleteClientDialog(id) {
  const client = state.clientProfiles.find(item => item.id === id);
  if (!client) return toast('Client not found.');
  const projects = projectsFor(id);
  openDialog(`<div class="dialog-heading"><div><div class="eyebrow">CLIENT MANAGEMENT</div><h2 id="delete-client-title">Delete client?</h2></div><button class="icon-button" data-action="close-dialog" aria-label="Close deletion dialog">${icon('close')}</button></div><p class="delete-summary">Delete <strong>${esc(client.name)}</strong> from this browser’s client directory? This action cannot be undone in Studio.</p><form id="delete-client-form" aria-labelledby="delete-client-title">${projects.length ? `<div class="delete-project-summary"><strong>${projects.length} related project${projects.length === 1 ? '' : 's'} will also be deleted:</strong><ul>${projects.map(project => `<li>${esc(project.name)} <small>· ${project.draft.apps.length} apps${project.published ? ' · includes published demo' : ''}</small></li>`).join('')}</ul><p>This includes their configuration, demo records, workflow history, quotes and published snapshots.</p></div><label class="checkbox-label delete-confirmation"><input type="checkbox" id="delete-client-projects" required> Also delete these projects and their saved demo data.</label>` : '<p class="delete-project-summary">This client has no projects. Only the client profile will be removed.</p>'}<p class="muted tiny-note">Other clients and shared app templates are kept.</p><p class="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button secondary" data-action="close-dialog" autofocus>Cancel</button><button type="submit" class="button danger">${projects.length ? 'Delete client & projects' : 'Delete client'}</button></div></form>`);
  document.querySelector('#delete-client-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      // Persist first, then replace active collections so a storage error cannot report a successful deletion.
      const next = { ...state };
      const removed = deleteClientProfile(next, id, { deleteProjects: document.querySelector('#delete-client-projects')?.checked === true });
      next.activity = [{ title: 'Client deleted', detail: `${removed.client.name} · ${removed.projectCount} related projects removed` }, ...state.activity].slice(0, 8);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
      catch { throw new Error('Deletion could not be saved to browser storage. The client and projects have been kept.'); }
      Object.assign(state, next);
      if (!current()) selectedId = '';
      if (profileId === id) profileId = '';
      if (projectClientFilter === id) projectClientFilter = '';
      document.querySelector('#dialog').close(); navigate('clients');
      toast(`Client deleted${removed.projectCount ? ` with ${removed.projectCount} related projects` : ''}.`);
    } catch (error) { event.target.querySelector('.form-error').textContent = error.message; }
  });
}

function persistManagementChange(next, title, detail) {
  next.activity = [{ title, detail }, ...state.activity].slice(0, 8);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
  catch { throw new Error('The change could not be saved to browser storage. Your project has been kept unchanged.'); }
  Object.assign(state, next);
}

function archiveProject(id) {
  const project = state.clients.find(item => item.id === id);
  if (!project) return toast('Project not found.');
  try {
    const updated = { ...project };
    setProjectArchived(updated, !project.archived);
    const next = { ...state, clients: state.clients.map(item => item.id === id ? updated : item) };
    persistManagementChange(next, updated.archived ? 'Project archived' : 'Project reactivated', updated.name);
    selectedId = id; navigate('manage');
    toast(updated.archived ? 'Project archived. Its data and publications are kept.' : 'Project is active. Continue working in Studio.');
  } catch (error) { toast(error.message); }
}

function deleteProjectDialog(id) {
  const project = state.clients.find(item => item.id === id);
  if (!project) return toast('Project not found.');
  openDialog(`<div class="dialog-heading"><h2>Delete project?</h2><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><p class="delete-summary">Delete <strong>${esc(project.name)}</strong> and its configuration, demo records, quotes and publication history? This cannot be undone in Studio.</p><p class="delete-project-summary">Client ${esc(ownerFor(project)?.name)}, their other projects and shared app templates are kept.</p><form id="delete-project-form"><p class="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button secondary" data-action="close-dialog" autofocus>Cancel</button><button class="button danger" type="submit">Delete project</button></div></form>`);
  document.querySelector('#delete-project-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const next = { ...state }; deleteProject(next, id);
      persistManagementChange(next, 'Project deleted', project.name);
      if (selectedId === id) selectedId = '';
      document.querySelector('#dialog').close(); navigate('builder'); toast('Project deleted. The client and other projects are kept.');
    } catch (error) { event.target.querySelector('.form-error').textContent = error.message; }
  });
}

function newProject(templateId = 'blank', clientId = '', input = {}) {
  openDialog(`<div class="dialog-heading"><div><div class="eyebrow">CONTIGOO STUDIO / NEW PROJECT</div><h2>Create new project</h2></div><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><p class="muted">A project can contain a single custom app or a complete solution. Choose its client and starting point.</p><form id="new-project-form"><label class="field-label" for="new-project-client">Client *</label><select id="new-project-client" class="input" required><option value="">Choose a client…</option>${state.clientProfiles.map(client => `<option value="${client.id}" ${client.id === clientId ? 'selected' : ''}>${esc(client.name)}</option>`).join('')}</select><button class="text-button" id="project-create-client" type="button">+ Create a client first</button><label class="field-label" for="new-project-name">Project name *</label><input class="input" id="new-project-name" value="${esc(input.name || '')}" placeholder="e.g. Operations portal" maxlength="60" required><label class="field-label" for="new-project-description">Description</label><textarea class="input" id="new-project-description" maxlength="500" rows="2" placeholder="What will this app or solution do?">${esc(input.description || '')}</textarea><label class="field-label" for="new-project-template">Starting point — optional framework</label><select id="new-project-template" class="input">${templates.map(template => `<option value="${template.id}" ${template.id === templateId ? 'selected' : ''}>${esc(template.name)}${template.id === 'blank' ? ' (recommended)' : ''}</option>`).join('')}</select><div id="starter-detail" class="starter-detail"></div><div class="dialog-note">${icon('layers', 19)} Next: select or create apps → configure data, pages and rules → branding and access → preview and publish.</div><p class="form-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button secondary" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Create & open Studio ${icon('arrow', 17)}</button></div></form>`);
  const updateStarterDetail = () => {
    const starter = templates.find(item => item.id === document.querySelector('#new-project-template').value);
    const total = starter.apps.reduce((sum, id) => sum + state.priceBook[id].monthly, 0);
    document.querySelector('#starter-detail').innerHTML = `<strong>${starter.apps.length ? `${starter.apps.length} modules preselected` : 'An empty project. Full choice.'}</strong><p>${esc(starter.description)}</p><div class="small-app-tags">${starter.apps.map(id => `<span>${esc(moduleById(id).name)}</span>`).join('')}</div><small>${starter.apps.length ? `${studio.money(total)} / month at current demo defaults, before setup or overrides. Remove or customize any module next.` : 'No apps or app charges yet. Your quote updates as you add modules.'}</small>`;
  };
  document.querySelector('#new-project-form').insertAdjacentHTML('afterbegin', '<div class="creation-steps" aria-label="Project setup">1. Client & project <span>→</span> 2. Starting point <span>→</span> 3. Open Studio</div>');
  document.querySelector('#new-project-template').addEventListener('change', updateStarterDetail);
  updateStarterDetail();
  document.querySelector('#project-create-client').addEventListener('click', () => {
    const draft = { name: document.querySelector('#new-project-name').value, description: document.querySelector('#new-project-description').value };
    const template = document.querySelector('#new-project-template').value;
    const owner = document.querySelector('#new-project-client').value;
    clientDialog('', client => newProject(template, client.id, draft), () => newProject(template, owner, draft));
  });
  document.querySelector('#new-project-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const project = createProject(state, { name: document.querySelector('#new-project-name').value, description: document.querySelector('#new-project-description').value, clientId: document.querySelector('#new-project-client').value, templateId: document.querySelector('#new-project-template').value });
      selectedId = project.id; tab = 'apps'; enhanceState(state);
      activity('A new project is taking shape', `${project.name} · ${ownerFor(project).name}`);
      document.querySelector('#dialog').close(); navigate('project'); toast('Project created. Choose apps or create your own.');
    } catch (error) { event.target.querySelector('.form-error').textContent = error.message; }
  });
}

function projectDetailsDialog() {
  const project = current();
  openDialog(`<div class="dialog-heading"><h2>Edit project details</h2><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><p class="muted">Client: ${esc(ownerFor(project)?.name)}. Project details are separate from the app’s display branding.</p><form id="project-details-form"><label class="field-label">Project name<input class="input" name="name" maxlength="60" value="${esc(project.name)}" required></label><label class="field-label">Description<textarea class="input" name="description" maxlength="500" rows="3">${esc(project.description)}</textarea></label><p class="form-error" role="alert"></p><div class="dialog-actions"><button class="button primary" type="submit">Save project details</button></div></form>`);
  document.querySelector('#project-details-form').addEventListener('submit', event => {
    event.preventDefault();
    try { updateProjectDetails(project, Object.fromEntries(new FormData(event.target))); save(); document.querySelector('#dialog').close(); render(); toast('Project details saved.'); }
    catch (error) { event.target.querySelector('.form-error').textContent = error.message; }
  });
}

function previewClient(id, published = false, version = null) {
  let client = state.clients.find(item => item.id === id);
  if (version !== null) {
    const entry = publicationHistory(client).find(item => item.version === version);
    if (!entry) return toast('Publication not found.');
    client = { ...client, published: entry.config, version: entry.version };
    published = true;
  }
  const config = published ? client.published : client.draft;
  const quote = config?.quote ? quoteFor(config) : null;
  const launcher = !published && !client.archived ? `<div class="preview-app-launcher">${client.draft.apps.map(appId => `<button class="button secondary" data-app-client="${client.id}" data-run-app="${appId}">${icon('external', 14)} Open ${esc(moduleById(appId)?.name || appId)}</button>`).join('')}</div>` : '';
  openDialog(`<div class="dialog-heading preview-dialog-heading"><div><span class="eyebrow">PROJECT PREVIEW · ${esc(ownerFor(client)?.name)}</span><h2>${esc(client.name)}</h2></div><div class="heading-actions"><button class="button secondary" data-preview-mode="${published ? 'draft' : 'published'}" data-client="${client.id}">${published ? 'Show draft' : 'Show published demo'}</button><button class="icon-button" data-action="close-dialog" aria-label="Close preview">${icon('close')}</button></div></div>${quote ? `<div class="quote-preview-readonly"><strong>${published ? 'Published quote snapshot' : 'Draft quote'}</strong><span>${studio.money(quote.monthly)} / month</span><span>${studio.money(quote.setup)} one-time setup</span><small>Illustrative pricing</small></div>` : ''}${launcher}${solutionPreview(client, false, published)}`, 'preview-dialog');
}

function platformSite() {
  openDialog(`<div class="dialog-heading"><span class="eyebrow">STANDALONE CONTIGOO WEBSITE · CONCEPT</span><button class="icon-button" data-action="close-dialog" aria-label="Close website preview">${icon('close')}</button></div><div class="public-site"><header><img src="/assets/logo.png" alt="Contigoo"><nav><a href="#site-apps">Apps</a><a href="#site-solutions">Solutions</a><button class="button dark" data-action="enter-studio">Open Studio ${icon('arrow', 16)}</button></nav></header><div class="public-hero"><span class="eyebrow">YOUR COMPLETE BUSINESS PLATFORM</span><h1>Built for your business.<br><em>Made to be yours.</em></h1><p>Bring your teams, operations and customers together.<br>Choose the apps you need. Shape the way you work.</p><button class="button primary" data-action="enter-studio">Explore the Studio ${icon('arrow', 17)}</button><div class="public-trust">One login <span>·</span> Connected apps <span>·</span> Your own identity</div></div><section id="site-apps" class="public-apps">${modules.slice(0, 6).map(app => `<div><span class="module-icon ${app.color}">${icon(app.icon, 24)}</span><strong>${app.name}</strong></div>`).join('')}</section><div id="site-solutions" class="public-bottom"><h2>One foundation.<br>Many ways to grow.</h2><p>A restaurant’s relationships. A company’s operations.<br>A retailer’s next collection. Connected by Contigoo.</p></div></div>`, 'website-dialog');
}

document.addEventListener('click', event => {
  const button = event.target.closest('button, a[data-nav]');
  if (!button) return;
  const data = button.dataset;
  if (button.disabled) return;
  if (data.appClient) selectedId = data.appClient;
  if ('openPricing' in data) { tab = 'pricing'; navigate('project'); return; }
  if (studio.handle(data)) return;
  if (data.nav) return navigate(data.nav);
  if (data.edit) { selectedId = data.edit; tab = 'apps'; return navigate('project'); }
  if (data.manageProject) { selectedId = data.manageProject; return navigate('manage'); }
  if (data.archiveProject) return archiveProject(data.archiveProject);
  if (data.deleteProject) return deleteProjectDialog(data.deleteProject);
  if (data.previewVersion) return previewClient(data.project, true, Number(data.previewVersion));
  if (data.clientProfile) { profileId = data.clientProfile; return navigate('client'); }
  if (data.editClient) return clientDialog(data.editClient);
  if (data.deleteClient) return deleteClientDialog(data.deleteClient);
  if (data.newProjectFor) return newProject('blank', data.newProjectFor);
  if ('clearClientSearch' in data) { query = ''; return render(); }
  if ('clearProjectSearch' in data) { projectQuery = ''; projectClientFilter = ''; projectStatusFilter = 'active'; return render(); }
  if (data.preview) return previewClient(data.preview);
  if (data.previewMode) return previewClient(data.client, data.previewMode === 'published');
  if (data.tab) { tab = data.tab; return render(); }
  if (data.category) { category = data.category; return render(); }
  if (data.toggleApp) { toggleApp(current(), data.toggleApp, allModules()); enhanceState(state); if (current().draft.apps.includes(data.toggleApp)) definitionFor(state, current(), data.toggleApp); save(); return render(); }
  if (data.addApp) { if (!current()) return navigate('builder'); if (!current().draft.apps.includes(data.addApp)) toggleApp(current(), data.addApp, allModules()); enhanceState(state); definitionFor(state, current(), data.addApp); save(); tab = 'apps'; navigate('project'); return toast(`App ready in ${current().name}'s draft. Use Edit app or Preview app.`); }
  if (data.role) { current().draft.role = data.role; updateDraft(); return render(); }
  if (data.color) { current().draft.color = data.color; updateDraft(); return render(); }
  if (data.deleteField) { current().draft.fields = current().draft.fields.filter(field => field.id !== data.deleteField); updateDraft(); return render(); }
  if (data.action === 'new-client') return clientDialog();
  if (data.action === 'new-project') return newProject();
  if (data.action === 'project-details') return projectDetailsDialog();
  if (data.action === 'close-dialog') { document.querySelector('#dialog').close(); if (view === 'manage') render(); return; }
  if (data.action === 'platform-site') return platformSite();
  if (data.action === 'enter-studio') { document.querySelector('#dialog').close(); return navigate('overview'); }
  if (data.action === 'shop-collection') { button.closest('.storefront').querySelector('.products').scrollIntoView({ behavior: 'smooth', block: 'center' }); return toast('Storefront concept: sample products only. Checkout is not connected.'); }
  if (data.action === 'remove-logo') { current().draft.logo = ''; updateDraft(); return render(); }
  if (data.action === 'publish') {
    try {
      const published = structuredClone(current());
      publishClient(published);
      const next = { ...state, clients: state.clients.map(project => project.id === published.id ? published : project) };
      persistManagementChange(next, 'A solution is ready to share', `${published.name} · demo version ${published.version}`);
      render(); toast(`Demo version ${published.version} saved locally. No public deployment has occurred.`);
    }
    catch (error) { toast(error.message); }
  }
});

document.addEventListener('click', event => {
  if (event.target.closest('.brand')) { event.preventDefault(); navigate('overview'); }
});
shell();
save();
