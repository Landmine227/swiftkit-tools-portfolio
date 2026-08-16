let currentMode = 'encode';
let decodedDataUri = null;

function setMode(mode, btn) {
  currentMode = mode;
  document.querySelectorAll('#modeToggle button').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('encodePanel').style.display = mode === 'encode' ? 'block' : 'none';
  document.getElementById('decodePanel').style.display = mode === 'decode' ? 'block' : 'none';
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ---------- Encode ----------
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please choose an image file (PNG, JPG, GIF, WEBP, or SVG).');
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    if (!confirm('This file is over 3 MB. Large images can make the browser feel slow when encoded. Continue anyway?')) return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUri = e.target.result;
    document.getElementById('encodePreviewImg').src = dataUri;
    document.getElementById('encodeFileName').textContent = file.name;
    document.getElementById('encodeFileType').textContent = file.type;
    document.getElementById('originalSize').textContent = formatBytes(file.size);
    document.getElementById('encodedSize').textContent = formatBytes(dataUri.length);
    document.getElementById('encodeResults').style.display = 'block';
    updateEncodeOutput(dataUri);
  };
  reader.readAsDataURL(file);
}

function updateEncodeOutput(dataUri) {
  const wrap = document.getElementById('cssWrapCheckbox').checked;
  const output = wrap ? `background-image: url("${dataUri}");` : dataUri;
  document.getElementById('encodeOutput').value = output;
}

document.getElementById('cssWrapCheckbox').addEventListener('change', () => {
  const img = document.getElementById('encodePreviewImg');
  if (img.src) updateEncodeOutput(img.src);
});

function copyEncoded() {
  const output = document.getElementById('encodeOutput');
  const btn = document.getElementById('copyEncodeBtn');
  output.select();
  navigator.clipboard.writeText(output.value).then(() => {
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 1200);
  }).catch(() => {
    alert('Could not copy automatically — the text is selected, so you can press Ctrl+C / Cmd+C.');
  });
}

// ---------- Decode ----------
function parseDataUri(str) {
  const match = str.trim().match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (match) return { mime: match[1], base64: match[2].replace(/\s+/g, '') };
  return { mime: null, base64: str.trim().replace(/\s+/g, '') };
}

function isValidBase64(str) {
  if (str.length === 0) return false;
  return /^[A-Za-z0-9+/]*={0,2}$/.test(str) && str.length % 4 === 0;
}

function extForMime(mime) {
  const map = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
    'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg'
  };
  return map[mime] || 'bin';
}

function handleDecodeInput() {
  const raw = document.getElementById('decodeInput').value;
  const mimeSelect = document.getElementById('mimeSelect');
  if (!raw.trim()) {
    mimeSelect.style.display = 'none';
    document.getElementById('decodeResults').style.display = 'none';
    document.getElementById('decodeError').style.display = 'none';
    return;
  }
  const parsed = parseDataUri(raw);
  mimeSelect.style.display = parsed.mime ? 'none' : 'block';
  decodeBase64();
}

function decodeBase64() {
  const raw = document.getElementById('decodeInput').value;
  const errorBox = document.getElementById('decodeError');
  const resultsBox = document.getElementById('decodeResults');
  errorBox.style.display = 'none';

  if (!raw.trim()) return;

  const parsed = parseDataUri(raw);
  const mime = parsed.mime || document.getElementById('mimeSelect').value;

  if (!isValidBase64(parsed.base64)) {
    errorBox.textContent = "That doesn't look like valid Base64 — check for missing characters or extra text.";
    errorBox.style.display = 'block';
    resultsBox.style.display = 'none';
    return;
  }

  try {
    const dataUri = `data:${mime};base64,${parsed.base64}`;
    const byteChars = atob(parsed.base64);
    document.getElementById('decodePreviewImg').src = dataUri;
    document.getElementById('decodeFileType').textContent = mime;
    document.getElementById('decodedSize').textContent = formatBytes(byteChars.length);
    decodedDataUri = { dataUri, mime, base64: parsed.base64 };
    resultsBox.style.display = 'block';
  } catch (e) {
    errorBox.textContent = "Couldn't decode this string — it may be corrupted or incomplete.";
    errorBox.style.display = 'block';
    resultsBox.style.display = 'none';
  }
}

function downloadDecoded() {
  if (!decodedDataUri) return;
  const byteChars = atob(decodedDataUri.base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: decodedDataUri.mime });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `decoded-image.${extForMime(decodedDataUri.mime)}`;
  link.click();
  URL.revokeObjectURL(link.href);
}
