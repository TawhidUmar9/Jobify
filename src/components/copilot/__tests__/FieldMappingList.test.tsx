import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import type { FieldMapping } from '../../../types/domain';
import { FieldMappingList } from '../FieldMappingList';

const sampleMappings: FieldMapping[] = [
  { clawId: 'field-0', fieldLabel: 'Full name', value: 'Alex Rahman', source: 'PROFILE' },
  { clawId: 'field-1', fieldLabel: 'Notice period', value: '1 month', source: 'ANSWER_BANK' },
  { clawId: 'field-2', fieldLabel: 'Why Acme Cloud?', value: 'I want to build great backend services.', source: 'GENERATED' },
];

describe('FieldMappingList', () => {
  it('renders title, field rows, source badges, and handles save to answers', async () => {
    const onSave = jest.fn();
    const view = await render(
      <ThemeProvider>
        <FieldMappingList
          mappings={sampleMappings}
          scrapedInputCount={5}
          lastFill={null}
          savedAnswerClawIds={[]}
          onSaveAnswer={onSave}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('3 of 5 fields ready to fill')).toBeTruthy();
    expect(screen.getByTestId(TestIds.copilot.fieldRow('field-0'))).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.getByText('Saved answer')).toBeTruthy();
    expect(screen.getByText('AI draft')).toBeTruthy();

    expect(screen.queryByTestId(TestIds.copilot.saveAnswer('field-0'))).toBeNull();
    expect(screen.queryByTestId(TestIds.copilot.saveAnswer('field-1'))).toBeNull();

    const saveBtn = screen.getByTestId(TestIds.copilot.saveAnswer('field-2'));
    expect(screen.getByText('Save to answers')).toBeTruthy();
    await fireEvent.press(saveBtn);
    expect(onSave).toHaveBeenCalledWith(sampleMappings[2]);

    await view.rerender(
      <ThemeProvider>
        <FieldMappingList
          mappings={sampleMappings}
          scrapedInputCount={5}
          lastFill={{ filledCount: 2, missingCount: 1 }}
          savedAnswerClawIds={['field-2']}
          onSaveAnswer={onSave}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Filled 2 of 3')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
    view.unmount();
  });

  it('renders empty message when mappings array is empty', async () => {
    await render(
      <ThemeProvider>
        <FieldMappingList
          mappings={[]}
          scrapedInputCount={0}
          lastFill={null}
          savedAnswerClawIds={[]}
          onSaveAnswer={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('0 of 0 fields ready to fill')).toBeTruthy();
    expect(screen.getByText('No fillable fields found on this page.')).toBeTruthy();
  });
});
