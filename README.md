# Contigoo Studio — Presentation demo

**Internal Management & Development Platform**

**Current product audience:** an internal Studio + Management System for the sole owner/Super Admin/developer, with employee management accounts added after completion. Clients are records, not Studio users. Production login must accept username, email or phone plus password. The prototype's role controls and external-site illustrations are demonstrations; there is no real login or account provisioning. Private owner notes and identifiers remain outside this public-source repository.

This is a working **frontend prototype** for reviewing the platform concept before VPS implementation. It includes a client directory, independent client projects, a visual app builder, a generic browser-local record/form/workflow runtime, and illustrative project quotations. It does not provide production accounts/authentication, server-enforced tenant isolation, domain-specific business engines, payment processing, checkout or deployment of generated client apps.

**v0.5 — Studio + management:** new workspaces start empty. **Projects & solutions** is the single project entry point: create a project with a blank or optional framework starting point, then choose **Manage** or **Open in Studio**. Manage includes app use, quotes, retained publications, archive/reactivate and independent project deletion. Clients retain Create/View/Edit/Delete. Framework starters are inside project creation, not a separate navigation destination.

## Open the sample

From the repository directory, with Node.js 22.13+ and npm:

```sh
npm ci
npm start
```

Open **http://127.0.0.1:4173** in your browser. The server listens only on the local computer. Brand assets and font licenses are included in `assets/`. No API keys, database or runtime npm dependencies are needed for the sample.

## Host the presentation

### GitHub Pages

In repository **Settings → Pages**, select **GitHub Actions** as the source. The included workflow tests and publishes the static build on pushes to `main` and can also be run manually from **Actions**.

For `SherifAsh93/contigoo-studio-demo`, the expected Pages address after deployment is:

**https://sherifash93.github.io/contigoo-studio-demo/**

### Vercel alternative

Import this GitHub repository into Vercel. The included `vercel.json` supplies the build command (`npm run build`) and output directory (`dist`). No environment variables are required. Vercel receives updates through the connected GitHub repository; there is no separate Git push into Vercel.

The static build uses relative assets and works at either a domain root or a GitHub Pages repository subpath.

## Five-minute manager walkthrough

1. Open **Clients**: show the searchable list, then **Create client** with synthetic business/contact details. Save it without creating a project.
2. From the client profile, **Create new project** → give it a project name → **Start from scratch** → **Create & open Studio**.
3. Select modules and show the changing price, or choose **Create custom app — no code**. Add a field and open **Preview & use app** to save a demo record.
4. Return to **Projects & solutions** → **Manage**. Open an app to work with its records, inspect pricing, and preview retained publication versions. **Open in Studio** resumes development.
5. Archive/reactivate the project and show the status filters. The client profile can have multiple independent projects. The globe icon opens the standalone website concept; storefront previews remain illustrations.

Each browser has its own demo data. Localhost projects do not automatically appear on the hosted URL. Prepare any presentation-specific records on that hosted URL in advance, and keep the local server available as a fallback.

## Try these workflows

### Manage clients: create, view, update and delete

**Clients → Create client.** Only the client/business name is required. Industry, contact person, email, phone, address and notes are optional. Saving opens the client profile with a related **Projects** list; creating a client does not create an empty solution or quote.

Create/edit dialogs use paired fields on wider screens and a single column on mobile. The title and Cancel/Save controls stay visible while only the fields scroll, including on short viewports. Labels have space for the keyboard-focus outline.

Every row has **View**, **Edit**, **Delete** and **+ Project** actions. Use **Edit** directly from the list, or **View → Edit client details**, to update business/contact information. Search by client name, industry, contact, email or phone. The client count reflects clients, not projects.

**Delete** is available in the list and the client profile. Its confirmation names the client and lists any related projects. Clients without projects need only the final **Delete client** confirmation. For clients with projects, explicitly check **Also delete these projects and their saved demo data**, then choose **Delete client & projects**. This removes the client profile and those projects, including their configuration, records, workflow logs, quotes and published snapshots. Other clients, shared app templates and default prices remain available. Cancel keeps everything; a browser-storage failure also keeps the active client/projects and reports the failure. Deleted clients stay deleted after reloading, including when the directory becomes empty.

### One entry point to build and manage

