# ShadowPress — Steganography Lab

All-in-one steganography toolkit with a dark hacker aesthetic.

## Features

| Module | Technique | Encode | Decode |
|--------|-----------|--------|--------|
| Image LSB | Bit manipulation on RGB pixels | ✓ | ✓ |
| Audio LSB | 16-bit WAV sample LSB | ✓ | ✓ |
| Text Stego | Zero-width Unicode chars | ✓ | ✓ |
| Metadata | PNG tEXt chunk injection | ✓ | ✓ |
| Chi-Square | Statistical steganalysis | — | ✓ |
| LSB Plane | Visual noise visualizer | — | ✓ |

## Setup

```bash
# Install dependencies
npm install

# Start server (production)
npm start

# Start with auto-reload (development)
npm run dev
```

Server runs at: http://localhost:3000

## Project Structure

```
shadowpress/
├── public/
│   ├── index.html          # Single-page app shell
│   ├── css/
│   │   └── style.css       # All styles, dark/light theme
│   └── js/
│       ├── particles.js    # Particle canvas + click effects
│       ├── stego.js        # Client-side stego logic (ZW, LSB plane)
│       └── ui.js           # API calls, tab routing, dropzones
├── server/
│   ├── index.js            # Express entry point
│   └── routes/
│       ├── image.js        # Image LSB encode/decode/lsb-plane
│       ├── audio.js        # Audio WAV LSB encode/decode
│       ├── meta.js         # PNG tEXt chunk inject/extract/read
│       └── analysis.js     # Chi-square steganalysis
├── package.json
└── README.md
```

## API Endpoints

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | /api/image/encode | image, secret, key? | PNG blob |
| POST | /api/image/decode | image, key? | JSON |
| POST | /api/image/lsb-plane | image | PNG blob |
| POST | /api/audio/encode | audio, secret | WAV blob |
| POST | /api/audio/decode | audio | JSON |
| POST | /api/meta/inject | image, secret, field? | PNG blob |
| POST | /api/meta/read | image | JSON |
| POST | /api/meta/extract | image | JSON |
| POST | /api/analysis/chisquare | image | JSON |

## Notes

- Image LSB: supports PNG, JPG, BMP, WebP. Output always PNG (lossless).
- Audio LSB: 16-bit WAV only. MP3/AAC lossy compression destroys LSB data.
- Passkey: applies XOR cipher before embedding. Both sides need the same key.
- Chi-square: p-value < 0.05 = suspicious, < 0.01 = likely stego detected.
- Metadata: PNG tEXt chunks survive most viewers but are stripped by some social media.
