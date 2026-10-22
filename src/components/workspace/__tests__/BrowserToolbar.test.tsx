import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { BrowserToolbar, type BrowserToolbarProps } from '../BrowserToolbar';

async function renderToolbar(props: Partial<BrowserToolbarProps> = {}) {
  const defaultProps: BrowserToolbarProps = {
    canGoBack: false,
    canGoForward: false,
    progress: 0,
    loading: false,
    url: 'https://wellfound.com/jobs',
    onBack: jest.fn(),
    onForward: jest.fn(),
    onReload: jest.fn(),
    onOpenAddress: jest.fn(),
    ...props,
  };
  return render(
    <ThemeProvider>
      <BrowserToolbar {...defaultProps} />
    </ThemeProvider>,
  );
}

describe('BrowserToolbar', () => {
  it('renders navigation buttons with enabled/disabled states based on canGoBack and canGoForward', async () => {
    const onBack = jest.fn();
    const onForward = jest.fn();
    const onReload = jest.fn();

    const view = await renderToolbar({
      canGoBack: false,
      canGoForward: false,
      onBack,
      onForward,
      onReload,
    });

    const backButton = screen.getByTestId(TestIds.workspace.toolbarBack);
    const forwardButton = screen.getByTestId(TestIds.workspace.toolbarForward);
    const reloadButton = screen.getByTestId(TestIds.workspace.toolbarReload);

    expect(backButton.props.accessibilityState).toEqual({ disabled: true });
    expect(forwardButton.props.accessibilityState).toEqual({ disabled: true });

    await fireEvent.press(backButton);
    expect(onBack).not.toHaveBeenCalled();

    await fireEvent.press(forwardButton);
    expect(onForward).not.toHaveBeenCalled();

    await fireEvent.press(reloadButton);
    expect(onReload).toHaveBeenCalledTimes(1);

    await view.rerender(
      <ThemeProvider>
        <BrowserToolbar
          canGoBack={true}
          canGoForward={true}
          progress={0}
          loading={false}
          url="https://wellfound.com/jobs"
          onBack={onBack}
          onForward={onForward}
          onReload={onReload}
          onOpenAddress={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.workspace.toolbarBack).props.accessibilityState).toEqual({
      disabled: false,
    });
    expect(
      screen.getByTestId(TestIds.workspace.toolbarForward).props.accessibilityState,
    ).toEqual({ disabled: false });

    await fireEvent.press(screen.getByTestId(TestIds.workspace.toolbarBack));
    expect(onBack).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId(TestIds.workspace.toolbarForward));
    expect(onForward).toHaveBeenCalledTimes(1);
  });

  it('displays host text and toggles address bar input', async () => {
    const onOpenAddress = jest.fn();
    await renderToolbar({
      url: 'https://www.linkedin.com/jobs/search',
      onOpenAddress,
    });

    const addressBtn = screen.getByTestId(TestIds.workspace.addressButton);
    expect(addressBtn).toBeTruthy();
    expect(screen.getByText('linkedin.com')).toBeTruthy();
    expect(addressBtn.props.accessibilityLabel).toBe(
      'Address: linkedin.com. Double tap to type a link',
    );

    await fireEvent.press(addressBtn);

    const input = screen.getByTestId(TestIds.workspace.addressInput);
    expect(input).toBeTruthy();
    expect(input.props.value).toBe('https://www.linkedin.com/jobs/search');

    await fireEvent.press(screen.getByLabelText('Cancel'));
    expect(screen.queryByTestId(TestIds.workspace.addressInput)).toBeNull();
    expect(screen.getByTestId(TestIds.workspace.addressButton)).toBeTruthy();
  });

  it('validates address input and shows inline error on invalid input, or calls onOpenAddress on valid submit', async () => {
    const onOpenAddress = jest.fn();
    await renderToolbar({
      url: 'https://wellfound.com',
      onOpenAddress,
    });

    await fireEvent.press(screen.getByTestId(TestIds.workspace.addressButton));

    const input = screen.getByTestId(TestIds.workspace.addressInput);
    const goButton = screen.getByTestId(TestIds.workspace.addressGo);

    await fireEvent.changeText(input, 'not a url');
    await fireEvent.press(goButton);

    expect(screen.getByText('Enter a web address')).toBeTruthy();
    expect(onOpenAddress).not.toHaveBeenCalled();

    await fireEvent.changeText(input, 'remoteok.com/dev-jobs');
    await fireEvent.press(goButton);

    expect(onOpenAddress).toHaveBeenCalledWith('https://remoteok.com/dev-jobs');
    expect(screen.queryByTestId(TestIds.workspace.addressInput)).toBeNull();
  });

  it('shows progress bar only when loading and sizes width by progress', async () => {
    const view = await renderToolbar({
      loading: false,
      progress: 0.5,
    });

    expect(screen.queryByTestId(TestIds.workspace.progressBar)).toBeNull();

    await view.rerender(
      <ThemeProvider>
        <BrowserToolbar
          canGoBack={false}
          canGoForward={false}
          progress={0.65}
          loading={true}
          url="https://wellfound.com"
          onBack={jest.fn()}
          onForward={jest.fn()}
          onReload={jest.fn()}
          onOpenAddress={jest.fn()}
        />
      </ThemeProvider>,
    );

    const progressBar = screen.getByTestId(TestIds.workspace.progressBar);
    expect(progressBar).toBeTruthy();
    const styleObj = Array.isArray(progressBar.props.style)
      ? Object.assign({}, ...progressBar.props.style)
      : progressBar.props.style;
    expect(styleObj.width).toBe('65%');
  });
});
