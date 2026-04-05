// ── Config ──────────────────────────────────────
const API = ''; // empty = same origin (backend on same server)

// ── Helpers ─────────────────────────────────────
function setOutput(el, type, text) {
  el.className = 'output ' + (type || '');
  el.textContent = text;
}

function setDropzone(input, zoneId) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;
  const file = input.files[0];
  if (file) {
    zone.classList.add('has-file');
    zone.querySelector('.dropzone-text').innerHTML = `<strong>${file.name}</strong><br>${(file.size / 1024).toFixed(1)} KB`;
    zone.querySelector('.dropzone-icon').textContent = '✓';
    // Show clear button (sibling of zone's parent)
    const clearId = zoneId.replace('-zone', '-clear');
    const clearBtn = document.getElementById(clearId);
    if (clearBtn) clearBtn.classList.add('visible');
  }
}

function clearDropzone(zoneId, fileInputId, clearBtnId, resetCallback) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(fileInputId);
  const clearBtn = document.getElementById(clearBtnId);

  if (zone) {
    zone.classList.remove('has-file');
    // Restore original dropzone icon/text
    const icon = zone.querySelector('.dropzone-icon');
    const text = zone.querySelector('.dropzone-text');
    if (icon) icon.textContent = '⬡';
    if (text) {
      // Restore default text based on zone type
      const defaults = {
        'img-enc-zone': 'Drop image or <strong>click to browse</strong><br>PNG · JPG · BMP · WebP',
        'img-dec-zone': 'Drop stego image or <strong>click to browse</strong>',
        'aud-enc-zone': 'Drop WAV file or <strong>click to browse</strong><br>16-bit WAV only',
        'aud-dec-zone': 'Drop stego WAV or <strong>click to browse</strong>',
        'meta-inj-zone': 'Drop image or <strong>click to browse</strong>',
        'meta-read-zone': 'Drop any image to inspect',
        'chi-zone': 'Drop image to analyze<br><strong>detects LSB steganography</strong>',
        'vis-zone': 'Drop image to visualize its <strong>LSB noise plane</strong>',
      };
      text.innerHTML = defaults[zoneId] || 'Drop file or <strong>click to browse</strong>';
    }
  }
  if (input) {
    // Reset file input
    input.value = '';
    try { Object.defineProperty(input, 'files', { value: new DataTransfer().files, configurable: true }); } catch(e) {}
  }
  if (clearBtn) clearBtn.classList.remove('visible');

  if (typeof resetCallback === 'function') resetCallback();
}

function resetImgEncPreview() {
  const prev = document.getElementById('img-enc-preview');
  if (prev) prev.innerHTML = '<span class="img-preview-empty">no image loaded</span>';
  // Reset stats
  ['s-dim','s-cap','s-use','s-pay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });
  const progressWrap = document.getElementById('img-progress-wrap');
  if (progressWrap) progressWrap.style.display = 'none';
  const dl = document.getElementById('img-dl');
  if (dl) dl.classList.remove('visible');
}

function resetChiResult() {
  const result = document.getElementById('chi-result');
  if (result) result.style.display = 'none';
}

function resetVisPreview() {
  const prev = document.getElementById('vis-preview');
  if (prev) prev.innerHTML = '<span class="img-preview-empty">load an image</span>';
}

function showDL(id, url, filename) {
  const el = document.getElementById(id);
  if (!el) return;
  el.href = url;
  el.download = filename;
  el.classList.add('visible');
}

async function apiPost(path, formData) {
  try {
    const res = await fetch(API + path, { method: 'POST', body: formData });
    return res;
  } catch (e) {
    throw new Error('API unreachable — is the server running? (' + e.message + ')');
  }
}

// ── Tab switching ────────────────────────────────
function switchTab(btn, id) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-' + id).classList.add('active');
}

// ── Theme ────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.dataset.theme === 'light';
  html.dataset.theme = isLight ? 'dark' : 'light';
  document.getElementById('theme-icon').textContent = isLight ? '☀' : '☾';
  document.getElementById('theme-label').textContent = isLight ? 'LIGHT' : 'DARK';
}

