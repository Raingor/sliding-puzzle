import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const base = process.env.GAME_URL || 'http://localhost:5178';
const key = 'puzzle-sliding-character-v1';
const out = fileURLToPath(new URL('../artifacts/', import.meta.url));
const label = process.env.SMOKE_LABEL || 'local';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const contexts = [], checks = [], errors = [];
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); console.log('PASS', name); };
async function setup({ raw, blocked = false, quota = false, mobile = false } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 360, height: 844 } : { width: 1440, height: 900 }, hasTouch: mobile, isMobile: mobile });
  contexts.push(context);
  await context.addInitScript(({ key, raw, blocked, quota }) => {
    if (blocked) Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
    else {
      if (!sessionStorage.getItem('character-seeded')) {
        localStorage.clear();
        if (raw !== undefined) localStorage.setItem(key, raw);
        sessionStorage.setItem('character-seeded', '1');
      }
      if (quota) Storage.prototype.setItem = function () { throw new DOMException('quota', 'QuotaExceededError'); };
    }
  }, { key, raw, blocked, quota });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`pageerror ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => errors.push(`request ${request.url()} ${request.failure()?.errorText}`));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#character-summary').waitFor();
  return page;
}
const open = async page => { if (!await page.locator('#character-picker').evaluate(el => el.open)) await page.locator('#character-summary').click(); };
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
try {
  await mkdir(out, { recursive: true });
  const page = await setup();
  check('default companion portrait and name visible outside board', await page.locator('#companion-image').isVisible() && await page.locator('#companion-name').textContent() === 'Joke Bear' && !await page.locator('#board #companion-image').count());
  await page.screenshot({ path: `${out}characters-${label}-desktop.png`, fullPage: true });
  await open(page);
  check('all nineteen choices available with accessible names', await page.locator('[data-character]').count() === 19 && await page.locator('[data-character]').evaluateAll(buttons => buttons.every(b => b.getAttribute('aria-label')?.startsWith('选择'))));
  await page.waitForFunction(() => [...document.querySelectorAll('.character-grid img')].every(img => img.complete && img.naturalWidth > 0));
  check('all nineteen local webp portraits decode with alt text', await page.locator('.character-grid img').evaluateAll(images => images.length === 19 && images.every(img => img.naturalWidth > 0 && img.alt && new URL(img.src).pathname.endsWith('.webp'))));
  const ids = await page.locator('[data-character]').evaluateAll(buttons => buttons.map(b => b.dataset.character));
  for (const id of ids) {
    await open(page);
    const button = page.locator(`[data-character="${id}"]`);
    const name = (await button.getAttribute('aria-label')).replace(/^选择/, '');
    await button.click();
    check(`choose ${id}: name portrait pressed state and close`, await page.locator('#companion-name').textContent() === name && await button.getAttribute('aria-pressed') === 'true' && await page.locator('[data-character][aria-pressed="true"]').count() === 1 && (await page.locator('#companion-image').getAttribute('src')).endsWith(`/${id}.webp`) && !await page.locator('#character-picker').evaluate(el => el.open));
  }
  await page.reload({ waitUntil: 'networkidle' });
  check('selection persists independently through refresh', await page.locator('#companion-name').textContent() === '海盗熊');
  await page.locator('#character-summary').focus();
  await page.keyboard.press('Enter');
  check('native summary opens using keyboard', await page.locator('#character-picker').evaluate(el => el.open));
  await page.keyboard.press('Tab');
  check('Tab reaches visible focused character button', await page.locator('[data-character="classic"]').evaluate(el => el === document.activeElement && getComputedStyle(el).outlineStyle === 'solid' && parseFloat(getComputedStyle(el).outlineWidth) >= 3));
  const movesBefore = await page.locator('#moves').textContent();
  await page.keyboard.press('ArrowLeft');
  check('character area arrow keys never move puzzle', await page.locator('#moves').textContent() === movesBefore);
  await page.keyboard.press('Enter');
  check('keyboard choice updates companion and focuses summary', await page.locator('#companion-name').textContent() === 'Joke Bear' && await page.locator('#character-summary').evaluate(el => el === document.activeElement));
  await open(page);
  await page.locator('[data-character="usagi"]').focus();
  await page.keyboard.press('Escape');
  check('Escape closes selector and returns focus without game input', !await page.locator('#character-picker').evaluate(el => el.open) && await page.locator('#character-summary').evaluate(el => el === document.activeElement) && await page.locator('#moves').textContent() === movesBefore);
  const mobile = await setup({ mobile: true });
  check('360px collapsed companion has no horizontal overflow', await noOverflow(mobile));
  await open(mobile);
  check('360px expanded nineteen-choice grid fits screen', await noOverflow(mobile));
  await mobile.screenshot({ path: `${out}characters-${label}-mobile.png`, fullPage: true });
  await mobile.locator('[data-character="bear-astronaut"]').tap();
  check('real touch choice at 360px works and collapses', await mobile.locator('#companion-name').textContent() === '太空熊' && !await mobile.locator('#character-picker').evaluate(el => el.open));
  for (const raw of ['{broken', JSON.stringify({ version: 1, id: 'unknown' }), JSON.stringify({ version: 2, id: 'usagi' })]) {
    const corrupt = await setup({ raw });
    check(`invalid saved choice safely defaults: ${raw}`, await corrupt.locator('#companion-name').textContent() === 'Joke Bear');
  }
  for (const mode of ['blocked', 'quota']) {
    const unavailable = await setup({ [mode]: true });
    await open(unavailable);
    await unavailable.locator('[data-character="hachiware"]').click();
    check(`${mode} storage still allows session character choice`, await unavailable.locator('#companion-name').textContent() === '小八');
    await unavailable.locator('.tile[data-movable="true"]').first().click();
    check(`${mode} storage never prevents playing puzzle`, await unavailable.locator('#moves').textContent() === '1');
  }
  check('no page console network or image errors', errors.length === 0);
  await writeFile(`${out}characters-${label}-report.json`, JSON.stringify({ base, checks, errors }, null, 2));
  console.log(`Completed ${checks.length} character checks at ${base}`);
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
  if (errors.length) console.error(errors.join('\n'));
}
