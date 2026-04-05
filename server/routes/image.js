const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function xorStr(str, key) {
  let out = '';
  for (let i = 0; i < str.length; i++)
    out += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  return out;
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

// POST /api/image/encode
router.post('/encode', upload.single('image'), async (req, res) => {
  try {
    const { secret, key } = req.body;
    if (!req.file || !secret) return res.status(400).json({ error: 'Missing image or secret' });

    const payload = key ? xorStr(secret, key) : secret;
    const fullMsg = payload + '\x00\x00\x00';
    const bits = textToBits(fullMsg);

    const { data, info } = await sharp(req.file.buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const capacity = Math.floor(data.length * 0.75);
    if (bits.length > capacity)
      return res.status(400).json({ error: 'Message too large for this image' });

    let bitIdx = 0;
    for (let i = 0; i < data.length && bitIdx < bits.length; i++) {
      if ((i + 1) % 4 === 0) continue;
      data[i] = (data[i] & 0xFE) | parseInt(bits[bitIdx]);
      bitIdx++;
    }

    const outBuf = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 }
    }).png().toBuffer();

    res.set('Content-Type', 'image/png');
    res.set('X-Bits-Written', bitIdx);
    res.set('X-Capacity-KB', (capacity / 8 / 1024).toFixed(2));
    res.set('X-Payload-KB', (bits.length / 8 / 1024).toFixed(3));
    res.set('X-Usage-Pct', ((bits.length / capacity) * 100).toFixed(1));
    res.send(outBuf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/image/decode
router.post('/decode', upload.single('image'), async (req, res) => {
  try {
    const { key } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Missing image' });

    const { data } = await sharp(req.file.buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let bits = '';
    for (let i = 0; i < data.length; i++) {
      if ((i + 1) % 4 === 0) continue;
      bits += (data[i] & 1).toString();
    }

    let text = bitsToText(bits);
    const nullIdx = text.indexOf('\x00\x00\x00');
    if (nullIdx !== -1) text = text.slice(0, nullIdx);
    if (key && text) text = xorStr(text, key);

    if (!text) return res.json({ message: null, found: false });
    res.json({ message: text, found: true, length: text.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/image/lsb-plane
router.post('/lsb-plane', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing image' });

    const { data, info } = await sharp(req.file.buffer)
      .resize({ width: 400, withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const out = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++)
      out[i] = (data[i] & 1) * 255;

    const png = await sharp(out, {
      raw: { width: info.width, height: info.height, channels: 3 }
    }).png().toBuffer();

    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
