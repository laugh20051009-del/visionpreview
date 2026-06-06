const fs = require("fs");
const path = require("path");
const Module = require("module");

process.env.NODE_PATH = [
  "C:\\Users\\user\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules",
  "C:\\Users\\user\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\playwright@1.60.0\\node_modules",
  "C:\\Users\\user\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\playwright-core@1.60.0\\node_modules",
].join(";");
Module._initPaths();

const { chromium } = require("playwright");

const img1 = "C:/Users/user/Downloads/ChatGPT Image 2026년 6월 6일 오후 01_41_13.png";
const img2 = "C:/Users/user/Downloads/ChatGPT Image 2026년 6월 6일 오후 01_41_22.png";
const outPath = path.resolve(__dirname, "apple_zoom_spin_reveal.webm");

function toDataUrl(file) {
  const data = fs.readFileSync(file);
  return `data:image/png;base64,${data.toString("base64")}`;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const result = await page.evaluate(
    async ({ img1Data, img2Data }) => {
      const width = 1920;
      const height = 1080;
      const fps = 30;
      const duration = 6.2;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      document.body.appendChild(canvas);
      const ctx = canvas.getContext("2d", { alpha: false });

      const loadImage = (src) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });

      const [first, second] = await Promise.all([
        loadImage(img1Data),
        loadImage(img2Data),
      ]);

      const easeInOutCubic = (x) =>
        x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      const easeOutQuint = (x) => 1 - Math.pow(1 - x, 5);
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

      function coverDraw(img, scale = 1, rotation = 0, opacity = 1, dx = 0, dy = 0) {
        const base = Math.max(width / img.naturalWidth, height / img.naturalHeight) * scale;
        const w = img.naturalWidth * base;
        const h = img.naturalHeight * base;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(width / 2 + dx, height / 2 + dy);
        ctx.rotate(rotation);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }

      function vignette(amount) {
        const g = ctx.createRadialGradient(width / 2, height / 2, 260, width / 2, height / 2, 1050);
        g.addColorStop(0, `rgba(0,0,0,0)`);
        g.addColorStop(1, `rgba(0,0,0,${amount})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }

      function drawFrame(t) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);

        if (t < 2.7) {
          const p = easeInOutCubic(clamp(t / 2.7, 0, 1));
          coverDraw(first, 1 + p * 0.36, 0, 1, 0, p * 8);
          vignette(0.18);
          return;
        }

        if (t < 3.75) {
          const p = clamp((t - 2.7) / 1.05, 0, 1);
          const spin = easeOutQuint(p);
          const a = Math.PI * 2.15 * spin;
          const firstAlpha = 1 - easeInOutCubic(p);
          const secondAlpha = easeInOutCubic(clamp((p - 0.2) / 0.8, 0, 1));

          for (let i = 0; i < 5; i += 1) {
            const trail = i / 4;
            coverDraw(first, 1.36 + p * 0.55 + trail * 0.02, a - trail * 0.18, firstAlpha * (0.22 - trail * 0.03), 0, 8);
          }
          coverDraw(first, 1.36 + p * 0.42, a, firstAlpha, 0, 8);
          coverDraw(second, 1.18 + (1 - p) * 0.7, -Math.PI * 0.7 * (1 - spin), secondAlpha, 0, -6 * (1 - p));
          vignette(0.25 + p * 0.15);
          return;
        }

        const p = easeInOutCubic(clamp((t - 3.75) / (duration - 3.75), 0, 1));
        coverDraw(second, 1.18 + p * 0.06, 0, 1, 0, -6);
        vignette(0.16);
      }

      const stream = canvas.captureStream(fps);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 9000000 });
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };

      const done = new Promise((resolve) => {
        recorder.onstop = async () => {
          const blob = new Blob(chunks, { type: mimeType });
          const buffer = await blob.arrayBuffer();
          resolve(Array.from(new Uint8Array(buffer)));
        };
      });

      recorder.start();
      const start = performance.now();
      await new Promise((resolve) => {
        function step(now) {
          const t = (now - start) / 1000;
          drawFrame(Math.min(t, duration));
          if (t < duration) {
            requestAnimationFrame(step);
          } else {
            recorder.stop();
            resolve();
          }
        }
        requestAnimationFrame(step);
      });

      return await done;
    },
    { img1Data: toDataUrl(img1), img2Data: toDataUrl(img2) }
  );

  fs.writeFileSync(outPath, Buffer.from(result));
  await browser.close();
  console.log(outPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
