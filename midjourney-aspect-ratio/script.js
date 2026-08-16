function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

function simplifyRatio(w, h) {
  const wStr = w.toString();
  const hStr = h.toString();
  const wDec = (wStr.split('.')[1] || '').length;
  const hDec = (hStr.split('.')[1] || '').length;
  const scale = Math.pow(10, Math.max(wDec, hDec));
  let W = Math.round(w * scale);
  let H = Math.round(h * scale);
  const g = gcd(W, H);
  W = W / g;
  H = H / g;
  return { W, H };
}

function copyRatio(ratioString, cardEl) {
  navigator.clipboard.writeText(ratioString).then(() => {
    showCopiedBadge(cardEl);
  }).catch(() => {
    alert('Could not copy automatically. Here is the code:\n' + ratioString);
  });
}

function showCopiedBadge(cardEl) {
  const badge = cardEl.querySelector('.copied-badge');
  if (!badge) return;
  badge.classList.add('show');
  clearTimeout(cardEl._copyTimeout);
  cardEl._copyTimeout = setTimeout(() => badge.classList.remove('show'), 1200);
}

function updateCustomRatio() {
  const wInput = document.getElementById('widthInput');
  const hInput = document.getElementById('heightInput');
  const w = parseFloat(wInput.value);
  const h = parseFloat(hInput.value);

  if (!w || !h || w <= 0 || h <= 0) return;

  const { W, H } = simplifyRatio(w, h);
  const codeEl = document.getElementById('customCode');
  codeEl.textContent = `--ar ${W}:${H}`;

  const shape = document.getElementById('customShape');
  shape.style.aspectRatio = `${W} / ${H}`;
  if (W >= H) {
    shape.style.width = '100%';
    shape.style.height = '';
  } else {
    shape.style.height = '100%';
    shape.style.width = '';
  }
}

function copyCustom() {
  const codeEl = document.getElementById('customCode');
  const btn = document.getElementById('customCopyBtn');
  navigator.clipboard.writeText(codeEl.textContent).then(() => {
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 1200);
  }).catch(() => {
    alert('Could not copy automatically. Here is the code:\n' + codeEl.textContent);
  });
}
