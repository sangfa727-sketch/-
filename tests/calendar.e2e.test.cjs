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
  '/calendar.html': ['calendar.html', 'text/html; charset=utf-8'],
  '/day.html': ['day.html', 'text/html; charset=utf-8'],
  '/js/day-astrology.js': ['js/day-astrology.js', 'text/javascript; charset=utf-8'],
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
    assert.equal(await page.locator('#astrology-features .feature-card').count(), 4);
    assert.equal(await page.locator('#feature-calendar').getAttribute('href'), 'calendar.html');
    await page.locator('#feature-calendar').click();
    assert.ok(page.url().endsWith('/calendar.html'));
    assert.match(await page.locator('#calendarTitle').textContent(), /နိုဝင်ဘာ ၂၀၂၆/);
    await page.goto('http://127.0.0.1:4173/app.html');
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
    await page.goto('http://127.0.0.1:4173/graha-nine.html');
    const sourcePariyayaRows = await page.locator('section[aria-labelledby="graha-pariyaya-heading"] tbody tr').evaluateAll(rows =>
      rows.map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent.trim()))
    );
    assert.equal(sourcePariyayaRows.length, 8);
    assert.deepEqual(sourcePariyayaRows.map(row => row[1]), [
      'တနင်္ဂနွေ','တနင်္လာ','အင်္ဂါ','ဗုဒ္ဓဟူး','ကြာသာပတေး','သောကြာ','စနေ','ရာဟု'
    ]);
    await page.goto('http://127.0.0.1:4173/graha-pariyaya.html');
    const correctedPlanetOrder = await page.locator('#planetGrid .planet-card').evaluateAll(cards =>
      cards.map(card => card.querySelector('h2').textContent.trim())
    );
    assert.deepEqual(correctedPlanetOrder, [
      'တနင်္ဂနွေဂြိုဟ်','တနင်္လာဂြိုဟ်','အင်္ဂါဂြိုဟ်','ဗုဒ္ဓဟူးဂြိုဟ်',
      'ကြာသပတေးဂြိုဟ်','သောကြာဂြိုဟ်','စနေဂြိုဟ်','ရာဟုဂြိုဟ်','ကိတ်ဂြိုဟ်'
    ]);
    const sourceTermsByPlanet = Object.fromEntries(sourcePariyayaRows.map(row => [row[1],row[3]]));
    const destinationTermsByPlanet = await page.locator('#planetGrid .planet-card').evaluateAll(cards =>
      cards.filter(card => card.querySelector('.planet-terms')).map(card => ({
        planet:card.dataset.planet,
        terms:card.querySelector('.planet-terms').textContent.trim()
      }))
    );
    assert.equal(destinationTermsByPlanet.length, 8);
    for (const item of destinationTermsByPlanet) {
      const sourceName = item.planet === 'ကြာသပတေး' ? 'ကြာသာပတေး' : item.planet;
      assert.equal(item.terms,sourceTermsByPlanet[sourceName],
        item.planet+' pariyaya terms must match the original graha-nine HTML verbatim');
    }
    assert.equal(await page.locator('#graha-comparison-heading').count(), 1);
    assert.equal(await page.locator('#people-body-heading').count(), 1);
    assert.equal(await page.locator('#akchara-linga-heading').count(), 1);
    assert.equal(await page.locator('section[aria-labelledby="akchara-linga-heading"] h3').count(), 7);
    const genderSection = page.locator('section[aria-labelledby="akchara-linga-heading"]');
    const genderTable = genderSection.locator('h3')
      .filter({ hasText: 'ကျား / မ ဂြိုဟ် ခွဲခြားနည်း' })
      .locator('xpath=following-sibling::div[contains(@class,"table-wrap")][1]//table');
    const genderRows = genderTable.locator('tbody tr');
    assert.equal(await genderRows.count(), 2, 'gender mnemonic table must contain exactly two rows');
    const maleGenderRow = genderRows.nth(0);
    const femaleGenderRow = genderRows.nth(1);
    assert.equal((await maleGenderRow.locator('td').nth(0).textContent()).trim(), 'ယောက်ျားဂြိုဟ်');
    assert.equal((await femaleGenderRow.locator('td').nth(0).textContent()).trim(), 'မိန်းမဂြိုဟ်');
    const maleGenderNumber = (await maleGenderRow.locator('td').nth(2).textContent()).replace(/\\s+/g, '');
    const femaleGenderNumber = (await femaleGenderRow.locator('td').nth(2).textContent()).replace(/\\s+/g, '');
    assert.match(maleGenderNumber, /၁၊၃၊၄၊၅/,
      'male graha mnemonic must map to 1, 3, 4, 5');
    assert.match(femaleGenderNumber, /၂၊၆၊၀၊၈/,
      'female graha mnemonic must map to 2, 6, 0, 8');
    await page.goto('http://127.0.0.1:4173/app.html');
    assert.equal(await page.locator('#feature-graha-pariyaya').getAttribute('href'), 'graha-pariyaya.html');
    await page.locator('#feature-graha-pariyaya').click();
    assert.ok(page.url().endsWith('/graha-pariyaya.html'));
    assert.equal(await page.locator('#planetGrid .planet-card').count(), 9);
    assert.equal(await page.locator('#planetGrid .planet-card:not(.missing)').count(), 9);
    const ketuText = await page.locator('#planetGrid [data-planet="ကိတ်"]').innerText();
    assert.ok(ketuText.includes('ဂြိုဟ်အမှတ်') && ketuText.includes('၉'));
    assert.ok(ketuText.includes('တိရစ္ဆာန်သင်္ကေတ') && ketuText.includes('ဆိတ်'));
    assert.ok(ketuText.includes('ဗုဒ္ဓဟူးနေ့'));
    assert.ok(ketuText.includes('နေ့လယ် ၁၂:၀၀ မှ သန်းခေါင် ၁၂:၀၀'));
    assert.ok(ketuText.includes('အက္ခရာ၊ အဆင်းသဏ္ဌာန်နှင့် အစိုးရသောအရပ်'));
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
    await page.goto('http://127.0.0.1:4173/calendar.html');
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
    await page.goto('http://127.0.0.1:4173/calendar.html');
    const appDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert.ok(appDimensions.document <= appDimensions.viewport, `app mobile horizontal overflow: ${JSON.stringify(appDimensions)}`);
    assert.ok(await page.locator('#calendarGrid .calendar-day').count() >= 28);
    assert.equal(await page.locator('#calendarGrid .calendar-day[aria-current="date"]').count(), 1);
    assert.deepEqual(await page.locator('#calendarGrid .weekday').allTextContents(), ['နွေ','လာ','အင်္','ဗုဒ္ဓ','ကြာ','သော','စနေ']);
    await page.locator('#dateText').fill('၂၈,၈,၁၉၈၆');
    assert.equal(await page.locator('#myanmarWeekday').textContent(), 'ကြာသပတေး');
    assert.equal(await page.locator('#calendarGrid .calendar-day[data-date="1986-08-28"]').count(), 1);
    await page.locator('#calendarGrid .calendar-day[data-date="1986-08-28"]').click();
    assert.ok(page.url().endsWith('/day.html?date=1986-08-28'));
    assert.equal(await page.locator('#dayWeekday').textContent(), 'ကြာသပတေး နေ့');
    assert.equal(await page.locator('#periodGrid .period-card').count(), 8);
    assert.deepEqual(await page.locator('#periodGrid .period-card').evaluateAll(cards => cards.map(card => Number(card.dataset.ownerIndex))), [4,2,0,5,3,1,6,4]);
    assert.deepEqual(await page.locator('#periodGrid .period-pillar-center strong').allTextContents(), ['၅','၃','၁','၆','၄','၂','၀','၅']);
    assert.equal(await page.locator('#periodGrid .period-card').first().locator('.period-time').textContent(), 'နံနက် ၆:၀၀ မှ နံနက် ၇:၃၀');
    assert.equal(await page.locator('#periodGrid .period-card').last().locator('.period-time').textContent(), 'ညနေ ၄:၃၀ မှ ညနေ ၆:၀၀');
    const weekdaySamples = [
      ['2026-11-01',0],['2026-11-02',1],['2026-11-03',2],['2026-11-04',3],
      ['2026-11-05',4],['2026-11-06',5],['2026-11-07',6],
    ];
    for (const [sampleDate, weekdayIndex] of weekdaySamples) {
      await page.goto('http://127.0.0.1:4173/day.html?date=' + sampleDate);
      const owners = await page.locator('#periodGrid .period-card').evaluateAll(cards => cards.map(card => Number(card.dataset.ownerIndex)));
      assert.equal(owners.length, 8);
      assert.equal(owners[0], weekdayIndex, sampleDate + ' must start with its own weekday');
      assert.equal(owners[7], weekdayIndex, sampleDate + ' must end with its own weekday');
      assert.equal(owners[1], (weekdayIndex + 5) % 7, sampleDate + ' inclusive sixth weekday must own period 2');
      const pillars = await page.locator('#periodGrid .period-pillar').evaluateAll(nodes => nodes.map(pillar => {
        const values = [...pillar.querySelectorAll('.pillar-number-value')];
        return {
          values: values.map(node => node.textContent.trim()),
          tops: values.map(node => node.getBoundingClientRect().top),
          direction: getComputedStyle(pillar).flexDirection,
        };
      }));
      assert.equal(pillars.length, 8, sampleDate + ' must render eight separate pillars');
      for (let periodIndex = 0; periodIndex < 8; periodIndex++) {
        const owner = owners[periodIndex];
        const expected = [5,2,6,1,4,0,3].map(value => (value + owner) % 7)
          .map(value => String(value).replace(/[0-9]/g, digit => '၀၁၂၃၄၅၆'[Number(digit)]));
        assert.deepEqual(pillars[periodIndex].values, expected, sampleDate + ' period ' + (periodIndex + 1) + ' pillar sequence');
        assert.equal(pillars[periodIndex].direction, 'column', sampleDate + ' period ' + (periodIndex + 1) + ' must be vertical');
        assert.ok(pillars[periodIndex].tops.every((top, index, all) => index === 0 || top > all[index - 1]),
          sampleDate + ' period ' + (periodIndex + 1) + ' values must be stacked top-to-bottom');
      }
    }

    // Pair classifications must render for every one of the 56 daily pillars.
    // A displayed 0 participates as mnemonic 7; Wednesday noon uses 4/8 (Rahu).
    for (const [sampleDate, weekdayIndex] of weekdaySamples) {
      await page.goto('http://127.0.0.1:4173/day.html?date=' + sampleDate);
      const cards = page.locator('#periodGrid .period-card');
      for (let periodIndex = 0; periodIndex < 8; periodIndex++) {
        const card = cards.nth(periodIndex);
        const pillar = card.locator('.period-pillar');
        const lankaToggle = card.locator('.period-lanka-toggle');
        const lankaPanel = card.locator('.period-lanka-details');
        assert.equal(await lankaToggle.count(),1,sampleDate+' period '+(periodIndex+1)+' must have a hide/show control');
        assert.equal(await lankaToggle.getAttribute('aria-expanded'),'false');
        assert.equal(await lankaPanel.isHidden(),true);
        await lankaToggle.click();
        assert.equal(await lankaToggle.getAttribute('aria-expanded'),'true');
        assert.equal(await lankaPanel.isVisible(),true);
        const lankaText = await lankaPanel.innerText();
        for (const phrase of ['အောင်၊ ဆု၊ လည်း၊ ပွား','အင်တူလက်မျှ နဂိုရ်ပ','ခြေစွပ်သိမ်းယူ ယာယီယူ',
          'ကြိုင်း လောင်း မြဲ သို','အ စ နံ ရောင်း','အောင်ပ ကုလား ဆွေသား နှောင်ရင်း',
          'ဦးညို ခေမာ သုတ ဝေရီ','အန္တော ဂဗ္ဘေ စရေ ဝံသေ','ဦးဝေ စံကူး ရေးဗူး တောသူ']) {
          assert.ok(lankaText.includes(phrase),sampleDate+' period '+(periodIndex+1)+' missing lanka: '+phrase);
        }
        assert.ok(lankaText.includes('မူရင်း HTML တွင် ကိန်းဂဏန်းသတ်မှတ်ချက် မဖော်ပြထားပါ'));
        await lankaToggle.click();
        assert.equal(await lankaToggle.getAttribute('aria-expanded'),'false');
        assert.equal(await lankaPanel.isHidden(),true);
        assert.equal(await card.locator('.period-pillar-legend .pair-legend-item').count(), 4,
          sampleDate + ' period ' + (periodIndex + 1) + ' must explain all four pair categories');
        assert.equal(await pillar.locator('[data-effective-number="7"]').count(), 1,
          sampleDate + ' period ' + (periodIndex + 1) + ' must map 0 to mnemonic 7');
        assert.ok(await pillar.locator('.pair-ring--outer-friend').count() > 0);
        assert.ok(await pillar.locator('.pair-ring--inner-friend').count() > 0);
        assert.ok(await pillar.locator('.pair-ring--outer-enemy').count() > 0);
        assert.ok(await pillar.locator('.pair-ring--inner-enemy').count() > 0);
        const isWednesdayRahu = weekdayIndex === 3 && periodIndex >= 4;
        assert.equal(await pillar.locator('[data-effective-number="8"]').count(), isWednesdayRahu ? 1 : 0,
          sampleDate + ' period ' + (periodIndex + 1) + ' Wednesday 4/8 alias boundary');
        if (isWednesdayRahu) {
          assert.equal(await pillar.locator('.pillar-number-alias').textContent(), '၈');
          assert.ok((await pillar.locator('.period-pillar-center').innerText()).includes('၄') ||
            await pillar.locator('.period-pillar-cell .pillar-number[data-effective-number="8"]').count() === 1);
        }
      }
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:4173/day.html?date=2026-11-05');
    const dayDimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert.ok(dayDimensions.document <= dayDimensions.viewport, `day page mobile horizontal overflow: ${JSON.stringify(dayDimensions)}`);
    assert.equal(await page.locator('#periodGrid .period-card').count(), 8);
    assert.deepEqual(await page.locator('#periodGrid .period-pillar').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).flexDirection)), Array(8).fill('column'));
    await page.goto('http://127.0.0.1:4173/day.html?date=1899-12-31');
    assert.equal(await page.locator('#dayError').isVisible(), true);
    assert.equal(await page.locator('#periodGrid .period-card').count(), 0);
    await page.goto('http://127.0.0.1:4173/day.html?date=1986-08-28');
    await page.locator('#calendarBack').click();
    assert.ok(page.url().includes('/calendar.html?date=1986-08-28'));
    assert.match(await page.locator('#calendarTitle').textContent(), /ဩဂုတ် ၁၉၈၆/);
    assert.equal(await page.locator('#calendarGrid .calendar-day.selected').getAttribute('data-date'), '1986-08-28');

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
