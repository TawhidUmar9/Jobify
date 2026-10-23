import { TestIds } from '../testIds';

describe('appearance testIDs', () => {
  it('exposes the required appearance testIDs and settings row', () => {
    expect(TestIds.settings.rowAppearance).toBe('settings-appearance');
    expect(TestIds.appearance.screen).toBe('appearance-screen');

    expect(TestIds.appearance.theme('system')).toBe('theme-system');
    expect(TestIds.appearance.theme('light')).toBe('theme-light');
    expect(TestIds.appearance.theme('dark')).toBe('theme-dark');

    expect(TestIds.appearance.textScale('system')).toBe('textScale-system');
    expect(TestIds.appearance.textScale('0.9')).toBe('textScale-0.9');
    expect(TestIds.appearance.textScale('1')).toBe('textScale-1');
    expect(TestIds.appearance.textScale('1.15')).toBe('textScale-1.15');
    expect(TestIds.appearance.textScale('1.3')).toBe('textScale-1.3');

    const zooms = [75, 90, 100, 115, 130, 150, 175, 200];
    zooms.forEach((z) => {
      expect(TestIds.appearance.webZoom(z)).toBe(`webZoom-${z}`);
    });

    expect(TestIds.appearance.reduceMotion('system')).toBe('reduceMotion-system');
    expect(TestIds.appearance.reduceMotion('on')).toBe('reduceMotion-on');
    expect(TestIds.appearance.reduceMotion('off')).toBe('reduceMotion-off');
  });
});
