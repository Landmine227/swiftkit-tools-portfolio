function formatCurrency(value) {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateCalculator() {
  const hourlyRate = parseFloat(document.getElementById('hourlyRate').value) || 0;
  const hours = parseFloat(document.getElementById('hoursPerMonth').value) || 0;
  const scopeCreepPct = parseFloat(document.getElementById('scopeCreepSlider').value);
  const overhead = parseFloat(document.getElementById('overheadInput').value) || 0;
  const taxPct = parseFloat(document.getElementById('taxSlider').value);

  document.getElementById('scopeCreepValue').textContent = scopeCreepPct + '%';
  document.getElementById('taxValue').textContent = taxPct + '%';
  document.getElementById('scopeCreepLabelOut').textContent = `+ Scope Creep Buffer (${scopeCreepPct}%)`;
  document.getElementById('taxLabelOut').textContent = `+ Tax Set-Aside (${taxPct}%)`;

  const baseValue = hourlyRate * hours;
  const scopeCreepAmount = baseValue * (scopeCreepPct / 100);
  const subtotal = baseValue + scopeCreepAmount + overhead;

  const taxDivisor = 1 - (taxPct / 100);
  const total = taxDivisor > 0 ? subtotal / taxDivisor : subtotal;
  const taxSetAside = total - subtotal;

  document.getElementById('baseValueOut').textContent = formatCurrency(baseValue);
  document.getElementById('scopeCreepOut').textContent = formatCurrency(scopeCreepAmount);
  document.getElementById('overheadOut').textContent = formatCurrency(overhead);
  document.getElementById('subtotalOut').textContent = formatCurrency(subtotal);
  document.getElementById('taxOut').textContent = formatCurrency(taxSetAside);
  document.getElementById('totalOut').textContent = formatCurrency(total);
}

document.addEventListener('DOMContentLoaded', updateCalculator);
