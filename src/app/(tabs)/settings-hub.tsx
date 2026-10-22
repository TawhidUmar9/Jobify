import { router } from 'expo-router';
import { Archive, Bot, Briefcase, FileText, Info, ListTodo, MessageSquareText, User } from 'lucide-react-native';
import { ScrollView } from 'react-native';

import { ListRow } from '../../components/ui/ListRow';
import { TestIds } from '../../constants/testIds';

/**
 * Settings hub ("/settings-hub"). UI_DIRECTIVES.md §4.3. One ListRow per section, in this order, each
 * pushing its screen: AI provider (/settings/ai, subtitle = "Gemini · gemini-3.8-flash" or "Not set up"),
 * Profile (/settings/profile), Resumes (/settings/resumes, "N resumes"), Job preferences
 * (/settings/preferences), Job boards (/settings/boards, "N boards"), Answer bank (/settings/answers,
 * "N saved answers"), Backup (/settings/backup), About (/settings/about).
 */
export default function SettingsHubScreen() {
  // TODO(T-039): subtitles from data; styling.
  return (
    <ScrollView testID={TestIds.settings.screen}>
      <ListRow title="AI provider" icon={Bot} testID={TestIds.settings.rowAi} onPress={() => router.push('/settings/ai')} />
      <ListRow title="Profile" icon={User} testID={TestIds.settings.rowProfile} onPress={() => router.push('/settings/profile')} />
      <ListRow title="Resumes" icon={FileText} testID={TestIds.settings.rowResumes} onPress={() => router.push('/settings/resumes')} />
      <ListRow title="Job preferences" icon={Briefcase} testID={TestIds.settings.rowPreferences} onPress={() => router.push('/settings/preferences')} />
      <ListRow title="Job boards" icon={ListTodo} testID={TestIds.settings.rowBoards} onPress={() => router.push('/settings/boards')} />
      <ListRow title="Answer bank" icon={MessageSquareText} testID={TestIds.settings.rowAnswers} onPress={() => router.push('/settings/answers')} />
      <ListRow title="Backup" icon={Archive} testID={TestIds.settings.rowBackup} onPress={() => router.push('/settings/backup')} />
      <ListRow title="About" icon={Info} testID={TestIds.settings.rowAbout} onPress={() => router.push('/settings/about')} />
    </ScrollView>
  );
}
