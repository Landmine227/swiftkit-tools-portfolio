const CLAUSE_START = new Set([
  'SELECT','FROM','WHERE','HAVING','LIMIT','OFFSET','SET','VALUES','UPDATE',
  'WITH','UNION','RETURNING','GROUP BY','ORDER BY','UNION ALL','INSERT INTO','DELETE FROM'
]);
const JOIN_KEYWORDS = new Set([
  'JOIN','INNER JOIN','LEFT JOIN','RIGHT JOIN','FULL JOIN','CROSS JOIN',
  'LEFT OUTER JOIN','RIGHT OUTER JOIN','FULL OUTER JOIN'
]);
const UPPERCASE_KEYWORDS = new Set([
  'SELECT','FROM','WHERE','AND','OR','NOT','IN','IS','NULL','LIKE','BETWEEN','AS','ON',
  'JOIN','INNER','LEFT','RIGHT','FULL','OUTER','CROSS','GROUP','BY','ORDER','HAVING',
  'LIMIT','OFFSET','UNION','ALL','DISTINCT','INSERT','INTO','VALUES','UPDATE','SET',
  'DELETE','CREATE','TABLE','ALTER','DROP','PRIMARY','KEY','FOREIGN','REFERENCES',
  'DEFAULT','CASE','WHEN','THEN','ELSE','END','EXISTS','ASC','DESC','WITH','RETURNING',
  'TRUE','FALSE'
]);
const MULTI_WORD = [
  'LEFT OUTER JOIN','RIGHT OUTER JOIN','FULL OUTER JOIN',
  'INNER JOIN','LEFT JOIN','RIGHT JOIN','FULL JOIN','CROSS JOIN',
  'GROUP BY','ORDER BY','UNION ALL','INSERT INTO','DELETE FROM'
].map(p => p.split(' '));

