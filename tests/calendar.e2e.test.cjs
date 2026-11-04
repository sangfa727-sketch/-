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
  '/graha-nine.html': ['graha-nine.html', 'text/html; charset=utf-8'],
  '/graha-pariyaya.html': ['graha-pariyaya.html', 'text/html; charset=utf-8'],
  '/anga-vijja.html': ['anga-vijja.html', 'text/html; charset=utf-8'],
};

test('Myanmar calendar and astrology reference pages work in desktop and mobile Chromium', async () => {
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
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
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
    assert.equal(await page.locator('#astrology-features .feature-card').count(), 3);
    assert.equal(await page.locator('#feature-pillar-method').getAttribute('href'), 'anga-vijja.html#pillar-method');
    assert.equal(await page.locator('#feature-pillar-verses').getAttribute('href'), 'anga-vijja.html#five-pillar-reading');
    await page.locator('#feature-pillar-method').click();
    assert.ok(page.url().endsWith('/anga-vijja.html#pillar-method'));
    assert.equal(await page.locator('#pillar-method h2').textContent(), 'အက္ခရာအလိုက် အခါတိုင်ထူပုံ');
    await page.goto('http://127.0.0.1:4173/app.html');
    await page.locator('#feature-pillar-verses').click();
    assert.ok(page.url().endsWith('/anga-vijja.html#five-pillar-reading'));
    assert.equal(await page.locator('#five-pillar-reading h2').textContent(), '၅ တိုင်ထူ အဟောလင်္ကာ');
    assert.equal(await page.locator('#three-pillar-reading h2').textContent(), '၃ တိုင်ထူ အဟောလင်္ကာ');
    await page.goto('http://127.0.0.1:4173/app.html');
    assert.equal(await page.locator('#feature-graha-pariyaya').getAttribute('href'), 'graha-pariyaya.html');
    await page.locator('#feature-graha-pariyaya').click();
    assert.ok(page.url().endsWith('/graha-pariyaya.html'));
    assert.equal(await page.locator('#planetGrid .planet-card').count(), 9);
    assert.equal(await page.locator('#planetGrid .planet-card:not(.missing)').count(), 9);
    const ketuCard = page.locator('#planetGrid [data-planet="ကိတ်"]');
    assert.match(await ketuCard.innerText(), /ဂြိုဟ်အမှတ်[\\s\\S]*၉/);
    assert.match(await ketuCard.innerText(), /တိရစ္ဆာန်သင်္ကေတ[\\s\\S]*ဆိတ်/);
    assert.match(await ketuCard.innerText(), /ဗုဒ္ဓဟူးနေ့/);
    assert.match(await ketuCard.innerText(), /နေ့လယ် ၁၂:၀၀ မှ သန်းခေါင် ၁၂:၀၀/);
    assert.match(await ketuCard.innerText(), /အက္ခရာ၊ အဆင်းသဏ္ဌာန်နှင့် အစိုးရသောအရပ်/);
    assert.ok((await page.locator('#planetGrid').innerText()).includes('အဖ၊ အဖေ'));
    await page.locator('#planetSearch').fill('ပညာ');
    assert.ok(await page.locator('#planetGrid .planet-card:not([hidden])').count() > 0);
    assert.ok(await page.locator('#planetGrid .planet-card[hidden]').count() > 0);
    await page.locator('#planetSearch').fill('မရှိသောစကား');
    assert.equal(await page.locator('#planetGrid .planet-card:not([hidden])').count(), 0);
    assert.equal(await page.locator('#noResults').isVisible(), true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const pariyayaDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert.ok(pariyayaDimensions.document <= pariyayaDimensions.viewport, `pariyaya mobile horizontal overflow: ${JSON.stringify(pariyayaDimensions)}`);
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

    // Static astrology reference: verify the mnemonic tables, corrected wording,
    // the two new reference sections, and desktop/mobile table containment.
    await page.setViewportSize({ width: 1365, height: 900 });
    await page.goto('http://127.0.0.1:4173/graha-nine.html');
    const classification = page.locator('section[aria-labelledby="akchara-linga-heading"]');
    assert.equal(await classification.locator('h3').count(), 7);
    assert.equal(await classification.locator('table').count(), 7);
    for (const heading of [
      '၁။ ကျား / မ ဂြိုဟ် ခွဲခြားနည်း',
      '၂။ စကားအမှန် / အမှား ခွဲခြားနည်း',
      '၃။ ဝယ် / မဝယ် ခွဲခြားနည်း',
      '၄။ နဂိုရ်ဂြိုဟ် / ယာယီဂြိုဟ် (အတွင်းလူ / အပြင်လူ) ခွဲခြားနည်း',
      '၅။ မိတ် / ရန် ခွဲခြားနည်း',
      '၆။ အကြီး / အငယ် ခွဲခြားနည်း',
      '၇။ ဓာတ်မိတ် / ဓာတ်ရန် ခွဲခြားနည်း',
    ]) {
      assert.ok(await classification.getByRole('heading', { name: heading, exact: true }).count() === 1, `missing heading: ${heading}`);
    }
    assert.ok((await page.locator('body').innerText()).includes('အောင်ပ ကုလား ဆွေသား နှောင်ရင်း'));
    const grahaBodyText = await page.locator('body').innerText();
    assert.ok(grahaBodyText.includes('ဦးသာ စိန်ပန်း ဒန်းလှ ကိုရှာ'));
    assert.equal(await page.locator('#graha-comparison-heading').count(), 1);
    assert.equal(await page.locator('#people-body-heading').count(), 1);
    assert.equal(await page.locator('#graha-comparison-heading').locator('xpath=following-sibling::div//tbody/tr').count(), 8);
    assert.ok(await page.locator('#people-body-heading').locator('xpath=following-sibling::p').count() >= 1);
    assert.equal(await page.locator('#people-body-heading').locator('xpath=following-sibling::div//tbody/tr').count(), 8);
    assert.ok((await page.locator('body').innerText()).includes('အရှင်ဂြိုဟ်'));
    assert.ok((await page.locator('body').innerText()).includes('ကျွန်ဂြိုဟ်'));

    const desktopTableOverflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      wrappers: [...document.querySelectorAll('.table-wrap')].every(wrapper =>
        wrapper.scrollWidth >= wrapper.clientWidth
      ),
    }));
    assert.ok(desktopTableOverflow.document <= desktopTableOverflow.viewport, `desktop page horizontal overflow: ${JSON.stringify(desktopTableOverflow)}`);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const mobileGrahaDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      tableWrappers: [...document.querySelectorAll('.table-wrap')].length,
      tables: [...document.querySelectorAll('.table-wrap table')].length,
      scrollableTables: [...document.querySelectorAll('.table-wrap')].filter(wrapper =>
        wrapper.scrollWidth > wrapper.clientWidth
      ).length,
    }));
    assert.ok(mobileGrahaDimensions.document <= mobileGrahaDimensions.viewport, `graha mobile page horizontal overflow: ${JSON.stringify(mobileGrahaDimensions)}`);
    assert.ok(mobileGrahaDimensions.tableWrappers > 0);
    assert.equal(mobileGrahaDimensions.tables, await page.locator('table').count());
    assert.ok(mobileGrahaDimensions.scrollableTables > 0, 'wide tables should scroll inside their wrappers on mobile');

    // Interactive Angavijja module: supplied Sunday/Monday examples, letter
    // selection, inferred weekday continuation, pillar labels, and mobile fit.
    await page.setViewportSize({ width: 1365, height: 900 });
    await page.goto('http://127.0.0.1:4173/anga-vijja.html');
    assert.deepEqual(await page.locator('#chart .cell:not(.center)').allTextContents(), ['၅', '၂', '၆', '၄', '၀', '၃']);
    assert.equal(await page.locator('#chart .cell.center').innerText(), '၁\nတနင်္ဂနွေ နံ');
    assert.equal(await page.locator('#chart .chart-rule').count(), 2);
    const verticalChart = await page.locator('#chart .cell').evaluateAll(cells => cells.map(cell => ({ top: cell.getBoundingClientRect().top, left: cell.getBoundingClientRect().left })));
    assert.ok(verticalChart.every((cell, i) => i === 0 || cell.top > verticalChart[i - 1].top), 'pillar digits and center must be vertically stacked');
    await page.locator('#weekday').selectOption('1');
    assert.deepEqual(await page.locator('#chart .cell:not(.center)').allTextContents(), ['၆', '၃', '၀', '၅', '၁', '၄']);
    assert.equal(await page.locator('#chart .cell.center').innerText(), '၂\nတနင်္လာ နံ');
    await page.locator('#letter').selectOption('ဃ');
    assert.equal(await page.locator('#weekday').inputValue(), '1');
    await page.locator('#weekday').selectOption('2');
    assert.deepEqual(await page.locator('#chart .cell:not(.center)').allTextContents(), ['၀', '၄', '၁', '၆', '၂', '၅']);
    assert.equal(await page.locator('#chart .cell.center').innerText(), '၃\nအင်္ဂါ နံ');

    await page.locator('#pillarNumbers').fill('1,0,5,4,2');
    await page.locator('#interpret').click();
    assert.match(await page.locator('#interpretResult').textContent(), /မူလတိုင်/);
    assert.match(await page.locator('#interpretResult').textContent(), /လက္ခဏာတိုင်/);
    await page.locator('#pillarNumbers').fill('1,0');
    await page.locator('#interpret').click();
    assert.match(await page.locator('#interpretResult').textContent(), /တိုင်အရေအတွက်/);
    await page.locator('#pillarType').selectOption('3');
    await page.locator('#pillarNumbers').fill('1,0,5');
    await page.locator('#interpret').click();
    assert.match(await page.locator('#interpretResult').textContent(), /နိမိတ်တိုင်/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const angaDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert.ok(angaDimensions.document <= angaDimensions.viewport, `Angavijja mobile horizontal overflow: ${JSON.stringify(angaDimensions)}`);

    assert.deepEqual(pageErrors, []);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