- **Projects & solutions → Create new project:** select an existing client, enter a separate project name and optional description, and choose a blank or framework starting point. If the client does not exist yet, **Create a client first** returns to the project setup with its inputs retained. Every Create project button uses this same flow.
- **Client profile → Create new project:** opens the same flow with that client preselected.
- **Projects & solutions → Manage:** search by project/client name and filter active, archived or pending-change projects. Review metadata, app usage, saved record counts, pricing and retained publication snapshots. The client profile links to the same management view.
- **Open in Studio:** enter the selected project's solution builder for visual editing. Framework starters are not another starting screen.
- **Inside Studio:** select apps or create a custom app; edit data/pages/rules; configure branding/access/pricing; preview and publish a demo snapshot. **Back to project** returns from the app editor; **All projects** returns to the project hub.
- **Edit project details** changes the project name/description. Client contact details and the project’s display branding are separate settings.
- **Archive / Reactivate:** move a project out of active work while keeping its configuration, records, prices and publications. Reactivate before editing or using apps. Archiving is local organization, not remote unpublishing or subscription cancellation.
- **Delete project:** confirms removal of that project's data and publications while keeping its client, sibling projects and shared app templates. Storage failures leave it intact.
- **Publication history:** new publishes retain versioned copies of configuration and quotes. The previous latest legacy snapshot is kept; already-overwritten older versions cannot be reconstructed. Preview any retained version. This is not record backup, database rollback or deployment.

One client can own zero, one or several projects. Projects have independent app selections, definitions, records, branding, quotes and published snapshots, even when they belong to the same client.

### Start with a project, not an industry product

**Create new project → Start from scratch** is the default. Choose modules freely on the next screen. Optional **Framework starters** are CRM, ERP / Business suite, Finance, Inventory & Operations, HR & People, Website & E-commerce, Service & Support, and Custom workflows. Their module selections are visible before creation and remain editable.

**Custom workflows** preselects Management and Projects for processes such as requests and task tracking. Configure the fields, pages and simple rules yourself; it does not automatically implement a complete approval process.

Earlier names such as “Noura Restaurant” were fictional fixtures, not real clients. New workspaces no longer insert them. The historical fixtures are in `test-fixtures.mjs`, excluded from the served/deployed files. Existing saved examples and user-created projects are preserved; review, rename or delete them through Clients. Legacy starter identifiers remain compatible but are not offered in creation.

The target product is an AI-assisted visual IDE with a project explorer, canvas, component/property tools and integrated assistance. The current sample implements part of that creator and has no live AI connection. Framework starters are selection presets, not complete production domain engines.

### Edit or preview an individual app

**Clients → View → Projects → Open in Studio → select an app → Edit app / Preview app on its card.** Or use **Projects & solutions → Manage → Edit app / Open app**.

- **Edit app → Data & fields:** add entities and typed fields, rename/reorder fields, set required/visible behavior.
- **Edit app → Pages & layout:** add or edit dashboard, list, form and content pages; change page order.
- **Edit app → Workflows:** create an on-record-created rule, optionally conditioned on a field. Actions set a field or append a local activity note. Rules run once in configured order; no arbitrary script execution.
- **Preview & use app:** open the generated pages, create/edit/delete local demo records and observe your rules. Required/type validation executes in the prototype model; this is not server-side enforcement.
- **Save as reusable app template:** available for custom apps. It copies schema/pages/rules for future client instances without copying records, prices or modifying existing instances.

### Build an app from scratch

**Projects & solutions → create a project or Open in Studio → Create custom app — no code.** Name the app and its first entity, set illustrative prices, then design it visually. For example: Equipment Rentals → Rental → add Deposit and Return date fields → add a Rental policy content page → create a status-setting rule → Preview & use app.

In **App library**, choose the **Working project** explicitly before adding or editing apps. With no project selected, browsing shows default demo prices and project-dependent actions are disabled. Creating one app follows the same project flow as assembling a larger solution.

This is a component-driven builder, not an unrestricted generator for any possible business system. Real inventory accounting, checkout, payroll and other specialized logic still need reusable production engines.

### Set prices while assembling the project

- The **system price banner** updates whenever an app is selected or removed.
- **Pricing** provides per-app monthly and one-time setup amounts, optional base fees and a discount on recurring charges.
- **Default price list** changes defaults for future selections. Existing project price snapshots and published quotes stay unchanged.
- The **App price** tab changes that app's price only for the selected client.
- **Export quote JSON** saves line items and totals in minor units (EGP piasters).
- Amounts are illustrative, admin-editable EGP values; they are not current Contigoo commercial rates. Tax and usage charges are excluded; nothing is charged.
- **Publish solution** retains a version of app definitions, selected apps and project prices, visible under Manage → Publication history. Later changes remain drafts. Publication is committed only if browser persistence succeeds. This is local publication, not deployment or invoicing.