function tokenize(sql) {
  const tokens = [];
  let i = 0;
  const n = sql.length;
  let sawSpaceBefore = true;

  while (i < n) {
    const ch = sql[i];
    if (/\s/.test(ch)) { sawSpaceBefore = true; i++; continue; }

    if (ch === '-' && sql[i+1] === '-') {
      let start = i;
      while (i < n && sql[i] !== '\n') i++;
      tokens.push({ type: 'COMMENT', value: sql.slice(start, i), spaceBefore: sawSpaceBefore });
      sawSpaceBefore = false; continue;
    }
    if (ch === '/' && sql[i+1] === '*') {
      let start = i; i += 2;
      while (i < n && !(sql[i] === '*' && sql[i+1] === '/')) i++;
      i += 2;
      tokens.push({ type: 'COMMENT', value: sql.slice(start, Math.min(i, n)), spaceBefore: sawSpaceBefore });
      sawSpaceBefore = false; continue;
    }
    if (ch === "'") {
      let start = i; i++;
      while (i < n) {
        if (sql[i] === "'" && sql[i+1] === "'") { i += 2; continue; }
        if (sql[i] === "'") { i++; break; }
        i++;
      }
      tokens.push({ type: 'STRING', value: sql.slice(start, i), spaceBefore: sawSpaceBefore });
      sawSpaceBefore = false; continue;
    }
    if (ch === '"' || ch === '`') {
      const quote = ch; let start = i; i++;
      while (i < n && sql[i] !== quote) i++;
      i++;
      tokens.push({ type: 'IDENT', value: sql.slice(start, i), spaceBefore: sawSpaceBefore });
      sawSpaceBefore = false; continue;
    }
    if (ch === '(') { tokens.push({ type: 'LPAREN', value: '(', spaceBefore: sawSpaceBefore }); sawSpaceBefore = false; i++; continue; }
    if (ch === ')') { tokens.push({ type: 'RPAREN', value: ')', spaceBefore: sawSpaceBefore }); sawSpaceBefore = false; i++; continue; }
    if (ch === ',') { tokens.push({ type: 'COMMA', value: ',', spaceBefore: sawSpaceBefore }); sawSpaceBefore = false; i++; continue; }
    if (ch === ';') { tokens.push({ type: 'SEMICOLON', value: ';', spaceBefore: sawSpaceBefore }); sawSpaceBefore = false; i++; continue; }

    if (/[A-Za-z0-9_.$]/.test(ch)) {
      let start = i;
      while (i < n && /[A-Za-z0-9_.$]/.test(sql[i])) i++;
      tokens.push({ type: 'WORD', value: sql.slice(start, i), spaceBefore: sawSpaceBefore });
      sawSpaceBefore = false; continue;
    }

    let start = i;
    while (i < n && !/[\s(),;'"`A-Za-z0-9_.$]/.test(sql[i])) i++;
    if (i === start) i++;
    tokens.push({ type: 'OP', value: sql.slice(start, i), spaceBefore: sawSpaceBefore });
    sawSpaceBefore = false;
  }
  return tokens;
}

function mergeMultiWordKeywords(tokens) {
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = null;
    for (const phrase of MULTI_WORD) {
      if (i + phrase.length <= tokens.length) {
        let ok = true;
        for (let j = 0; j < phrase.length; j++) {
          const t = tokens[i + j];
          if (t.type !== 'WORD' || t.value.toUpperCase() !== phrase[j]) { ok = false; break; }
        }
        if (ok) { matched = phrase; break; }
      }
    }
    if (matched) {
      out.push({ type: 'KEYWORD', value: matched.join(' '), spaceBefore: tokens[i].spaceBefore });
      i += matched.length;
    } else {
      out.push(tokens[i]); i++;
    }
  }
  return out;
}

function formatSQL(sqlInput) {
  let tokens = tokenize(sqlInput);
  tokens = mergeMultiWordKeywords(tokens);

  const INDENT = '  ';
  let output = '';
  let lastEmittedType = null;
  let baseDepth = 0;
  let currentIndent = 0;
  let parenDepth = 0;
  const parenTypeStack = [];
  const caseStack = [];
  const betweenStack = [];
  let atLineStart = true;

  function newline(indentLevel) {
    output += '\n' + INDENT.repeat(Math.max(0, indentLevel));
    currentIndent = indentLevel;
    atLineStart = true;
  }

  function appendInline(text, forceNoSpace) {
    const noSpace = forceNoSpace || lastEmittedType === 'LPAREN';
    if (!atLineStart && output.length > 0 && !noSpace) {
      output += ' ';
    }
    output += text;
    atLineStart = false;
  }

  for (let idx = 0; idx < tokens.length; idx++) {
    const tok = tokens[idx];
    const upper = (tok.type === 'WORD' || tok.type === 'KEYWORD') ? tok.value.toUpperCase() : null;

    if (tok.type === 'RPAREN') {
      parenDepth = Math.max(0, parenDepth - 1);
      const kind = parenTypeStack.pop();
      if (kind === 'group') baseDepth = Math.max(0, baseDepth - 1);
      appendInline(')', true);
      lastEmittedType = tok.type;
      continue;
    }

    if (tok.type === 'LPAREN') {
      const isFuncCall = lastEmittedType === 'WORD' && tok.spaceBefore === false;
      appendInline('(', tok.spaceBefore === false);
      parenDepth++;
      if (isFuncCall) {
        parenTypeStack.push('func');
      } else {
        parenTypeStack.push('group');
        baseDepth++;
      }
      lastEmittedType = tok.type;
      continue;
    }

    if (tok.type === 'COMMA') {
      output += ',';
      atLineStart = false;
      if (parenDepth === 0) {
        newline(baseDepth + 1);
      }
      lastEmittedType = tok.type;
      continue;
    }

    if (tok.type === 'SEMICOLON') {
      output += ';';
      lastEmittedType = tok.type;
      continue;
    }

    if (upper === 'BETWEEN') {
      betweenStack.push(true);
      appendInline('BETWEEN');
      lastEmittedType = 'WORD';
      continue;
    }

    if (upper === 'AND' && parenDepth === 0) {
      if (betweenStack.length > 0) {
        betweenStack.pop();
        appendInline('AND');
      } else {
        newline(baseDepth + 1);
        appendInline('AND');
      }
      lastEmittedType = 'WORD';
      continue;
    }

    if (upper === 'OR' && parenDepth === 0) {
      newline(baseDepth + 1);
      appendInline('OR');
      lastEmittedType = 'WORD';
      continue;
    }

    if (upper === 'ON') {
      newline(baseDepth + 1);
      appendInline('ON');
      lastEmittedType = 'WORD';
      continue;
    }

    if (upper === 'CASE') {
      caseStack.push(currentIndent);
      appendInline('CASE');
      lastEmittedType = 'WORD';
      continue;
    }
    if (upper === 'WHEN' || upper === 'ELSE') {
      const lvl = caseStack.length ? caseStack[caseStack.length - 1] + 1 : baseDepth + 1;
      newline(lvl);
      appendInline(upper);
      lastEmittedType = 'WORD';
      continue;
    }
    if (upper === 'END') {
      const lvl = caseStack.length ? caseStack.pop() : baseDepth;
      newline(lvl);
      appendInline('END');
      lastEmittedType = 'WORD';
      continue;
    }
    if (upper === 'THEN') {
      appendInline('THEN');
      lastEmittedType = 'WORD';
      continue;
    }

    if (tok.type === 'KEYWORD' && (CLAUSE_START.has(upper) || JOIN_KEYWORDS.has(upper))) {
      if (output.length > 0) newline(baseDepth);
      appendInline(upper);
      lastEmittedType = 'KEYWORD';
      continue;
    }
    if (tok.type === 'WORD' && (CLAUSE_START.has(upper) || JOIN_KEYWORDS.has(upper))) {
      if (output.length > 0) newline(baseDepth);
      appendInline(upper);
      lastEmittedType = 'WORD';
      continue;
    }

    if ((tok.type === 'WORD') && UPPERCASE_KEYWORDS.has(upper)) {
      appendInline(upper);
      lastEmittedType = 'WORD';
      continue;
    }

    if (tok.type === 'KEYWORD') {
      appendInline(tok.value);
      lastEmittedType = 'KEYWORD';
      continue;
    }

    appendInline(tok.value, tok.type === 'OP' && (tok.value === '.' ));
    lastEmittedType = tok.type;
  }

  return output.trim();
}

function formatQuery() {
  const input = document.getElementById('sqlInput').value;
  if (!input.trim()) {
    alert('Paste a SQL query first.');
    return;
  }
  const formatted = formatSQL(input);
  document.getElementById('sqlOutput').value = formatted;
  document.getElementById('resultsContainer').style.display = 'block';
}

function copyOutput() {
  const output = document.getElementById('sqlOutput');
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
