(() => {
  const root = document.documentElement;
  let storedTheme = null;

  try {
    storedTheme = localStorage.getItem('theme');
  } catch (_) {
    // Ignore storage errors so theme boot never blocks rendering.
  }

  // 深色是全站默认主色调：只有访客显式选过浅色（storedTheme === 'light'）才会
  // 以浅色打开。切换按钮照旧把选择写进 localStorage，两边语义一致。
  const dark = storedTheme !== 'light';

  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
})();
