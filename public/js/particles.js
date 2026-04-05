(() => {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], mouse = { x: -999, y: -999 };

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function isLight() { return document.documentElement.dataset.theme === 'light'; }

  class Particle {
    constructor() { this.reset(true); }
    reset(initial) {
      this.x = Math.random() * W;
      this.y = initial ? Math.random() * H : H + 10;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = -(Math.random() * 0.4 + 0.1);
      this.life = 0;
      this.maxLife = Math.random() * 400 + 200;
      this.size = Math.random() * 1.5 + 0.5;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life++;
      // Mouse repulsion
      const dx = this.x - mouse.x, dy = this.y - mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 100) {
        const force = (100 - dist) / 100 * 0.5;
        this.vx += dx / dist * force;
        this.vy += dy / dist * force;
        this.vx *= 0.97;
        this.vy *= 0.97;
      }
      if (this.life > this.maxLife || this.y < -10) this.reset(false);
    }
    draw() {
      const t = this.life / this.maxLife;
      const alpha = Math.sin(t * Math.PI) * (isLight() ? 0.12 : 0.35);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = isLight() ? `rgba(0,100,60,${alpha})` : `rgba(0,255,140,${alpha})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 80; i++) particles.push(new Particle());

  function loop() {
    ctx.clearRect(0, 0, W, H);
    // Draw connecting lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          const alpha = (1 - d/100) * (isLight() ? 0.06 : 0.1);
          ctx.strokeStyle = isLight() ? `rgba(0,100,60,${alpha})` : `rgba(0,255,140,${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }
  loop();

  document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  // Click ripple
  document.addEventListener('click', e => {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    const size = 60;
    ripple.style.cssText = `
      width:${size}px; height:${size}px;
      left:${e.clientX - size/2}px; top:${e.clientY - size/2}px;
      background: ${isLight() ? 'rgba(0,100,60,0.25)' : 'rgba(0,255,140,0.2)'};
    `;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);

    // Burst particles at click
    for (let i = 0; i < 5; i++) {
      const p = new Particle();
      p.x = e.clientX + (Math.random()-0.5)*20;
      p.y = e.clientY + (Math.random()-0.5)*20;
      p.vy = -(Math.random() * 1.5 + 0.5);
      p.vx = (Math.random()-0.5) * 1.5;
      p.life = 0;
      p.maxLife = 80 + Math.random() * 60;
      particles.push(p);
      if (particles.length > 120) particles.shift();
    }
  });

  // Dropzone drag effects
  document.querySelectorAll('.dropzone').forEach(dz => {
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => { dz.classList.remove('drag-over'); });
  });
})();
