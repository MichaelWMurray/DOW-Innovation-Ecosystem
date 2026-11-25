"""Restore the v12 dataset used by the original build and validation scripts."""
import gzip
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = root / "public/data.json"
if not data.exists():
    data.write_bytes(gzip.decompress((root / "snapshot/data.json.gz").read_bytes()))
