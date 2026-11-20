import './style.css';
import { mountCharacters } from './characters';
import { canMove, createGame, directionIndex, elapsed, move, moveDirection, type Direction, type Size } from './engine';
import { load, record, restore, save, type StorageLike } from './storage';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="page-shell">
    <header class="masthead">
      <a class="wordmark" href="./" aria-label="归位，数字华容道首页"><span class="brand-mark" aria-hidden="true">归</span><span>归位<span class="brand-sub">THE SLIDING PUZZLE</span></span></a>
      <button class="text-button" id="help-open" aria-haspopup="dialog"><span class="question" aria-hidden="true">?</span> 玩法说明</button>
    </header>
    <main>
      <div class="intro"><div><p class="eyebrow">一方珐琅 · 一刻专注</p><h1>数字华容道<span class="title-dot">。</span></h1></div><p class="intro-note">留一格空白，<br>让每个数字找到自己的位置。</p></div>
      <div class="game-layout">
        <section class="play-area" aria-label="华容道游戏区">
          <div class="board-top"><span id="board-label">三阶 · 轻松入门</span><span class="status" id="status">等待第一步</span></div>
          <div class="enamel-frame"><span class="screw s1" aria-hidden="true"></span><span class="screw s2" aria-hidden="true"></span><span class="screw s3" aria-hidden="true"></span><span class="screw s4" aria-hidden="true"></span>
            <div id="board" class="board" tabindex="0" role="group" aria-label="数字华容道棋盘" aria-describedby="input-help"><div class="empty-slot" aria-hidden="true"><span>归</span></div></div>
          </div>
          <div class="game-readout" aria-label="本局数据"><div><span>本局步数</span><strong id="moves">0</strong><small>步</small></div><span class="readout-line"></span><div><span>用时</span><strong id="timer">00:00</strong></div></div>
          <p id="live-message" class="live-message" role="status" aria-live="polite">点击相邻数字，开始这一局。</p>
        </section>
        <aside class="control-area" aria-label="游戏操作">
          <div class="control-heading"><span class="tiny-label">CHOOSE YOUR PACE</span><h2>从容，或是挑战。</h2></div>
          <div id="companion-host" class="companion-host" aria-label="陪伴角色"></div>
          <div class="size-picker" role="group" aria-label="棋盘尺寸"><button data-size="3" aria-pressed="true"><strong>3 × 3</strong><span>轻松入门</span></button><button data-size="4" aria-pressed="false"><strong>4 × 4</strong><span>进阶挑战</span></button></div>
          <div class="best-record"><span class="tiny-label">PERSONAL BEST / 个人最佳</span><p id="best">尚无纪录，等你归位。</p><small>最少步数与最快用时分别记录</small></div>
          <div class="movement-controls"><div><h3>让数字向这边移动</h3><p id="input-help">方向键 / 在棋盘上滑动<br>箭头始终表示<strong>数字块</strong>的移动方向</p></div><div class="dpad" role="group" aria-label="数字块移动方向"><button data-direction="up" aria-label="数字块向上移动">↑</button><button data-direction="left" aria-label="数字块向左移动">←</button><span aria-hidden="true">移</span><button data-direction="right" aria-label="数字块向右移动">→</button><button data-direction="down" aria-label="数字块向下移动">↓</button></div></div>
          <button id="restart" class="restart-button"><span aria-hidden="true">↻</span> 重新开局<span class="button-note">重新打乱</span></button>
          <p class="storage-note" id="storage-note">进度与纪录仅保存在这台设备</p>
          <div class="closing-note" aria-hidden="true"><span>01 — 08 / 15</span><p>不必急于抵达，<br>每一次移动，都更接近秩序。</p></div>
        </aside>
      </div>
    </main>
    <footer><span>归位 · 把片刻交还给自己</span><span>BLUE ENAMEL EDITION</span></footer>
  </div>
  <dialog id="help-dialog" aria-labelledby="help-title"><button class="dialog-close" data-close="help-dialog" aria-label="关闭玩法说明">×</button><p class="eyebrow">HOW TO PLAY</p><h2 id="help-title">一格之间，自有秩序。</h2><ol><li>将数字按从左到右、从上到下的顺序排列，最后一格留空。</li><li>点击与空格上下左右相邻的数字块，让它滑入空位；不能斜移或跨格。</li><li>先点击棋盘或用 Tab 聚焦棋盘，再使用方向键。方向键、触屏按钮与滑动均表示<strong>数字块移动方向</strong>。例如向左：空格右侧的数字向左滑入空位。</li><li>第一步有效移动开始计时，归位即停止。切换尺寸或重新开局会打乱新盘；无效移动不计步。关闭说明时本局继续计时。</li></ol><div class="goal-example" aria-label="三阶完成示例">${[1,2,3,4,5,6,7,8,''].map(n => `<span>${n}</span>`).join('')}</div><p class="dialog-footnote">每局由合法移动打乱，始终有解。刷新可续局；离开页面的时间不计入用时。</p><button class="primary-button" data-close="help-dialog">明白了，开始归位</button></dialog>
  <dialog id="win-dialog" aria-labelledby="win-title"><button class="dialog-close" data-close="win-dialog" aria-label="关闭完成结算">×</button><p class="eyebrow">EVERYTHING IN ITS PLACE</p><div class="win-seal" aria-hidden="true">归</div><h2 id="win-title">恰好，各归其位。</h2><p class="win-sub">你把散落的数字，拼成了秩序。</p><div class="win-result"><span><strong id="win-moves"></strong> 步</span><span><strong id="win-time"></strong> 用时</span></div><p id="win-best"></p><button class="primary-button" id="play-again">再来一局</button><button class="text-button finish-view" data-close="win-dialog">留在完成的棋盘</button></dialog>
