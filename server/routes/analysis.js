const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Chi-square test for LSB steganography detection
// Theory: in natural images, pairs of values (2k, 2k+1) should appear roughly equally.
// LSB replacement creates a strong statistical bias where pair frequencies become equal.
function chiSquareTest(data) {
  // Count occurrences of each byte value
  const freq = new Array(256).fill(0);
  for (let i = 0; i < data.length; i++) {
    if ((i + 1) % 4 !== 0) freq[data[i]]++;
  }

  // Chi-square on value pairs (0,1), (2,3), ..., (254,255)
  let chi = 0;
  let df = 0;
  const pairs = [];

  for (let v = 0; v < 256; v += 2) {
    const observed0 = freq[v];
    const observed1 = freq[v + 1];
    const expected = (observed0 + observed1) / 2;
    if (expected > 0) {
      const c0 = Math.pow(observed0 - expected, 2) / expected;
      const c1 = Math.pow(observed1 - expected, 2) / expected;
      chi += c0 + c1;
      df++;
      pairs.push({ v, v1: v + 1, o0: observed0, o1: observed1, expected: expected.toFixed(1) });
    }
  }

  // Approximate p-value using chi-square CDF with df degrees of freedom
  // Using regularized incomplete gamma function approximation
  const pValue = 1 - chiCDF(chi, df);

  // LSB analysis per channel
  const lsbDist = { zeros: 0, ones: 0 };
  for (let i = 0; i < data.length; i++) {
    if ((i + 1) % 4 === 0) continue;
    if (data[i] & 1) lsbDist.ones++; else lsbDist.zeros++;
  }
  const lsbBalance = Math.abs(lsbDist.zeros - lsbDist.ones) / (lsbDist.zeros + lsbDist.ones);

  // Verdict — thresholds tuned for real images.
  // Natural images often have p < 0.05 due to compression artifacts and gradients.
  // We use p > 0.10 as the clean threshold, and also factor in LSB balance.
  // A truly stego image has BOTH very low p-value AND near-zero LSB balance.
  let verdict, confidence, risk;

  // LSB balance: natural images tend to have >2% imbalance; stego images approach 0%
  const lsbBalancePct = lsbBalance * 100;

  if (pValue > 0.10) {
    // High p-value → pairs are NOT equalized → likely clean
    verdict = 'CLEAN';
    confidence = Math.min(95, Math.round(50 + pValue * 40));
    risk = 'LOW';
  } else if (pValue > 0.01 || lsbBalancePct > 1.5) {
    // Medium zone — suspicious but not conclusive
    verdict = 'SUSPICIOUS';
    confidence = Math.round(50 + (0.10 - pValue) / 0.09 * 35);
    risk = 'MEDIUM';
  } else {
    // Very low p-value AND near-perfect LSB balance → strong stego signal
    verdict = 'STEGO DETECTED';
    confidence = Math.min(97, Math.round(80 + (0.01 - pValue) / 0.01 * 17));
    risk = 'HIGH';
  }

  return {
    verdict,
    risk,
    confidence,
    chiSquare: chi.toFixed(4),
    degreesOfFreedom: df,
    pValue: pValue.toFixed(6),
    lsbBalance: (lsbBalance * 100).toFixed(2) + '%',
    lsbZeros: lsbDist.zeros,
    lsbOnes: lsbDist.ones,
    samplePairs: pairs.slice(0, 10)
  };
}

// Regularized lower incomplete gamma function approximation (series expansion)
function gammaInc(a, x) {
  if (x < 0) return 0;
  if (x === 0) return 0;
  let sum = 1 / a;
  let term = 1 / a;
  for (let n = 1; n < 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-10) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * sum;
}

function logGamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function chiCDF(x, df) {
  return gammaInc(df / 2, x / 2);
}

// POST /api/analysis/chisquare
router.post('/chisquare', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing image' });

    const { data, info } = await sharp(req.file.buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const result = chiSquareTest(data);
    result.imageInfo = {
      width: info.width,
      height: info.height,
      pixels: info.width * info.height,
      totalBytes: data.length
    };

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