// ── Image Encode ─────────────────────────────────
async function encodeImage() {
  const file = document.getElementById('img-enc-file').files[0];
  const secret = document.getElementById('img-secret').value.trim();
  const key = document.getElementById('img-key').value;

  if (!file || !secret) { alert('Please load an image and enter a secret.'); return; }

  const fd = new FormData();
  fd.append('image', file);
  fd.append('secret', secret);
  if (key) fd.append('key', key);

  const btn = document.querySelector('#panel-img-lsb .card:first-child .btn');
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const res = await apiPost('/api/image/encode', fd);
    if (!res.ok) { const j = await res.json(); alert(j.error); return; }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const usage = res.headers.get('X-Usage-Pct');
    const pay = res.headers.get('X-Payload-KB');
    const cap = res.headers.get('X-Capacity-KB');

    document.getElementById('s-use').textContent = usage + '%';
    document.getElementById('s-pay').textContent = pay + ' KB';
    document.getElementById('s-cap').textContent = cap + ' KB';
    document.getElementById('s-pct').textContent = usage + '%';

    const pct = parseFloat(usage);
    document.getElementById('img-progress').style.width = Math.min(pct, 100) + '%';
    document.getElementById('img-progress-wrap').style.display = 'block';

    showDL('img-dl', url, 'stego_image.png');
  } catch (e) {
    alert(e.message);
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

// ── Image Decode ─────────────────────────────────
async function decodeImage() {
  const file = document.getElementById('img-dec-file').files[0];
  const key = document.getElementById('img-dec-key').value;
  const out = document.getElementById('img-dec-out');

  if (!file) { setOutput(out, 'error', 'no image loaded'); return; }

  const fd = new FormData();
  fd.append('image', file);
  if (key) fd.append('key', key);

  try {
    const res = await apiPost('/api/image/decode', fd);
    const j = await res.json();
    if (j.found) {
      setOutput(out, 'success', '> message found (' + j.length + ' chars)\n\n' + j.message);
    } else {
      setOutput(out, 'error', 'no hidden message detected\n(or wrong passkey)');
    }
  } catch (e) {
    setOutput(out, 'error', e.message);
  }
}

// ── Audio Encode ─────────────────────────────────
async function encodeAudio() {
  const file = document.getElementById('aud-enc-file').files[0];
  const secret = document.getElementById('aud-secret').value.trim();

  if (!file || !secret) { alert('Load a WAV file and enter a secret.'); return; }

  const fd = new FormData();
  fd.append('audio', file);
  fd.append('secret', secret);

  try {
    const res = await apiPost('/api/audio/encode', fd);
    if (!res.ok) { const j = await res.json(); alert(j.error); return; }
    const blob = await res.blob();
    showDL('aud-dl', URL.createObjectURL(blob), 'stego_audio.wav');
  } catch (e) {
    alert(e.message);
  }
}

// ── Audio Decode ─────────────────────────────────
async function decodeAudio() {
  const file = document.getElementById('aud-dec-file').files[0];
  const out = document.getElementById('aud-dec-out');

  if (!file) { setOutput(out, 'error', 'no WAV loaded'); return; }

  const fd = new FormData();
  fd.append('audio', file);

  try {
    const res = await apiPost('/api/audio/decode', fd);
    const j = await res.json();
    if (j.found) {
      setOutput(out, 'success', '> ' + j.message);
    } else {
      setOutput(out, 'error', 'no hidden message detected');
    }
  } catch (e) {
    setOutput(out, 'error', e.message);
  }
}

// ── Metadata field dropdown sync ─────────────────
function syncMetaField(select) {
  const customInput = document.getElementById('meta-field');
  if (select.value === 'custom') {
    customInput.style.display = 'block';
    customInput.value = '';
    customInput.focus();
  } else {
    customInput.style.display = 'none';
    customInput.value = select.value;
  }
}

function getMetaFieldValue() {
  const select = document.getElementById('meta-field-select');
  const customInput = document.getElementById('meta-field');
  if (select.value === 'custom') {
    return customInput.value.trim() || 'Comment';
  }
  return select.value || 'Comment';
}

// ── Metadata Inject ──────────────────────────────
async function injectMeta() {
  const file = document.getElementById('meta-inj-file').files[0];
  const field = getMetaFieldValue();
  const secret = document.getElementById('meta-secret').value.trim();

  if (!file || !secret) { alert('Load an image and enter a payload.'); return; }

  const fd = new FormData();
  fd.append('image', file);
  fd.append('field', field);
  fd.append('secret', secret);

  try {
    const res = await apiPost('/api/meta/inject', fd);
    if (!res.ok) { const j = await res.json(); alert(j.error); return; }
    const blob = await res.blob();
    showDL('meta-dl', URL.createObjectURL(blob), 'meta_stego.png');
  } catch (e) {
    alert(e.message);
  }
}

// ── Metadata Read ────────────────────────────────
async function readMeta() {
  const file = document.getElementById('meta-read-file').files[0];
  const out = document.getElementById('meta-out');
  if (!file) { setOutput(out, 'error', 'no image loaded'); return; }

  const fd = new FormData();
  fd.append('image', file);

  try {
    const res = await apiPost('/api/meta/read', fd);
    const j = await res.json();
    if (j.error) { setOutput(out, 'error', j.error); return; }
    const lines = Object.entries(j.fields).map(([k, v]) => `${k.padEnd(14)} ${v}`).join('\n');
    setOutput(out, 'info', lines || '(no EXIF fields found)');
  } catch (e) {
    setOutput(out, 'error', e.message);
  }
}

// ── Metadata Extract ─────────────────────────────
async function extractMeta() {
  const file = document.getElementById('meta-read-file').files[0];
  const out = document.getElementById('meta-out');
  if (!file) { setOutput(out, 'error', 'no image loaded'); return; }

  const fd = new FormData();
  fd.append('image', file);

  try {
    const res = await apiPost('/api/meta/extract', fd);
    const j = await res.json();
    if (!j.found) { setOutput(out, 'error', 'no tEXt chunks found'); return; }
    const lines = j.chunks.map(c => `[${c.type}] ${c.keyword}\n> ${c.text}`).join('\n\n');
    setOutput(out, 'success', lines);
  } catch (e) {
    setOutput(out, 'error', e.message);
  }
}

// ── Chi-Square Analysis ──────────────────────────
async function runChiSquare() {
  const file = document.getElementById('chi-file').files[0];
  if (!file) { alert('Load an image first.'); return; }

  const fd = new FormData();
  fd.append('image', file);

  const btn = document.querySelector('#panel-analysis .card:first-child .btn');
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const res = await apiPost('/api/analysis/chisquare', fd);
    const j = await res.json();
    if (j.error) { alert(j.error); return; }

    const result = document.getElementById('chi-result');
    const verdict = document.getElementById('chi-verdict');
    const grid = document.getElementById('chi-grid');

    const riskClass = j.risk === 'HIGH' ? 'red' : j.risk === 'MEDIUM' ? 'amber' : 'green';
    const badgeClass = riskClass === 'green' ? 'badge-green' : riskClass === 'amber' ? 'badge-amber' : 'badge-red';
    verdict.innerHTML = `<span style="color:var(--${riskClass})">${j.verdict}</span> <span class="badge ${badgeClass}">${j.risk} RISK</span>`;

    grid.innerHTML = [
      { label: 'confidence', val: j.confidence + '%', cls: riskClass },
      { label: 'chi²', val: j.chiSquare },
      { label: 'p-value', val: j.pValue },
      { label: 'LSB balance', val: j.lsbBalance },
      { label: 'pixels', val: j.imageInfo.pixels.toLocaleString() },
      { label: 'df', val: j.degreesOfFreedom },
    ].map(s => `
      <div class="stat">
        <div class="stat-label">${s.label}</div>
        <div class="stat-val ${s.cls || ''}">${s.val}</div>
      </div>
    `).join('');

    result.style.display = 'block';
  } catch (e) {
    alert(e.message);
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

// ── Drag & drop on all dropzones ─────────────────
document.querySelectorAll('.dropzone').forEach(dz => {
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    const input = dz.querySelector('input[type="file"]');
    if (input && e.dataTransfer.files.length) {
      Object.defineProperty(input, 'files', { value: e.dataTransfer.files, configurable: true });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
});
