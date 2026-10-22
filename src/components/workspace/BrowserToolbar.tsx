import { View } from 'react-native';

export interface BrowserToolbarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  /** 0..1; bar hidden when not loading. */
  progress: number;
  loading: boolean;
  /** Current page URL; shown as displayHost(url). */
  url: string;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  /** Called with a normalized http(s) URL typed into the address bar. */
  onOpenAddress: (url: string) => void;
}

/**
 * Row under the board bar, height 48. UI_DIRECTIVES.md §4.1 "Browser toolbar".
 * [Back ChevronLeft toolbarBack "Back"] [Forward ChevronRight toolbarForward "Forward"]
 * [host button (toolbarAddress, flex 1, caption textSecondary, ellipsize middle,
 *  label "Address: <host>. Double tap to type a link")] [Reload RotateCw toolbarReload "Reload page"].
 * Tapping the host replaces the row with an address bar: TextField-like input (TestIds.workspace.addressInput,
 * keyboardType url, autoFocus, prefilled with the full URL, selectTextOnFocus) + "Go" (addressGo) + Cancel X.
 * Submit: normalizeAddressInput(text) → onOpenAddress(url) and close; null → inline error "Enter a web address".
 * 2px progress bar on the bottom edge (TestIds.workspace.progressBar), colors.progress.
 */
export function BrowserToolbar(props: BrowserToolbarProps) {
  // TODO(T-044): implement per the rules above.
  void props;
  return <View style={{ height: 48 }} />;
}
