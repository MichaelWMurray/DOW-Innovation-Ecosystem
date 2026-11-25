# Lifecycle visualization (v12)

[Open the lifecycle visualization](https://michaelwmurray.github.io/DOW-Innovation-Ecosystem/lifecycle/)

The v12 dataset is stored losslessly in `snapshot/data.json.gz`. The npm commands restore it to `public/data.json` on first use.

## Original prototype notes

React + D3 + SVG. All 73 retained organizations (323 relationships) are loaded, plus APFIT: 74 inventory entities total. Fifteen have supported funding context and are plotted; 59 remain accessible in search/directory but are hidden from the chart because supported funding scopes remain unresolved. DCSA is in a separate lifecycle-unassigned lane because its funding is identifiable but its development stage is not. SEI and DCSA add funding scopes beyond the previous subset. The exact 73-organization retained roster and existing hierarchy are accessible, but the retained 73-organization RDT&E roster remains unchanged. APFIT is an explicitly supplemental procurement program. Hosted privately. BioMADE uses the reviewed $18.432M FY2026 Bioindustrial Manufacturing Innovation activity, BA 6.3, within PE 0603680D8Z. Its $409.493M parent PE is not assigned to BioMADE.

## Run and build

Node 22+:

```sh
npm ci
npm run dev
npm test
npm run build
```

Open `dist/Innovation_Ecosystem_Prototype.html` directly in a desktop browser. The application, logos, and data are bundled. The source uses `public/data.json` as its one canonical dataset. To refresh existing downloads without changing Google Sheets:

```sh
python scripts/import_data.py crosswalk.xlsx budget.xlsx inventory.json relationships.json
```

The JSON inputs are existing Sheets values responses from `Innovation Organizations!A1:R424` and `From-To!A1:F962`. Python requires openpyxl. Existing source URLs and evidence remain in the data and app. Original workbooks and credentials are excluded.

## Approved lifecycle and ring design

X retains the official 6.1–6.5 definitions, then Low-Rate Production, Full-Rate Production, and Operations, Sustainment & Lifecycle Management. Colors retain the original eight 6.1–6.8 values, with money green (#2f9e44) for Credit Program and a separate steel-blue Procurement category (#4b678c). These colors describe funding categories, not X coordinates.

BA 1–5 provide initial lifecycle positions. BA 6–8 require source-specific evidence. DIU's explicitly titled Fielding PE maps to the delivery/operations end of the display, not a TRL or production assessment. DARPA's management-support funding remains in its ring and area but is excluded from the horizontal average. Each profile gives mapped coverage, unassigned amounts, and record-level rationale. No unsupported TRLs are generated.

One circle per organization; no magnified duplicate insets. Interior area is proportional to displayed resource amounts. Ring thickness is moderate: clamp(3.5, 22.1 × sqrt(radius/170), 22.1), remaining constant in screen size while zooming. Rings are outside, excluded from the area scale. Logos fill circular interiors without aspect-ratio distortion. D3 collision handling moves Y only, preserving X.

## Credit Program appropriation

OSC's green Credit Program record is the enacted $1.5 billion appropriation in Public Law 119-21, July 4, 2025: $500 million under section 20004(d) plus $1 billion under section 20005(b), available through September 30, 2029. This REPLACES the former $210 billion principal-authority record; it is not an additional amount. There is no loan-authority amount in the displayed data. Source is the official GovInfo law text. Low-Rate Production placement retains the user-approved convention. The checkbox removes the appropriation from geometry; its source record stays available. Enacted multi-year credit-program appropriations and FY2026 RDT&E/procurement requests retain separate labels and KPIs. Fixed scale is 170/sqrt(7435.156), with MDA the largest identified funding scope. No amount is presented as disbursements or remaining balance.

Full-directory loading does not convert associated PE budgets into organization allocations. Parent/child funding remains separate. All relationships remain inspectable, and search/directory can open entities whose funding is hidden. Compound PE keys avoid duplicated aggregate totals.

## Validation and next steps

Tests cover source counts/totals, proportional interior areas, external ring shares and widths, original colors, lending inclusion/exclusion, evidence-based lifecycle placement, and collision checks. Browser QA covers axis rendering, authority toggle, profiles, and source drill-down. Existing search, filtering, zoom/pan, and hierarchy navigation remain available.

Continue ordinary edits with Sol Medium. The full retained 73-organization directory is loaded. Further work should validate allocations before increasing the number of funding-sized circles. GitHub and static-hosting publication remain later phases requiring the user's direction.

## Component filter and APFIT

The Component dropdown uses the inventory Type column, not immediate-parent names. The loaded groups are USW(R&E), USW(A&S), Combatant Command, Joint Staff, and Air Force. Immediate-parent links remain unchanged. APFIT uses its inventory ID IEORG-0334 and logo; its displayed FY2026 procurement spend plan is $1,355.5M, including $325.5M discretionary and $1,030M mandatory reconciliation. The lifecycle overlay reads the same procurement control as the treemap and nested circles from `visualizations/hierarchy/src/non-rdte.json`. The compressed v12 snapshot retains the original $92.193M request for provenance. Its production-stage placement is supported by the official APFIT FAQ. Procurement has its own color and subtotal, not an RDT&E BA color. NSIC and DIU remain separate entities, and their records are not inherited. SCO scopes are supported by the PE mission; new agency scopes use issuing-agency identity. No workbook or matching inventory was modified.

## Service import (November 5, 2026)

The canonical app dataset includes 832 new service/DHP PE/category records and 796 explicit organization–PE associations. Three Navy PE missions support partial ONR program context of $205.473M. Other new associations remain unallocated. No source workbook was edited. DHP PDF page text is retained; its appropriation BA2 is not treated as lifecycle 6.2. Navy planned activities and DHP project breakdowns are not normalized.

For regeneration, stage inputs in ignored `import_work/`: Army_FY2026_Processed.json (the saved Army extraction), AFSF.json (created by import_service_tables.py from the four Air Force and one Space Force XMLs), and DHP-pages.json (a JSON list of page text in PDF order). Place the renamed source XML files and manifest.json (list of name/id objects retaining Drive IDs) together, then run `python scripts/merge_services.py SOURCE_DIRECTORY`. The importer replaces prior imported associations idempotently, preserving original relationships. Keep the current data.json baseline, or stage base-data.json to use a specific pre-import version. Rebuild evidence, run tests, and build before deployment.

## Funding scope review (November 5, 2026)

`python scripts/review_funding_scope.py SOURCE_DIRECTORY --apply` screens the canonical dataset plus staged Army, AF/SF, and Navy sources. It applies source-ID review rules to dedicated program/project/activity funding or explicit sole-performer/executing-agency statements. Funding values are read from source records, never supplied in review rules. A verified army-manifest.json in the source directory maps the renamed Army books to existing Drive IDs. The stage inputs are those used for the service import above.

`public/scope-review.json` records 78 distinct applied scope decisions for 24 organizations (23 additional bubbles plus increased ONR scope), evidence excerpts, source links, every loaded relationship assessment, rejected acronym collisions, and pending cases. The existing Budget evidence page renders the decisions and consolidated unresolved questions. There are now 39 positive-resource bubbles and 35 hidden organizations out of 74 loaded. Amounts are partial program context, not institution budgets. Parent/subordinate roll-ups and shared-project splits remain disabled. NRL facilities funding is shown under lifecycle-unassigned BA6, rather than being placed at an invented maturity stage. Geometry extends vertical spacing as the plot grows; X and area scale remain fixed. Aggregate union keys now use appropriation+PE+BA; whole PEs absorb included projects, and whole projects absorb their included activities. Original 323 retained relationships remain unchanged in identity.

User follow-up: UCAH is displayed as its $27.416M named activity. JHTO retains its other two funded activities ($23.582M), preserving the $50.998M combined PE without overlap. Project M44 ($4.004M) is assigned to C5ISR by explicit user decision following its mission despite the CECOM title. C5ISR displayed context is $186.226M. There are 40 plotted and 34 hidden entities; 81 included scope decisions and 152 pending organization/record cases remain.
