function scanTemplate() {
  const template = document.getElementById('templateInput').value;
  const fieldsContainer = document.getElementById('fieldsContainer');
  const fieldsWrap = document.getElementById('variableFields');

  const regex = /\{\{([^{}]+)\}\}/g;
  const found = [];
  const seen = new Set();
  let match;

  while ((match = regex.exec(template)) !== null) {
    const varName = match[1].trim();
    if (!seen.has(varName)) {
      seen.add(varName);
      found.push(varName);
    }
  }

  if (found.length === 0) {
    fieldsContainer.style.display = 'none';
    fieldsWrap.innerHTML = '';
    return;
  }

  fieldsWrap.innerHTML = '';
  found.forEach((varName) => {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'variable-field';
    fieldDiv.innerHTML = `
      <label for="var-${cssSafe(varName)}">{{${varName}}}</label>
      <input type="text" id="var-${cssSafe(varName)}" data-varname="${escapeHtml(varName)}" placeholder="Enter ${escapeHtml(varName)}...">
    `;
    fieldsWrap.appendChild(fieldDiv);
  });

  fieldsContainer.style.display = 'block';
}

function cssSafe(str) {
  return str.replace(/[^a-zA-Z0-9-_]/g, '_');
}

function buildPrompt() {
  const template = document.getElementById('templateInput').value;

  if (!template.trim()) {
    alert('Paste a template first.');
    return;
  }

  const inputs = document.querySelectorAll('#variableFields input');
  let result = template;

  inputs.forEach((input) => {
    const varName = input.getAttribute('data-varname');
    const value = input.value.trim() || `{{${varName}}}`;
    const pattern = new RegExp(`\\{\\{\\s*${escapeRegex(varName)}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, value);
  });

  document.getElementById('outputText').value = result;
  document.getElementById('resultsContainer').style.display = 'block';
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function copyOutput() {
  const output = document.getElementById('outputText');
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
