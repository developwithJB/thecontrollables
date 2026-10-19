import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const projectRoot = process.cwd();
const outputDir = resolve(projectRoot, "public/social");
const landscapeArt = readFileSync(resolve(outputDir, "fully-charged-75-guides-landscape-v2.png")).toString("base64");
const portraitArt = readFileSync(resolve(outputDir, "fully-charged-75-guides-portrait-v2.png")).toString("base64");

mkdirSync(outputDir, { recursive: true });

const variants = [
  {
    id: "og",
    label: "Open Graph · Facebook · LinkedIn · WhatsApp · Slack · Discord · iMessage · Bluesky · Mastodon",
    filename: "fully-charged-75-share-og-1200x630-v2.png",
    width: 1200,
    height: 630,
    layout: "landscape",
    art: landscapeArt,
  },
  {
    id: "x",
    label: "X / Twitter",
    filename: "fully-charged-75-share-x-1200x675-v2.png",
    width: 1200,
    height: 675,
    layout: "landscape",
    art: landscapeArt,
  },
  {
    id: "youtube",
    label: "YouTube · Video community",
    filename: "fully-charged-75-share-youtube-1280x720-v2.png",
    width: 1280,
    height: 720,
    layout: "landscape",
    art: landscapeArt,
  },
  {
    id: "square",
    label: "Instagram · Threads · Facebook square",
    filename: "fully-charged-75-share-square-1080x1080-v2.png",
    width: 1080,
    height: 1080,
    layout: "square",
    art: landscapeArt,
  },
  {
    id: "feed",
    label: "Instagram · Threads portrait feed",
    filename: "fully-charged-75-share-feed-1080x1350-v2.png",
    width: 1080,
    height: 1350,
    layout: "portrait",
    art: portraitArt,
  },
  {
    id: "pinterest",
    label: "Pinterest",
    filename: "fully-charged-75-share-pinterest-1000x1500-v2.png",
    width: 1000,
    height: 1500,
    layout: "portrait",
    art: portraitArt,
  },
  {
    id: "story",
    label: "Instagram Stories · Facebook Stories · Reels · TikTok",
    filename: "fully-charged-75-share-story-1080x1920-v2.png",
    width: 1080,
    height: 1920,
    layout: "story",
    art: portraitArt,
  },
];

const guides = [
  ["Awareness", "#67e8f9"],
  ["Perspective", "#bef264"],
  ["Habit", "#fbbf24"],
  ["Wellness", "#c4b5fd"],
  ["Environment", "#5eead4"],
];

const browser = await chromium.launch({ headless: true });

