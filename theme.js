function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    document.getElementById('themeIcon').textContent = '🌙';
    document.getElementById('themeLabel').textContent = 'Dark mode';
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('themeIcon').textContent = '☀️';
    document.getElementById('themeLabel').textContent = 'Light mode';
  }
}
function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  localStorage.setItem('swiftkit-theme', next);
  applyTheme(next);
}
(function initTheme() {
  const saved = localStorage.getItem('swiftkit-theme');
  applyTheme(saved || 'dark');
})();
