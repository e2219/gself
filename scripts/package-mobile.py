from pathlib import Path
import json,zipfile,os
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'package.json').read_text())['version']
out=root/'releases';files=json.loads((out/'source-files.json').read_text())
with zipfile.ZipFile(out/f'mooncatch-{version}-source.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in files:z.write(root/name,'mooncatch/'+name)
with zipfile.ZipFile(out/'mooncatch-signing-private.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in ['.private/mooncatch-release.jks','android/signing.properties']:z.write(root/name,'mooncatch/'+name)
os.chmod(out/'mooncatch-signing-private.zip',0o600)
print('Packaged source and separate private signing backup.')
