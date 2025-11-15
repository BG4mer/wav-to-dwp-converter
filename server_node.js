// server_node.js
// Simple Express server that accepts WAV samples + manifest and returns a ZIP with a generated .dwp (best-effort)
// WARNING: This is an open-source, reverse-engineered best-effort .dwp generator, not guaranteed to be 100% compatible with all DirectWave features.
// Save as server_node.js, run: npm install express multer jszip
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const upload = multer({ storage: multer.memoryStorage() });
const app = express();

// helper: create a simple binary DWP-like container: header + JSON chunk + sample files concatenated
function buildDwpBuffer(manifest, samples){
  // manifest: object, samples: [{name,buffer}]
  const header = Buffer.from('DWPv1'); // simple magic (not official)
  const jsonChunk = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
  const jsonLen = Buffer.alloc(4); jsonLen.writeUInt32LE(jsonChunk.length,0);
  // assemble: [header][jsonLen][jsonChunk][number_of_samples][for each: nameLen,name, sampleLen, sampleData]
  const parts = [header, jsonLen, jsonChunk];
  const countBuf = Buffer.alloc(4); countBuf.writeUInt32LE(samples.length,0); parts.push(countBuf);
  for(const s of samples){
    const nameBuf = Buffer.from(s.name, 'utf8');
    const nameLen = Buffer.alloc(4); nameLen.writeUInt32LE(nameBuf.length,0);
    const sampleLen = Buffer.alloc(4); sampleLen.writeUInt32LE(s.buffer.length,0);
    parts.push(nameLen, nameBuf, sampleLen, s.buffer);
  }
  return Buffer.concat(parts);
}

app.post('/api/convert', upload.array('samples'), async (req, res) => {
  try{
    const manifest = JSON.parse(req.body.manifest || '{}');
    const samples = req.files.map(f=>({name:f.originalname, buffer:f.buffer}));
    // Build DWP-like buffer (best-effort/open implementation)
    const dwpBuf = buildDwpBuffer(manifest, samples);
    // Create a zip with .dwp + original samples + manifest.json
    const zip = new JSZip();
    zip.file((manifest.programName || 'program') + '.dwp', dwpBuf);
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    const samplesFolder = zip.folder('samples');
    for(const s of samples) samplesFolder.file(s.name, s.buffer);
    const content = await zip.generateAsync({type:'nodebuffer'});
    res.setHeader('Content-Type','application/zip');
    res.setHeader('Content-Disposition','attachment; filename=result.zip');
    res.send(content);
  }catch(err){
    console.error(err);
    res.status(500).send('error');
  }
});

app.listen(3000, ()=>console.log('Listening on http://localhost:3000'));
