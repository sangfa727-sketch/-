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

test('date picker and 100-year range are present', () => {
  assert.match(html, /min="2026-01-01"/);
  assert.match(html, /max="2125-12-31"/);
  assert.match(html, /id="dateInput"/);
  assert.match(html, /id="calendarGrid"/);
});

test('inline browser script has valid JavaScript syntax', () => {
  const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, 'inline application script not found');
  assert.doesNotThrow(() => new vm.Script(match[1], { filename: 'calendar-100-years.inline.js' }));
});
