"""Prepare the lifecycle entry page and its data for GitHub Pages after vite build."""
from pathlib import Path
import re
import shutil

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
out = root.parents[1] / 'docs/lifecycle'
out.mkdir(parents=True, exist_ok=True)
for filename in ['evidence.html', 'FY2026_Funding_Changes_by_Organization_ID.csv']:
    shutil.copy2(dist / filename, out / filename)
shutil.copytree(dist / 'assets', out / 'assets', dirs_exist_ok=True)
import gzip
(out / 'data.json.gz').write_bytes(gzip.compress((root / 'public/data.json').read_bytes(), compresslevel=9, mtime=0))
html = (dist / 'index.html').read_text()
html = re.sub(r'(<script id="dataset" type="application/json">).*?(</script>)', r'\1\2', html, flags=re.S)
def loader(match):
    return f"""<script type="module">
try {{
  const response = await fetch('./data.json.gz');
  if (!response.ok) throw new Error('Dataset request failed (' + response.status + ')');
  const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
  document.getElementById('dataset').textContent = await new Response(stream).text();
  await import('{match[1]}');
}} catch (error) {{
  document.getElementById('root').textContent = 'Unable to open the lifecycle visualization. ' + error.message;
}}
</script>"""
html, count = re.subn(r'<script type="module" crossorigin src="([^"]+)"></script>', loader, html)
assert count == 1
(out / 'index.html').write_text(html)
