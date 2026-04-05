// ── Zero-width text steganography ────────────────────────────
const ZW0 = '\u200B', ZW1 = '\u200C', ZWDEL = '\uFEFF';

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

function encodeZW() {
  const cover = document.getElementById('zt-cover').value;
  const secret = document.getElementById('zt-secret').value;
  const out = document.getElementById('zt-out');
  if (!cover || !secret) { setOutput(out, 'error', 'both fields required'); return; }

  let bits = textToBits(secret);
  let zwStr = '';
  for (const b of bits) zwStr += b === '0' ? ZW0 : ZW1;

  const mid = Math.floor(cover.length / 2);
  const result = cover.slice(0, mid) + ZWDEL + zwStr + ZWDEL + cover.slice(mid);
  out.dataset.val = result;
  out.className = 'output success';
  out.textContent = result;
}

function decodeZW() {
  const text = document.getElementById('zt-paste').value;
  const out = document.getElementById('zt-dec-out');
  const s = text.indexOf(ZWDEL), e = text.indexOf(ZWDEL, s + 1);
  if (s === -1 || e === -1) { setOutput(out, 'error', 'no zero-width payload found'); return; }
  const payload = text.slice(s + 1, e);
  let bits = '';
  for (const c of payload) {
    if (c === ZW0) bits += '0';
    else if (c === ZW1) bits += '1';
  }
  const msg = bitsToText(bits);
  if (!msg) { setOutput(out, 'error', 'payload empty or corrupted'); return; }
  setOutput(out, 'success', '> ' + msg);
}

function copyZW() {
  const val = document.getElementById('zt-out').dataset.val;
  if (val) navigator.clipboard.writeText(val).then(() => {
    const out = document.getElementById('zt-out');
    const prev = out.className;
    out.className = 'output info';
    setTimeout(() => { out.className = prev; }, 800);
  }).catch(() => {});
}

// ── LSB Plane — client-side canvas ───────────────────────────
function visualizeLSBClient(input) {
  const file = input.files[0];
  if (!file) return;
  setDropzone(input, 'vis-zone');
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 380 / Math.max(img.width, img.height));
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const idata = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = idata.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = (d[i]   & 1) * 255;
      d[i+1] = (d[i+1] & 1) * 255;
      d[i+2] = (d[i+2] & 1) * 255;
    }
    ctx.putImageData(idata, 0, 0);
    const prev = document.getElementById('vis-preview');
    prev.innerHTML = '';
    prev.appendChild(canvas);
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

// ── Image encode preview ──────────────────────────────────────
function handleImgEnc(input) {
  setDropzone(input, 'img-enc-zone');
  const file = input.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const cap = Math.floor(img.width * img.height * 3 / 8);
    document.getElementById('s-dim').textContent = img.width + '×' + img.height;
    document.getElementById('s-cap').textContent = (cap / 1024).toFixed(1) + ' KB';
    const prev = document.getElementById('img-enc-preview');
    prev.innerHTML = `<img src="${url}" alt="preview">`;
    URL.revokeObjectURL(url);
  };
  img.src = url;
}
