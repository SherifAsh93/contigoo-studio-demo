import { clone } from './model.mjs';
import { catalog, enhanceState, quoteFor, moneyToCents, defaultPrice, setProjectPrice, setQuoteSettings, definitionFor, createCustomApp, addAppEntity, addAppField, addAppPage, addWorkflow, moveItem, recordsFor, saveDemoRecord, reusableTemplate, fieldTypes, pageTypes } from './builder-model.mjs';

export function createStudioUI(ctx) {
  const { state, current, save, render, navigate, toast, icon, esc, openDialog } = ctx;
  let appId = '';
  let section = 'data';
  let entityId = '';
  let runtime = null;
  const app = () => catalog(state).find(item => item.id === appId);
  const definition = () => definitionFor(state, current(), appId);
  const money = amount => `EGP ${(amount / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const amount = cents => (cents / 100).toFixed(2);
  const mark = () => { current().dirty = true; save(); };
  const options = (items, selected = '') => items.map(item => `<option value="${esc(item.id)}" ${item.id === selected ? 'selected' : ''}>${esc(item.name)}</option>`).join('');
  const formError = (form, error) => { const node = form.querySelector('.form-error'); if (node) node.textContent = error.message; else toast(error.message); };
  const activeEntity = () => definition().entities.find(item => item.id === entityId) || definition().entities[0];

  function openEditor(id) {
    if (!current().draft.apps.includes(id)) return toast('Add this app to the client project first.');
    appId = id; section = 'data'; entityId = definition().entities[0].id;
    save(); navigate('designer');
  }

  function quoteBanner() {
    enhanceState(state);
    const quote = quoteFor(current().draft);
    return `<section class="project-cost-banner" aria-label="Client project quote">
      <div><span class="eyebrow">THIS CLIENT’S SYSTEM PRICE</span><p>${quote.lines.length} selected apps · updates as you add or remove apps</p></div>
      <div class="quote-metric"><strong id="project-monthly">${money(quote.monthly)}</strong><span>per month</span></div>
      <div class="quote-metric"><strong id="project-setup">${money(quote.setup)}</strong><span>one-time setup</span></div>
      <button class="button secondary" data-open-pricing>Edit prices ${icon('arrow', 15)}</button>
      <small>Illustrative admin-editable rates · no charges</small>
    </section>`;
  }

  function appPrice(id) {
    const price = current().draft.quote?.prices[id] || state.priceBook[id] || defaultPrice(id);
    return `${money(price.monthly)}/mo${price.setup ? ` + ${money(price.setup)} setup` : ''}`;
  }

  function pricingView() {
    const quote = quoteFor(current().draft);
    return `<div class="panel-heading"><h3>Price this client’s solution</h3><button class="text-button" data-price-book>Default price list</button></div>
      <p class="muted config-intro">Every selected app adds a line. Changes here apply to this project only. Setup fees are separate from the recurring subscription.</p>
      <div class="price-lines">${quote.lines.map(line => `<form class="project-price-row" data-project-price="${line.id}">
        <strong>${esc(catalog(state).find(item => item.id === line.id)?.name || line.id)}</strong>
        <label>EGP / month<input class="input" name="monthly" type="number" min="0" step="0.01" value="${amount(line.monthly)}" required></label>
        <label>EGP setup<input class="input" name="setup" type="number" min="0" step="0.01" value="${amount(line.setup)}" required></label>
        <button class="button secondary" type="submit">Save</button><p class="form-error" role="alert"></p></form>`).join('') || '<p class="muted">Select apps to build the quote.</p>'}</div>
      <form id="quote-settings"><div class="form-row"><label class="field-label">Base EGP / month<input class="input" name="monthly" type="number" min="0" step="0.01" value="${amount(quote.baseMonthly)}" required></label><label class="field-label">Base EGP setup<input class="input" name="setup" type="number" min="0" step="0.01" value="${amount(quote.baseSetup)}" required></label></div>
      <label class="field-label">Discount on recurring total (%)<input class="input" name="discount" type="number" min="0" max="100" step="0.01" value="${current().draft.quote.discountPercent}" required></label>
      <p class="form-error" role="alert"></p><button class="button primary" type="submit">Update quote</button></form>
      <div class="quote-totals"><div><span>Recurring subtotal</span><strong>${money(quote.subtotal)}</strong></div><div><span>Recurring discount</span><strong>− ${money(quote.discount)}</strong></div><div><span>Monthly total</span><strong>${money(quote.monthly)}</strong></div><div><span>One-time setup total</span><strong>${money(quote.setup)}</strong></div><div class="grand-total"><span>First month + setup</span><strong>${money(quote.firstPayment)}</strong></div></div>
      <p class="muted tiny-note">Demo quotation only. Tax, usage charges and payment processing are not included. Publishing snapshots this project’s app selection and prices.</p>
      <button class="button secondary" data-export-quote>${icon('external', 16)} Export quote JSON</button>`;
  }

  function openPriceBook() {
    openDialog(`<div class="dialog-heading"><div><div class="eyebrow">PLATFORM ADMINISTRATION</div><h2>Default app prices</h2></div><button class="icon-button" data-action="close-dialog" aria-label="Close price list">${icon('close')}</button></div><p class="muted">Defaults for new project selections. Existing project prices and published quotes stay unchanged.</p>
      <form id="price-book-form"><div class="price-book-table"><div class="price-book-row heading"><strong>App</strong><span>EGP / month</span><span>EGP setup</span></div>${catalog(state).map(item => `<div class="price-book-row"><strong>${esc(item.name)}</strong><input class="input" aria-label="${esc(item.name)} monthly price" data-price-id="${item.id}" data-price-kind="monthly" type="number" min="0" step="0.01" value="${amount(state.priceBook[item.id].monthly)}" required><input class="input" aria-label="${esc(item.name)} setup price" data-price-id="${item.id}" data-price-kind="setup" type="number" min="0" step="0.01" value="${amount(state.priceBook[item.id].setup)}" required></div>`).join('')}</div><p class="form-error" role="alert"></p><div class="dialog-actions"><button class="button primary" type="submit">Save default prices</button></div></form>`, 'wide-dialog');
    document.querySelector('#price-book-form').addEventListener('submit', event => {
      event.preventDefault();
      try {
        const next = clone(state.priceBook);
        for (const input of event.target.querySelectorAll('[data-price-id]')) next[input.dataset.priceId][input.dataset.priceKind] = moneyToCents(input.value);
        state.priceBook = next; save(); document.querySelector('#dialog').close(); render(); toast('Default prices saved. Existing project quotes are unchanged.');
      } catch (error) { formError(event.target, error); }
    });
  }

  function customAppDialog() {
    enhanceState(state);
    openDialog(`<div class="dialog-heading"><div><div class="eyebrow">NO CODE. YOUR OWN APP.</div><h2>Build a custom app</h2></div><button class="icon-button" data-action="close-dialog" aria-label="Close app creation">${icon('close')}</button></div>
      <p class="muted">For ${esc(current().draft.name)}. The app starts with a data table, editable form and dashboard. You can add more visually.</p>
      <form id="custom-app-form"><label class="field-label">App name<input class="input" name="name" id="custom-app-name" placeholder="e.g. Equipment Rentals" maxlength="60" required autofocus></label>
      <label class="field-label">First entity / record type<input class="input" name="entity" id="custom-app-entity" placeholder="e.g. Rental" maxlength="35" required></label>
      <div class="form-row"><label class="field-label">EGP / month<input class="input" name="monthly" id="custom-app-monthly" type="number" min="0" step="0.01" value="0" required></label><label class="field-label">One-time EGP setup<input class="input" name="setup" id="custom-app-setup" type="number" min="0" step="0.01" value="0" required></label></div>
      <p class="form-error" role="alert"></p><div class="dialog-actions"><button class="button primary" type="submit">Create & open app builder ${icon('arrow', 17)}</button></div></form>`);
    document.querySelector('#custom-app-form').addEventListener('submit', event => {
      event.preventDefault(); const values = new FormData(event.target);
      try {
        const item = createCustomApp(state, current(), { name: values.get('name'), entityName: values.get('entity'), monthly: values.get('monthly'), setup: values.get('setup') });
        save(); document.querySelector('#dialog').close(); openEditor(item.id); toast('Your app is ready to design. Its price is included in this project.');
      } catch (error) { formError(event.target, error); }
    });
  }

  function editorView() {
    const def = definition(); const entity = activeEntity(); entityId = entity.id;
    return `<div class="page-heading"><div><div class="eyebrow">${esc(current().draft.name)} / VISUAL APP BUILDER</div><h1>${esc(def.name)}</h1><p>Design this app here. No code or AI prompt needed for these building blocks.</p></div><div class="heading-actions"><button class="button secondary" data-nav="builder">Back to project</button><button class="button primary" data-run-app="${appId}">${icon('eye', 17)} Preview & use app</button></div></div>
      <div class="editor-scope"><span>${icon('sliders', 18)} Editing this client’s copy only · changes save as a local draft</span>${app().custom ? `<button class="text-button" data-save-app-template>Save as reusable app template ${icon('layers', 15)}</button>` : ''}</div>
      <div class="designer-layout"><section class="configuration-panel designer-panel"><div class="builder-tabs">${[['data', 'Data & fields'], ['pages', 'Pages & layout'], ['workflow', 'Workflows'], ['price', 'App price']].map(([key, text]) => `<button class="${section === key ? 'active' : ''}" data-designer-tab="${key}">${text}</button>`).join('')}</div><div class="configuration-body">${section === 'data' ? dataEditor(def, entity) : section === 'pages' ? pagesEditor(def) : section === 'workflow' ? workflowEditor(def, entity) : appPriceEditor()}</div></section>
      <aside class="designer-outline"><span class="eyebrow">APP STRUCTURE</span><h3>${esc(def.name)}</h3><div class="outline-counts"><span>${def.entities.length} entities</span><span>${def.pages.length} pages</span><span>${def.workflows.length} rules</span></div>
      <h4>Client navigation</h4>${def.pages.map(page => `<button class="outline-page" data-open-app-page="${page.id}">${icon(page.kind === 'Form' ? 'sliders' : page.kind === 'Dashboard' ? 'chart' : 'board', 17)}<span>${esc(page.name)}<small>${page.kind}</small></span>${icon('external', 13)}</button>`).join('')}
      <div class="outline-price"><span>Included in this project</span><strong>${appPrice(appId)}</strong></div>
      <div class="inline-note">${icon('eye', 17)} Preview & use app opens your generated forms and pages. Add demo records and test your rules immediately.</div>
      <p class="tiny-note muted">Records stay in this browser. This generic visual runtime is not yet a production inventory, accounting or checkout engine.</p></aside></div>`;
  }

  function dataEditor(def, entity) {
    return `<div class="panel-heading"><h3>Define what this app stores</h3><select class="input compact-input" id="designer-entity" aria-label="App entity">${options(def.entities, entity.id)}</select></div>
      <p class="muted config-intro">A record type can be a Rental, Job, Guest, Request or anything your client tracks.</p>
      <form id="app-entity-form" class="inline-form"><input class="input" name="name" id="app-entity-name" placeholder="Add another entity" maxlength="35" required><button class="button secondary" type="submit">+ Entity</button></form>
      <form id="app-field-form" class="editor-form"><div class="form-row"><label class="field-label">Field label<input class="input" name="label" id="app-field-label" maxlength="45" placeholder="e.g. Return date" required></label><label class="field-label">Field type<select class="input" name="type" id="app-field-type">${fieldTypes.map(type => `<option>${type}</option>`).join('')}</select></label></div>
      <label class="field-label">Choices, if applicable<input class="input" name="options" id="app-field-options" placeholder="e.g. New, Approved, Rejected"></label>
      <div class="form-submit-row"><label class="checkbox-label"><input name="required" id="app-field-required" type="checkbox"> Required</label><button class="button primary" type="submit">+ Add field</button></div><p class="form-error" role="alert"></p></form>
      <div class="editor-section-heading"><h3>Form fields</h3><span>Rename · require · show/hide · reorder</span></div>
      <div class="editable-fields">${entity.fields.map((field, index) => `<div class="editable-field" data-app-field="${field.id}"><div class="field-line"><span class="field-type-icon">${field.type === 'Number' ? '#' : 'Aa'}</span><input class="input" data-field-label="${field.id}" aria-label="Rename ${esc(field.label)}" value="${esc(field.label)}" maxlength="45"><span class="field-type-tag">${field.type}</span></div><div class="field-controls"><label><input type="checkbox" data-field-required="${field.id}" ${field.required ? 'checked' : ''}> Required</label><label><input type="checkbox" data-field-visible="${field.id}" ${field.visible !== false ? 'checked' : ''}> Visible</label><button class="icon-button" data-field-move="${field.id}" data-direction="-1" ${index === 0 ? 'disabled' : ''} aria-label="Move ${esc(field.label)} up">↑</button><button class="icon-button" data-field-move="${field.id}" data-direction="1" ${index === entity.fields.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(field.label)} down">↓</button><button class="icon-button" data-remove-app-field="${field.id}" aria-label="Remove ${esc(field.label)}">${icon('trash', 15)}</button></div></div>`).join('')}</div>`;
  }

  function pagesEditor(def) {
    return `<h3>Build your app’s pages and navigation</h3><p class="muted config-intro">Compose dashboards, data lists, forms and content pages. Each page is generated from your app’s schema.</p>
      <form id="app-name-form" class="inline-form"><input class="input" name="name" value="${esc(def.name)}" aria-label="App display name" maxlength="60" required><button class="button secondary" type="submit">Rename app</button></form>
      <form id="app-page-form"><div class="form-row"><label class="field-label">Page title<input class="input" name="name" id="app-page-name" placeholder="e.g. New booking" maxlength="45" required></label><label class="field-label">Page component<select class="input" name="kind" id="app-page-kind">${pageTypes.map(type => `<option>${type}</option>`).join('')}</select></label></div>
      <label class="field-label">Connected entity<select class="input" name="entityId" id="app-page-entity">${options(def.entities, entityId)}</select></label><label class="field-label">Text for a content page<textarea class="input" name="body" rows="3" maxlength="2000" placeholder="Write your welcome message or instructions"></textarea></label><p class="form-error" role="alert"></p><button class="button primary" type="submit">+ Add page</button></form>
      <div class="field-list">${def.pages.map((page, index) => `<div class="custom-field-item"><span class="field-type-icon">${icon(page.kind === 'Form' ? 'sliders' : 'board', 16)}</span><div><strong>${esc(page.name)}</strong><small>${page.kind} · ${esc(def.entities.find(entity => entity.id === page.entityId)?.name || '')}</small></div><div class="page-row-actions"><button class="icon-button" data-page-move="${page.id}" data-direction="-1" ${index === 0 ? 'disabled' : ''} aria-label="Move ${esc(page.name)} up">↑</button><button class="icon-button" data-edit-page="${page.id}" aria-label="Edit ${esc(page.name)}">${icon('sliders', 15)}</button><button class="icon-button" data-open-app-page="${page.id}" aria-label="Preview ${esc(page.name)}">${icon('eye', 15)}</button><button class="icon-button" data-remove-page="${page.id}" aria-label="Remove ${esc(page.name)}">${icon('trash', 15)}</button></div></div>`).join('')}</div>`;
  }

  function workflowEditor(def, entity) {
    return `<div class="panel-heading"><h3>When this happens, do that</h3><select class="input compact-input" id="designer-entity" aria-label="Workflow entity">${options(def.entities, entity.id)}</select></div><p class="muted config-intro">These rules execute when you create a record in Preview & use app. No scripts. Rules run once, in the order below.</p>
      <form id="app-workflow-form"><label class="field-label">Rule name<input class="input" name="name" id="workflow-name" placeholder="e.g. New rentals start as pending" maxlength="60" required></label>
      <div class="workflow-trigger">${icon('spark', 18)} WHEN a new ${esc(entity.name)} record is created</div>
      <div class="form-row"><label class="field-label">IF field<select class="input" name="conditionField"><option value="">Always run</option>${options(entity.fields.map(field => ({ id: field.id, name: field.label })))}</select></label><label class="field-label">Equals<input class="input" name="conditionValue" placeholder="Exact value, if using a condition"></label></div>
      <div class="form-row"><label class="field-label">THEN<select class="input" name="action" id="workflow-action"><option value="set">Set a field value</option><option value="note">Write an activity note</option></select></label><label class="field-label">Target field<select class="input" name="targetField" id="workflow-target">${options(entity.fields.map(field => ({ id: field.id, name: field.label })))}</select></label></div>
      <label class="field-label">Value or activity note<input class="input" name="value" id="workflow-value" placeholder="Use an allowed field value, or write a note" required></label><p class="form-error" role="alert"></p><button class="button primary" type="submit">+ Add rule</button></form>
      <div class="field-list">${def.workflows.map(rule => `<div class="custom-field-item"><span class="field-type-icon">${icon('workflow', 16)}</span><div><strong>${esc(rule.name)}</strong><small>${esc(def.entities.find(item => item.id === rule.entityId)?.name)} created → ${rule.action === 'set' ? 'set field' : 'activity note'}: ${esc(rule.value)}</small></div><label class="checkbox-label"><input type="checkbox" data-rule-enabled="${rule.id}" ${rule.enabled ? 'checked' : ''}> On</label><button class="icon-button" data-remove-rule="${rule.id}" aria-label="Remove ${esc(rule.name)}">${icon('trash', 15)}</button></div>`).join('') || '<p class="muted config-intro">No rules yet. Add your first one and test it in the app preview.</p>'}</div>`;
  }

  function appPriceEditor() {
    const price = current().draft.quote.prices[appId];
    return `<h3>This app’s contribution to the client quote</h3><p class="muted config-intro">Set a project-specific price. Changing it updates the system total without changing other clients or your default price list.</p>
      <form class="single-app-price" data-project-price="${appId}"><label class="field-label">EGP per month<input class="input" name="monthly" type="number" min="0" step="0.01" value="${amount(price.monthly)}" required></label><label class="field-label">One-time EGP setup<input class="input" name="setup" type="number" min="0" step="0.01" value="${amount(price.setup)}" required></label><p class="form-error" role="alert"></p><button class="button primary" type="submit">Save app price</button></form><div class="inline-note">${icon('chart', 17)} ${current().draft.apps.length} selected apps. Whole system: ${money(quoteFor(current().draft).monthly)} / month, plus ${money(quoteFor(current().draft).setup)} setup.</div>`;
  }

  function bind() {
    document.querySelectorAll('[data-project-price]').forEach(form => form.addEventListener('submit', event => {
      event.preventDefault(); const values = new FormData(form);
      try { setProjectPrice(state, current(), form.dataset.projectPrice, values.get('monthly'), values.get('setup')); save(); render(); toast('Project app price updated.'); } catch (error) { formError(form, error); }
    }));
    document.querySelector('#quote-settings')?.addEventListener('submit', event => {
      event.preventDefault(); const values = new FormData(event.target);
      try { setQuoteSettings(current(), values.get('monthly'), values.get('setup'), values.get('discount')); save(); render(); } catch (error) { formError(event.target, error); }
    });
    document.querySelector('#designer-entity')?.addEventListener('change', event => { entityId = event.target.value; render(); });
    const formHandler = (selector, action) => document.querySelector(selector)?.addEventListener('submit', event => {
      event.preventDefault();
      try { action(Object.fromEntries(new FormData(event.target))); mark(); render(); } catch (error) { formError(event.target, error); }
    });
    formHandler('#app-entity-form', values => { entityId = addAppEntity(definition(), values.name).id; });
    formHandler('#app-field-form', values => addAppField(definition(), { ...values, entityId, required: values.required === 'on' }));
    formHandler('#app-page-form', values => addAppPage(definition(), values));
    formHandler('#app-workflow-form', values => addWorkflow(definition(), { ...values, entityId }));
    formHandler('#app-name-form', values => { const name = values.name.trim(); if (!name) throw new Error('Enter an app name.'); definition().name = name; });
    document.querySelectorAll('[data-field-label]').forEach(input => input.addEventListener('change', () => {
      const field = activeEntity().fields.find(item => item.id === input.dataset.fieldLabel); const value = input.value.trim();
      if (!value || activeEntity().fields.some(item => item.id !== field.id && item.label.toLowerCase() === value.toLowerCase())) { toast('Use a non-empty, unique field label.'); input.value = field.label; return; }
      field.label = value; mark(); render();
    }));
    for (const [attribute, property] of [['fieldRequired', 'required'], ['fieldVisible', 'visible']]) {
      const selector = property === 'required' ? '[data-field-required]' : '[data-field-visible]';
      document.querySelectorAll(selector).forEach(input => input.addEventListener('change', () => {
        const field = activeEntity().fields.find(item => item.id === input.dataset[attribute]);
        if (property === 'visible' && !input.checked && field.required) { input.checked = true; toast('Make the field optional before hiding it.'); return; }
        field[property] = input.checked;
        if (property === 'required' && input.checked) field.visible = true;
        mark(); render();
      }));
    }
    document.querySelectorAll('[data-rule-enabled]').forEach(input => input.addEventListener('change', () => { definition().workflows.find(rule => rule.id === input.dataset.ruleEnabled).enabled = input.checked; mark(); }));
  }

  function runtimeInput(field, value = '') {
    const required = field.required && field.type !== 'Yes / No' ? 'required' : '';
    const id = `record-${field.id}`;
    if (field.type === 'Yes / No') return `<label class="checkbox-label runtime-checkbox"><input id="${id}" name="${field.id}" type="checkbox" ${value === true ? 'checked' : ''}> ${esc(field.label)}</label>`;
    const control = field.type === 'Choice' ? `<select class="input" id="${id}" name="${field.id}" ${required}><option value="">Choose…</option>${field.options.map(choice => `<option ${choice === value ? 'selected' : ''}>${esc(choice)}</option>`).join('')}</select>` : `<input class="input" id="${id}" name="${field.id}" type="${({ Number: 'number', Date: 'date', Email: 'email' })[field.type] || 'text'}" ${field.type === 'Number' ? 'step="any"' : ''} value="${esc(value)}" ${required}>`;
    return `<label class="field-label" for="${id}">${esc(field.label)}${field.required ? ' *' : ''}${control}</label>`;
  }

  function runApp(id, pageId = '') {
    if (!current().draft.apps.includes(id)) return toast('Add the app to this project first.');
    const def = definitionFor(state, current(), id); save();
    runtime = { clientId: current().id, appId: id, pageId: pageId || def.pages[0].id, editId: '', form: false };
    showRuntime();
  }

  function showRuntime() {
    const client = state.clients.find(item => item.id === runtime.clientId);
    const def = definitionFor(state, client, runtime.appId);
    const page = def.pages.find(item => item.id === runtime.pageId) || def.pages[0];
    const entity = def.entities.find(item => item.id === page.entityId) || def.entities[0];
    const records = recordsFor(client, runtime.appId, entity.id);
    const fields = entity.fields.filter(field => field.visible !== false);
    const isForm = runtime.form || page.kind === 'Form';
    let body;
    if (isForm) {
      const existing = records.find(item => item.id === runtime.editId);
      body = `<div class="runtime-form-heading"><h2>${runtime.editId ? 'Edit' : 'New'} ${esc(entity.name.toLowerCase())}</h2><p>Generated from the fields you designed. Data is saved in this browser only.</p></div><form id="runtime-record-form"><div class="runtime-fields">${fields.map(field => runtimeInput(field, existing?.values[field.id] ?? '')).join('')}</div><p class="form-error" role="alert"></p><button class="button primary" type="submit">${runtime.editId ? 'Save changes' : 'Create record'}</button></form>`;
    } else if (page.kind === 'Dashboard') {
      body = `<h2>${esc(def.name)} at a glance</h2><p class="muted">Live counts from this app’s local demo records.</p><div class="runtime-stats">${def.entities.map(item => `<div><strong>${recordsFor(client, runtime.appId, item.id).length}</strong><span>${esc(item.name)} records</span></div>`).join('')}</div><div class="runtime-callout">${icon('spark', 24)}<div><strong>Your app, built visually.</strong><p>Use the navigation to open your lists and forms. Rules run when you create a record.</p></div></div>`;
    } else if (page.kind === 'Content') {
      body = `<h2>${esc(page.name)}</h2><div class="runtime-content-text">${esc(page.body || 'Add your page content in Pages & layout.')}</div>`;
    } else {
      body = `<div class="runtime-list-heading"><div><h2>${esc(page.name)}</h2><p>${records.length} local demo records</p></div><button class="button primary" data-runtime-add>+ Add ${esc(entity.name.toLowerCase())}</button></div><div class="runtime-table-wrap"><table class="runtime-table"><thead><tr>${fields.map(field => `<th>${esc(field.label)}</th>`).join('')}<th>Actions</th></tr></thead><tbody>${records.map(record => `<tr>${fields.map(field => `<td>${esc(typeof record.values[field.id] === 'boolean' ? record.values[field.id] ? 'Yes' : 'No' : record.values[field.id] ?? '')}</td>`).join('')}<td><button class="text-button" data-runtime-edit="${record.id}">Edit</button><button class="icon-button" data-runtime-delete="${record.id}" aria-label="Delete record">${icon('trash', 14)}</button></td></tr>`).join('') || `<tr><td colspan="${fields.length + 1}"><div class="empty-state">No records yet. Add the first ${esc(entity.name.toLowerCase())} to try your app.</div></td></tr>`}</tbody></table></div>`;
    }
    const logs = client.workflowLog.filter(item => item.appId === runtime.appId).slice(-4);
    openDialog(`<div class="dialog-heading"><div><span class="eyebrow">WORKING APP PREVIEW · LOCAL DEMO</span><h2>${esc(client.draft.name)} / ${esc(def.name)}</h2></div><button class="icon-button" data-action="close-dialog" aria-label="Close app preview">${icon('close')}</button></div><div class="app-runtime"><nav class="runtime-nav" aria-label="Generated app pages">${def.pages.map(item => `<button class="${item.id === page.id && !runtime.form ? 'active' : ''}" data-runtime-page="${item.id}">${esc(item.name)}</button>`).join('')}</nav><main class="runtime-body">${body}${logs.length ? `<aside class="runtime-log"><h3>Workflow activity</h3>${logs.map(log => `<p>${icon('check', 13)} ${esc(log.note)}</p>`).join('')}</aside>` : ''}</main></div><p class="tiny-note muted">This is the generated app—not a screenshot. Try its forms and simple rules. Data, quotes and publication remain browser-local; production security and deployment are not connected.</p>`, 'runtime-dialog');
    document.querySelector('#runtime-record-form')?.addEventListener('submit', event => {
      event.preventDefault(); const input = Object.fromEntries(new FormData(event.target));
      try {
        const previous = records.find(item => item.id === runtime.editId);
        // Preserve hidden field values when editing existing records.
        saveDemoRecord(client, runtime.appId, def, entity.id, { ...(previous?.values || {}), ...input, ...Object.fromEntries(fields.filter(field => field.type === 'Yes / No').map(field => [field.id, input[field.id] === 'on'])) }, runtime.editId);
        save(); runtime.form = false; runtime.editId = '';
        const list = def.pages.find(item => item.kind === 'List' && item.entityId === entity.id);
        if (list) runtime.pageId = list.id;
        showRuntime(); toast('Demo record saved. Matching on-create rules were applied.');
      } catch (error) { formError(event.target, error); }
    });
  }

  function editPage(id) {
    const page = definition().pages.find(item => item.id === id);
    openDialog(`<div class="dialog-heading"><h2>Edit page</h2><button class="icon-button" data-action="close-dialog" aria-label="Close page editor">${icon('close')}</button></div><form id="edit-page-form"><label class="field-label">Title<input class="input" name="name" maxlength="45" value="${esc(page.name)}" required></label><label class="field-label">Component<select class="input" name="kind">${pageTypes.map(kind => `<option ${kind === page.kind ? 'selected' : ''}>${kind}</option>`).join('')}</select></label><label class="field-label">Entity<select class="input" name="entityId">${options(definition().entities, page.entityId)}</select></label><label class="field-label">Content<textarea class="input" name="body" rows="5" maxlength="2000">${esc(page.body)}</textarea></label><p class="form-error" role="alert"></p><div class="dialog-actions"><button class="button primary" type="submit">Save page</button></div></form>`);
    document.querySelector('#edit-page-form').addEventListener('submit', event => {
      event.preventDefault(); const input = Object.fromEntries(new FormData(event.target));
      if (!input.name.trim()) return formError(event.target, new Error('Enter a page name.'));
      Object.assign(page, input, { name: input.name.trim() }); mark(); document.querySelector('#dialog').close(); render();
    });
  }

  function handle(data) {
    try {
      if (data.editApp) { openEditor(data.editApp); return true; }
      if (data.runApp) { runApp(data.runApp); return true; }
      if ('newCustomApp' in data) { customAppDialog(); return true; }
      if ('priceBook' in data) { openPriceBook(); return true; }
      if (data.designerTab) { section = data.designerTab; render(); return true; }
      if (data.openAppPage) { runApp(appId, data.openAppPage); return true; }
      if ('saveAppTemplate' in data) { reusableTemplate(state, current(), appId); save(); toast('Reusable template updated. Existing client copies and records are unchanged.'); return true; }
      if (data.fieldMove) { moveItem(activeEntity().fields, data.fieldMove, Number(data.direction)); mark(); render(); return true; }
      if (data.removeAppField) {
        const used = definition().workflows.some(rule => rule.entityId === entityId && (rule.targetField === data.removeAppField || rule.conditionField === data.removeAppField));
        if (used) throw new Error('Remove or change workflows referencing this field first.');
        if (activeEntity().fields.length === 1) throw new Error('Keep at least one field in an entity.');
        activeEntity().fields = activeEntity().fields.filter(field => field.id !== data.removeAppField); mark(); render(); return true;
      }
      if (data.pageMove) { moveItem(definition().pages, data.pageMove, Number(data.direction)); mark(); render(); return true; }
      if (data.editPage) { editPage(data.editPage); return true; }
      if (data.removePage) { if (definition().pages.length === 1) throw new Error('Keep at least one app page.'); definition().pages = definition().pages.filter(page => page.id !== data.removePage); mark(); render(); return true; }
      if (data.removeRule) { definition().workflows = definition().workflows.filter(rule => rule.id !== data.removeRule); mark(); render(); return true; }
      if (data.runtimePage) { runtime.pageId = data.runtimePage; runtime.form = false; runtime.editId = ''; showRuntime(); return true; }
      if ('runtimeAdd' in data || data.runtimeEdit) { runtime.form = true; runtime.editId = data.runtimeEdit || ''; showRuntime(); return true; }
      if (data.runtimeDelete) {
        const client = state.clients.find(item => item.id === runtime.clientId); const def = definitionFor(state, client, runtime.appId); const page = def.pages.find(item => item.id === runtime.pageId);
        client.demoRecords[runtime.appId][page.entityId] = recordsFor(client, runtime.appId, page.entityId).filter(record => record.id !== data.runtimeDelete); save(); showRuntime(); return true;
      }
      if ('exportQuote' in data) {
        const quote = quoteFor(current().draft);
        const data = { type: 'Demo quotation; no payment requested', client: current().draft.name, currency: 'EGP', amounts: 'minor units / piasters', ...quote, lines: quote.lines.map(line => ({ ...line, name: catalog(state).find(item => item.id === line.id)?.name })) };
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'contigoo-project-quote.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); return true;
      }
    } catch (error) { toast(error.message); return true; }
    return false;
  }

  return { editorView, pricingView, quoteBanner, appPrice, bind, handle, money, openEditor, customAppDialog };
}
