const NUMERIC_ATTRS = ['d','points','x','y','cx','cy','r','rx','ry','x1','y1','x2','y2','width','height','transform','stroke-width','stroke-dasharray','viewBox'];

function roundNumbersInAttrValue(value, precision) {
  return value.replace(/-?\d+\.\d+/g, (match) => {
    const num = parseFloat(match);
    const rounded = parseFloat(num.toFixed(precision));
    return String(rounded);
  });
}

function minifySvg(input, options) {
  let svg = input;

  svg = svg.replace(/<\?xml[^>]*\?>/g, '');
  svg = svg.replace(/<!DOCTYPE[^>]*>/gi, '');
  svg = svg.replace(/<!--[\s\S]*?-->/g, '');
  svg = svg.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');

  if (options.stripTitleDesc) {
    svg = svg.replace(/<title[\s\S]*?<\/title>/gi, '');
    svg = svg.replace(/<desc[\s\S]*?<\/desc>/gi, '');
  }

  svg = svg.replace(/\s(inkscape|sodipodi):[\w-]+="[^"]*"/g, '');
  svg = svg.replace(/\sxmlns:(inkscape|sodipodi)="[^"]*"/g, '');
  svg = svg.replace(/\s(class|style)=""/g, '');

  const attrPattern = new RegExp('\\b(' + NUMERIC_ATTRS.join('|') + ')="([^"]*)"', 'g');
  svg = svg.replace(attrPattern, (full, attrName, attrValue) => {
    return attrName + '="' + roundNumbersInAttrValue(attrValue, options.precision) + '"';
  });

  svg = svg.replace(/>\s+</g, '><');
  svg = svg.trim();

  return svg;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(2) + ' KB';
}

function runMinify() {
  const input = document.getElementById('svgInput').value;
  const resultsContainer = document.getElementById('resultsContainer');

  if (!input.trim()) {
    resultsContainer.style.display = 'none';
    return;
  }
  if (!input.includes('<svg')) {
    resultsContainer.style.display = 'none';
    return;
  }

  const precision = parseInt(document.getElementById('precisionSlider').value, 10);
  document.getElementById('precisionValue').textContent = precision;
  const stripTitleDesc = document.getElementById('stripTitleCheckbox').checked;

  let output;
  try {
    output = minifySvg(input, { precision, stripTitleDesc });
  } catch (e) {
    resultsContainer.style.display = 'none';
    return;
  }

  document.getElementById('svgOutput').value = output;

  const originalBytes = new Blob([input]).size;
  const minifiedBytes = new Blob([output]).size;
  const reduction = originalBytes > 0 ? Math.round((1 - minifiedBytes / originalBytes) * 100) : 0;

  document.getElementById('sizeStats').innerHTML =
    `<span>Original: <strong>${formatBytes(originalBytes)}</strong></span>` +
    `<span>Minified: <strong>${formatBytes(minifiedBytes)}</strong></span>` +
    `<span>Reduction: <strong>${reduction}%</strong></span>`;

  try {
    document.getElementById('previewBefore').innerHTML = input;
  } catch (e) {
    document.getElementById('previewBefore').textContent = 'Preview unavailable';
  }
  try {
    document.getElementById('previewAfter').innerHTML = output;
  } catch (e) {
    document.getElementById('previewAfter').textContent = 'Preview unavailable';
  }

  resultsContainer.style.display = 'block';
}

function copyOutput() {
  const output = document.getElementById('svgOutput');
  const btn = document.getElementById('copyBtn');
  output.select();
  navigator.clipboard.writeText(output.value).then(() => {
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 1200);
  }).catch(() => {
    alert('Could not copy automatically — the text is selected, so you can press Ctrl+C / Cmd+C.');
  });
}

function downloadSvg() {
  const svg = document.getElementById('svgOutput').value;
  if (!svg) return;
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'minified.svg';
  link.click();
  URL.revokeObjectURL(link.href);
}
