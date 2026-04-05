# 🌌 ShadowPress [v1.0.0]
### Advanced Steganographic Processing & Signal Intelligence Lab

```text
      _                 _                 _                                 
     | |               | |               | |                                
  ___| |__   __ _  __| | _____      _ __ | |__   ___  ___ ___               
 / __| '_ \ / _` |/ _` |/ _ \ \ /\ / / '_ \| '__/ _ \/ __/ __|              
 \__ \ | | | (_| | (_| | (_) \ V  V /| |_) | | |  __/\__ \__ \              
 |___/_| |_|\__,_|\__,_|\___/ \_/\_/ | .__/|_|  \___||___/___/              
                                     | |                                    
                                     |_|                                    
```

ShadowPress is a comprehensive suite for carrier-signal manipulation and covert data exfiltration. It provides high-fidelity embedding, extraction, and statistical steganalysis tools designed for specialists in digital forensics and information security.

---

## 🛠 Technical Capabilities

### 🖼 Spatial Domain Manipulation (Image LSB)
- **Modality**: Pixel-level bitwise replacement in the RGBA space.
- **Kernel**: 1-bit LSB injection with optional XOR cipher obfuscation.
- **Support**: Lossless transforms across PNG, BMP, and WebP. Note: JPEG carriers are pre-converted to lossless buffers to prevent quantization-induced data loss.

### 🔊 Temporal Signal Injection (Audio LSB)
- **Modality**: Least Significant Bit replacement in 16-bit PCM WAV samples.
- **Throughput**: ~1 byte per sample per channel segment.
- **Constraints**: Signal integrity is maintained only in linear pulse-code modulation (LPCM). Lossy codecs (MP3/AAC) will cause catastrophic payload corruption.

### 📝 Unicode Ghosting (Text Stego)
- **Technique**: Zero-width character (`U+200B`, `U+200C`, `U+200D`, `U+FEFF`) mapping.
- **Mechanism**: Binary sequence encoding into non-rendering Unicode points. Invisible to standard text renders, detectable only via hex-dump or regex auditing.

### 🧬 Metadata Shadow-Ops
- **Injection**: PNG `tEXt` chunk instantiation via raw buffer manipulation.
- **Persistence**: Survived by most OS-level metadata parsers; prone to stripping by social media CDNs (Instagram/FB/X).

---

## 🔬 Steganalysis & Signal Integrity

ShadowPress includes a dedicated analysis engine to detect LSB irregularities:

### 📈 Chi-Square (χ²) Statistical Attack
Evaluates the distribution of Frequency Pairs (PoVs).
- **Theory**: $E = \frac{1}{2} (n_{2k} + n_{2k+1})$.
- **Detection**: Quantifies the convergence of adjacent pixel value frequencies toward an artificial average—a hallmark of LSB replacement.
- **Verdict Thresholds**:
  - `p-value < 0.01`: High-confidence stego detection.
  - `p-value > 0.10`: Consistent with natural image entropy.

### 🌑 LSB Bit-Plane Rendering
Visualizes the 0th bit-plane to expose patterns that break natural image gradients. This visualizer is crucial for identifying "salted" regions where encrypted payloads disrupt the noise floor.

---

## 🚀 Deployment Protocol

```bash
# Clone the repository
git clone https://github.com/praneeth3696/ShadowPress.git

# Initialize environment
cd ShadowPress
npm install --silent

# Spin up the listener
npm run dev
```

The node cluster will initialize at `0.0.0.0:3000`. Environment variables can be piped for custom port binding.

---

## 📡 API Schema [v1]

| Endpoint | Method | Payload Type | Description |
|:---|:---|:---|:---|
| `/api/image/encode` | `POST` | `multipart/form-data` | Embeds secret into spatial carrier. |
| `/api/image/decode` | `POST` | `multipart/form-data` | Extracts bit-stream from spatial carrier. |
| `/api/analysis/chisquare` | `POST` | `multipart/form-data` | Runs χ² PoV analysis on image buffer. |
| `/api/audio/encode` | `POST` | `audio/wav` | Modulates WAV sample LSBs. |

---

## ⚠️ Operation Warnings

1. **Payload Recovery**: All LSB operations are deterministic. If a `passkey` was used during encoding, the exact same key MUST be provided for XOR-reversion during decoding.
2. **Lossy Compression**: Avoid JPG/MP3 carriers if you require 100% bit-integrity post-embedding.
3. **Entropy**: Embedding large payloads into low-entropy carriers (e.g., solid color images) will result in trivial detection via Chi-Square analysis.

---
**Build Status**: `STABLE` | **Security Level**: `INFOCON 3`

