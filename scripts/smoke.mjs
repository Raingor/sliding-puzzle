import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const base = process.env.GAME_URL || 'http://localhost:5178';
const out = fileURLToPath(new URL('../artifacts/', import.meta.url));
const key = 'puzzle-sliding-v1';
const label = process.env.SMOKE_LABEL || (new URL(base).port === '4178' ? 'preview' : 'dev');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], checks = [], contexts = [];
const check = (name, ok) => { assert.ok(ok, name); checks.push(name); console.log('PASS', name); };
const startingBoard = [1,2,3,4,0,6,7,5,8];
const fixture = (board = startingBoard, patch = {}) => ({ version: 1, best: {}, current: { size: 3, board, moves: 0, elapsedMs: 0, status: 'ready', ...patch } });
const getSave = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
async function setup(data = fixture(), options = {}, mode = '') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  contexts.push(context);
  await context.addInitScript(({ key, data, mode }) => {
    if (mode === 'blocked') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
    else if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(key, mode === 'corrupt' ? '{broken' : JSON.stringify(data));
      sessionStorage.setItem('seeded', '1');
    }
  }, { key, data, mode });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => errors.push(`resource: ${request.url()} ${request.failure()?.errorText}`));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('.tile').last().waitFor();
  return { page, context };
}
const stateMatches = (page, board) => page.waitForFunction(({ key, board }) => JSON.stringify(JSON.parse(localStorage.getItem(key)).current.board) === JSON.stringify(board), { key, board });
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
async function swipe(page, context, direction) {
  const box = await page.locator('#board').boundingBox();
  assert.ok(box);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const dx = direction === 'left' ? -80 : direction === 'right' ? 80 : 0;
  const dy = direction === 'up' ? -80 : direction === 'down' ? 80 : 0;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] });
  for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 5, y: y + dy * i / 5, id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
