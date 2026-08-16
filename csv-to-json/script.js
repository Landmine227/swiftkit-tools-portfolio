let outputFormat = 'pretty';

function setFormat(format, btn) {
  outputFormat = format;
  document.querySelectorAll('#formatToggle button').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  if (document.getElementById('resultsContainer').style.display === 'block') {
    csvToJson();
  }
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { field += char; }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === ',') { row.push(field); field = ''; }
      else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (char === '\r') { /* skip */ }
      else { field += char; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

function autoType(value) {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  if (/^0\d+$/.test(trimmed)) return value;
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^-?\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
  return value;
}

function csvToJson() {
  const csvText = document.getElementById('csvInput').value;
  if (!csvText.trim()) {
    alert('Paste some CSV data first.');
    return;
  }

  const rows = parseCSV(csvText.trim());
  if (rows.length === 0) {
    alert('No data found in that input.');
    return;
  }

  const useHeaders = document.getElementById('headerCheckbox').checked;
  let headers, dataRows;

  if (useHeaders) {
    headers = rows[0].map((h, idx) => h.trim() || `column_${idx + 1}`);
    dataRows = rows.slice(1);
  } else {
    headers = rows[0].map((_, idx) => `column_${idx + 1}`);
    dataRows = rows;
  }

  const result = dataRows.map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined ? autoType(r[idx]) : '';
    });
    return obj;
  });

  const json = outputFormat === 'pretty' ? JSON.stringify(result, null, 2) : JSON.stringify(result);
  document.getElementById('jsonOutput').value = json;
  document.getElementById('resultsContainer').style.display = 'block';
}

function copyJson() {
  const output = document.getElementById('jsonOutput');
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

function downloadJson() {
  const json = document.getElementById('jsonOutput').value;
  if (!json) return;
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'data.json';
  link.click();
  URL.revokeObjectURL(link.href);
}
