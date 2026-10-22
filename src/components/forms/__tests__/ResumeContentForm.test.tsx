import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import type { ResumeContent } from '../../../types/domain';
import { ResumeContentForm } from '../ResumeContentForm';

describe('ResumeContentForm', () => {
  const sampleContent: ResumeContent = {
    summary: 'Experienced backend developer',
    skills: ['Node.js', 'TypeScript', 'PostgreSQL'],
    highlights: ['Led backend migration to cloud'],
  };

  it('renders fields and propagates label and content edits', async () => {
    const onLabelChange = jest.fn();
    const onChange = jest.fn();

    await render(
      <ThemeProvider>
        <ResumeContentForm
          label="Backend"
          onLabelChange={onLabelChange}
          value={sampleContent}
          onChange={onChange}
          labelError={null}
        />
      </ThemeProvider>,
    );

    const labelInput = screen.getByTestId(TestIds.resumeImport.label);
    expect(labelInput.props.value).toBe('Backend');
    await fireEvent.changeText(labelInput, 'Full Stack');
    expect(onLabelChange).toHaveBeenCalledWith('Full Stack');

    const summaryInput = screen.getByLabelText('Summary');
    expect(summaryInput.props.value).toBe('Experienced backend developer');
    await fireEvent.changeText(summaryInput, 'New summary');
    expect(onChange).toHaveBeenCalledWith({
      ...sampleContent,
      summary: 'New summary',
    });

    expect(screen.getByText('Node.js')).toBeTruthy();
    expect(screen.getByText('Led backend migration to cloud')).toBeTruthy();
  });

  it('displays label error message when provided', async () => {
    await render(
      <ThemeProvider>
        <ResumeContentForm
          label=""
          onLabelChange={jest.fn()}
          value={sampleContent}
          onChange={jest.fn()}
          labelError="Enter a resume name"
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Enter a resume name')).toBeTruthy();
  });
});
