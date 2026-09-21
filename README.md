# Contigoo Studio — Presentation demo

This is a working **frontend prototype** for reviewing the platform concept before VPS implementation. It includes a visual app builder, a generic browser-local record/form/workflow runtime, and illustrative project quotations. It does not provide production accounts/authentication, server-enforced tenant isolation, domain-specific business engines, payment processing, checkout or public deployment.

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

1. Show the **Overview**: one Studio serving different client solutions.
2. Create a project using **Start from scratch**, then select modules and show the changing price.
3. Create a custom app, add a field, and open **Preview & use app**.
4. Add a demo record; demonstrate a simple rule and a client-specific app price.
5. Use the globe icon for the standalone website concept and show the storefront preview.

Each browser has its own demo data. Localhost projects do not automatically appear on the hosted URL. Prepare any presentation-specific records on that hosted URL in advance, and keep the local server available as a fallback.

## Try these workflows

### Start with a project, not an industry product

**Create client solution → Start from scratch** is now the default. Choose modules freely on the next screen. Optional **Framework starters** are CRM, ERP / Business suite, Finance, Inventory & Operations, HR & People, Website & E-commerce, Service & Support, and Custom workflows. Their module selections are visible before creation and remain editable.

“Restaurant relationships” was an illustrative preset inferred from a user example; it is no longer a primary starting option. Existing restaurant/company/store demo clients and user-created projects are retained. Legacy identifiers are preserved for compatibility, not displayed in the creation menu.

The target product is an AI-assisted visual IDE with a project explorer, canvas, component/property tools and integrated assistance. The current sample implements part of that creator and has no live AI connection. Framework starters are selection presets, not complete production domain engines.

### Edit or preview an individual app

**Clients → Open in Studio → select an app → Edit app / Preview app on its card.**

- **Edit app → Data & fields:** add entities and typed fields, rename/reorder fields, set required/visible behavior.
- **Edit app → Pages & layout:** add or edit dashboard, list, form and content pages; change page order.
- **Edit app → Workflows:** create an on-record-created rule, optionally conditioned on a field. Actions set a field or append a local activity note. Rules run once in configured order; no arbitrary script execution.
- **Preview & use app:** open the generated pages, create/edit/delete local demo records and observe your rules. Required/type validation executes in the prototype model; this is not server-side enforcement.
- **Save as reusable app template:** available for custom apps. It copies schema/pages/rules for future client instances without copying records, prices or modifying existing instances.

### Build an app from scratch

**Solution builder → Create custom app — no code.** Name the app and its first entity, set illustrative prices, then design it visually. For example: Equipment Rentals → Rental → add Deposit and Return date fields → add a Rental policy content page → create a status-setting rule → Preview & use app.

This is a component-driven builder, not an unrestricted generator for any possible business system. Real inventory accounting, checkout, payroll and other specialized logic still need reusable production engines.

### Set prices while assembling the project

- The **system price banner** updates whenever an app is selected or removed.
- **Pricing** provides per-app monthly and one-time setup amounts, optional base fees and a discount on recurring charges.
- **Default price list** changes defaults for future selections. Existing project price snapshots and published quotes stay unchanged.
- The **App price** tab changes that app's price only for the selected client.
- **Export quote JSON** saves line items and totals in minor units (EGP piasters).
- Amounts are illustrative, admin-editable EGP values; they are not current Contigoo commercial rates. Tax and usage charges are excluded; nothing is charged.
- **Publish solution** snapshots app definitions, selected apps and project prices. Later changes remain drafts. This is local publication, not deployment or invoicing.

### Other sample features

Branding supports name, colors, tagline and a logo. **Shared data** preserves the earlier client-wide fields/entities; per-app fields now live in **Edit app**. Access remains a role configuration preview. Templates create independent client settings. The globe icon previews the standalone Contigoo website; the overall solution preview retains the illustrative client workspace/storefront and links to individual working app previews.

The overall workspace/storefront metrics, products and prices are illustrative fixtures. Records entered through individual app previews are local demo records. Neither is backed by a production database. Images of garments are local SVG illustrations.

Drafts are stored under the browser localStorage key `contigoo-studio-concept-v1`. Clearing this site's browser storage restores the original demo on the next load. Do not enter real credentials or customer information.

The visual-builder upgrade keeps this existing key, clients, logos and shared fields. On the first upgrade it attempts a browser-local backup under `contigoo-studio-concept-v1-before-builder-v2`, then adds new configuration structures without overwriting existing published snapshots. Keep the same browser and `http://127.0.0.1:4173` origin to retain your demo data.

## Verification and screenshots

```sh
npm test
npm run test:static
```

Tests use the pinned Puppeteer Core development dependency and an installed Chromium browser. On Windows the default is Microsoft Edge. Set `PUPPETEER_EXECUTABLE_PATH` to use another compatible browser; the GitHub Actions workflow uses the hosted runner's Google Chrome.

`npm run test:static` builds the allowlisted `dist/` output and verifies assets, module loading, project creation, pricing and generated forms beneath the GitHub Pages URL prefix. Planning documents, credentials, localStorage contents, test output and development files are excluded from the site build.

Checks cover blank-first/category starters, backward compatibility, legacy-data migration, additive integer-money pricing, quotes/snapshots, custom app creation/reuse, records, conditional rules, safe content rendering, independent client configurations, form metadata, app selection, branding, logo upload, filtering and mobile layouts. They do not prove backend security, AI integration or production readiness.

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

The prototype deliberately uses lightweight HTML/CSS/JavaScript. It is a design and interaction reference, not acceptance of the future production framework or architecture.
