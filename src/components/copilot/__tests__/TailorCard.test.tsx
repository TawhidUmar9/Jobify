import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { AI_ERROR_MESSAGES } from '../../../services/ai/types';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import type { TailorResult } from '../../../types/domain';
import { TailorCard } from '../TailorCard';

const sampleResult: TailorResult = {
  emphasize: ['Experience with Docker and Kubernetes', 'Strong background in Node.js'],
  bulletRewrites: [
    {
      original: 'Built APIs in Express',
      suggested: 'Designed and deployed high-throughput Node.js microservices',
      reason: 'Aligns with the role requirements',
    },
  ],
  coverNote: 'I am excited about this backend opportunity.',
  coldDm: 'Hi, I noticed your opening and would love to connect.',
};

describe('TailorCard', () => {
  it('renders idle state with button and caption, and handles press', async () => {
    const onTailor = jest.fn();
    const onCopy = jest.fn();
    const view = await render(
      <ThemeProvider>
        <TailorCard tailor={{ status: 'idle' }} onTailor={onTailor} onCopy={onCopy} />
      </ThemeProvider>,
    );

    const btn = screen.getByTestId(TestIds.copilot.tailorButton);
    expect(screen.getByText('Improve my application')).toBeTruthy();
    expect(screen.getByText('Suggestions, cover note and DM. Uses one more AI request.')).toBeTruthy();

    await fireEvent.press(btn);
    expect(onTailor).toHaveBeenCalled();
    view.unmount();
  });

  it('renders loading state with spinner and text', async () => {
    const view = await render(
      <ThemeProvider>
        <TailorCard tailor={{ status: 'loading' }} onTailor={jest.fn()} onCopy={jest.fn()} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.copilot.tailorLoading)).toBeTruthy();
    expect(screen.getByText('Writing suggestions…')).toBeTruthy();
    view.unmount();
  });

  it('renders error state with AI error message and try again button', async () => {
    const onTailor = jest.fn();
    const view = await render(
      <ThemeProvider>
        <TailorCard tailor={{ status: 'error', code: 'RATE_LIMITED' }} onTailor={onTailor} onCopy={jest.fn()} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.copilot.tailorError)).toBeTruthy();
    expect(screen.getByText(AI_ERROR_MESSAGES.RATE_LIMITED)).toBeTruthy();

    const retry = screen.getByText('Try again');
    await fireEvent.press(retry);
    expect(onTailor).toHaveBeenCalled();
    view.unmount();
  });

  it('renders ready state with emphasize, bullet rewrites, cover note, cold dm, and handles copy', async () => {
    const onCopy = jest.fn();
    const view = await render(
      <ThemeProvider>
        <TailorCard tailor={{ status: 'ready', result: sampleResult }} onTailor={jest.fn()} onCopy={onCopy} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.copilot.tailorCard)).toBeTruthy();
    expect(screen.getByTestId(TestIds.copilot.emphasize)).toBeTruthy();
    expect(screen.getByText('• Experience with Docker and Kubernetes')).toBeTruthy();

    expect(screen.getByTestId(TestIds.copilot.bulletRewrite(0))).toBeTruthy();
    expect(screen.getByText('Built APIs in Express')).toBeTruthy();
    expect(screen.getByText('Designed and deployed high-throughput Node.js microservices')).toBeTruthy();
    expect(screen.getByText('Aligns with the role requirements')).toBeTruthy();

    const copyNote = screen.getByTestId(TestIds.copilot.copyCoverNote);
    await fireEvent.press(copyNote);
    expect(onCopy).toHaveBeenCalledWith(sampleResult.coverNote);

    const copyDm = screen.getByTestId(TestIds.copilot.copyDm);
    await fireEvent.press(copyDm);
    expect(onCopy).toHaveBeenCalledWith(sampleResult.coldDm);
    view.unmount();
  });

  it('hides cover note and cold dm blocks when empty', async () => {
    const emptyResult: TailorResult = {
      emphasize: [],
      bulletRewrites: [],
      coverNote: '',
      coldDm: '   ',
    };
    const view = await render(
      <ThemeProvider>
        <TailorCard tailor={{ status: 'ready', result: emptyResult }} onTailor={jest.fn()} onCopy={jest.fn()} />
      </ThemeProvider>,
    );

    expect(screen.queryByTestId(TestIds.copilot.coverNote)).toBeNull();
    expect(screen.queryByTestId(TestIds.copilot.coldDm)).toBeNull();
    expect(screen.queryByTestId(TestIds.copilot.copyCoverNote)).toBeNull();
    expect(screen.queryByTestId(TestIds.copilot.copyDm)).toBeNull();
    view.unmount();
  });
});
