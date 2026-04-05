# LowKey

Hide in plain sight.

LowKey is a client-side steganography toolkit that embeds and extracts hidden data within images and text using low-level data manipulation techniques.

The focus is not just on hiding data, but on understanding how information can exist below the threshold of human perception.

---

## Core Capabilities

### Image Steganography (LSB Manipulation)

- Direct bit-level encoding using Least Significant Bit substitution
- Operates on RGB channels via Canvas pixel buffers
- Payload capacity derived from image resolution
- Optional XOR-based obfuscation layer
- Deterministic encoding and extraction

---

### Text Steganography (Zero-Width Encoding)

- Binary encoding using invisible Unicode characters
- Zero-width space (U+200B) and non-joiner (U+200C) used as bit carriers
- Byte Order Mark (U+FEFF) used as payload delimiter
- Maintains visual integrity of cover text
- Resistant to casual inspection

---

### Decoding Engine

- Unified extraction pipeline for both image and text payloads
- Bitstream reconstruction from pixel data and Unicode sequences
- Optional key-based deobfuscation
- Graceful handling of invalid or missing payloads

---

### Steganalysis Utilities

- LSB plane visualization for structural inspection
- Highlights statistical irregularities in pixel noise
- Useful for both validation and detection workflows

---

## System Design

### Image Pipeline

- Image loaded into Canvas context
- Pixel buffer accessed as RGBA byte array
- Least significant bits of RGB channels modified sequentially
- Alpha channel preserved to avoid rendering artifacts
- Message terminated using null-byte delimiter

Capacity:
(width × height × 3) / 8 bytes

---

### Text Pipeline

- Input message converted to binary stream
- Bits mapped to zero-width Unicode characters
- Payload injected into cover text with delimiters
- Decoding reverses mapping and reconstructs original message

---

## Execution Model

- Fully client-side
- No external dependencies
- No data leaves the browser
- Deterministic and reproducible results

---

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Canvas API (pixel-level manipulation)
- Unicode encoding techniques

---

## Project Structure

LowKey/
│
├── index.html
├── README.md

---

## Why This Project

Most implementations treat steganography as a novelty.

LowKey treats it as a systems problem:

- Bit-level data control
- Encoding/decoding symmetry
- Capacity vs detectability trade-offs
- Human perception vs machine representation

This is not just about hiding data.
It is about understanding where data can exist.

---

## Limitations

- XOR is not cryptographically secure
- Susceptible to compression artifacts (especially JPEG)
- No statistical obfuscation against advanced steganalysis

---

## Future Work

- AES-based encryption layer
- Audio steganography (WAV LSB)
- Adaptive embedding strategies
- Statistical resistance techniques
- Payload fragmentation and reconstruction

---

## Disclaimer

Intended for educational, research, and security exploration purposes.

---

## Author

Praneeth  
Software Systems, PSG College of Technology

---

## Closing Statement

If a system cannot detect the presence of data,
it cannot defend against it.
