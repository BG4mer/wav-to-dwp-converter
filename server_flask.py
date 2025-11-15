# server_flask.py
# Flask server that accepts WAV samples + manifest and returns a ZIP with a generated .dwp (best-effort)
# Save as server_flask.py, run: pip install flask pyzipper
from flask import Flask, request, send_file, jsonify
import io, struct, json, zipfile, time

app = Flask(__name__)

def build_dwp_bytes(manifest, samples):
    # Best-effort container: header + json chunk + samples list
    header = b'DWPv1'
    json_chunk = json.dumps(manifest, indent=2).encode('utf8')
    json_len = struct.pack('<I', len(json_chunk))
    out = io.BytesIO()
    out.write(header)
    out.write(json_len)
    out.write(json_chunk)
    out.write(struct.pack('<I', len(samples)))
    for name, data in samples:
        name_b = name.encode('utf8')
        out.write(struct.pack('<I', len(name_b)))
        out.write(name_b)
        out.write(struct.pack('<I', len(data)))
        out.write(data)
    return out.getvalue()

@app.route('/api/convert', methods=['POST'])
def convert():
    try:
        manifest = json.loads(request.form.get('manifest','{}'))
        files = request.files.getlist('samples')
        samples = []
        for f in files:
            samples.append((f.filename, f.read()))
        dwp_bytes = build_dwp_bytes(manifest, samples)
        mem = io.BytesIO()
        with zipfile.ZipFile(mem, 'w') as z:
            z.writestr((manifest.get('programName','program') + '.dwp'), dwp_bytes)
            z.writestr('manifest.json', json.dumps(manifest, indent=2))
            for name, data in samples:
                z.writestr('samples/' + name, data)
        mem.seek(0)
        return send_file(mem, mimetype='application/zip', as_attachment=True, download_name='result.zip')
    except Exception as e:
        print('err', e)
        return jsonify({'error':'server error'}), 500

if __name__=='__main__':
    app.run(port=3000)
