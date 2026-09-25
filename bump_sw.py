"""Stamp sw.js with a hash of the shell so every deploy is picked up by installed copies."""
import hashlib, re, pathlib
d = pathlib.Path(__file__).parent
h = hashlib.sha1(b''.join((d/f).read_bytes() for f in ('index.html','manifest.webmanifest'))).hexdigest()[:10]
sw = (d/'sw.js').read_text()
sw = re.sub(r"const VERSION = 'wrstl-[0-9a-f]+';", f"const VERSION = 'wrstl-{h}';", sw)
(d/'sw.js').write_text(sw); print('sw version wrstl-'+h)
