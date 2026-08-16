function getAscii(view, offset, length) {
  let s = '';
  for (let i = 0; i < length; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

function readExifData(arrayBuffer) {
  try {
    const view = new DataView(arrayBuffer);
    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xFFD8) return null;

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xFFD8 || marker === 0xFFD9) continue;
      if (marker === 0xFFDA) break;
      if ((marker & 0xFF00) !== 0xFF00) break;

      const segLength = view.getUint16(offset, false);
      if (marker === 0xFFE1) {
        const header = getAscii(view, offset + 2, 6);
        if (header.startsWith('Exif')) {
          return parseTiff(view, offset + 2 + 6);
        }
      }
      offset += segLength;
    }
    return null;
  } catch (e) {
    return null;
  }
}

function parseTiff(view, tiffStart) {
  const byteOrderMarker = getAscii(view, tiffStart, 2);
  const little = byteOrderMarker === 'II';
  const magic = view.getUint16(tiffStart + 2, little);
  if (magic !== 42) return null;

  const ifd0Offset = view.getUint32(tiffStart + 4, little);
  const tags = {};

  function readIfd(ifdOffset) {
    const entryCount = view.getUint16(tiffStart + ifdOffset, little);
    let gpsIfdOffset = null;
    let exifIfdOffset = null;
    for (let i = 0; i < entryCount; i++) {
      const entryOffset = tiffStart + ifdOffset + 2 + i * 12;
      const tag = view.getUint16(entryOffset, little);
      const type = view.getUint16(entryOffset + 2, little);
      const count = view.getUint32(entryOffset + 4, little);
      const valueOffsetField = entryOffset + 8;

      const typeSizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
      const size = (typeSizes[type] || 1) * count;
      const dataOffset = size <= 4 ? valueOffsetField : tiffStart + view.getUint32(valueOffsetField, little);

      if (tag === 0x010F) tags.Make = getAscii(view, dataOffset, count);
      else if (tag === 0x0110) tags.Model = getAscii(view, dataOffset, count);
      else if (tag === 0x0132) tags.DateTime = getAscii(view, dataOffset, count);
      else if (tag === 0x8825) gpsIfdOffset = view.getUint32(valueOffsetField, little);
      else if (tag === 0x8769) exifIfdOffset = view.getUint32(valueOffsetField, little);
      else if (tag === 0x9003) tags.DateTimeOriginal = getAscii(view, dataOffset, count);
    }

    if (exifIfdOffset) {
      const subCount = view.getUint16(tiffStart + exifIfdOffset, little);
      for (let i = 0; i < subCount; i++) {
        const entryOffset = tiffStart + exifIfdOffset + 2 + i * 12;
        const tag = view.getUint16(entryOffset, little);
        const type = view.getUint16(entryOffset + 2, little);
        const count = view.getUint32(entryOffset + 4, little);
        const valueOffsetField = entryOffset + 8;
        const typeSizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
        const size = (typeSizes[type] || 1) * count;
        const dataOffset = size <= 4 ? valueOffsetField : tiffStart + view.getUint32(valueOffsetField, little);
        if (tag === 0x9003) tags.DateTimeOriginal = getAscii(view, dataOffset, count);
      }
    }

    if (gpsIfdOffset) {
      const gpsCount = view.getUint16(tiffStart + gpsIfdOffset, little);
      let latRef, lonRef, lat, lon;
      for (let i = 0; i < gpsCount; i++) {
        const entryOffset = tiffStart + gpsIfdOffset + 2 + i * 12;
        const tag = view.getUint16(entryOffset, little);
        const type = view.getUint16(entryOffset + 2, little);
        const count = view.getUint32(entryOffset + 4, little);
        const valueOffsetField = entryOffset + 8;
        if (tag === 0x0001) latRef = getAscii(view, valueOffsetField, 1);
        else if (tag === 0x0003) lonRef = getAscii(view, valueOffsetField, 1);
        else if (tag === 0x0002 || tag === 0x0004) {
          const rationalOffset = tiffStart + view.getUint32(valueOffsetField, little);
          const vals = [];
          for (let r = 0; r < 3; r++) {
            const num = view.getUint32(rationalOffset + r * 8, little);
            const den = view.getUint32(rationalOffset + r * 8 + 4, little);
            vals.push(den === 0 ? 0 : num / den);
          }
          const decimal = vals[0] + vals[1] / 60 + vals[2] / 3600;
          if (tag === 0x0002) lat = decimal;
          else lon = decimal;
        }
      }
      if (lat !== undefined && lon !== undefined) {
        tags.GPSLatitude = (latRef === 'S' ? -lat : lat).toFixed(6);
        tags.GPSLongitude = (lonRef === 'W' ? -lon : lon).toFixed(6);
      }
    }
  }

  readIfd(ifd0Offset);
  return Object.keys(tags).length > 0 ? tags : null;
}

