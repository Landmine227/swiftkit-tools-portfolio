function extractCode() {
  const input = document.getElementById('markdownInput').value;
  const filesList = document.getElementById('filesList');
  const resultsContainer = document.getElementById('resultsContainer');
  filesList.innerHTML = '';
  const regex = /```([a-zA-Z0-9+#-]+)?\s*([\s\S]*?)\n```/g;
  let match; let count = 0;
  while ((match = regex.exec(input)) !== null) {
    count++;
    const lang = match[1] || 'txt';
    const code = match[2].trim();
    let extension = lang.toLowerCase();
    if (extension === 'javascript') extension = 'js';
    if (extension === 'typescript') extension = 'ts';
    if (extension === 'python') extension = 'py';
    const fileName = `extracted_asset_${count}.${extension}`;
    const fileCard = document.createElement('div');
    fileCard.className = 'file-card';
    fileCard.innerHTML = `
      <div class="file-info">
        <span class="file-name">${fileName}</span>
        <span>Format: ${lang.toUpperCase()}</span>
      </div>
      <pre><code>${escapeHtml(code)}</code></pre>
      <button class="download-btn" onclick="downloadBlob('${btoa(unescape(encodeURIComponent(code)))}', '${fileName}')">Download File</button>
    `;
    filesList.appendChild(fileCard);
  }
  if (count > 0) {
    resultsContainer.style.display = 'block';
  } else {
    alert('No valid markdown code blocks found. Make sure your text contains code wrapped inside triple backticks.');
    resultsContainer.style.display = 'none';
  }
}

function downloadBlob(base64Data, fileName) {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], {type: "application/octet-stream"});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
