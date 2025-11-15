
WAV → DWP Converter (Standalone package)
========================================

What this is
------------
This package provides a mobile-friendly frontend and two server backends (Node.js and Python) that implement a best-effort open-source .dwp generator.
Its goal is to allow users without FL Studio / DirectWave to create .dwp-like packages from WAV samples + mapping data.

Important Notes and Limitations
-------------------------------
- The .dwp implementation here is a best-effort, open-source container. It is NOT an official Image-Line/DirectWave file emitter.
- Some versions of FL Studio or DirectWave may not accept files built by this tool. Test on your target device.
- If you find compatibility problems, include the manifest.json and samples when reporting issues so the generator can be improved.
- You must own any sample files you upload; do not upload copyrighted material without permission.

Files included
--------------
- index.html - Single-file frontend (mobile friendly)
- server_node.js - Node.js Express server sample (uses memory multer)
- server_flask.py - Python Flask server sample
- README.md - This file

Quick start - Node.js
---------------------
1. Install Node.js (v14+ recommended).
2. npm init -y
3. npm install express multer jszip
4. node server_node.js
5. Open index.html in browser (or host it on any static host) and point the backend URL to http://localhost:3000/api/convert

Quick start - Python (Flask)
----------------------------
1. Install Python 3.8+
2. pip install flask
3. python server_flask.py
4. Point frontend backend URL to http://localhost:3000/api/convert

How conversion works (brief)
---------------------------
- Frontend uploads WAV samples and an editable manifest.json describing zones, velocities and loop points.
- Backend builds a DWP-like binary container (header + JSON chunk + sample blobs) and returns a ZIP containing .dwp, manifest.json and samples.
- This project aims to be iteratively improved for compatibility with players/synths that consume DirectWave .dwp files.

Contributing
------------
Improvements to the file layout, header details, or additional metadata are welcome. Open an issue or submit a pull request with test cases.

License
-------
MIT License — use and modify freely. No warranty provided.
