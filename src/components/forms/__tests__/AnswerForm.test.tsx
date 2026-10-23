import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { AnswerForm } from '../AnswerForm';

describe('AnswerForm', () => {
  it('renders initial values, displays live counter, and submits valid answer', async () => {
    const onSave = jest.fn();
    const onCancel = jest.fn();

    await render(
      <ThemeProvider>
        <AnswerForm
          visible={true}
          initial={{ question: 'Why Jobify?', answer: 'It is a local-first app.' }}
          error={null}
          onSave={onSave}
          onCancel={onCancel}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Edit answer')).toBeTruthy();
    const qInput = screen.getByTestId(TestIds.answers.formQuestion);
    const aInput = screen.getByTestId(TestIds.answers.formAnswer);
    expect(qInput.props.value).toBe('Why Jobify?');
    expect(aInput.props.value).toBe('It is a local-first app.');
    expect(screen.getByText('24 / 4000')).toBeTruthy();

    await fireEvent.changeText(aInput, 'It is very fast and private.');
    expect(screen.getByText('28 / 4000')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(TestIds.answers.formSave));
    expect(onSave).toHaveBeenCalledWith({
      question: 'Why Jobify?',
      answer: 'It is very fast and private.',
    });
  });

  it('renders panel content inside KeyboardAvoidingView', async () => {
    await render(
      <ThemeProvider>
        <AnswerForm
          visible={true}
          initial={null}
          error={null}
          onSave={jest.fn()}
          onCancel={jest.fn()}
        />
      </ThemeProvider>,
    );
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"paddingBottom":0');
  });

  it('validates empty fields and displays error', async () => {
    const onSave = jest.fn();

    await render(
      <ThemeProvider>
        <AnswerForm
          visible={true}
          initial={null}
          error={null}
          onSave={onSave}
          onCancel={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Add answer')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(TestIds.answers.formSave));
    expect(screen.getAllByText('Fill in both fields').length).toBeGreaterThanOrEqual(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
