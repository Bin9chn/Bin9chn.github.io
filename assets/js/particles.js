/* 全站背景：柔光粒子 + 玻璃色斑。
 * 画布与色斑都固定在 z-index:0，页面内容容器是 z-10，
 * 所以粒子永远垫在内容下面；玻璃卡片用 backdrop-filter 把它模糊透出。
 * prefers-reduced-motion 时只画一帧静态点阵；标签页隐藏时暂停动画。 */
(() => {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  /* 柔光色斑：给玻璃面板和粒子提供可模糊的色彩底。 */
  const blobs = document.createElement('div');
  blobs.className = 'nerdy-glass-blobs';
  blobs.setAttribute('aria-hidden', 'true');

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;';

  document.body.prepend(blobs, canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let dots = [];
  let raf = 0;
  let running = false;
  const mouse = { x: -1e4, y: -1e4 };
  const LINK = 120;
  const LINK_MOUSE = 150;

  function seed() {
    const target = Math.min(90, Math.round((w * h) / 16000));
    dots = Array.from({ length: target }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1 + Math.random() * 1.4,
      a: 0.22 + Math.random() * 0.38,
    }));
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    if (reduced) draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const p of dots) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(103, 232, 249, ' + p.a + ')';
      ctx.fill();
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i];
      for (let j = i + 1; j < dots.length; j++) {
        const b = dots[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK * LINK) {
          const o = (1 - Math.sqrt(d2) / LINK) * 0.15;
          ctx.strokeStyle = 'rgba(103, 232, 249, ' + o + ')';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      const mdx = a.x - mouse.x;
      const mdy = a.y - mouse.y;
      const md2 = mdx * mdx + mdy * mdy;
      if (md2 < LINK_MOUSE * LINK_MOUSE) {
        const o = (1 - Math.sqrt(md2) / LINK_MOUSE) * 0.25;
        ctx.strokeStyle = 'rgba(165, 243, 252, ' + o + ')';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
    }
  }

  function loop() {
    if (!running) return;
    for (const p of dots) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = w + 10;
      else if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10;
      else if (p.y > h + 10) p.y = -10;
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (reduced || running) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  window.addEventListener('resize', resize);
  window.addEventListener(
    'pointermove',
    (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    },
    { passive: true }
  );
  document.documentElement.addEventListener('pointerleave', () => {
    mouse.x = -1e4;
    mouse.y = -1e4;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  resize();
  start();
})();