// ---------- UI wiring ----------
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

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
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    alert('Please choose a JPEG, PNG, or WEBP image.');
    return;
  }

  document.getElementById('results').style.display = 'block';
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileTypeSize').textContent = `${file.type} — ${formatBytes(file.size)}`;

  const objectUrl = URL.createObjectURL(file);
  document.getElementById('previewImg').src = objectUrl;

  // Read metadata (display only, never blocks scrubbing below)
  const reader = new FileReader();
  reader.onload = (e) => {
    let tags = null;
    try { tags = readExifData(e.target.result); } catch (err) { tags = null; }
    displayMetadata(tags);
  };
  reader.readAsArrayBuffer(file);

  // Scrub via canvas re-encode, independent of whether metadata reading succeeded
  scrubImage(file, objectUrl);
}

function displayMetadata(tags) {
  const statusEl = document.getElementById('metadataStatus');
  const listEl = document.getElementById('metadataList');
  listEl.innerHTML = '';

  if (!tags) {
    statusEl.innerHTML = '<div class="status-banner clean">No hidden metadata was found in this file.</div>';
    return;
  }

  statusEl.innerHTML = '<div class="status-banner found">This file contains hidden metadata — see below.</div>';

  const labels = {
    Make: 'Camera Make', Model: 'Camera Model',
    DateTime: 'Date/Time', DateTimeOriginal: 'Date Taken'
  };
  Object.keys(tags).forEach((key) => {
    if (key === 'GPSLatitude' || key === 'GPSLongitude') return;
    const row = document.createElement('div');
    row.className = 'metadata-item';
    row.innerHTML = `<span class="meta-label">${labels[key] || key}</span><span class="meta-value">${tags[key]}</span>`;
    listEl.appendChild(row);
  });

  if (tags.GPSLatitude && tags.GPSLongitude) {
    const row = document.createElement('div');
    row.className = 'metadata-item';
    const mapUrl = `https://www.google.com/maps?q=${tags.GPSLatitude},${tags.GPSLongitude}`;
    row.innerHTML = `<span class="meta-label">GPS Location</span><span class="meta-value"><a href="${mapUrl}" target="_blank" rel="noopener">${tags.GPSLatitude}, ${tags.GPSLongitude} — View on map</a></span>`;
    listEl.appendChild(row);
  }
}

function scrubImage(file, objectUrl) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const outputType = file.type === 'image/png' ? 'image/png' : (file.type === 'image/webp' ? 'image/webp' : 'image/jpeg');
    const quality = outputType === 'image/png' ? undefined : 0.92;

    canvas.toBlob((blob) => {
      if (!blob) {
        document.getElementById('scrubStatus').innerHTML = '<div class="status-banner found">Could not process this image. Try a different file.</div>';
        return;
      }
      const scrubStatus = document.getElementById('scrubStatus');
      scrubStatus.innerHTML = `<div class="status-banner clean">Clean copy ready — ${formatBytes(file.size)} → ${formatBytes(blob.size)}</div>`;

      const downloadBtn = document.getElementById('downloadBtn');
      downloadBtn.style.display = 'block';
      downloadBtn.onclick = () => {
        const ext = outputType === 'image/png' ? 'png' : (outputType === 'image/webp' ? 'webp' : 'jpg');
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${baseName}-clean.${ext}`;
        link.click();
        URL.revokeObjectURL(link.href);
      };
    }, outputType, quality);
  };
  img.src = objectUrl;
}
