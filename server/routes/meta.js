const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// POST /api/meta/read — read EXIF metadata from image
router.post('/read', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing image' });

    const meta = await sharp(req.file.buffer).metadata();
    const fields = {
      format: meta.format,
      width: meta.width,
      height: meta.height,
      space: meta.space,
      channels: meta.channels,
      depth: meta.depth,
      density: meta.density,
      hasProfile: meta.hasProfile,
      hasAlpha: meta.hasAlpha,
      exif: meta.exif ? `${meta.exif.length} bytes of EXIF data present` : 'none',
      icc: meta.icc ? `${meta.icc.length} bytes of ICC profile` : 'none',
      iptc: meta.iptc ? `${meta.iptc.length} bytes of IPTC data` : 'none',
    };
    res.json({ fields });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/meta/inject — hide message in PNG tEXt chunk (comment field)
router.post('/inject', upload.single('image'), async (req, res) => {
  try {
    const { secret, field } = req.body;
    if (!req.file || !secret) return res.status(400).json({ error: 'Missing image or secret' });

    const keyword = field || 'Comment';
    // Build a tEXt chunk: keyword + null + text
    const keyBuf = Buffer.from(keyword + '\x00' + secret, 'latin1');
    const chunkType = Buffer.from('tEXt');
    const crc = computeCRC32(Buffer.concat([chunkType, keyBuf]));

    // Get raw PNG from sharp (strips existing metadata)
    const pngBuf = await sharp(req.file.buffer).png({ compressionLevel: 0 }).toBuffer();

    // Insert tEXt chunk after PNG signature + IHDR chunk
    // PNG sig = 8 bytes, IHDR chunk = 4(len)+4(type)+13(data)+4(crc) = 25 bytes
    const insertAt = 8 + 25;

    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(keyBuf.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);

    const textChunk = Buffer.concat([lenBuf, chunkType, keyBuf, crcBuf]);
    const outBuf = Buffer.concat([
      pngBuf.slice(0, insertAt),
      textChunk,
      pngBuf.slice(insertAt)
    ]);

    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', 'attachment; filename="meta_stego.png"');
    res.set('X-Field', keyword);
    res.set('X-Payload-Bytes', secret.length);
    res.send(outBuf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/meta/extract — read tEXt chunks from PNG
router.post('/extract', upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing image' });

    const buf = req.file.buffer;
    // Check PNG signature
    const sig = buf.slice(0, 8).toString('hex');
    if (sig !== '89504e470d0a1a0a') return res.status(400).json({ error: 'Not a valid PNG' });

    const chunks = [];
    let offset = 8;
    while (offset < buf.length - 12) {
      const length = buf.readUInt32BE(offset);
      const type = buf.slice(offset + 4, offset + 8).toString('ascii');
      const data = buf.slice(offset + 8, offset + 8 + length);

      if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
        const nullIdx = data.indexOf(0);
        const keyword = data.slice(0, nullIdx).toString('latin1');
        const text = data.slice(nullIdx + 1).toString('latin1');
        chunks.push({ type, keyword, text });
      }
      if (type === 'IEND') break;
      offset += 12 + length;
    }

    res.json({ chunks, found: chunks.length > 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// CRC32 helper for PNG chunk validation
function computeCRC32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++)
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

module.exports = router;
