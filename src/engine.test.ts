import { describe, expect, it } from 'vitest';
import { canMove, createGame, directionIndex, elapsed, goal, isSolved, isValidBoard, move, moveDirection, neighbors, type Game, type Size } from './engine';

const seeded = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const fixture = (board = [1, 2, 3, 4, 5, 6, 7, 0, 8]): Game => ({ size: 3, board, moves: 0, status: 'ready', startedAt: null, elapsedMs: 0, shufflePath: [] });

describe.each([3, 4] as const)('%i阶合法打乱', size => {
  it.each(Array.from({ length: 40 }, (_, i) => i + 1))('种子 %i 保持排列、可解、非完成态且逆回放还原', seed => {
    const game = createGame(size, seeded(seed));
    expect([...game.board].sort((a, b) => a - b)).toEqual(Array.from({ length: size * size }, (_, i) => i));
    expect(isValidBoard(game.board, size)).toBe(true);
    expect(isSolved(game.board)).toBe(false);
    expect(game.moves).toBe(0);
    expect(game.status).toBe('ready');
    const board = [...game.board];
    let previous = -1;
    for (const index of [...game.shufflePath].reverse()) {
      const blank = board.indexOf(0);
      expect(canMove(board, index, size)).toBe(true);
      expect(index).not.toBe(previous); // no immediate reverse step in the shuffle
      [board[blank], board[index]] = [board[index], board[blank]];
      previous = blank;
    }
    expect(board).toEqual(goal(size));
  });
  it('固定随机源与异常随机值仍有限终止且可解', () => {
    for (const random of [() => 0, () => 1, () => -1, () => NaN, () => Infinity]) {
      const game = createGame(size, random, 2);
      expect(isValidBoard(game.board, size)).toBe(true);
      expect(isSolved(game.board)).toBe(false);
      expect(game.shufflePath.length).toBeLessThanOrEqual(3);
    }
  });
});

describe('移动与计时', () => {
  it('相邻只指曼哈顿距离1，不跨行', () => {
    expect(neighbors(2, 3)).toEqual([5, 1]);
    const board = [1, 2, 0, 3, 4, 5, 6, 7, 8];
    expect(canMove(board, 3, 3)).toBe(false);
    expect(canMove(board, 1, 3)).toBe(true);
    expect(canMove(board, 5, 3)).toBe(true);
    expect(canMove(board, 4, 3)).toBe(false);
  });
  it('无效操作不计步、不计时、不改变对象', () => {
    const game = fixture();
    for (const i of [-1, 0, 1, 3, 7, 9, 1.5, NaN]) expect(move(game, i, 100)).toBe(game);
    expect(game.moves).toBe(0);
    expect(elapsed(game, 10000)).toBe(0);
  });
  it('有效移动第一次启动计时且原状态不可变', () => {
    const game = fixture();
    const next = move(game, 6, 1000);
    expect(next.board).toEqual([1, 2, 3, 4, 5, 6, 0, 7, 8]);
    expect(game.board).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
    expect(next.moves).toBe(1);
    expect(next.status).toBe('playing');
    expect(elapsed(next, 4500)).toBe(3500);
    expect(elapsed(next, 500)).toBe(0);
    const invalid = move(next, 0, 8000);
    expect(invalid).toBe(next);
    expect(elapsed(invalid, 8000)).toBe(7000);
  });
  it('正确完成才获胜，时间冻结且完成后禁止操作', () => {
    let game = move(fixture(), 6, 1000);
    game = move(game, 7, 2000);
    expect(game.status).toBe('playing');
    game = move(game, 8, 5500);
    expect(game.status).toBe('won');
    expect(game.moves).toBe(3);
    expect(game.board).toEqual(goal(3));
    expect(elapsed(game, 999999)).toBe(4500);
    expect(move(game, 7, 10000)).toBe(game);
  });
  it('单步完成用时为0，合法而非伪造计时', () => {
    const game = move(fixture(), 8, 2000);
    expect(game.status).toBe('won');
    expect(game.elapsedMs).toBe(0);
  });
  it('方向表示数字块移动，与空格方向相反', () => {
    const game = fixture([1, 2, 3, 4, 0, 5, 6, 7, 8]);
    expect(directionIndex(game, 'up')).toBe(7);
    expect(directionIndex(game, 'down')).toBe(1);
    expect(directionIndex(game, 'left')).toBe(5);
    expect(directionIndex(game, 'right')).toBe(3);
    expect(moveDirection(game, 'left', 0).board[4]).toBe(5);
    expect(moveDirection(fixture(), 'up', 0)).toEqual(fixture());
  });
  it('重开产生独立计时/计步状态，不与旧局共享数组', () => {
    const old = move(createGame(4, seeded(2)), directionIndex(createGame(4, seeded(2)), 'left'), 5);
    const fresh = createGame(3, seeded(1));
    expect(fresh.moves).toBe(0); expect(fresh.startedAt).toBeNull(); expect(elapsed(fresh, 10000)).toBe(0);
    expect(old.board).not.toBe(fresh.board);
  });
});

describe('存档棋盘的排列与奇偶性', () => {
  it.each([3, 4] as Size[])('接受%i阶目标与合法局面，拒绝奇偶性不符', size => {
    expect(isValidBoard(goal(size), size)).toBe(true);
    const swapped = goal(size); [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    expect(isValidBoard(swapped, size)).toBe(false);
  });
  it('拒绝重复、越界、错长度和非整数', () => {
    for (const value of [null, [], [1,2,3,4,5,6,7,8,8], [1,2,3,4,5,6,7,8,9], [1,2,3,4,5,6,7,0,8.1]]) expect(isValidBoard(value, 3)).toBe(false);
  });
});
