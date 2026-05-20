// capture.js — run with: node capture.js
// Requires: npm install playwright (or npx playwright install chromium)

const { chromium } = require('playwright');
const path = require('path');

async function capture() {
  const browser = await chromium.launch();
  const assets = [
    { file: 'icon.html',        out: 'icon.png',        w: 512,  h: 512  },
    { file: 'screenshot1.html', out: 'screenshot1.png', w: 390,  h: 844  },
    { file: 'screenshot2.html', out: 'screenshot2.png', w: 390,  h: 844  },
    { file: 'screenshot3.html', out: 'screenshot3.png', w: 390,  h: 844  },
  ];

  for (const asset of assets) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: asset.w, height: asset.h });
    const filePath = path.resolve(__dirname, asset.file);
    await page.goto(`file://${filePath}`);
    await page.waitForTimeout(500); // let fonts/animations settle
    const outPath = path.resolve(__dirname, asset.out);
    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: asset.w, height: asset.h } });
    console.log(`✅  Saved → ${asset.out}`);
    await page.close();
  }

  await browser.close();
  console.log('\n🎉  All assets captured!');
}

capture().catch(err => { console.error(err); process.exit(1); });
