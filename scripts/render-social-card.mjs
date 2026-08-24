import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const projectRoot = process.cwd();
const backgroundPath = resolve(projectRoot, "public/fully-charged-75-visual-v1.jpg");
const outputPath = resolve(projectRoot, "public/og-image-fully-charged-75-v1.png");
const background = readFileSync(backgroundPath).toString("base64");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

await page.setContent(`
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
        body {
          color: #f8fafc;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #050a14;
        }
        .card { position: relative; width: 1200px; height: 630px; overflow: hidden; background: #050a14; }
        .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .76; }
        .shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(3,7,16,.99) 0%, rgba(3,7,16,.94) 43%, rgba(3,7,16,.40) 72%, rgba(3,7,16,.10) 100%); }
        .glow { position: absolute; width: 540px; height: 540px; left: -260px; top: -250px; border-radius: 50%; background: rgba(34,211,238,.13); filter: blur(70px); }
        .content { position: relative; height: 100%; padding: 54px 62px 46px; display: flex; flex-direction: column; }
        .eyebrow { display: inline-flex; align-items: center; align-self: flex-start; gap: 10px; padding: 10px 15px; border: 1px solid rgba(103,232,249,.28); border-radius: 999px; background: rgba(8,145,178,.13); color: #a5f3fc; font-size: 15px; font-weight: 750; letter-spacing: .13em; text-transform: uppercase; }
        .eyebrow-dot { width: 8px; height: 8px; border-radius: 50%; background: #67e8f9; box-shadow: 0 0 18px #22d3ee; }
        h1 { margin: 28px 0 0; width: 690px; font-size: 64px; line-height: 1.01; letter-spacing: -.045em; font-weight: 770; }
        h1 span { color: #67e8f9; }
        .sub { margin-top: 20px; width: 615px; color: #cbd5e1; font-size: 20px; line-height: 1.45; }
        .guide-row { margin-top: auto; display: flex; gap: 9px; }
        .guide { padding: 10px 13px; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; background: rgba(2,6,23,.74); color: #e2e8f0; font-size: 13px; font-weight: 700; }
        .guide::before { content: ""; display: inline-block; width: 7px; height: 7px; margin-right: 7px; border-radius: 50%; background: var(--color); box-shadow: 0 0 14px var(--color); }
        .privacy { position: absolute; right: 48px; bottom: 42px; color: #cbd5e1; font-size: 13px; font-weight: 650; letter-spacing: .02em; }
        .mark { position: absolute; right: 70px; top: 58px; width: 150px; height: 150px; border-radius: 50%; display: grid; place-items: center; border: 1px solid rgba(251,191,36,.48); background: rgba(7,12,23,.78); box-shadow: 0 0 70px rgba(251,191,36,.24); }
        .mark strong { font-size: 68px; line-height: .9; letter-spacing: -.06em; }
        .mark small { display: block; margin-top: 4px; color: #fde68a; text-align: center; font-size: 13px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <main class="card">
        <img class="art" src="data:image/jpeg;base64,${background}" alt="" />
        <div class="shade"></div>
        <div class="glow"></div>
        <div class="mark"><div><strong>75</strong><small>days</small></div></div>
        <div class="content">
          <div class="eyebrow"><span class="eyebrow-dot"></span>The Dashboard · Fully Charged 75</div>
          <h1>Five Controllables.<br /><span>Seventy-five days.</span></h1>
          <p class="sub">A strict, private Christian formation path built around one honest daily rhythm.</p>
          <div class="guide-row">
            <span class="guide" style="--color:#67e8f9">Awareness</span>
            <span class="guide" style="--color:#bef264">Perspective</span>
            <span class="guide" style="--color:#fbbf24">Habit</span>
            <span class="guide" style="--color:#c4b5fd">Wellness</span>
            <span class="guide" style="--color:#5eead4">Environment</span>
          </div>
        </div>
        <div class="privacy">Private by default · No public rankings</div>
      </main>
    </body>
  </html>
`);

await page.screenshot({ path: outputPath, type: "png" });
await browser.close();

process.stdout.write(`${outputPath}\n`);
