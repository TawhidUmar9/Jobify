import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { StagingExplainer } from '../StagingExplainer';

describe('StagingExplainer', () => {
  it('renders title, body, and fires continue and cancel handlers', async () => {
    const onContinue = jest.fn();
    const onCancel = jest.fn();

    await render(
      <ThemeProvider>
        <StagingExplainer visible={true} onContinue={onContinue} onCancel={onCancel} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.stagingExplainer.dialog)).toBeTruthy();
    expect(screen.getByText('Choose a folder for resumes')).toBeTruthy();
    expect(
      screen.getByText(
        'Android will ask for a folder. Open Download, create a folder named Jobify, and tap Use this folder. Staged resumes go there so they show first under Recent when a job site asks for a file.',
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByTestId(TestIds.stagingExplainer.continue));
    expect(onContinue).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId(TestIds.stagingExplainer.cancel));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
