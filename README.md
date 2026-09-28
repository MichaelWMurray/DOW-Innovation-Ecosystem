# DoW Innovation Ecosystem

Created and maintained by **Michael Murray**.

An 11-column organizational reference chart, formatted for one 17 x 11-inch landscape page, plus an interactive Kumu map.

- [Explore the interactive map](https://kumu.io/mwmurray/innovationecosystem#innovation-ecosystem)
- [Connect on LinkedIn](https://www.linkedin.com/in/michael-w-murray)
- [Download chart releases](https://github.com/MichaelWMurray/DOW-Innovation-Ecosystem/releases)

Independent reference; not an official DoW publication.

## Approved baseline

The initial release is the September 2026 version with **September 2026** in the upper-right corner, without the word Updated. It includes Michael Murray's attribution and both QR codes. The baseline contains 333 eligible organizations. The three technical header/footer lines are rendered white as requested.

## Rebuild

The source code and fonts are tracked here. Exact source snapshots and approved exports belong in release assets to avoid duplicating logo-heavy data in every code revision.

For the simplest rebuild, download and extract the complete rebuild ZIP from a release and follow its README.

If using a clone of this repository, first extract `live_sheet_dated.json` from the matching release rebuild ZIP into the repository root. Then run:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe rebuild.py
```

See [full rebuild instructions](REBUILD_INSTRUCTIONS.md) for macOS/Linux, validation, and troubleshooting. PDF, SVG and 400-dpi PNG exports appear in `output/`.

## Data and changes

The live Google Sheet remains authoritative for new chart revisions. The bundled release snapshot reproduces that release exactly; it is not an automatically refreshed live feed. Do not change source organizations, priorities or parent relationships without approval.

The layout is tailored to this hierarchy. Changes to the source can require manual placement and routing adjustments. Run every validation script and visually inspect the resulting PDF before releasing a new version. There is no automatic publishing or scheduled source refresh.

## Rights and attribution

No open-source license has been selected for this project's original code or chart. Public visibility alone does not grant a general reuse license. Bundled DejaVu fonts retain their included license. Organization names, logos, and other third-party material retain their respective rights and are not licensed by this repository. Display does not imply endorsement.
