/** Proves the Jest harness renders components that use mocked native libraries. */
import { render, screen } from '@testing-library/react-native';

import { CopilotActions } from '../../src/components/copilot/CopilotActions';
import { PortalWebView } from '../../src/components/workspace/PortalWebView';
import { TestIds } from '../../src/constants/testIds';
import { kvGet, KV_KEYS } from '../../src/services/kvStore';
import { createFakeDb } from '../helpers/fakeDb';

describe('test harness', () => {
  it('renders the WebView mock with its testID', async () => {
    await render(
      <PortalWebView
        webViewRef={{ current: null }}
        url="https://example.com"
        onNavStateChange={jest.fn()}
        onLoadProgress={jest.fn()}
        onMessage={jest.fn()}
      />,
    );
    expect(screen.getByTestId(TestIds.workspace.webview)).toBeTruthy();
  });

  it('renders copilot action buttons by testID', async () => {
    await render(
      <CopilotActions
        canAutoFill={false}
        filling={false}
        staging={false}
        logged={false}
        logging={false}
        onAutoFill={jest.fn()}
        onStageResume={jest.fn()}
        onLogApplication={jest.fn()}
      />,
    );
    expect(screen.getByTestId(TestIds.copilot.autoFill)).toBeTruthy();
    expect(screen.getByTestId(TestIds.copilot.logApplication)).toBeTruthy();
  });

  it('provides a fake SQLite database and kv-store mock', async () => {
    const fake = createFakeDb();
    fake.queue('getAllAsync', [{ id: 1 }]);
    await expect(fake.db.getAllAsync('SELECT 1')).resolves.toEqual([{ id: 1 }]);
    await expect(kvGet(KV_KEYS.activeBoardId)).resolves.toBeNull();
  });
});
