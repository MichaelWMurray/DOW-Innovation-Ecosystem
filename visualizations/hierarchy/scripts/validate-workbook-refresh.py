"""Prepare a candidate chart snapshot from three workbook exports in JSONL format."""
import json
import subprocess
import sys
from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory

organization_file, ledger_file, non_rdte_file, destination = map(Path, sys.argv[1:])
source = Path(__file__).resolve().parents[1] / "src"

def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines()]

def amount(value):
    result = Decimal(str(value))
    if not result.is_finite() or result < 0:
        raise ValueError(f"Invalid funding amount: {value}")
    return result

snapshot = json.loads((source / "draft.json").read_text())
records = {}
for index, row in enumerate(rows(organization_file), 1):
    if not row or not str(row[0]).startswith("IEORG-"):
        continue
    if row[0] in records:
        raise ValueError(f"Duplicate organization: {row[0]}")
    records[row[0]] = index, row
if records.keys() != {item["orgId"] for item in snapshot["funding"]}:
    raise ValueError("Funding worksheet organization IDs differ from the visualization inventory")
for record in snapshot["funding"]:
    index, row = records[record["orgId"]]
    value = row[2] if len(row) > 2 else None
    record["amountMillionsDecimal"] = str(amount(value)) if value not in ("", None) else None
    record["status"] = "supported" if record["amountMillionsDecimal"] is not None else "no_supported_scope"
    record["scope"] = row[4] if len(row) > 4 else None
    record["sourceLocator"]["row"] = index

non_rdte_rows = [row for row in rows(non_rdte_file) if len(row) >= 9 and row[2] == 2026]
def one(org_id, predicate):
    matches = [row for row in non_rdte_rows if row[0] == org_id and predicate(row)]
    if len(matches) != 1:
        raise ValueError(f"Expected one funding control row for {org_id}, found {len(matches)}")
    return matches[0]

apfit = "IEORG-0334"
osc = "IEORG-0294"
plan = one(apfit, lambda r: r[4] == "Total FY2026 spend plan")
components = [r for r in non_rdte_rows if r[0] == apfit and r[6] == "Yes"]
if not components or sum(amount(row[5]) for row in components) != amount(plan[5]):
    raise ValueError("APFIT component amounts do not reconcile to the spend plan")
lending = one(osc, lambda r: "cumulative lending authority" in r[4].lower())
non_rdte = {
    "procurement": {apfit: {"amount": float(amount(plan[5])), "basis": plan[7], "components": [
        {"label": row[4], "amount": float(amount(row[5]))} for row in components
    ]}},
    "authority": {osc: {"amount": float(amount(lending[5])), "basis": lending[7]}},
}

with TemporaryDirectory() as temp:
    candidate = Path(temp)
    (candidate / "draft.json").write_text(json.dumps(snapshot, ensure_ascii=False))
    (candidate / "non-rdte.json").write_text(json.dumps(non_rdte, ensure_ascii=False))
    subprocess.run([sys.executable, str(Path(__file__).with_name("build-rollups.py")), str(ledger_file), temp], check=True)
    destination.mkdir(parents=True, exist_ok=False)
    for file in candidate.iterdir():
        (destination / file.name).write_bytes(file.read_bytes())
