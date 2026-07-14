let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: { x: number; y: number; vx: number; vy: number; life: number; size: number; color: string }[] = [];
let raf: number | null = null;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "999";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  window.addEventListener("resize", () => {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

function tick() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.life -= 0.02;
    ctx!.globalAlpha = Math.max(p.life, 0);
    ctx!.fillStyle = p.color;
    ctx!.beginPath();
    ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx!.fill();
  });
  particles = particles.filter((p) => p.life > 0);
  ctx.globalAlpha = 1;
  raf = particles.length ? requestAnimationFrame(tick) : null;
}

export function sparkleBurst(x: number, y: number, color = "#ff88a6") {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  ensureCanvas();
  for (let i = 0; i < 16; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 2.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1,
      size: 2 + Math.random() * 3,
      color,
    });
  }
  if (!raf) tick();
}
