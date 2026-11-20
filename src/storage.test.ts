import { describe, expect, it } from 'vitest';
import { createGame, move, type Game } from './engine';
import { load, record, restore, save, STORAGE_KEY, type SavedData, type StorageLike } from './storage';

const base: SavedData = { version: 1, best: {} };
const store = (raw: unknown): StorageLike => ({ getItem: () => typeof raw === 'string' ? raw : JSON.stringify(raw), setItem: () => {} });
const current = { size: 3, board: [1,2,3,4,5,6,7,0,8], moves: 5, elapsedMs: 4500, status: 'playing' };

describe('安全本地存储', () => {
  it('使用独立版本化key', () => { expect(STORAGE_KEY).toBe('puzzle-sliding-v1'); });
  it('坏JSON、未知版本和不正确根字段安全降级', () => {
    for (const raw of ['{', 'null', '[]', {}, { version: 2, best: {} }, { version: 1, best: [] }, { version: '1', best: {} }]) expect(load(store(raw))).toEqual(base);
  });
  it('存储get/set抛错或不存在仍可游戏', () => {
    const throwing: StorageLike = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } };
    expect(load(throwing)).toEqual(base);
    expect(load()).toEqual(base);
    expect(save(throwing, base, createGame(3), 0)).toBe(false);
    expect(save(undefined, base, createGame(3), 0)).toBe(false);
  });
  it('最佳成绩逐尺寸校验字段、拒绝负数和错误类型', () => {
    expect(load(store({ version: 1, best: { 3: { moves: 20, timeMs: 3000 }, 4: { moves: -1, timeMs: 'fast' } } })).best).toEqual({ 3: { moves: 20, timeMs: 3000 } });
    expect(load(store({ version: 1, best: { 3: { moves: 1.5, timeMs: 30 }, 4: { moves: 0, timeMs: 0 } } })).best).toEqual({});
  });
  it('合法进行中局面可恢复且离线时间不计入', () => {
    const data = load(store({ ...base, current }));
    expect(data.current).toEqual(current);
    const game = restore(data.current!, 90000);
    expect(game.startedAt).toBe(90000);
    expect(game.elapsedMs).toBe(4500);
    expect(game.shufflePath).toEqual([]);
  });
  it('ready/won以一致状态恢复', () => {
    const ready = load(store({ ...base, current: { ...current, status: 'ready', moves: 0, elapsedMs: 0 } })).current!;
    expect(restore(ready, 10).startedAt).toBeNull();
    const won = load(store({ ...base, current: { ...current, board: [1,2,3,4,5,6,7,8,0], status: 'won' } })).current!;
    expect(restore(won, 10).status).toBe('won');
  });
  it.each([
    { size: 5 }, { board: [1,2,3,4,5,6,7,8,8] }, { board: [2,1,3,4,5,6,7,8,0] },
    { moves: -1 }, { moves: 1.1 }, { elapsedMs: -5 }, { elapsedMs: '22' }, { status: 'paused' },
    { status: 'won' }, { status: 'ready' }, { status: 'playing', moves: 0 }, { board: [1,2,3,4,5,6,7,8,0] },
  ])('拒绝不合法存档 %o', patch => {
    expect(load(store({ ...base, current: { ...current, ...patch } })).current).toBeUndefined();
  });
  it('序列化保存实时用时，不写startedAt或内部打乱路径', () => {
    let key = '', raw = '';
    const storage: StorageLike = { getItem: () => raw, setItem: (k, v) => { key = k; raw = v; } };
    const game = restore(current as Parameters<typeof restore>[0], 1000);
    expect(save(storage, base, game, 2500)).toBe(true);
    expect(key).toBe(STORAGE_KEY);
    expect(JSON.parse(raw).current.elapsedMs).toBe(6000);
    expect(JSON.parse(raw).current.startedAt).toBeUndefined();
    expect(load(storage).current?.board).toEqual(current.board);
  });
  it('个人最少步数和最快用时分别更新、尺寸隔离、未胜利不记录', () => {
    const game = { ...restore(current as Parameters<typeof restore>[0], 0), status: 'won', moves: 8, elapsedMs: 5000, startedAt: null } as Game;
    let result = record(base, game);
    expect(result.improved).toBe(true);
    result = record(result.data, { ...game, moves: 10, elapsedMs: 3000 });
    expect(result.data.best[3]).toEqual({ moves: 8, timeMs: 3000 });
    result = record(result.data, { ...game, size: 4, moves: 40 });
    expect(result.data.best[4]?.moves).toBe(40);
    expect(result.data.best[3]?.moves).toBe(8);
    expect(record(result.data, createGame(3)).data).toBe(result.data);
    expect(record(result.data, { ...game, moves: 20, elapsedMs: 6000 }).improved).toBe(false);
  });
});