try {
  await mkdir(out, { recursive: true });
  const { page } = await setup();
  check('desktop 1440×900: eight enamel tiles and no horizontal overflow', await page.locator('.tile').count() === 8 && await noOverflow(page));
  await page.screenshot({ path: `${out}${label}-desktop.png`, fullPage: true });
  await page.locator('#help-open').focus();
  await page.keyboard.press('ArrowLeft');
  check('arrow keys outside board do not hijack page', (await getSave(page)).current.moves === 0);
  await page.locator('#help-open').click();
  check('rules open as accessible modal', await page.locator('#help-dialog').evaluate(el => el.open && el.matches(':modal')));
  await page.keyboard.press('ArrowUp');
  check('modal arrow keys cannot move background game', (await getSave(page)).current.moves === 0);
  await page.keyboard.press('Escape');
  check('Escape closes rules and restores focus', await page.locator('#help-open').evaluate(el => el === document.activeElement));
  await page.keyboard.press('Tab');
  check('real Tab reaches board with a clearly visible keyboard focus ring', await page.locator('#board').evaluate(el => {
    const style = getComputedStyle(el);
    return document.activeElement === el && el.matches(':focus-visible') && style.outlineStyle === 'solid' && parseFloat(style.outlineWidth) >= 3 && style.outlineColor === 'rgb(207, 126, 57)';
  }));
  await page.locator('#help-open').click();
  const focusRetained = await page.evaluate(async () => {
    document.querySelector('#help-dialog').close();
    const board = document.querySelector('#board');
    board.focus();
    // Flush the queued close event: it must not override subsequent focus.
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return document.activeElement === board;
  });
  check('queued dialog close event never steals subsequent board focus', focusRetained);
  const invalidBox = await page.locator('[data-tile="1"]').boundingBox();
  assert.ok(invalidBox);
  await page.mouse.click(invalidBox.x + invalidBox.width / 2, invalidBox.y + invalidBox.height / 2);
  check('nonadjacent real click does not count or start timer', (await getSave(page)).current.moves === 0 && await page.locator('#timer').textContent() === '00:00');
  await page.locator('[data-tile="5"]').click();
  await stateMatches(page, [1,2,3,4,5,6,7,0,8]);
  check('adjacent real click moves exactly one tile and one step', (await getSave(page)).current.moves === 1);
  await page.waitForTimeout(1250);
  check('timer starts only after valid move', await page.locator('#timer').textContent() !== '00:00');
  await page.locator('#board').focus();
  await page.keyboard.press('ArrowLeft');
  await page.locator('#win-dialog[open]').waitFor();
  const won = await getSave(page);
  check('real keyboard final step wins and records result', won.current.status === 'won' && won.current.moves === 2 && won.best[3].moves === 2 && won.best[3].timeMs >= 1000);
  const frozen = await page.locator('#timer').textContent();
  await page.waitForTimeout(1100);
  check('victory timer freezes', await page.locator('#timer').textContent() === frozen);
  await page.screenshot({ path: `${out}${label}-victory.png`, fullPage: true });
  await page.keyboard.press('Escape');
  await page.reload({ waitUntil: 'networkidle' });
  check('refresh restores victory and size-specific best', (await getSave(page)).best[3].moves === 2 && await page.locator('#best').textContent() !== '尚无纪录，等你归位。');
  await page.locator('[data-size="4"]').click();
  const four = await getSave(page);
  check('switch to 4×4 resets game but isolates 3×3 record', four.current.size === 4 && four.current.moves === 0 && four.current.board.length === 16 && await page.locator('.tile').count() === 15 && await page.locator('#best').textContent() === '尚无纪录，等你归位。');
  await page.screenshot({ path: `${out}${label}-four.png`, fullPage: true });
  await page.reload({ waitUntil: 'networkidle' });
  check('validated in-progress/ready board survives reload', same((await getSave(page)).current.board, four.current.board));
  const movable = page.locator('.tile[data-movable="true"]').first();
  await movable.click();
  await page.reload({ waitUntil: 'networkidle' });
  check('active state resumes after reload', (await getSave(page)).current.status === 'playing' && (await getSave(page)).current.moves === 1);
  await page.locator('#restart').click();
  check('restart clears time and steps without stale callback', (await getSave(page)).current.moves === 0 && await page.locator('#timer').textContent() === '00:00');
  await page.locator('#restart').click({ clickCount: 3 });
  await page.waitForTimeout(300);
  check('rapid restart remains a fresh legal-size game', (await getSave(page)).current.status === 'ready' && (await getSave(page)).current.board.length === 16);
  await page.locator('[data-size="3"]').click();
  check('switching back restores only the matching best', (await getSave(page)).best[3].moves === 2 && (await getSave(page)).best[4] === undefined);

  const mobile = await setup(fixture(), { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  check('390×844 mobile fits width', await noOverflow(mobile.page));
  await mobile.page.screenshot({ path: `${out}${label}-mobile.png`, fullPage: true });
  await mobile.page.locator('[data-tile="5"]').tap();
  await stateMatches(mobile.page, [1,2,3,4,5,6,7,0,8]);
  check('real touchscreen tap moves adjacent tile', (await getSave(mobile.page)).current.moves === 1);
  await mobile.page.locator('[data-direction="down"]').tap();
  await stateMatches(mobile.page, startingBoard);
  check('touchscreen direction button uses tile direction', (await getSave(mobile.page)).current.moves === 2);
  let expected = [...startingBoard];
  for (const direction of ['up', 'right', 'down', 'left']) {
    const blank = expected.indexOf(0), offset = { up: 3, down: -3, left: 1, right: -1 }[direction];
    [expected[blank], expected[blank + offset]] = [expected[blank + offset], expected[blank]];
    await swipe(mobile.page, mobile.context, direction);
    await stateMatches(mobile.page, expected);
    check(`real CDP touch swipe ${direction} moves TILE in stated direction`, same((await getSave(mobile.page)).current.board, expected));
  }
  check('swipes suppress synthetic extra click', (await getSave(mobile.page)).current.moves === 6);
  await mobile.page.setViewportSize({ width: 360, height: 844 });
  check('360px narrow screen has no horizontal overflow', await noOverflow(mobile.page));
  await mobile.page.locator('[data-size="4"]').tap();
  check('4×4 touch size switching remains responsive at 360px', (await getSave(mobile.page)).current.size === 4 && await noOverflow(mobile.page));
  await mobile.page.screenshot({ path: `${out}${label}-narrow-four.png`, fullPage: true });

  const fourFinish = fixture([1,2,3,4,5,6,7,8,9,10,11,12,13,14,0,15], { size: 4, moves: 12, elapsedMs: 4000, status: 'playing' });
  fourFinish.best = { 3: { moves: 2, timeMs: 1500 }, 4: { moves: 30, timeMs: 20000 } };
  const fourTouch = await setup(fourFinish, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await fourTouch.page.locator('[data-tile="15"]').tap();
  await fourTouch.page.locator('#win-dialog[open]').waitFor();
  const fourWon = await getSave(fourTouch.page);
  check('4×4 real final touch wins and improves the correct record', fourWon.current.status === 'won' && fourWon.best[4].moves === 13 && fourWon.best[4].timeMs < 20000 && fourWon.best[3].moves === 2);
  await fourTouch.page.locator('#play-again').tap();
  check('victory play-again starts fresh 4×4 and closes modal', !(await fourTouch.page.locator('#win-dialog').evaluate(el => el.open)) && (await getSave(fourTouch.page)).current.moves === 0);
  await fourTouch.page.reload({ waitUntil: 'networkidle' });
  check('improved 4×4 record survives refresh', (await getSave(fourTouch.page)).best[4].moves === 13);

  const reduced = await setup(fixture(), { reducedMotion: 'reduce' });
  check('reduced motion eliminates tile transition', await reduced.page.locator('.tile').first().evaluate(el => getComputedStyle(el).transitionDuration === '0s'));
  const broken = await setup(undefined, {}, 'corrupt');
  check('corrupt storage safely starts playable board', await broken.page.locator('.tile').count() === 8);
  const version = await setup({ version: 9, best: { 3: { moves: 1, timeMs: 1 } } });
  check('unsupported storage version safely ignored', (await getSave(version.page)).best[3] === undefined);
  const blocked = await setup(undefined, {}, 'blocked');
  await blocked.page.locator('.tile[data-movable="true"]').first().click();
  check('blocked localStorage still fully playable with honest feedback', await blocked.page.locator('#moves').textContent() === '1' && (await blocked.page.locator('#storage-note').textContent()).includes('不可用'));
  check('no pageerror, console error, failed request or HTTP error', errors.length === 0);
  await writeFile(`${out}${label}-report.json`, JSON.stringify({ base, checks, errors, screenshots: [`${label}-desktop.png`, `${label}-victory.png`, `${label}-four.png`, `${label}-mobile.png`, `${label}-narrow-four.png`] }, null, 2));
  console.log(`Completed ${checks.length} browser checks at ${base}`);
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
  if (errors.length) console.error(errors.join('\n'));
}
