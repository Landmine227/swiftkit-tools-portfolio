function formatDate(date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function updateRunway() {
  const cash = parseFloat(document.getElementById('cashInput').value) || 0;
  const mrr = parseFloat(document.getElementById('mrrInput').value) || 0;
  const expenses = parseFloat(document.getElementById('expensesInput').value) || 0;

  const netBurn = expenses - mrr;

  const dateEl = document.getElementById('runwayDate');
  const monthsEl = document.getElementById('runwayMonths');
  const badgeEl = document.getElementById('runwayBadge');
  const gaugeEl = document.getElementById('runwayGaugeFill');

  if (netBurn <= 0) {
    dateEl.textContent = "You're profitable";
    monthsEl.textContent = 'Revenue covers expenses — no runway limit at current numbers.';
    badgeEl.textContent = 'Healthy';
    badgeEl.style.background = '#22c55e';
    gaugeEl.style.width = '100%';
    gaugeEl.style.background = '#22c55e';
    return;
  }

  const monthsRemaining = cash <= 0 ? 0 : cash / netBurn;
  const daysRemaining = Math.max(0, Math.round(monthsRemaining * 30.4368));

  const cashOutDate = new Date();
  cashOutDate.setDate(cashOutDate.getDate() + daysRemaining);

  dateEl.textContent = formatDate(cashOutDate);

  const wholeMonths = Math.floor(monthsRemaining);
  const remDays = Math.round((monthsRemaining - wholeMonths) * 30.4368);
  monthsEl.textContent = `${wholeMonths} months, ${remDays} days of runway at $${netBurn.toLocaleString()}/mo net burn`;

  let color, label;
  if (monthsRemaining < 3) {
    color = '#ef4444'; label = 'Critical';
  } else if (monthsRemaining < 6) {
    color = '#f59e0b'; label = 'Caution';
  } else {
    color = '#22c55e'; label = 'Healthy';
  }

  badgeEl.textContent = label;
  badgeEl.style.background = color;
  gaugeEl.style.background = color;
  gaugeEl.style.width = Math.min((monthsRemaining / 24) * 100, 100) + '%';
}

document.addEventListener('DOMContentLoaded', updateRunway);
