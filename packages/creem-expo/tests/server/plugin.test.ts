import { describe, it, expect } from 'vitest';
import { validateScheme, withCreemScheme } from '../../src/plugin/index';

function makeConfig(overrides: Record<string, unknown> = {}) {
  return { name: 'test', slug: 'test', ...overrides } as Parameters<typeof withCreemScheme>[0];
}

describe('validateScheme', () => {
  it('accepts a valid scheme', () => {
    expect(() => validateScheme('myapp')).not.toThrow();
  });

  it('accepts scheme with allowed special chars', () => {
    expect(() => validateScheme('my-app.v2+test')).not.toThrow();
  });

  it('throws on scheme starting with a digit', () => {
    expect(() => validateScheme('123app')).toThrow(/Invalid scheme/);
  });

  it('throws on scheme with spaces', () => {
    expect(() => validateScheme('my app')).toThrow(/Invalid scheme/);
  });

  it('throws on empty string', () => {
    expect(() => validateScheme('')).toThrow(/empty/);
  });
});

describe('withCreemScheme', () => {
  it('sets config.extra.creem.scheme from plugin props', () => {
    const config = makeConfig();
    const result = withCreemScheme(config, { scheme: 'myapp' });
    expect(result.extra?.creem?.scheme).toBe('myapp');
  });

  it('falls back to config.scheme when no props.scheme', () => {
    const config = makeConfig({ scheme: 'fallback' });
    const result = withCreemScheme(config, {});
    expect(result.extra?.creem?.scheme).toBe('fallback');
  });

  it('falls back to first element of config.scheme array', () => {
    const config = makeConfig({ scheme: ['first', 'second'] });
    const result = withCreemScheme(config, {});
    expect(result.extra?.creem?.scheme).toBe('first');
  });

  it('throws when no scheme in props or config', () => {
    const config = makeConfig();
    expect(() => withCreemScheme(config, {})).toThrow(/No scheme provided/);
  });

  it('registers iOS infoPlist mod', () => {
    const config = makeConfig({ scheme: 'testapp' });
    const result = withCreemScheme(config, {});
    expect(typeof (result as any).mods?.ios?.infoPlist).toBe('function');
  });

  it('registers Android manifest mod', () => {
    const config = makeConfig({ scheme: 'testapp' });
    const result = withCreemScheme(config, {});
    expect(typeof (result as any).mods?.android?.manifest).toBe('function');
  });
});
