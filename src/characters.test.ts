import { describe, expect, it } from 'vitest';
import { CHARACTERS, CHARACTER_KEY, readCharacter, writeCharacter } from './characters';

const store = (value: unknown) => ({ getItem: () => typeof value === 'string' ? value : JSON.stringify(value), setItem: () => {} });
describe('独立陪伴角色存储', () => {
  it('19个唯一人物全部可选', () => { expect(CHARACTERS).toHaveLength(19); expect(new Set(CHARACTERS.map(c => c.id)).size).toBe(19); });
  it.each(CHARACTERS)('保存的$id可恢复', character => { expect(readCharacter(store({ version: 1, id: character.id }))).toBe(character); });
  it.each(['{bad', 'null', '[]', { version: 2, id: 'usagi' }, { version: 1, id: 'invalid' }, { version: 1, id: '<script>' }, { id: 'usagi' }, { version: 1, id: 3 }])('损坏字段安全默认 %o', raw => { expect(readCharacter(store(raw)).id).toBe('classic'); });
  it('没有存储或读写抛错仍可用', () => {
    const storage = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } };
    expect(readCharacter().id).toBe('classic'); expect(readCharacter(storage).id).toBe('classic');
    expect(writeCharacter(storage, 'usagi')).toBe(false); expect(writeCharacter(undefined, 'usagi')).toBe(false);
  });
  it('独立key并拒绝未知id写入', () => {
    let savedKey = '', raw = '';
    const storage = { getItem: () => raw, setItem: (key: string, value: string) => { savedKey = key; raw = value; } };
    expect(writeCharacter(storage, 'invalid')).toBe(false); expect(raw).toBe('');
    expect(writeCharacter(storage, 'bear-astronaut')).toBe(true); expect(savedKey).toBe(CHARACTER_KEY);
    expect(readCharacter(storage).id).toBe('bear-astronaut');
  });
});
