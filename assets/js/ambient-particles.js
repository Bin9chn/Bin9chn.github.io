(() => {
  const canvas = document.createElement("canvas");
  canvas.id = "ambient-particles";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const context = canvas.getContext("2d");
  if (!context) return;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const palette = ["88, 191, 255", "66, 224, 164", "245, 184, 90"];
  const pointer = { x: 0, y: 0, active: false };
  let width = 0;
  let height = 0;
  let particles = [];
  let frameId = 0;
  let lastFrame = 0;

  const createParticle = () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.16,
    vy: (Math.random() - 0.5) * 0.16,
    radius: 0.6 + Math.random() * 1.1,
    alpha: 0.18 + Math.random() * 0.45,
    color: palette[Math.floor(Math.random() * palette.length)],
  });

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const density = width < 768 ? 22000 : 15500;
    const count = Math.min(82, Math.max(24, Math.round((width * height) / density)));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = Array.from({ length: count }, createParticle);

    if (motionQuery.matches) draw(0, true);
  };

  const draw = (time, staticFrame = false) => {
    context.clearRect(0, 0, width, height);
    const maxDistance = width < 768 ? 92 : 128;

    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];

      if (!staticFrame && lastFrame) {
        particle.x += particle.vx * (time - lastFrame) * 0.06;
        particle.y += particle.vy * (time - lastFrame) * 0.06;
      }

      if (particle.x < -10) particle.x = width + 10;
      if (particle.x > width + 10) particle.x = -10;
      if (particle.y < -10) particle.y = height + 10;
      if (particle.y > height + 10) particle.y = -10;

      context.beginPath();
      context.fillStyle = `rgba(${particle.color}, ${particle.alpha})`;
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();

      for (let j = i + 1; j < particles.length; j += 1) {
        const other = particles[j];
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distance = Math.hypot(dx, dy);
        if (distance > maxDistance) continue;

        context.beginPath();
        context.strokeStyle = `rgba(88, 191, 255, ${(1 - distance / maxDistance) * 0.1})`;
        context.lineWidth = 0.6;
        context.moveTo(particle.x, particle.y);
        context.lineTo(other.x, other.y);
        context.stroke();
      }

      if (pointer.active) {
        const pointerDistance = Math.hypot(particle.x - pointer.x, particle.y - pointer.y);
        if (pointerDistance < 150) {
          context.beginPath();
          context.strokeStyle = `rgba(66, 224, 164, ${(1 - pointerDistance / 150) * 0.15})`;
          context.lineWidth = 0.7;
          context.moveTo(particle.x, particle.y);
          context.lineTo(pointer.x, pointer.y);
          context.stroke();
        }
      }
    }

    lastFrame = time;
    if (!staticFrame && !motionQuery.matches) {
      frameId = window.requestAnimationFrame(draw);
    }
  };

  const stop = () => {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const start = () => {
    stop();
    lastFrame = 0;
    if (motionQuery.matches) {
      draw(0, true);
    } else {
      frameId = window.requestAnimationFrame(draw);
    }
  };

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resize();
      start();
    }, 160);
  });

  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }, { passive: true });

  window.addEventListener("pointerleave", () => {
    pointer.active = false;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  window.addEventListener("pagehide", stop, { once: true });
  motionQuery.addEventListener?.("change", start);

  resize();
  start();
})();
