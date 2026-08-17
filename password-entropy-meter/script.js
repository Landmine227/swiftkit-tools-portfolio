const COMMON_PASSWORDS = new Set([
  'password','123456','123456789','qwerty','12345678','111111','1234567','123123',
  'qwerty123','1q2w3e','1234567890','dragon','iloveyou','monkey','letmein','football',
  'admin','welcome','login','abc123','starwars','123321','password1','michael',
  'trustno1','master','sunshine','princess','azerty','000000','freedom','whatever',
  'passw0rd','superman','batman','shadow','michelle','jennifer','hunter','buster',
  'soccer','harley','ranger','jordan','jessica','joshua','hockey','killer','george',
  'andrew','charlie','thomas','robert','tigger','cookie','mustang','daniel','taylor',
  'matthew','computer','dallas','hannah','cheese','austin','william','orange','purple',
  'ashley','amanda','nicole','richard','samantha','summer','ginger','banana','pepper',
  'hello123','iloveyou1','welcome1','letmein1','qazwsx','zaq1zaq1','asdfghjkl'
]);

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];

function getPoolSize(password) {
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 33;
  return pool || 1;
}

function findRepeatedRuns(password) {
  let wasted = 0;
  let found = false;
  let i = 0;
  while (i < password.length) {
    let j = i;
    while (j < password.length && password[j] === password[i]) j++;
    const runLen = j - i;
    if (runLen >= 3) { wasted += runLen - 1; found = true; }
    i = j;
  }
  return { wasted, found };
}

function findSequentialRuns(password) {
  let wasted = 0;
  let found = false;
  const lower = password.toLowerCase();
  let i = 0;
  while (i < lower.length - 1) {
    let j = i;
    const diff = lower.charCodeAt(i + 1) - lower.charCodeAt(i);
    if (diff === 1 || diff === -1) {
      while (j < lower.length - 1 && (lower.charCodeAt(j + 1) - lower.charCodeAt(j)) === diff) j++;
      const runLen = j - i + 1;
      if (runLen >= 3) { wasted += runLen - 1; found = true; }
      i = j + 1;
    } else {
      i++;
    }
  }
  return { wasted, found };
}

function findKeyboardSequences(password) {
  const lower = password.toLowerCase();
  let wasted = 0;
  let found = false;
  KEYBOARD_ROWS.forEach((row) => {
    const reversed = row.split('').reverse().join('');
    [row, reversed].forEach((seq) => {
      for (let len = Math.min(8, seq.length); len >= 4; len--) {
        for (let start = 0; start <= seq.length - len; start++) {
          const chunk = seq.slice(start, start + len);
          if (lower.includes(chunk)) { wasted += len - 1; found = true; }
        }
      }
    });
  });
  return { wasted: Math.min(wasted, password.length), found };
}

function isCommonPasswordVariant(password) {
  const stripped = password.toLowerCase().replace(/[\d!@#$%^&*]+$/, '');
  return COMMON_PASSWORDS.has(password.toLowerCase()) || COMMON_PASSWORDS.has(stripped);
}

function estimateEntropy(password) {
  const warnings = [];
  if (!password) return { bits: 0, warnings };

  if (isCommonPasswordVariant(password)) {
    warnings.push('This is one of the most commonly used passwords — attackers try these first.');
    return { bits: Math.min(6, password.length * 0.5), warnings };
  }

  const pool = getPoolSize(password);
  const baseBits = password.length * Math.log2(pool);

  const repeated = findRepeatedRuns(password);
  const sequential = findSequentialRuns(password);
  const keyboard = findKeyboardSequences(password);

  if (repeated.found) warnings.push('Contains a repeated character run (like "aaa" or "111").');
  if (sequential.found) warnings.push('Contains a sequential run (like "abc" or "123").');
  if (keyboard.found) warnings.push('Contains a keyboard-adjacent pattern (like "qwerty" or "asdf").');
  if (password.length < 12) warnings.push('Shorter passwords are easier to brute-force — length matters more than complexity.');

  const totalWaste = repeated.wasted + sequential.wasted + keyboard.wasted;
  const wastedBits = Math.min(baseBits * 0.85, totalWaste * Math.log2(pool));
  const bits = Math.max(0, baseBits - wastedBits);

  if (warnings.length === 0) warnings.push('No common weaknesses detected in this check.');

  return { bits: Math.round(bits * 10) / 10, warnings };
}

function rateEntropy(bits) {
  if (bits < 28) return { label: 'Very Weak', color: '#ef4444', pct: 15 };
  if (bits < 36) return { label: 'Weak', color: '#f59e0b', pct: 35 };
  if (bits < 60) return { label: 'Reasonable', color: '#eab308', pct: 60 };
  if (bits < 128) return { label: 'Strong', color: '#22c55e', pct: 85 };
  return { label: 'Very Strong', color: '#16a34a', pct: 100 };
}

function humanTime(seconds) {
  if (seconds < 1) return 'instantly';
  const units = [
    ['centuries', 3153600000], ['years', 31536000], ['days', 86400],
    ['hours', 3600], ['minutes', 60], ['seconds', 1]
  ];
  for (const [name, secs] of units) {
    if (seconds >= secs) return (seconds / secs).toFixed(1) + ' ' + name;
  }
  return seconds.toFixed(1) + ' seconds';
}

function crackTimeSeconds(bits) {
  return Math.pow(2, bits) / 10_000_000_000 / 2;
}

function checkPassword() {
  const password = document.getElementById('passwordInput').value;
  const resultsContainer = document.getElementById('resultsContainer');

  if (!password) {
    resultsContainer.style.display = 'none';
    return;
  }
  resultsContainer.style.display = 'block';

  const { bits, warnings } = estimateEntropy(password);
  const rating = rateEntropy(bits);

  document.getElementById('bitsDisplay').textContent = bits + ' bits';
  document.getElementById('bitsDisplay').style.color = rating.color;
  document.getElementById('ratingLabel').textContent = rating.label;

  const gauge = document.getElementById('strengthGauge');
  gauge.style.width = rating.pct + '%';
  gauge.style.background = rating.color;

  document.getElementById('crackTimeDisplay').textContent =
    `Estimated crack time at 10 billion guesses/sec: ${humanTime(crackTimeSeconds(bits))}`;

  const warningsList = document.getElementById('warningsList');
  warningsList.innerHTML = '';
  warnings.forEach((w) => {
    const row = document.createElement('div');
    row.className = 'metadata-item';
    row.innerHTML = `<span class="meta-label">${w}</span>`;
    warningsList.appendChild(row);
  });
}

function toggleVisibility() {
  const input = document.getElementById('passwordInput');
  const btn = document.getElementById('toggleVisibility');
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}
