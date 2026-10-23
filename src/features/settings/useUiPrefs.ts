import { useEffect, useSyncExternalStore } from 'react';

import { kvGet, kvSet, KV_KEYS } from '../../services/kvStore';
import type { TextScale } from '../../theme/tokens';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ReduceMotionMode = 'system' | 'on' | 'off';

export interface UiPrefsState {
  themeMode: ThemeMode;
  textScale: TextScale;
  webZoom: number;
  reduceMotion: ReduceMotionMode;
}

export const VALID_WEB_ZOOMS = [75, 90, 100, 115, 130, 150, 175, 200] as const;

let prefsState: UiPrefsState = {
  themeMode: 'system',
  textScale: 'system',
  webZoom: 100,
  reduceMotion: 'system',
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore
    }
  });
}

let initPromise: Promise<UiPrefsState> | null = null;

export async function loadUiPrefs(): Promise<UiPrefsState> {
  const [themeMode, textScale, webZoomStr, reduceMotion] = await Promise.all([
    kvGet(KV_KEYS.themeMode),
    kvGet(KV_KEYS.textScale),
    kvGet(KV_KEYS.webZoom),
    kvGet(KV_KEYS.reduceMotion),
  ]);

  const validThemeMode: ThemeMode =
    themeMode === 'light' || themeMode === 'dark' || themeMode === 'system'
      ? themeMode
      : 'system';

  const validTextScale: TextScale =
    textScale === '0.9' ||
    textScale === '1' ||
    textScale === '1.15' ||
    textScale === '1.3' ||
    textScale === 'system'
      ? textScale
      : 'system';

  const parsedZoom = webZoomStr ? parseInt(webZoomStr, 10) : 100;
  const validWebZoom = (VALID_WEB_ZOOMS as readonly number[]).includes(parsedZoom)
    ? parsedZoom
    : 100;

  const validReduceMotion: ReduceMotionMode =
    reduceMotion === 'on' || reduceMotion === 'off' || reduceMotion === 'system'
      ? reduceMotion
      : 'system';

  prefsState = {
    themeMode: validThemeMode,
    textScale: validTextScale,
    webZoom: validWebZoom,
    reduceMotion: validReduceMotion,
  };
  notify();
  return prefsState;
}

export function initUiPrefs(): Promise<UiPrefsState> {
  if (!initPromise) {
    initPromise = loadUiPrefs();
  }
  return initPromise;
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  prefsState = { ...prefsState, themeMode: mode };
  notify();
  await kvSet(KV_KEYS.themeMode, mode);
}

export async function setTextScale(scale: TextScale): Promise<void> {
  prefsState = { ...prefsState, textScale: scale };
  notify();
  await kvSet(KV_KEYS.textScale, scale);
}

export async function setWebZoom(zoom: number): Promise<void> {
  prefsState = { ...prefsState, webZoom: zoom };
  notify();
  await kvSet(KV_KEYS.webZoom, String(zoom));
}

export async function setReduceMotion(mode: ReduceMotionMode): Promise<void> {
  prefsState = { ...prefsState, reduceMotion: mode };
  notify();
  await kvSet(KV_KEYS.reduceMotion, mode);
}

export function resetUiPrefsForTests(): void {
  prefsState = {
    themeMode: 'system',
    textScale: 'system',
    webZoom: 100,
    reduceMotion: 'system',
  };
  initPromise = null;
  notify();
}

export function getUiPrefsState(): UiPrefsState {
  return prefsState;
}

export function subscribeUiPrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useUiPrefs() {
  const state = useSyncExternalStore(subscribeUiPrefs, getUiPrefsState);

  useEffect(() => {
    void initUiPrefs();
  }, []);

  return {
    ...state,
    setThemeMode,
    setTextScale,
    setWebZoom,
    setReduceMotion,
  };
}