`;
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
mountCharacters($('#companion-host'));
const board = $<HTMLDivElement>('#board');
const helpDialog = $<HTMLDialogElement>('#help-dialog');
const winDialog = $<HTMLDialogElement>('#win-dialog');
let storage: StorageLike | undefined;
try { storage = window.localStorage; } catch { /* Private mode may deny even the getter. */ }
let data = load(storage);
let game = data.current ? restore(data.current, Date.now()) : createGame(3);
let gesture: { x: number; y: number; id: number } | null = null;
let suppressClickUntil = 0;
let lastSize: Size | undefined;
const timeText = (ms: number) => {
  const total = Math.floor(ms / 1000), minutes = Math.floor(total / 60), seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
function persist() {
  const ok = save(storage, data, game, Date.now());
  $('#storage-note').textContent = ok ? '进度与纪录仅保存在这台设备' : '本地保存不可用，仍可正常游玩';
}
function openDialog(dialog: HTMLDialogElement) {
  dialog.showModal();
}
for (const dialog of [helpDialog, winDialog]) {
  // Native dialog closing restores focus synchronously. A queued `close`
  // listener must not steal focus from the user's subsequent Tab or action.
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const r = dialog.getBoundingClientRect();
    const e = event as MouseEvent;
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  } });
}
function render() {
  if (lastSize !== game.size) {
    board.querySelectorAll('.tile').forEach(tile => tile.remove());
    for (let n = 1; n < game.size * game.size; n++) {
      const button = document.createElement('button');
      button.className = 'tile';
      button.dataset.tile = String(n);
      button.innerHTML = `<span class="tile-face"><span class="tile-number">${n}</span><span class="tile-stamp" aria-hidden="true">·</span></span>`;
      board.append(button);
    }
    lastSize = game.size;
  }
  board.style.setProperty('--size', String(game.size));
  board.dataset.size = String(game.size);
  const position = (element: HTMLElement, i: number) => {
    element.style.left = `${(i % game.size) * 100 / game.size}%`;
    element.style.top = `${Math.floor(i / game.size) * 100 / game.size}%`;
  };
  board.querySelectorAll<HTMLButtonElement>('.tile').forEach(button => {
    const n = Number(button.dataset.tile), i = game.board.indexOf(n);
    position(button, i);
    const movable = game.status !== 'won' && canMove(game.board, i, game.size);
    button.dataset.movable = String(movable);
    button.setAttribute('aria-label', `数字 ${n}${movable ? '，可移入空格' : '，当前不可移动'}`);
    button.setAttribute('aria-disabled', String(!movable));
    button.tabIndex = movable ? 0 : -1;
  });
  position($('.empty-slot'), game.board.indexOf(0));
  $('#moves').textContent = String(game.moves);
  $('#timer').textContent = timeText(elapsed(game, Date.now()));
  $('#board-label').textContent = game.size === 3 ? '三阶 · 轻松入门' : '四阶 · 进阶挑战';
  $('#status').textContent = { ready: '等待第一步', playing: '归位进行中', won: '已完成归位' }[game.status];
  $('#status').dataset.state = game.status;
  document.querySelectorAll<HTMLButtonElement>('[data-size]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.size) === game.size)));
  document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(button => button.setAttribute('aria-disabled', String(game.status === 'won' || directionIndex(game, button.dataset.direction as Direction) === -1)));
  const best = data.best[game.size];
  $('#best').textContent = best ? `${best.moves} 步 / ${timeText(best.timeMs)}` : '尚无纪录，等你归位。';
}
function accept(next: typeof game) {
  if (next === game) {
    if (game.status !== 'won') $('#live-message').textContent = '这个方向暂时移不动，试试空格旁的数字。';
    return;
  }
  game = next;
  let improved = false;
  if (game.status === 'won') {
    const result = record(data, game); data = result.data; improved = result.improved;
  }
  render(); persist();
  $('#live-message').textContent = game.status === 'won' ? '完成！所有数字已归位。' : '继续移动，让数字依次归位。';
  if (game.status === 'won') {
    $('#win-moves').textContent = String(game.moves);
    $('#win-time').textContent = timeText(game.elapsedMs);
    $('#win-best').textContent = improved ? '新的个人最佳，值得记住的一局。' : '又完成了一次专注的挑战。';
    openDialog(winDialog);
  }
}
function restart(size = game.size) {
  gesture = null;
  if (winDialog.open) winDialog.close();
  game = createGame(size);
  render(); persist();
  $('#live-message').textContent = '新的一局已打乱，点击相邻数字开始。';
}
board.addEventListener('click', event => {
  if (Date.now() < suppressClickUntil) return;
  const tile = (event.target as Element).closest<HTMLButtonElement>('[data-tile]');
  if (tile) accept(move(game, game.board.indexOf(Number(tile.dataset.tile)), Date.now()));
});
board.addEventListener('keydown', event => {
  const direction = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as const)[event.key as 'ArrowUp'];
  if (direction && !helpDialog.open && !winDialog.open) {
    event.preventDefault();
    accept(moveDirection(game, direction, Date.now()));
  }
});
board.addEventListener('pointerdown', event => {
  if (event.pointerType === 'touch' || event.pointerType === 'pen') gesture = { x: event.clientX, y: event.clientY, id: event.pointerId };
});
board.addEventListener('pointerup', event => {
  if (!gesture || gesture.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
  gesture = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  event.preventDefault(); suppressClickUntil = Date.now() + 500;
  const direction: Direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  accept(moveDirection(game, direction, Date.now()));
  board.focus({ preventScroll: true });
});
board.addEventListener('pointercancel', () => { gesture = null; });
$('#help-open').addEventListener('click', () => openDialog(helpDialog));
document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(button => button.addEventListener('click', () => $<HTMLDialogElement>(`#${button.dataset.close}`).close()));
document.querySelectorAll<HTMLButtonElement>('[data-size]').forEach(button => button.addEventListener('click', () => { if (Number(button.dataset.size) !== game.size) restart(Number(button.dataset.size) as Size); }));
document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(button => button.addEventListener('click', () => accept(moveDirection(game, button.dataset.direction as Direction, Date.now()))));
$('#restart').addEventListener('click', () => restart());
$('#play-again').addEventListener('click', () => { restart(); board.focus(); });
window.setInterval(() => { $('#timer').textContent = timeText(elapsed(game, Date.now())); }, 200);
window.addEventListener('pagehide', persist);
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
render(); persist();
if (game.status === 'playing') $('#live-message').textContent = '已恢复上次进度，继续归位。';
if (game.status === 'won') $('#live-message').textContent = '上次挑战已完成，随时可以重新开局。';
