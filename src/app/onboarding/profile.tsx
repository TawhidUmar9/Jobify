import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

/**
 * Step 2 of 3 ("/onboarding/profile"). UI_DIRECTIVES.md §4.2.
 * Title "Add your resume". Resume label TextField (TestIds.resumeImport.label, default "Main").
 * Options: primary "Import PDF" (importPdf; hidden when !pdfSupported or AI skipped, with caption
 * "PDF import needs Gemini"), secondary "Paste resume text" (pasteToggle → multiline pasteText +
 * "Read my resume" pasteSubmit; needs AI), ghost "Fill in manually" (manual).
 * Status line (resumeImport.status): parsing → "Reading your resume…" spinner; error → message.
 * After import or manual: ProfileForm prefilled (useProfileData). Primary "Continue" (next):
 * validateProfile → saveProfile → /onboarding/preferences.
 */
export default function OnboardingProfileScreen() {
  // TODO(T-019): implement per the rules above.
  return (
    <View testID={TestIds.onboarding.profileScreen}>
      <Text>OnboardingProfileScreen</Text>
    </View>
  );
}
