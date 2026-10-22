/** Helpers for *.dom.test.ts files (jsdom). */

/** jsdom does not implement innerText; map it to textContent for tests. */
export function installInnerTextPolyfill(): void {
  if (!('innerText' in HTMLElement.prototype) || Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText') === undefined) {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get(this: HTMLElement) {
        return this.textContent ?? '';
      },
      set(this: HTMLElement, v: string) {
        this.textContent = v;
      },
    });
  }
}

export interface CapturedMessages {
  messages: unknown[];
  restore: () => void;
}

/** Installs window.ReactNativeWebView.postMessage capturing parsed JSON messages. */
export function captureBridgeMessages(): CapturedMessages {
  const messages: unknown[] = [];
  (window as unknown as { ReactNativeWebView: { postMessage: (s: string) => void } }).ReactNativeWebView = {
    postMessage: (s: string) => messages.push(JSON.parse(s)),
  };
  return {
    messages,
    restore: () => {
      delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    },
  };
}

/** Runs an injected script string the way the WebView would (global scope). */
export function runInjectedScript(script: string): void {
  // eslint-disable-next-line no-new-func
  new Function(script)();
}
