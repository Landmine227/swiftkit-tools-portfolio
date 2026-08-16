function updateEstimate() {
  const views = parseInt(document.getElementById('viewsSlider').value, 10);
  const qualifiedRate = parseInt(document.getElementById('qualifiedSlider').value, 10);
  const rpmTier = document.querySelector('input[name="rpmTier"]:checked').value;

  document.getElementById('viewsValue').textContent = views.toLocaleString();
  document.getElementById('qualifiedValue').textContent = qualifiedRate + '%';

  document.querySelectorAll('.rpm-option').forEach((label) => {
    const input = label.querySelector('input');
    label.classList.toggle('selected', input.checked);
  });

  const rpmLow = rpmTier === 'highcpm' ? 1.00 : 0.40;
  const rpmHigh = rpmTier === 'highcpm' ? 1.50 : 1.00;

  const qualifiedViews = views * (qualifiedRate / 100);
  const low = (qualifiedViews / 1000) * rpmLow;
  const high = (qualifiedViews / 1000) * rpmHigh;

  document.getElementById('estimateRange').textContent =
    `$${low.toFixed(2)} – $${high.toFixed(2)}`;
}

document.addEventListener('DOMContentLoaded', updateEstimate);
