const express = require('express');
const multer = require('multer');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function parseWAV(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const riff = String.fromCharCode(...buffer.slice(0, 4));
  if (riff !== 'RIFF') throw new Error('Not a valid WAV file');

  let offset = 12;
  let fmtOffset = -1, dataOffset = -1, dataSize = 0;

  while (offset < buffer.length - 8) {
    const chunkId = String.fromCharCode(...buffer.slice(offset, offset + 4));
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === 'fmt ') fmtOffset = offset + 8;
    if (chunkId === 'data') { dataOffset = offset + 8; dataSize = chunkSize; break; }
    offset += 8 + chunkSize;
  }

  if (dataOffset === -1) throw new Error('No data chunk found');

  const numChannels = view.getUint16(fmtOffset + 2, true);
  const sampleRate = view.getUint32(fmtOffset + 4, true);
  const bitsPerSample = view.getUint16(fmtOffset + 14, true);

  return { view, dataOffset, dataSize, numChannels, sampleRate, bitsPerSample, raw: buffer };
}

function textToBits(text) {
  let bits = '';
  for (let i = 0; i < text.length; i++)
    bits += text.charCodeAt(i).toString(2).padStart(8, '0');
  return bits;
}

function bitsToText(bits) {
  let text = '';
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const code = parseInt(bits.slice(i, i + 8), 2);
    if (code === 0) break;
    text += String.fromCharCode(code);
  }
  return text;
}

// POST /api/audio/encode
router.post('/encode', upload.single('audio'), (req, res) => {
  try {
    const { secret } = req.body;
    if (!req.file || !secret) return res.status(400).json({ error: 'Missing audio or secret' });

    const wav = parseWAV(req.file.buffer);
    if (wav.bitsPerSample !== 16) return res.status(400).json({ error: 'Only 16-bit WAV supported' });

    const fullMsg = secret + '\x00\x00\x00';
    const bits = textToBits(fullMsg);
    const maxBits = Math.floor(wav.dataSize / 2);

    if (bits.length > maxBits)
      return res.status(400).json({ error: 'Message too large for this audio file' });

    const out = Buffer.from(wav.raw);
    const outView = new DataView(out.buffer, out.byteOffset, out.byteLength);

    for (let i = 0; i < bits.length; i++) {
      const bytePos = wav.dataOffset + i * 2;
      const sample = outView.getInt16(bytePos, true);
      const newSample = (sample & ~1) | parseInt(bits[i]);
      outView.setInt16(bytePos, newSample, true);
    }

    res.set('Content-Type', 'audio/wav');
    res.set('Content-Disposition', 'attachment; filename="stego_audio.wav"');
    res.set('X-Capacity-Chars', maxBits / 8);
    res.set('X-Bits-Written', bits.length);
    res.send(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/audio/decode
router.post('/decode', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing audio' });

    const wav = parseWAV(req.file.buffer);
    if (wav.bitsPerSample !== 16) return res.status(400).json({ error: 'Only 16-bit WAV supported' });

    const view = new DataView(wav.raw.buffer, wav.raw.byteOffset, wav.raw.byteLength);
    let bits = '';
    const maxSamples = Math.floor(wav.dataSize / 2);
    for (let i = 0; i < maxSamples; i++) {
      const sample = view.getInt16(wav.dataOffset + i * 2, true);
      bits += (sample & 1).toString();
    }

    let text = bitsToText(bits);
    const nullIdx = text.indexOf('\x00\x00\x00');
    if (nullIdx !== -1) text = text.slice(0, nullIdx);

    if (!text) return res.json({ message: null, found: false });
    res.json({ message: text, found: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
