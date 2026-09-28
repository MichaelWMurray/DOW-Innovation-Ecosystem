"""Rebuild and validate the approved chart; does not access or modify Google Sheets."""
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
for script in [
    'build_dated.py',
    'dated_revision/audit_crossings.py',
    'dated_revision/audit_parallel.py',
    'dated_revision/check_clearance.py',
]:
    subprocess.run([sys.executable, script], check=True)

out = ROOT / 'output'
out.mkdir(exist_ok=True)
for ext in ['pdf', 'svg']:
    shutil.copy2(ROOT / 'dated_revision' / ('defense_innovation_ecosystem_11x17.' + ext),
                 out / ('dow_innovation_ecosystem_11x17.' + ext))

import fitz
with fitz.open(out / 'dow_innovation_ecosystem_11x17.pdf') as doc:
    assert len(doc) == 1
    page = doc[0]
    assert abs(page.rect.width - 1224) < 0.01 and abs(page.rect.height - 792) < 0.01
    page.get_pixmap(dpi=400, alpha=False).save(out / 'dow_innovation_ecosystem_11x17.png')
print('\nRebuild and validation completed. Files are in:', out)
print('Inspect the PDF visually before distributing a modified version. Print at Actual Size / 100%.')
