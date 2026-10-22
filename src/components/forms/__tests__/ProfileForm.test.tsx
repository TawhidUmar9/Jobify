import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestIds } from '../../../constants/testIds';
import { EMPTY_PROFILE, type CandidateProfile } from '../../../types/domain';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { ProfileForm, validateProfile } from '../ProfileForm';

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return { Eye: Icon, EyeOff: Icon, X: Icon, CircleCheck: Icon };
});

function profile(patch: Partial<CandidateProfile> = {}): CandidateProfile {
  return {
    ...EMPTY_PROFILE,
    links: [],
    skills: [],
    experience: [],
    education: [],
    extraFacts: [],
    ...patch,
  };
}

describe('validateProfile', () => {
  it('requires a name and email, and a 2-letter country code when one is entered', () => {
    expect(validateProfile(profile()).fullName).toBe('Enter your name');
    expect(validateProfile(profile({ fullName: 'Alex Rahman' })).email).toBe('Enter a valid email');
    expect(validateProfile(profile({ fullName: 'Alex Rahman', email: 'alex.rahman@example.com' }))).toEqual({});
    expect(validateProfile(profile({ fullName: 'Alex Rahman', email: 'alex.rahman@example.com', countryCode: 'B' })).countryCode).toBe(
      'Use a 2-letter country code, e.g. BD',
    );
    expect(validateProfile(profile({ fullName: 'Alex Rahman', email: 'alex.rahman@example.com', countryCode: 'BD' }))).toEqual({});
  });
});

describe('ProfileForm', () => {
  it('upper-cases the country code, validates a link, and shows the resume counts', async () => {
    const onChange = jest.fn();
    await render(
      <ThemeProvider>
        <ProfileForm
          value={profile({
            fullName: 'Alex Rahman',
            experience: [{ title: 'Engineer', company: 'Acme', start: '2024', end: 'Present', bullets: ['Shipped'] }, { title: 'Intern', company: 'Beta', start: '2023', end: '2024', bullets: [] }, { title: 'Tutor', company: 'Gamma', start: '2022', end: '2023', bullets: [] }],
            education: [{ school: 'Example University', degree: 'BSc', year: '2026' }],
          })}
          onChange={onChange}
          errors={{ fullName: 'Enter your name' }}
        />
      </ThemeProvider>,
    );
    expect(screen.getByText('Enter your name')).toBeTruthy();
    expect(screen.getByText('3 roles, 1 degree from your resume')).toBeTruthy();
    expect(screen.getByText('Facts auto-fill may use, e.g. Notice period: 2 weeks')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId(TestIds.profileForm.country), 'bd');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ countryCode: 'BD' }));

    await fireEvent.press(screen.getByLabelText('Add link'));
    const withLink = onChange.mock.calls[onChange.mock.calls.length - 1][0] as CandidateProfile;
    expect(withLink.links).toEqual([{ label: '', url: '' }]);
  });
});
