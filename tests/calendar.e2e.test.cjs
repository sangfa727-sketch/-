const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const assets = {
  '/calendar-100-years.html': ['calendar-100-years.html', 'text/html; charset=utf-8'],
  '/js/mm-calendar-core.js': ['js/mm-calendar-core.js', 'text/javascript; charset=utf-8'],
  '/app.html': ['app.html', 'text/html; charset=utf-8'],
  '/css/app.css': ['css/app.css', 'text/css; charset=utf-8'],
  '/js/calendar-app.js': ['js/calendar-app.js', 'text/javascript; charset=utf-8'],
};

test('Myanmar calendar works in desktop and mobile Chromium browsers', async () => {
  const server = http.createServer((req, res) => {
    const asset = assets[new URL(req.url, 'http://localhost').pathname];
    if (!asset) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': asset[1], 'cache-control': 'no-store' });
    res.end(fs.readFileSync(path.join(root, asset[0])));
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(4173, '127.0.0.1', resolve);
  });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
    await page.clock.install({ time: new Date('2026-11-04T12:00:00') });
    await page.goto('http://127.0.0.1:4173/calendar-100-years.html');

    await page.locator('#dateInput').fill('2026-11-04');
    assert.equal(await page.locator('#myYear').textContent(), '၁၃၈၈ ခု');
    assert.equal(await page.locator('#myMonth').textContent(), 'သီတင်းကျွတ်');
    assert.equal(await page.locator('#myDay').textContent(), 'လဆုတ် ၉ ရက်');
    assert.equal(await page.locator('#myWeekday').textContent(), 'ဗုဒ္ဓဟူး');
    assert.equal(await page.locator('#gapDirection').textContent(), 'တူညီသောနေ့');
    
    await page.locator('#dateText').fill('28,8,1986');
    assert.equal(await page.locator('#myYear').textContent(), '၁၃၄၈ ခု');
    assert.equal(await page.locator('#myMonth').textContent(), 'ဝါခေါင်');
    assert.equal(await page.locator('#myDay').textContent(), 'လဆုတ် ၈ ရက်');
    assert.equal(await page.locator('#myWeekday').textContent(), 'ကြာသပတေး');
    assert.equal(await page.locator('#dateGap').textContent(), '၄၀ နှစ် ၂ လ ၇ ရက်');
    assert.equal(await page.locator('#totalGapDays').textContent(), '၁၄၆၇၈ ရက်');
    assert.equal(await page.locator('#gapDirection').textContent(), 'ရှာဖွေသည့်နေ့သည် အတိတ်');

    await page.locator('#dateText').fill('31,2,2024');
    assert.equal(await page.locator('#myYear').textContent(), '—');
    assert.match(await page.locator('#error').textContent(), /ရက်စွဲမမှန်ကန်ပါ/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert.ok(dimensions.document <= dimensions.viewport, `mobile horizontal overflow: ${JSON.stringify(dimensions)}`);

    await page.locator('#dateText').fill('28/08/1986');
    assert.equal(await page.locator('#myDay').textContent(), 'လဆုတ် ၈ ရက်');
    assert.ok(await page.locator('#calendarGrid .day').count() >= 28);

    await page.goto('http://127.0.0.1:4173/app.html');
    await page.locator('#datePicker').fill('1986-08-28');
    assert.match(await page.locator('#myanmarFullDate').textContent(), /၁၃၄၈ ခု/);
    assert.match(await page.locator('#myanmarFullDate').textContent(), /ဝါခေါင်/);
    assert.equal(await page.locator('#moonPhase').textContent(), 'လဆုတ် ၈ ရက်');
    assert.equal(await page.locator('#myanmarWeekday').textContent(), 'ကြာသပတေး');
    assert.equal(await page.locator('#dateDifference').textContent(), '၄၀ နှစ် ၂ လ ၇ ရက်');
    assert.equal(await page.locator('#totalDays').textContent(), '၁၄၆၇၈ ရက်');
    await page.locator('#dateText').fill('31,2,2024');
    assert.equal(await page.locator('#myanmarFullDate').textContent(), '—');
    assert.equal(await page.locator('#datePicker').inputValue(), '');
    assert.match(await page.locator('#errorMessage').textContent(), /ရက်စွဲမမှန်ကန်ပါ/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:4173/app.html');
    const appDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert.ok(appDimensions.document <= appDimensions.viewport, `app mobile horizontal overflow: ${JSON.stringify(appDimensions)}`);
    assert.ok(await page.locator('#calendarGrid .calendar-day').count() >= 28);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
