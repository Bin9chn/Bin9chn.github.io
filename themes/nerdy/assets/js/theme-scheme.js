(() => {
  const root = document.documentElement;
  let storedTheme = null;

  try {
    storedTheme = localStorage.getItem('theme');
  } catch (_) {
    // Ignore storage errors so theme boot never blocks rendering.
  }

  // A first visit always starts on the light theme, whatever the OS preference is.
  // Once the visitor flips the toggle, that choice is stored and wins from then on.
  const dark = storedTheme === 'dark';

  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
})();
