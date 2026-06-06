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

async function main() {
  const videoPath = path.resolve(__dirname, "apple_zoom_spin_reveal.webm");
  const videoData = fs.readFileSync(videoPath).toString("base64");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  await page.setContent(`
    <body style="margin:0;background:#000">
      <video src="data:video/webm;base64,${videoData}" style="width:960px;height:540px" muted></video>
    </body>
  `);
  await page.waitForFunction(() => document.querySelector("video").readyState >= 1);
  const duration = await page.$eval("video", (video) => video.duration);
  for (const seconds of [0.7, 3.7, 5.4]) {
    await page.$eval("video", (video, seconds) => {
      video.currentTime = seconds;
    }, seconds);
    await page.waitForFunction((seconds) => Math.abs(document.querySelector("video").currentTime - seconds) < 0.25, seconds);
    await page.screenshot({ path: path.resolve(__dirname, `preview_${seconds.toFixed(1).replace(".", "_")}s.png`) });
  }
  await browser.close();
  const bytes = fs.statSync(videoPath).size;
  console.log(JSON.stringify({ videoPath, bytes, duration }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
