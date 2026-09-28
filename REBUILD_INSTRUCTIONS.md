# DoW Innovation Ecosystem - reproducible checkpoint

This package rebuilds the approved 28 September 2026 chart with corrected connector spacing: **333 organizations, 11 columns, one 17 x 11-inch landscape page**. It includes the exact source snapshot and embedded logos used for that chart. No Google login or internet connection is needed to rebuild after installing the Python dependencies. The script never edits the live sheet.

## Windows: rebuild in three steps

1. Extract the entire ZIP into one folder. Keep the folder structure intact. Install 64-bit Python 3.11 or newer if needed, including its Python launcher. Open that extracted folder in File Explorer, type `powershell` in the address bar, and press Enter.
2. Create a private environment and install the dependencies:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

3. Rebuild:

```powershell
.\.venv\Scripts\python.exe rebuild.py
```

There is no need to activate the environment or change PowerShell execution policy. Subsequent rebuilds require only the last command. If `py` is unavailable but `python --version` works, use `python -m venv .venv` for the first command.

## macOS or Linux

From a terminal in the extracted folder:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python rebuild.py
```

## Results

The `output` folder contains:

- `dow_innovation_ecosystem_11x17.pdf`: vector PDF, one 17 x 11-inch page.
- `dow_innovation_ecosystem_11x17.svg`: vector chart with embedded logos.
- `dow_innovation_ecosystem_11x17.png`: 400-dpi image, 6800 x 4400 pixels.

Use the PDF for printing at **Actual Size / 100%**. SVG text uses DejaVu Sans; the fonts are bundled under `fonts` and can be installed if an SVG viewer substitutes another font. PDF fonts are embedded. The PNG exporter in this portable package uses PyMuPDF, so anti-aliasing may differ slightly from the previously delivered PNG; PDF/SVG geometry is unchanged.

The approved PDF and validation reports are in `reference`. PDF timestamps may change, so a rebuilt PDF need not have the same byte hash to be visually identical.

## What is included

| File or folder | Purpose |
| --- | --- |
| `rebuild.py` | Runs the builder, all audits, and PNG export in the correct order. |
| `build_dated.py` | Layout, cards, groups, logo display, typography, routing, PDF and SVG generation. |
| `live_sheet_dated.json` | Exact 27 September source snapshot, including logo data; 423 source organizations. |
| `lane_order.json` | Preserved routing configuration input. |
| `fonts` | DejaVu Sans regular/bold fonts and license; no system font installation required for the builder. |
| `dated_revision` | Audit scripts; generated geometry and validation reports also appear here. |
| `requirements.txt` | Dependency versions used for this checkpoint. |
| `reference` | Approved PDF and reference validation reports. |

The builder differs from the approved source only in using bundled font paths instead of Linux-specific system paths.

## Validation and visual inspection

The runner stops if an audit fails. It checks expected versus rendered organizations; missing and duplicate cards; card overlaps; text overflow; connector intersections with card interiors; unrelated connector crossings; spacing between horizontal connectors and visible card borders; group overlap with outside cards; maximum two parallel gutter lines; and distinct colors for parallel parent branches.

Inspect the PDF after every intentional change. Check the parent-bottom/left-turn connections, the group headers, long names, logos, page edges, and the legend. Automated audits do not replace visual review. `dated_revision/validation.json` lists any logo decoding failures; none were present in this checkpoint.

## Rebuilding this checkpoint versus updating the chart

**To reproduce this exact version**, use the bundled snapshot unchanged. Do not refresh it first.

**To make a new version using current data**, save a separate copy of this entire package, then read the live Google Sheet first:

- Spreadsheet: `1db8IsJfFm6lozj8g05WwjtKjXmlS0emzZTT_6n6OssU`
- Tab: `Innovation Organizations`
- Source relationship: column C `Parent Organization` to column A `Label`.
- Logo: column I; organization type: column M; chart priority: column O.
- Include priorities 1 and 2, with blank treated as 2, plus required ancestors.
- At this checkpoint the read range was A1:O424. Inspect current metadata and extend the range if rows have been added.

Replace the snapshot with a Sheets values response containing a top-level `values` array: header row first, then data rows, columns A through O in their original order. Preserve string values and full image data URIs. The builder expects priority values as strings such as `"1"`, `"2"`, `"3"`, or blank. It reads the JSON locally; it does not fetch Google Sheets itself. A downloaded XLSX or CSV cannot simply be renamed to JSON.

Update the displayed source date in `build_dated.py` when refreshing data. The count is calculated automatically. Do not alter organizations, names, parents, or priorities in the live sheet without explicit approval.

**The layout is tailored to this hierarchy, not a general-purpose automatic org-chart layout engine.** Adding, deleting, renaming, or reparenting organizations may require adjustments to the placement and routing code. A successful rebuild of this snapshot does not guarantee that future source changes fit without intervention. Keep the included checkpoint untouched as a rollback.

## Troubleshooting

- Missing Python/package: use the commands above and the same environment's Python for install and rebuild.
- Missing fonts: restore the entire `fonts` folder from the ZIP.
- Missing JSON or audit files: extract the whole ZIP instead of running a single file from inside it.
- Assertion or audit failure after changes: read the traceback and JSON reports under `dated_revision`; correct the layout rather than disabling the checks.
- For exact rollback: extract a fresh copy of this ZIP and rerun `rebuild.py`.

## Michael Murray branding

Credit and two QR codes are in the bottom-right area. Interactive map: https://kumu.io/mwmurray/innovationecosystem#innovation-ecosystem . LinkedIn: https://www.linkedin.com/in/michael-w-murray . The map QR is 0.845 inch square, LinkedIn 0.781 inch including four-module quiet zones. Both were decoded from the final PDF rendered at 150 and 300 dpi. PDF QR areas are clickable. No URL shortener or tracking service is used. The independent-reference note distinguishes the chart from an official publication.

## September date presentation
The three technical header/footer lines are colored white. September 2026 appears at top right. Change update_label in build_dated.py when the chart is refreshed.
