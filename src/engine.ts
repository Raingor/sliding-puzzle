export type Size = 3 | 4;
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Status = 'ready' | 'playing' | 'won';
export interface Game {
  size: Size;
  board: number[];
  moves: number;
  status: Status;
  startedAt: number | null;
  elapsedMs: number;
  /** Previous blank positions, reversed to replay the shuffle back to its goal. */
  shufflePath: number[];
}

export const goal = (size: Size): number[] => Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size));
export const isSolved = (board: readonly number[]): boolean => board.every((tile, i) => tile === (i + 1) % board.length);
export function neighbors(index: number, size: Size): number[] {
  const row = Math.floor(index / size), col = index % size;
  return [row > 0 ? index - size : -1, row < size - 1 ? index + size : -1,
    col > 0 ? index - 1 : -1, col < size - 1 ? index + 1 : -1].filter(i => i >= 0);
}
export function canMove(board: readonly number[], index: number, size: Size): boolean {
  return Number.isInteger(index) && index >= 0 && index < board.length && board[index] !== 0 && neighbors(board.indexOf(0), size).includes(index);
}

/** A bounded legal walk, not a random permutation or a runtime solver. */
export function createGame(size: Size, random: () => number = Math.random, steps = size === 3 ? 72 : 160): Game {
  const board = goal(size), shufflePath: number[] = [];
  let blank = board.length - 1, previousBlank = -1;
  const walk = () => {
    const choices = neighbors(blank, size).filter(i => i !== previousBlank);
    const value = random();
    const normalized = Number.isFinite(value) ? Math.max(0, Math.min(0.999999999, value)) : 0;
    const next = choices[Math.floor(normalized * choices.length)];
    shufflePath.push(blank);
    [board[blank], board[next]] = [board[next], board[blank]];
    previousBlank = blank;
    blank = next;
  };
  const count = Number.isFinite(steps) ? Math.max(1, Math.min(10000, Math.floor(steps))) : 1;
  for (let step = 0; step < count; step++) walk();
  if (isSolved(board)) walk();
  return { size, board, moves: 0, status: 'ready', startedAt: null, elapsedMs: 0, shufflePath };
}

export function elapsed(game: Game, now: number): number {
  return game.elapsedMs + (game.startedAt === null ? 0 : Math.max(0, now - game.startedAt));
}
export function move(game: Game, index: number, now: number): Game {
  if (game.status === 'won' || !canMove(game.board, index, game.size)) return game;
  const board = [...game.board], blank = board.indexOf(0);
  [board[blank], board[index]] = [board[index], board[blank]];
  const next: Game = { ...game, board, moves: game.moves + 1, status: 'playing', startedAt: game.startedAt ?? now };
  if (isSolved(board)) {
    next.elapsedMs = elapsed(next, now);
    next.startedAt = null;
    next.status = 'won';
  }
  return next;
}

/** Directions always describe the TILE movement, not the blank movement. */
export function directionIndex(game: Game, direction: Direction): number {
  const blank = game.board.indexOf(0), size = game.size;
  const index = { up: blank + size, down: blank - size, left: blank + 1, right: blank - 1 }[direction];
  return canMove(game.board, index, size) ? index : -1;
}
export function moveDirection(game: Game, direction: Direction, now: number): Game {
  return move(game, directionIndex(game, direction), now);
}

export function isValidBoard(value: unknown, size: Size): value is number[] {
  if (!Array.isArray(value) || value.length !== size * size || !value.every(n => Number.isInteger(n) && n >= 0 && n < size * size) || new Set(value).size !== size * size) return false;
  const nonzero = value.filter(n => n !== 0);
  let inversions = 0;
  for (let i = 0; i < nonzero.length; i++) for (let j = i + 1; j < nonzero.length; j++) if (nonzero[i] > nonzero[j]) inversions++;
  const blankRowFromBottom = size - Math.floor(value.indexOf(0) / size);
  return size % 2 === 1 ? inversions % 2 === 0 : (inversions + blankRowFromBottom) % 2 === 1;
}
