"""Build supported FY2026 hierarchy totals from the selected crosswalk ledger."""
import json
import sys
from collections import defaultdict
from decimal import Decimal
from pathlib import Path


source = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parents[1] / "src"
snapshot = json.loads((source / "draft.json").read_text())
ledger_rows = [json.loads(line) for line in Path(sys.argv[1]).read_text().splitlines()]
children = defaultdict(list)
for org in snapshot["organizations"]:
    children[org["parentId"]].append(org["id"])

ledger = defaultdict(list)
seen = set()
for row in ledger_rows:
    if len(row) <= 13 or row[8] != "Selected" or not str(row[13]).startswith("IEORG-"):
        continue
    _, _, pe, project, level, _, _, amount, _, locator, *_ = row
    assert locator not in seen and pe and level in {"R2", "R2A-PROJECT", "R2A-PROGRAM", "R3"}
    assert level == "R2" or project
    seen.add(locator)
    ledger[row[13]].append((pe, project, level, Decimal(str(amount))))
for record in snapshot["funding"]:
    selected = sum(entry[3] for entry in ledger[record["orgId"]])
    assert abs(selected - Decimal(record["amountMillionsDecimal"] or "0")) < Decimal("0.000001"), record["orgId"]

def subtree(org_id):
    yield org_id
    for child in children[org_id]:
        yield from subtree(child)

def rollup(org_id):
    pools = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    records = [row for member in subtree(org_id) for row in ledger[member]]
    for pe, project, level, amount in records:
        pools[pe][project][level].append(amount)
    total = Decimal(0)
    uncertain = 0
    for projects in pools.values():
        full_pe = [amount for levels in projects.values() for amount in levels["R2"]]
        if full_pe:
            total += max(full_pe)
            uncertain += int(len(set(full_pe)) > 1)
            continue
        for levels in projects.values():
            full_project = levels["R2A-PROJECT"]
            if full_project:
                total += max(full_project)
                uncertain += int(len(set(full_project)) > 1)
                continue
            programs = levels["R2A-PROGRAM"]
            cost_lines = levels["R3"]
            # With no confirmed mapping between these two views of a project,
            # the larger subtotal is the supported floor of their union.
            total += max(sum(programs), sum(cost_lines))
            uncertain += int(bool(programs and cost_lines))
    assert total <= sum((row[3] for row in records), Decimal(0))
    return {"amountMillions": float(total), "ambiguousPools": uncertain} if records else None

result = {org["id"]: rollup(org["id"]) for org in snapshot["organizations"] if children[org["id"]]}
(source / "funding-rollups.json").write_text(json.dumps(result, indent=2) + "\n")
print(f"{len(seen)} selected scopes, {sum(value is not None for value in result.values())} supported parent rollups")
for org_id in ("IEORG-0259", "IEORG-0052", "IEORG-0006", "IEORG-0236", "IEORG-0001"):
    print(org_id, result.get(org_id))
