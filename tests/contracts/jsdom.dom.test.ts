/**
 * Proves the 'dom' Jest project works for injected-script tests.
 * jsdom has no innerText: tests polyfill it with installInnerTextPolyfill() from tests/helpers/dom.ts.
 */
import { installInnerTextPolyfill } from '../helpers/dom';

describe('dom project', () => {
  it('supports labels, native setters and the innerText polyfill', () => {
    installInnerTextPolyfill();
    document.body.innerHTML = '<label for="a">Name</label><input id="a"><label>Why<textarea></textarea></label>';
    const input = document.getElementById('a') as HTMLInputElement;
    expect(input.labels?.[0].innerText).toBe('Name');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
    expect(typeof setter).toBe('function');
  });
});
