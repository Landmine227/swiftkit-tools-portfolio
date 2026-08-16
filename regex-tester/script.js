function explainRegex(pattern) {
  const entries = [];
  let i = 0;
  const n = pattern.length;
  let groupCounter = 0;
  const groupStack = [];

  function describeClassBody(body) {
    let negate = false;
    let s = body;
    if (s.startsWith('^')) { negate = true; s = s.slice(1); }
    const parts = [];
    let j = 0;
    while (j < s.length) {
      if (s[j] === '\\' && j + 1 < s.length) {
        const c = s[j + 1];
        const map = { d: 'digits', D: 'non-digits', w: 'word characters', W: 'non-word characters', s: 'whitespace', S: 'non-whitespace', n: 'newline', t: 'tab', r: 'carriage return' };
        parts.push(map[c] || ('literal "' + c + '"'));
        j += 2;
        continue;
      }
      if (j + 2 < s.length && s[j + 1] === '-' && s[j + 2] !== ']') {
        parts.push(s[j] + '-' + s[j + 2]);
        j += 3;
        continue;
      }
      parts.push('"' + s[j] + '"');
      j++;
    }
    const list = parts.join(', ');
    return negate ? `Any character NOT one of: ${list}` : `Any character that is one of: ${list}`;
  }

  function readQuantifierSuffix() {
    if (i >= n) return null;
    const c = pattern[i];
    if (c === '*' || c === '+' || c === '?') {
      i++;
      let lazy = false;
      if (pattern[i] === '?') { lazy = true; i++; }
      const map = { '*': 'zero or more times', '+': 'one or more times', '?': 'zero or one time (optional)' };
      return map[c] + (lazy ? ', as few times as possible (lazy)' : '');
    }
    if (c === '{') {
      const close = pattern.indexOf('}', i);
      if (close !== -1) {
        const inner = pattern.slice(i + 1, close);
        if (/^\d+(,\d*)?$/.test(inner)) {
          i = close + 1;
          let lazy = false;
          if (pattern[i] === '?') { lazy = true; i++; }
          let desc;
          if (inner.indexOf(',') === -1) desc = `exactly ${inner} times`;
          else {
            const [min, max] = inner.split(',');
            desc = max === '' ? `${min} or more times` : `between ${min} and ${max} times`;
          }
          return desc + (lazy ? ', as few times as possible (lazy)' : '');
        }
      }
    }
    return null;
  }

  function push(token, desc) {
    const q = readQuantifierSuffix();
    entries.push({ token, desc: q ? `${desc} — ${q}` : desc });
  }

  while (i < n) {
    const ch = pattern[i];

    if (ch === '\\') {
      const c = pattern[i + 1];
      if (c === undefined) { push('\\', 'Literal backslash'); i++; continue; }
      const start = i;
      if (/[1-9]/.test(c)) {
        let j = i + 1;
        while (j < n && /[0-9]/.test(pattern[j])) j++;
        const num = pattern.slice(i + 1, j);
        i = j;
        push(pattern.slice(start, i), `Backreference to capturing group #${num}`);
        continue;
      }
      if (c === 'k' && pattern[i + 2] === '<') {
        const close = pattern.indexOf('>', i + 3);
        if (close !== -1) {
          const name = pattern.slice(i + 3, close);
          i = close + 1;
          push(pattern.slice(start, i), `Backreference to named group "${name}"`);
          continue;
        }
      }
      const simple = {
        d: 'Digit (0-9)', D: 'Not a digit',
        w: 'Word character (letter, digit, or underscore)', W: 'Not a word character',
        s: 'Whitespace character', S: 'Not a whitespace character',
        b: 'Word boundary', B: 'Not a word boundary',
        n: 'Newline character', t: 'Tab character', r: 'Carriage return character', '0': 'Null character'
      };
      i += 2;
      if (simple[c] !== undefined) { push(pattern.slice(start, i), simple[c]); continue; }
      push(pattern.slice(start, i), `Literal "${c}" character`);
      continue;
    }

    if (ch === '[') {
      const close = pattern.indexOf(']', i + 1);
      const end = close === -1 ? n : close + 1;
      const body = pattern.slice(i + 1, close === -1 ? n : close);
      const raw = pattern.slice(i, end);
      i = end;
      const desc = describeClassBody(body);
      push(raw, desc);
      continue;
    }

    if (ch === '.') { i++; push('.', 'Any character (except line breaks, unless the "s" flag is set)'); continue; }
    if (ch === '^') { i++; entries.push({ token: '^', desc: 'Start of the string (or line, if the "m" flag is set)' }); continue; }
    if (ch === '$') { i++; entries.push({ token: '$', desc: 'End of the string (or line, if the "m" flag is set)' }); continue; }
    if (ch === '|') { i++; entries.push({ token: '|', desc: 'OR — matches the pattern before or after this' }); continue; }

    if (ch === '(') {
      let kind = 'capture';
      let label = '';
      let advance = 1;
      if (pattern[i + 1] === '?') {
        if (pattern[i + 2] === ':') { kind = 'noncap'; advance = 3; }
        else if (pattern[i + 2] === '=') { kind = 'lookahead'; advance = 3; }
        else if (pattern[i + 2] === '!') { kind = 'neglookahead'; advance = 3; }
        else if (pattern[i + 2] === '<' && pattern[i + 3] === '=') { kind = 'lookbehind'; advance = 4; }
        else if (pattern[i + 2] === '<' && pattern[i + 3] === '!') { kind = 'neglookbehind'; advance = 4; }
        else if (pattern[i + 2] === '<') {
          const close = pattern.indexOf('>', i + 3);
          label = pattern.slice(i + 3, close);
          advance = close - i + 1;
          kind = 'namedcap';
        }
      }
      const raw = pattern.slice(i, i + advance);
      i += advance;
      const descMap = {
        capture: () => { groupCounter++; return `Start of capturing group #${groupCounter}`; },
        noncap: () => `Start of non-capturing group`,
        namedcap: () => `Start of named capturing group "${label}"`,
        lookahead: () => `Start of positive lookahead (must be followed by this, but it isn't included in the match)`,
        neglookahead: () => `Start of negative lookahead (must NOT be followed by this)`,
        lookbehind: () => `Start of positive lookbehind (must be preceded by this, but it isn't included in the match)`,
        neglookbehind: () => `Start of negative lookbehind (must NOT be preceded by this)`
      };
      groupStack.push(kind);
      entries.push({ token: raw, desc: descMap[kind]() });
      continue;
    }

    if (ch === ')') {
      const kind = groupStack.pop() || 'capture';
      const labelMap = {
        capture: 'End of capturing group', noncap: 'End of non-capturing group', namedcap: 'End of named capturing group',
        lookahead: 'End of lookahead', neglookahead: 'End of negative lookahead',
        lookbehind: 'End of lookbehind', neglookbehind: 'End of negative lookbehind'
      };
      i++;
      push(')', labelMap[kind] || 'End of group');
      continue;
    }

    const start = i;
    i++;
    push(pattern[start], `Literal "${pattern[start]}" character`);
  }

  return entries;
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function getFlags() {
  let flags = '';
  if (document.getElementById('flagG').checked) flags += 'g';
  if (document.getElementById('flagI').checked) flags += 'i';
  if (document.getElementById('flagM').checked) flags += 'm';
  if (document.getElementById('flagS').checked) flags += 's';
  return flags;
}

function runRegexTest() {
  const patternInput = document.getElementById('patternInput');
  const pattern = patternInput.value;
  const testString = document.getElementById('testStringInput').value;
  const errorBox = document.getElementById('regexError');
  const highlightOut = document.getElementById('highlightOutput');
  const matchCountEl = document.getElementById('matchCount');
  const matchList = document.getElementById('matchList');
  const explainList = document.getElementById('explainList');
  const explainSection = document.getElementById('explainSection');

  errorBox.style.display = 'none';
  patternInput.classList.remove('invalid');

  if (!pattern) {
    highlightOut.innerHTML = '<span style="color:var(--text-muted);">Enter a pattern above to see matches highlighted here.</span>';
    matchCountEl.textContent = '';
    matchList.innerHTML = '';
    explainSection.style.display = 'none';
    return;
  }

  const userFlags = getFlags();
  let regex;
  try {
    regex = new RegExp(pattern, userFlags);
  } catch (e) {
    patternInput.classList.add('invalid');
    errorBox.textContent = 'Invalid pattern: ' + e.message;
    errorBox.style.display = 'block';
    highlightOut.innerHTML = '<span style="color:var(--text-muted);">Fix the pattern above to see matches.</span>';
    matchCountEl.textContent = '';
    matchList.innerHTML = '';
    return;
  }

  const highlightFlags = userFlags.includes('g') ? userFlags : userFlags + 'g';
  const highlightRegex = new RegExp(pattern, highlightFlags);

  let matches = [];
  try {
    matches = [...testString.matchAll(highlightRegex)];
  } catch (e) {
    matches = [];
  }

  let html = '';
  let lastIndex = 0;
  if (testString.length === 0) {
    highlightOut.innerHTML = '<span style="color:var(--text-muted);">Type a test string above to see matches highlighted here.</span>';
  } else if (matches.length === 0) {
    highlightOut.textContent = testString;
  } else {
    matches.forEach((m) => {
      if (m.index === undefined) return;
      html += escapeHtml(testString.slice(lastIndex, m.index));
      html += '<mark>' + escapeHtml(m[0]) + '</mark>';
      lastIndex = m.index + m[0].length;
      if (m[0].length === 0) lastIndex++;
    });
    html += escapeHtml(testString.slice(lastIndex));
    highlightOut.innerHTML = html;
  }

  matchCountEl.textContent = testString.length === 0 ? '' : `${matches.length} match${matches.length === 1 ? '' : 'es'} found`;
  matchList.innerHTML = '';
  matches.slice(0, 50).forEach((m, idx) => {
    const item = document.createElement('div');
    item.className = 'match-item';
    let groupsHtml = '';
    if (m.length > 1) {
      const groupTexts = [];
      for (let g = 1; g < m.length; g++) {
        groupTexts.push(`Group ${g}: "${m[g] !== undefined ? escapeHtml(m[g]) : ''}"`);
      }
      groupsHtml = `<div class="match-groups">${groupTexts.join(' &nbsp;•&nbsp; ')}</div>`;
    }
    if (m.groups) {
      const namedTexts = Object.entries(m.groups).map(([k, v]) => `${k}: "${v !== undefined ? escapeHtml(v) : ''}"`);
      if (namedTexts.length) groupsHtml += `<div class="match-groups">${namedTexts.join(' &nbsp;•&nbsp; ')}</div>`;
    }
    item.innerHTML = `<span class="match-main">Match ${idx + 1}: "${escapeHtml(m[0])}"</span> <span style="color:var(--text-muted);">at index ${m.index}</span>${groupsHtml}`;
    matchList.appendChild(item);
  });

  explainSection.style.display = 'block';
  explainList.innerHTML = '';
  try {
    const entries = explainRegex(pattern);
    entries.forEach((e) => {
      const row = document.createElement('div');
      row.className = 'explain-item';
      row.innerHTML = `<span class="explain-token">${escapeHtml(e.token)}</span><span class="explain-desc">${escapeHtml(e.desc)}</span>`;
      explainList.appendChild(row);
    });
  } catch (e) {
    explainList.innerHTML = '<div class="explain-item"><span class="explain-desc">Could not break down this pattern.</span></div>';
  }
}

document.addEventListener('DOMContentLoaded', runRegexTest);
