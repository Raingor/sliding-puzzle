import { elapsed, isSolved, isValidBoard, type Game, type Size } from './engine';

export const STORAGE_KEY = 'puzzle-sliding-v1';
export interface Best { moves: number; timeMs: number }
export interface StoredGame { size: Size; board: number[]; moves: number; elapsedMs: number; status: 'ready' | 'playing' | 'won' }
export interface SavedData { version: 1; best: Partial<Record<Size, Best>>; current?: StoredGame }
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
const empty = (): SavedData => ({ version: 1, best: {} });
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= Number.MAX_SAFE_INTEGER;
const count = (v: unknown): v is number => finite(v) && Number.isInteger(v);

function currentGame(v: unknown): StoredGame | undefined {
  if (!object(v) || (v.size !== 3 && v.size !== 4) || !isValidBoard(v.board, v.size) || !count(v.moves) || !finite(v.elapsedMs)) return;
  if (v.status !== 'ready' && v.status !== 'playing' && v.status !== 'won') return;
  const solved = isSolved(v.board);
  if ((v.status === 'won') !== solved) return;
  if (v.status === 'ready' && (v.moves !== 0 || v.elapsedMs !== 0)) return;
  if (v.status !== 'ready' && v.moves === 0) return;
  return { size: v.size, board: [...v.board], moves: v.moves, elapsedMs: v.elapsedMs, status: v.status };
}
export function load(storage?: StorageLike): SavedData {
  try {
    const raw: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null');
    if (!object(raw) || raw.version !== 1 || !object(raw.best)) return empty();
    const best: SavedData['best'] = {};
    for (const size of [3, 4] as const) {
      const value = raw.best[size];
      if (object(value) && count(value.moves) && value.moves > 0 && finite(value.timeMs)) best[size] = { moves: value.moves, timeMs: value.timeMs };
    }
    return { version: 1, best, current: currentGame(raw.current) };
  } catch { return empty(); }
}
export function save(storage: StorageLike | undefined, data: SavedData, game: Game, now: number): boolean {
  try {
    if (!storage) return false;
    const current: StoredGame = { size: game.size, board: game.board, moves: game.moves, elapsedMs: elapsed(game, now), status: game.status };
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, best: data.best, current }));
    return true;
  } catch { return false; }
}
export function restore(stored: StoredGame, now: number): Game {
  return { ...stored, board: [...stored.board], startedAt: stored.status === 'playing' ? now : null, shufflePath: [] };
}
export function record(data: SavedData, game: Game): { data: SavedData; improved: boolean } {
  if (game.status !== 'won') return { data, improved: false };
  const previous = data.best[game.size];
  const best = { moves: Math.min(previous?.moves ?? Infinity, game.moves), timeMs: Math.min(previous?.timeMs ?? Infinity, game.elapsedMs) };
  const improved = !previous || best.moves < previous.moves || best.timeMs < previous.timeMs;
  return { data: { ...data, best: { ...data.best, [game.size]: best } }, improved };
}
