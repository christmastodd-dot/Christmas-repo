// Renders the app icon (gradient badge + "C2T" wordmark) to PNG at the sizes
// needed for manifest.json and Apple touch icon, using headless Chromium.
// Run with: NODE_PATH=/opt/node22/lib/node_modules node tools/generate_icons.js
const path = require("path");
const { chromium } = require("playwright");

const ICON_DIR = path.join(__dirname, "..", "icons");

function iconHtml(size, { maskableSafe = false } = {}) {
  // Maskable icons need the visual content within a centered "safe zone"
  // (~80% of the canvas) since OS masks can crop the outer edge.
  const fontSize = maskableSafe ? Math.round(size * 0.30) : Math.round(size * 0.34);
  const subSize = maskableSafe ? Math.round(size * 0.07) : Math.round(size * 0.08);
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;}
  .badge{
    width:${size}px;height:${size}px;
    background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 45%,#f97316 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    font-family:-apple-system,Helvetica,Arial,sans-serif;
  }
  .word{
    color:#ffffff;font-weight:800;font-size:${fontSize}px;letter-spacing:-2px;
    text-shadow:0 2px 6px rgba(0,0,0,0.15);
  }
  .sub{
    color:#ffffff;font-weight:600;font-size:${subSize}px;letter-spacing:2px;
    margin-top:${Math.round(size * 0.01)}px;opacity:0.92;text-transform:uppercase;
  }
</style></head>
<body>
  <div class="badge">
    <div class="word">C2T</div>
    <div class="sub">Tri Training</div>
  </div>
</body></html>`;
}

async function renderIcon(browser, size, fileName, opts = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(iconHtml(size, opts));
  const el = await page.$(".badge");
  await el.screenshot({ path: path.join(ICON_DIR, fileName) });
  await page.close();
  console.log("wrote", fileName);
}

(async () => {
  const browser = await chromium.launch();
  await renderIcon(browser, 192, "icon-192.png");
  await renderIcon(browser, 512, "icon-512.png");
  await renderIcon(browser, 512, "icon-maskable-512.png", { maskableSafe: true });
  await renderIcon(browser, 180, "apple-touch-icon.png");
  await browser.close();
})();
