import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import AboutScreen, { PRIVACY_STATEMENT } from '../about';

jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.0',
    extra: {
      repositoryUrl: 'https://github.com/TawhidUmar9/jobify',
    },
  },
}));

describe('AboutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockImplementation(jest.fn().mockResolvedValue(true));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders app name, version, license, and privacy statement verbatim', async () => {
    await render(
      <ThemeProvider>
        <AboutScreen />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.about.screen)).toBeTruthy();
    expect(screen.getByText('Jobify')).toBeTruthy();
    expect(screen.getByText('Version 1.0.0')).toBeTruthy();
    expect(screen.getByText('License: GPL-3.0-or-later')).toBeTruthy();
    expect(screen.getByText(PRIVACY_STATEMENT)).toBeTruthy();
  });

  it('opens repository URL on source code press', async () => {
    await render(
      <ThemeProvider>
        <AboutScreen />
      </ThemeProvider>,
    );

    const sourceLink = screen.getByTestId(TestIds.about.sourceLink);
    expect(sourceLink).toBeTruthy();
    await fireEvent.press(sourceLink);

    expect(Linking.openURL).toHaveBeenCalledWith('https://github.com/TawhidUmar9/jobify');
  });

  it('opens licenses URL on open-source licenses press', async () => {
    await render(
      <ThemeProvider>
        <AboutScreen />
      </ThemeProvider>,
    );

    const licensesLink = screen.getByTestId(TestIds.about.licenses);
    expect(licensesLink).toBeTruthy();
    await fireEvent.press(licensesLink);

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://github.com/TawhidUmar9/jobify/blob/main/LICENSES.md',
    );
  });
});