for (const variant of variants) {
  const page = await browser.newPage({
    viewport: { width: variant.width, height: variant.height },
    deviceScaleFactor: 1,
  });

  const guideMarkup = guides
    .map(
      ([name, color]) =>
        `<span class="guide"><i style="--guide:${color}"></i>${name}</span>`,
    )
    .join("");

  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          html, body {
            width: ${variant.width}px;
            height: ${variant.height}px;
            margin: 0;
            overflow: hidden;
          }
          body {
            color: #f8fafc;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #030814;
          }
          .card {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
            isolation: isolate;
            background:
              radial-gradient(circle at 18% 18%, rgba(14, 165, 233, .13), transparent 32%),
              radial-gradient(circle at 82% 82%, rgba(34, 211, 238, .07), transparent 28%),
              #030814;
          }
          .card::before {
            content: "";
            position: absolute;
            inset: 0;
            z-index: 2;
            opacity: .13;
            background-image:
              linear-gradient(rgba(148, 163, 184, .13) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148, 163, 184, .13) 1px, transparent 1px);
            background-size: 72px 72px;
            mask-image: radial-gradient(circle at center, black, transparent 78%);
          }
          .art {
            position: absolute;
            z-index: 1;
            display: block;
            object-fit: contain;
            filter: saturate(.96) contrast(1.03);
          }
          .vignette {
            position: absolute;
            inset: 0;
            z-index: 3;
            pointer-events: none;
          }
          .brand, .badge, .headline, .sub, .cta, .guides, .url { position: absolute; z-index: 5; }
          .brand {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            color: #a5f3fc;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: .18em;
            text-transform: uppercase;
          }
          .brand-dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #67e8f9;
            box-shadow: 0 0 22px rgba(34, 211, 238, .95);
          }
          .badge {
            display: grid;
            place-items: center;
            width: 112px;
            height: 112px;
            border: 1px solid rgba(103, 232, 249, .34);
            border-radius: 50%;
            color: #f8fafc;
            text-align: center;
            background: rgba(4, 12, 26, .78);
            box-shadow: 0 0 45px rgba(34, 211, 238, .12), inset 0 0 26px rgba(103, 232, 249, .05);
            backdrop-filter: blur(16px);
          }
          .badge strong { display: block; font-size: 46px; line-height: .8; letter-spacing: -.06em; }
          .badge small { display: block; margin-top: 10px; color: #67e8f9; font-size: 10px; font-weight: 850; letter-spacing: .2em; text-transform: uppercase; }
          .headline {
            margin: 0;
            font-weight: 790;
            letter-spacing: -.055em;
            line-height: .93;
            text-wrap: balance;
          }
          .headline span { color: #67e8f9; }
          .sub {
            margin: 0;
            color: #cbd5e1;
            font-weight: 520;
            letter-spacing: -.018em;
            line-height: 1.32;
          }
          .cta {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            padding: 17px 22px;
            border: 1px solid rgba(103, 232, 249, .4);
            border-radius: 16px;
            color: #ecfeff;
            font-size: 15px;
            font-weight: 780;
            letter-spacing: .045em;
            text-transform: uppercase;
            background: rgba(8, 47, 73, .44);
            box-shadow: 0 18px 50px rgba(0, 0, 0, .28), inset 0 1px rgba(255, 255, 255, .06);
            backdrop-filter: blur(18px);
          }
          .cta b { color: #67e8f9; font-size: 22px; line-height: 0; }
          .guides { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; }
          .guide {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 9px 11px;
            border: 1px solid rgba(148, 163, 184, .18);
            border-radius: 999px;
            color: #dbeafe;
            font-size: 12px;
            font-weight: 700;
            background: rgba(3, 10, 23, .68);
            backdrop-filter: blur(16px);
          }
          .guide i {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: var(--guide);
            box-shadow: 0 0 14px var(--guide);
          }
          .url {
            color: #94a3b8;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .08em;
            text-transform: uppercase;
          }

          .landscape .art { top: 0; right: -5px; width: 68%; height: 100%; opacity: .92; }
          .landscape .vignette {
            background:
              linear-gradient(90deg, rgba(3, 8, 20, 1) 0%, rgba(3, 8, 20, .97) 35%, rgba(3, 8, 20, .54) 58%, rgba(3, 8, 20, .08) 100%),
              linear-gradient(0deg, rgba(3, 8, 20, .62), transparent 32%);
          }
          .landscape .brand { top: 49px; left: 58px; }
          .landscape .badge { top: 48px; right: 53px; }
          .landscape .headline { top: 133px; left: 58px; width: 590px; font-size: 68px; }
          .landscape .sub { top: 288px; left: 60px; width: 500px; font-size: 22px; }
          .landscape .cta { top: 386px; left: 59px; }
          .landscape .guides { left: 58px; bottom: 43px; max-width: 720px; }
          .landscape .url { right: 52px; bottom: 48px; }

          .square .art {
            top: 210px;
            left: -120px;
            width: 1320px;
            height: 880px;
            opacity: .9;
            mask-image: linear-gradient(180deg, transparent 0%, black 10%, black 100%);
          }
          .square .vignette {
            background:
              linear-gradient(180deg, rgba(3, 8, 20, .95) 0%, rgba(3, 8, 20, .28) 28%, rgba(3, 8, 20, .16) 64%, rgba(3, 8, 20, .9) 86%, rgba(3, 8, 20, 1) 100%);
          }
          .square .brand { top: 54px; left: 58px; }
          .square .badge { top: 48px; right: 52px; }
          .square .headline { top: 118px; left: 58px; width: 820px; font-size: 76px; }
          .square .sub { top: 292px; left: 62px; width: 720px; font-size: 23px; }
          .square .cta { left: 50%; bottom: 142px; transform: translateX(-50%); }
          .square .guides { left: 50%; bottom: 62px; width: 930px; justify-content: center; transform: translateX(-50%); }
          .square .url { display: none; }

          .portrait .art, .story .art { inset: 0; width: 100%; height: 100%; opacity: .94; }
          .portrait .vignette, .story .vignette {
            background:
              linear-gradient(180deg, rgba(3, 8, 20, 1) 0%, rgba(3, 8, 20, .82) 18%, rgba(3, 8, 20, .04) 34%, rgba(3, 8, 20, .04) 72%, rgba(3, 8, 20, .92) 88%, rgba(3, 8, 20, 1) 100%);
          }
          .portrait .brand { top: 62px; left: 58px; }
          .portrait .badge { top: 48px; right: 52px; }
          .portrait .headline { top: 128px; left: 58px; width: calc(100% - 116px); font-size: 78px; }
          .portrait .sub { top: 302px; left: 62px; width: calc(100% - 124px); font-size: 23px; }
          .portrait .cta { left: 50%; bottom: 128px; transform: translateX(-50%); white-space: nowrap; }
          .portrait .guides { left: 50%; bottom: 51px; width: 92%; justify-content: center; transform: translateX(-50%); }
          .portrait .url { display: none; }

          .story .brand { top: 106px; left: 74px; font-size: 16px; }
          .story .badge { top: 84px; right: 68px; width: 126px; height: 126px; }
          .story .badge strong { font-size: 52px; }
          .story .headline { top: 196px; left: 72px; width: 820px; font-size: 92px; }
          .story .sub { top: 350px; left: 77px; width: 760px; font-size: 27px; }
          .story .cta { left: 50%; bottom: 177px; padding: 20px 27px; font-size: 17px; transform: translateX(-50%); white-space: nowrap; }
          .story .guides { left: 50%; bottom: 82px; width: 930px; justify-content: center; transform: translateX(-50%); }
          .story .guide { padding: 10px 12px; font-size: 13px; }
          .story .url { left: 50%; bottom: 40px; transform: translateX(-50%); white-space: nowrap; }
        </style>
      </head>
      <body>
        <main class="card ${variant.layout}" aria-label="${variant.label}">
          <img class="art" src="data:image/png;base64,${variant.art}" alt="" />
          <div class="vignette"></div>
          <div class="brand"><span class="brand-dot"></span>The Dashboard</div>
          <div class="badge"><div><strong>75</strong><small>days</small></div></div>
          <h1 class="headline">Put The Controllables <span>first.</span></h1>
          <p class="sub">Five Controllables. One honest next step.</p>
          <div class="cta">Start the 75-Day Covenant <b>→</b></div>
          <div class="guides">${guideMarkup}</div>
          <div class="url">thedashboard.agbcoaching.com</div>
        </main>
      </body>
    </html>
  `);

  await page.screenshot({ path: resolve(outputDir, variant.filename), type: "png" });
  await page.close();
}

await browser.close();

writeFileSync(
  resolve(outputDir, "share-manifest-v2.json"),
  `${JSON.stringify(
    {
      campaign: "Fully Charged 75",
      message: "Put The Controllables first. Five Controllables. One honest next step.",
      callToAction: "Start the 75-Day Covenant",
      destination: "https://thedashboard.agbcoaching.com/",
      altText:
        "Dark navy Fully Charged 75 graphic showing five glowing guide icons—an owl, turtle, shark, satellite, and rocket—representing Awareness, Perspective, Habit, Wellness, and Environment.",
      files: variants.map(({ id, label, filename, width, height }) => ({ id, label, filename, width, height })),
    },
    null,
    2,
  )}\n`,
);

process.stdout.write(`${variants.map(({ filename }) => resolve(outputDir, filename)).join("\n")}\n`);
