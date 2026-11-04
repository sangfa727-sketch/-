const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'js/mm-calendar-core.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'calendar-100-years.html'), 'utf8');
const sandbox = {};
vm.runInNewContext(core, sandbox, { filename: 'mm-calendar-core.js' });

test('2026-11-04 converts to ME 1388 Thadingyut waning day 9', () => {
  const jdn = sandbox.w2j(2026, 11, 4, 1);
  const result = sandbox.j2m(jdn);
  assert.equal(result.my, 1388);
  assert.equal(result.mm, 7);
  assert.equal(result.mp, 2);
  assert.equal(result.fd, 9);
  assert.equal(result.wd, 4); // Wednesday; 0=Saturday
});

test('1986-08-28 converts to ME 1348 Wagaung waning day 8 Thursday', () => {
  const result = sandbox.j2m(sandbox.w2j(1986, 8, 28, 1));
  assert.equal(result.my, 1348);
  assert.equal(result.mm, 5);
  assert.equal(result.mp, 2);
  assert.equal(result.fd, 8);
  assert.equal(result.wd, 5); // Thursday; 0=Saturday
});

test('calendar core returns valid dates for every day in 2026-2125', () => {
  let checked = 0;
  let previousJdn = null;
  const yearTypes = new Set();

  for (let year = 2026; year <= 2125; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const monthLength = new Date(Date.UTC(year, month, 0)).getUTCDate();
      for (let day = 1; day <= monthLength; day += 1) {
        const jdn = sandbox.w2j(year, month, day, 1);
        const result = sandbox.j2m(jdn);
        assert.ok(result.my >= 1387 && result.my <= 1487, `Myanmar year out of expected range: ${year}-${month}-${day}`);
        assert.ok(result.mm >= 0 && result.mm <= 14, `Invalid Myanmar month: ${year}-${month}-${day}`);
        assert.ok(result.md >= 1 && result.md <= 30, `Invalid Myanmar month-day: ${year}-${month}-${day}`);
        assert.ok(result.myt >= 0 && result.myt <= 2, `Invalid Myanmar year type: ${year}-${month}-${day}`);
        if (previousJdn !== null) assert.equal(jdn, previousJdn + 1);
        previousJdn = jdn;
        yearTypes.add(result.myt);
        checked += 1;
      }
    }
  }

  assert.equal(checked, 36524);
  assert.deepEqual([...yearTypes].sort(), [0, 1, 2]);
});

test('historical and future date lookup plus date-gap UI are present', () => {
  assert.match(html, /min="1900-01-01"/);
  assert.match(html, /max="2125-12-31"/);
  assert.match(html, /id="dateInput"/);
  assert.match(html, /id="dateText"/);
  assert.match(html, /id="dateGap"/);
  assert.match(html, /function calendarGap\(/);
  assert.match(html, /id="calendarGrid"/);
});

test('free-text parser accepts supported date formats and rejects malformed input', () => {
  const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, 'inline application script not found');
  const start = match[1].indexOf('function parseFreeDate');
  const end = match[1].indexOf('function updateResult');
  assert.ok(start >= 0 && end > start, 'free-text parser not found');
  const parserSandbox = {};
  vm.runInNewContext(match[1].slice(start, end) + '; this.parseFreeDate = parseFreeDate;', parserSandbox);
  for (const value of ['28,8,1986', '28/08/1986', '28-08-1986']) {
    const parsed = parserSandbox.parseFreeDate(value);
    assert.equal(parsed.y, 1986);
    assert.equal(parsed.m, 8);
    assert.equal(parsed.d, 28);
  }
  const iso = parserSandbox.parseFreeDate('1986-08-28');
  assert.deepEqual({ y: iso.y, m: iso.m, d: iso.d }, { y: 1986, m: 8, d: 28 });
  assert.equal(parserSandbox.parseFreeDate('not-a-date'), null);
  assert.equal(parserSandbox.parseFreeDate('28,8,86'), null);
  for (const invalid of ['31,2,2024', '29,2,2023', '0,1,2024', '1,13,2024']) {
    assert.equal(parserSandbox.parseFreeDate(invalid), null, invalid);
  }
  assert.match(html, /function clearResults\(/);
  assert.match(html, /function rejectFreeDate\(/);
});

test('calendar date gap reports years, months, days and correct direction', () => {
  const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, 'inline application script not found');
  const start = match[1].indexOf('function dateOnlyUTC');
  const end = match[1].indexOf('function parseFreeDate');
  assert.ok(start >= 0 && end > start, 'date gap helpers not found');
  const helperSandbox = {};
  vm.runInNewContext(match[1].slice(start, end) + '; this.calendarGap = calendarGap;', helperSandbox);
  const past = helperSandbox.calendarGap(new Date(2026, 10, 4), new Date(1986, 7, 28));
  assert.equal(past.years, 40);
  assert.equal(past.months, 2);
  assert.equal(past.days, 7);
  assert.equal(past.direction, 'ရှာဖွေသည့်နေ့သည် အတိတ်');
  const future = helperSandbox.calendarGap(new Date(2026, 10, 4), new Date(2030, 11, 12));
  assert.equal(future.direction, 'ရှာဖွေသည့်နေ့သည် အနာဂတ်');
});

test('inline browser script has valid JavaScript syntax', () => {
  const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, 'inline application script not found');
  assert.doesNotThrow(() => new vm.Script(match[1], { filename: 'calendar-100-years.inline.js' }));
});

test('calendar gap handles month ends and leap-day anniversaries without negative days', () => {
  const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, 'inline application script not found');
  const start = match[1].indexOf('function dateOnlyUTC');
  const end = match[1].indexOf('function parseFreeDate');
  const helperSandbox = {};
  vm.runInNewContext(match[1].slice(start, end) + '; this.calendarGap = calendarGap;', helperSandbox);
  const cases = [
    [new Date(2024, 0, 31), new Date(2024, 2, 1), 0, 1, 1, 30],
    [new Date(2023, 0, 31), new Date(2023, 1, 28), 0, 1, 0, 28],
    [new Date(2024, 1, 29), new Date(2025, 1, 28), 1, 0, 0, 365],
    [new Date(2023, 11, 31), new Date(2024, 0, 30), 0, 0, 30, 30],
  ];
  for (const [from, to, years, months, days, total] of cases) {
    const result = helperSandbox.calendarGap(from, to);
    assert.deepEqual([result.years, result.months, result.days, result.total], [years, months, days, total]);
    assert.ok(result.days >= 0);
  }
});

test('historical lookup core returns valid Myanmar dates for every day in 1900-2025', () => {
  let checked = 0;
  for (let year = 1900; year <= 2025; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const monthLength = new Date(Date.UTC(year, month, 0)).getUTCDate();
      for (let day = 1; day <= monthLength; day += 1) {
        const result = sandbox.j2m(sandbox.w2j(year, month, day, 1));
        assert.ok(result.my >= 1260 && result.my <= 1387, `Myanmar year out of historical range: ${year}-${month}-${day}`);
        assert.ok(result.mm >= 0 && result.mm <= 14);
        assert.ok(result.md >= 1 && result.md <= 30);
        assert.ok(result.myt >= 0 && result.myt <= 2);
        checked += 1;
      }
    }
  }
  assert.ok(checked > 45000);
});
