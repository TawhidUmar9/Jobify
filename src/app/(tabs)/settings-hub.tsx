import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Archive, Bot, Briefcase, FileText, Info, ListTodo, MessageSquareText, Palette, User } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ListRow } from '../../components/ui/ListRow';
import { TestIds } from '../../constants/testIds';
import { listAnswers } from '../../db/repositories/answersRepo';
import { listBoards } from '../../db/repositories/boardsRepo';
import { getPreferences, getProfile } from '../../db/repositories/profileRepo';
import { listResumes } from '../../db/repositories/resumesRepo';
import { loadAiConfig } from '../../services/ai/config';
import type { AiConfig } from '../../services/ai/types';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import type { CandidateProfile, JobPreferences, WorkMode } from '../../types/domain';

function formatPreferencesSubtitle(prefs: JobPreferences | null): string {
  if (!prefs) return 'Not set up';
  const modeLabels: Record<WorkMode, string> = {
    REMOTE: 'Remote',
    HYBRID: 'Hybrid',
    ONSITE: 'On-site',
  };
  const modes = prefs.workModes.map((m) => modeLabels[m] ?? m).join(', ');
  const roleCount = prefs.targetRoles.length;
  const roles = roleCount > 0 ? `${roleCount} ${roleCount === 1 ? 'role' : 'roles'}` : '';
  if (modes && roles) return `${modes} · ${roles}`;
  if (modes) return modes;
  if (roles) return roles;
  return 'Not set up';
}

/**
 * Settings hub ("/settings-hub"). UI_DIRECTIVES.md §4.3. One ListRow per section, in this order, each
 * pushing its screen: AI provider (/settings/ai, subtitle = "Gemini · gemini-3.5-flash-lite" or "Not set up"),
 * Profile (/settings/profile), Resumes (/settings/resumes, "N resumes"), Job preferences
 * (/settings/preferences), Job boards (/settings/boards, "N boards"), Appearance & accessibility
 * (/settings/appearance), Answer bank (/settings/answers, "N saved answers"), Backup (/settings/backup),
 * About (/settings/about).
 */
export default function SettingsHubScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();

  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [preferences, setPreferences] = useState<JobPreferences | null>(null);
  const [resumeCount, setResumeCount] = useState<number>(0);
  const [boardCount, setBoardCount] = useState<number>(0);
  const [answerCount, setAnswerCount] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const [loadedAi, loadedProfile, loadedPrefs, loadedResumes, loadedBoards, loadedAnswers] =
            await Promise.all([
              loadAiConfig(),
              getProfile(db),
              getPreferences(db),
              listResumes(db),
              listBoards(db),
              listAnswers(db),
            ]);
          if (cancelled) return;
          setAiConfig(loadedAi);
          setProfile(loadedProfile);
          setPreferences(loadedPrefs);
          setResumeCount(loadedResumes.length);
          setBoardCount(loadedBoards.length);
          setAnswerCount(loadedAnswers.length);
        } catch {
          // ignore load errors on hub
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  const aiSubtitle = aiConfig
    ? `${aiConfig.provider === 'gemini' ? 'Gemini' : 'OpenAI-compatible'} · ${aiConfig.model}`
    : 'Not set up';
  const profileSubtitle = profile?.fullName?.trim() ? profile.fullName.trim() : 'Not set up';
  const resumesSubtitle = `${resumeCount} ${resumeCount === 1 ? 'resume' : 'resumes'}`;
  const preferencesSubtitle = formatPreferencesSubtitle(preferences);
  const boardsSubtitle = `${boardCount} ${boardCount === 1 ? 'board' : 'boards'}`;
  const answersSubtitle = `${answerCount} saved ${answerCount === 1 ? 'answer' : 'answers'}`;

  return (
    <ScrollView
      testID={TestIds.settings.screen}
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <ListRow
        title="AI provider"
        subtitle={aiSubtitle}
        icon={Bot}
        testID={TestIds.settings.rowAi}
        onPress={() => router.push('/settings/ai')}
      />
      <ListRow
        title="Profile"
        subtitle={profileSubtitle}
        icon={User}
        testID={TestIds.settings.rowProfile}
        onPress={() => router.push('/settings/profile')}
      />
      <ListRow
        title="Resumes"
        subtitle={resumesSubtitle}
        icon={FileText}
        testID={TestIds.settings.rowResumes}
        onPress={() => router.push('/settings/resumes')}
      />
      <ListRow
        title="Job preferences"
        subtitle={preferencesSubtitle}
        icon={Briefcase}
        testID={TestIds.settings.rowPreferences}
        onPress={() => router.push('/settings/preferences')}
      />
      <ListRow
        title="Job boards"
        subtitle={boardsSubtitle}
        icon={ListTodo}
        testID={TestIds.settings.rowBoards}
        onPress={() => router.push('/settings/boards')}
      />
      <ListRow
        title="Appearance & accessibility"
        icon={Palette}
        testID={TestIds.settings.rowAppearance}
        onPress={() => router.push('/settings/appearance')}
      />
      <ListRow
        title="Answer bank"
        subtitle={answersSubtitle}
        icon={MessageSquareText}
        testID={TestIds.settings.rowAnswers}
        onPress={() => router.push('/settings/answers')}
      />
      <ListRow
        title="Backup"
        icon={Archive}
        testID={TestIds.settings.rowBackup}
        onPress={() => router.push('/settings/backup')}
      />
      <ListRow
        title="About"
        icon={Info}
        testID={TestIds.settings.rowAbout}
        onPress={() => router.push('/settings/about')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
});
