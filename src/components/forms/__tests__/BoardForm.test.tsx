import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { BoardForm } from '../BoardForm';

describe('BoardForm', () => {
  it('renders initial values and submits normalized address', async () => {
    const onSave = jest.fn();
    const onCancel = jest.fn();

    await render(
      <ThemeProvider>
        <BoardForm
          visible={true}
          initial={{ name: 'LinkedIn', url: 'https://linkedin.com/jobs' }}
          error={null}
          onSave={onSave}
          onCancel={onCancel}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Edit job board')).toBeTruthy();
    const nameInput = screen.getByTestId(TestIds.boards.formName);
    const urlInput = screen.getByTestId(TestIds.boards.formUrl);
    expect(nameInput.props.value).toBe('LinkedIn');
    expect(urlInput.props.value).toBe('https://linkedin.com/jobs');

    await fireEvent.changeText(nameInput, 'LinkedIn Jobs');
    await fireEvent.changeText(urlInput, 'linkedin.com/jobs');
    await fireEvent.press(screen.getByTestId(TestIds.boards.formSave));

    expect(onSave).toHaveBeenCalledWith({
      name: 'LinkedIn Jobs',
      url: 'https://linkedin.com/jobs',
    });
  });

  it('validates name length and url validity client-side', async () => {
    const onSave = jest.fn();

    await render(
      <ThemeProvider>
        <BoardForm
          visible={true}
          initial={null}
          error={null}
          onSave={onSave}
          onCancel={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Add job board')).toBeTruthy();

    // Empty name
    await fireEvent.press(screen.getByTestId(TestIds.boards.formSave));
    expect(screen.getByText('Use 1–16 characters')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();

    // Fill valid name, invalid url
    await fireEvent.changeText(screen.getByTestId(TestIds.boards.formName), 'Acme');
    await fireEvent.changeText(screen.getByTestId(TestIds.boards.formUrl), 'not a url');
    await fireEvent.press(screen.getByTestId(TestIds.boards.formSave));
    expect(screen.getByText('Enter a full https:// address')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('displays server error passed via props', async () => {
    await render(
      <ThemeProvider>
        <BoardForm
          visible={true}
          initial={null}
          error="INVALID_URL"
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Enter a full https:// address')).toBeTruthy();
  });
});