### Other sample features

Branding supports a display name, colors, tagline and a logo for each project. Its initial display name comes from the client; later branding and client-profile edits are independent. **Shared data** preserves the earlier configuration fields/entities; per-app fields live in **Edit app**. Access remains a role configuration preview. Templates create independent project settings. The globe icon previews the standalone Contigoo website; the overall solution preview retains the illustrative client workspace/storefront and links to individual working app previews.

The overall workspace/storefront metrics, products and prices are illustrative fixtures. Records entered through individual app previews are local demo records. Neither is backed by a production database. Images of garments are local SVG illustrations.

Drafts are stored under the browser localStorage key `contigoo-studio-concept-v1`. Clearing this site's browser storage loses its saved work and starts an empty workspace on the next load. There is no production database or authentication service in this prototype. Do not enter real credentials or customer information.

The visual-builder upgrade keeps this existing key, clients, logos and shared fields. On the first upgrade it attempts a browser-local backup under `contigoo-studio-concept-v1-before-builder-v2`, then adds new configuration structures without overwriting existing published snapshots. Keep the same browser and `http://127.0.0.1:4173` origin to retain your demo data.

The client-directory upgrade additionally attempts a one-time backup under `contigoo-studio-concept-v1-before-client-directory-v1`. It creates a client profile for each earlier solution and links that existing project, preserving IDs, records, definitions, quotes and published snapshots. It does not infer or merge separate clients based on matching names. For storage compatibility, `state.clients` remains the project collection; `state.clientProfiles` stores business/contact details, and each project has `clientId`, `name` and `description`. Empty directories are preserved instead of being replaced with seed data.

## Verification and screenshots

```sh
npm test
npm run test:static
```

Tests use the pinned Puppeteer Core development dependency and an installed Chromium browser. On Windows the default is Microsoft Edge. Set `PUPPETEER_EXECUTABLE_PATH` to use another compatible browser; the GitHub Actions workflow uses the hosted runner's Google Chrome.

`npm run test:static` builds the allowlisted `dist/` output and verifies assets, module loading, project creation, pricing and generated forms beneath the GitHub Pages URL prefix. Planning documents, credentials, localStorage contents, test output and development files are excluded from the site build.

The 43 model/browser checks cover empty-first onboarding, unified project creation, client CRUD, project management/daily use, archive/reactivate, independent project deletion, version history/preview, storage failures, client isolation in local state, compatibility/migration, app building/reuse, quotes, rules, safe rendering and desktop/mobile layouts. Client-dialog checks verify visible/clickable actions, contained scrolling, focus spacing, retained input and validation at desktop, 1024×664, 667×830, mobile and 390×500 viewports. Static checks cover the core journey beneath the GitHub Pages repository subpath. They do not prove backend security, AI integration or production readiness. Screenshots with named sample clients use explicitly injected test fixtures, not default workspace data.

- `validation-report.json`: completed prototype checks.
- `screenshots/01-studio-overview.png`: your administrator overview.
- `screenshots/02-solution-builder.png`: app selection and live preview.
- `screenshots/03-data-and-forms.png`: custom entity/field builder.
- `screenshots/04-client-storefront.png`: customer E-commerce concept.
- `screenshots/05-platform-website.png`: standalone Contigoo website concept.
- `screenshots/06-mobile-overview.png`: mobile layout.
- `screenshots/07-visual-app-builder.png`: custom app data/form designer.
- `screenshots/08-working-app-preview.png`: generated record list with workflow results.
- `screenshots/09-project-pricing.png`: additive project quote and editable pricing.
- `screenshots/10-blank-first-project.png`: default blank project and optional framework starters.
- `screenshots/11-client-profile.png`: standalone client details and related projects.
- `screenshots/12-studio-projects.png`: new/existing project hub.
- `screenshots/13-client-directory.png`: searchable client list with project counts.
- `screenshots/14-client-delete.png`: explicit client/related-project deletion confirmation.
- `screenshots/15-project-management.png`: app usage, quote, version history and lifecycle management.
- `screenshots/16-mobile-project-management.png`: archived project management on mobile.
- `screenshots/17-client-dialog-desktop.png`: short-viewport client dialog with visible actions.
- `screenshots/18-client-dialog-mobile.png`: single-column form with fixed header/footer.

The prototype deliberately uses lightweight HTML/CSS/JavaScript. It is a design and interaction reference, not acceptance of the future production framework or architecture.
