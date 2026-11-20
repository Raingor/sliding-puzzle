import './characters.css';

/** Local catalog: no runtime dependency on the original game. */
export const CHARACTERS = [
  { id: 'classic', name: 'Joke Bear', short: '自嘲熊' },
  { id: 'chiikawa', name: '吉伊', short: '吉伊' },
  { id: 'hachiware', name: '小八', short: '小八' },
  { id: 'usagi', name: '乌萨奇', short: '乌萨奇' },
  { id: 'mole-croquette', name: '鼹鼠饼', short: '鼹鼠饼' },
  { id: 'old-dog', name: '老头狗', short: '老头狗' },
  { id: 'bear-raincoat', name: '小黄鸭雨衣熊', short: '雨衣熊' },
  { id: 'bear-pajama', name: '睡衣派对熊', short: '睡衣熊' },
  { id: 'bear-ninja', name: '夜行忍者熊', short: '忍者熊' },
  { id: 'kurimanju', name: '栗子馒头', short: '栗子馒头' },
  { id: 'momonga', name: '飞鼠', short: '飞鼠' },
  { id: 'rakko', name: '海獭', short: '海獭' },
  { id: 'shisa', name: '狮萨', short: '狮萨' },
  { id: 'furuhonya', name: '古本屋', short: '古本屋' },
  { id: 'bear-strawberry', name: '草莓熊', short: '草莓熊' },
  { id: 'bear-frog', name: '青蛙熊', short: '青蛙熊' },
  { id: 'bear-astronaut', name: '太空熊', short: '太空熊' },
  { id: 'bear-chef', name: '厨师熊', short: '厨师熊' },
  { id: 'bear-pirate', name: '海盗熊', short: '海盗熊' },
] as const;
export const CHARACTER_KEY = 'puzzle-sliding-character-v1';
type Character = typeof CHARACTERS[number];
interface CharacterStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
const findCharacter = (id: unknown): Character | undefined => CHARACTERS.find(character => character.id === id);
export function readCharacter(storage?: CharacterStorage): Character {
  try {
    const data: unknown = JSON.parse(storage?.getItem(CHARACTER_KEY) ?? 'null');
    if (typeof data === 'object' && data !== null && 'version' in data && data.version === 1 && 'id' in data) return findCharacter(data.id) ?? CHARACTERS[0];
  } catch { /* Storage access and damaged JSON both safely use the default. */ }
  return CHARACTERS[0];
}
export function writeCharacter(storage: CharacterStorage | undefined, id: string): boolean {
  if (!storage || !findCharacter(id)) return false;
  try { storage.setItem(CHARACTER_KEY, JSON.stringify({ version: 1, id })); return true; } catch { return false; }
}
export function mountCharacters(host: HTMLElement): void {
  let storage: CharacterStorage | undefined;
  try { storage = window.localStorage; } catch { /* Still allow session-only selection. */ }
  let selected = readCharacter(storage);
  const image = (character: Character) => `./characters-2d/${character.id}.webp`;
  host.innerHTML = `<details class="character-picker" id="character-picker">
    <summary id="character-summary" aria-label="选择陪伴角色">
      <span class="companion-portrait"><img id="companion-image" width="64" height="64" alt="${selected.name}头像" src="${image(selected)}"></span>
      <span class="companion-copy"><span class="companion-label">YOUR QUIET COMPANY / 陪你归位</span><strong id="companion-name">${selected.name}</strong><span class="companion-invite">换个伙伴，慢慢归位 <span aria-hidden="true">⌄</span></span></span>
    </summary>
    <div class="character-panel"><p class="character-panel-heading">选一位伙伴，陪你专注这一局。<span>19 位 · 全部可选</span></p><div class="character-grid" role="group" aria-label="全部19位陪伴角色">${CHARACTERS.map(character => `<button type="button" class="character-option" data-character="${character.id}" aria-label="选择${character.name}" aria-pressed="${character.id === selected.id}"><img src="${image(character)}" alt="${character.name}头像" width="52" height="52"><span>${character.short}</span></button>`).join('')}</div><p class="character-save-note" id="character-save-note" role="status">角色仅保存在这台设备，不影响游戏进度。</p></div>
  </details>`;
  const details = host.querySelector<HTMLDetailsElement>('details')!;
  const summary = host.querySelector<HTMLElement>('summary')!;
  const notice = host.querySelector<HTMLElement>('#character-save-note')!;
  host.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(button => {
    button.addEventListener('click', () => {
      const character = findCharacter(button.dataset.character);
      if (!character) return;
      selected = character;
      const portrait = host.querySelector<HTMLImageElement>('#companion-image')!;
      portrait.src = image(selected); portrait.alt = `${selected.name}头像`;
      host.querySelector<HTMLElement>('#companion-name')!.textContent = selected.name;
      host.querySelectorAll<HTMLButtonElement>('[data-character]').forEach(option => option.setAttribute('aria-pressed', String(option.dataset.character === selected.id)));
      const saved = writeCharacter(storage, selected.id);
      notice.textContent = saved ? `已选择${selected.name}，下次还会陪着你。` : `已选择${selected.name}；本地保存不可用，仅本次有效。`;
      details.open = false;
      summary.focus({ preventScroll: true });
    });
  });
  details.addEventListener('keydown', event => {
    if (event.key === 'Escape' && details.open) {
      event.preventDefault(); event.stopPropagation();
      details.open = false; summary.focus({ preventScroll: true });
    }
  });
}
