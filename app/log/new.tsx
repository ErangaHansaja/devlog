import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useProjects } from '../../src/hooks';
import { createStandupLog } from '../../src/services/logs.service';
import { validateStandupDump } from '../../src/validation';

export default function NewLogScreen() {
  const router = useRouter();
  const { projects, loading: projectsLoading } = useProjects();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [rawDump, setRawDump] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-select first project once loaded
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const charCount = rawDump.trim().length;
  const isLengthValid = charCount >= 10;

  const handleSaveDump = async () => {
    if (!selectedProjectId) {
      setErrorMessage('Please select a project before saving.');
      return;
    }

    const validation = validateStandupDump(rawDump);
    if (!validation.isValid) {
      setErrorMessage(
        validation.errors?.rawDump || 'Please write at least 10 characters.'
      );
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const newLog = await createStandupLog({
        projectId: selectedProjectId,
        rawDump: rawDump.trim(),
      });

      if (!newLog) {
        setErrorMessage(
          'A standup log already exists for this project today. Each project allows one daily log.'
        );
        setIsSaving(false);
        return;
      }

      // Successfully saved Phase 1 dump — return to dashboard
      router.replace('/(tabs)');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save standup log.'
      );
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Custom Header with Back Button */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Text style={styles.backButtonIcon}>‹</Text>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>

          <View style={styles.headerTitleCenter}>
            <Text style={styles.headerTitle}>New DevLog</Text>
            <Text style={styles.headerSubtitle}>Evening Standup Dump</Text>
          </View>

          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error Banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Project Selector Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Select Project <Text style={styles.requiredStar}>*</Text>
            </Text>

            {projectsLoading ? (
              <View style={styles.loadingProjectsRow}>
                <ActivityIndicator size="small" color="#38bdf8" />
                <Text style={styles.loadingProjectsText}>
                  Loading projects...
                </Text>
              </View>
            ) : projects.length === 0 ? (
              <View style={styles.noProjectsWarning}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <View style={styles.warningTextContainer}>
                  <Text style={styles.warningTitle}>No active projects found</Text>
                  <Text style={styles.warningDescription}>
                    You need to create a project before logging standup thoughts.
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.createProjectLink,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => router.push('/(tabs)/projects')}
                  >
                    <Text style={styles.createProjectLinkText}>
                      + Create Project in Projects Tab →
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.projectPillsRow}
              >
                {projects.map((project) => {
                  const isSelected = project.id === selectedProjectId;
                  return (
                    <Pressable
                      key={project.id}
                      style={({ pressed }) => [
                        styles.projectPill,
                        isSelected && styles.projectPillSelected,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => {
                        setSelectedProjectId(project.id);
                        if (errorMessage) setErrorMessage(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.projectPillText,
                          isSelected && styles.projectPillTextSelected,
                        ]}
                      >
                        {project.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Raw Dump Input Section */}
          <View style={styles.section}>
            <View style={styles.inputHeaderRow}>
              <Text style={styles.sectionLabel}>
                Daily Dump <Text style={styles.requiredStar}>*</Text>
              </Text>
              <Text
                style={[
                  styles.charCounter,
                  isLengthValid ? styles.charCounterValid : styles.charCounterWarning,
                ]}
              >
                {charCount} / 10 chars min
              </Text>
            </View>

            <View style={styles.terminalContainer}>
              <View style={styles.terminalHeaderBar}>
                <View style={styles.terminalDots}>
                  <View style={[styles.terminalDot, { backgroundColor: '#ef4444' }]} />
                  <View style={[styles.terminalDot, { backgroundColor: '#f59e0b' }]} />
                  <View style={[styles.terminalDot, { backgroundColor: '#22c55e' }]} />
                </View>
                <Text style={styles.terminalHeaderTitle}>raw_standup.md</Text>
              </View>

              <TextInput
                style={styles.terminalInput}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                autoFocus
                placeholder="E.g., fixed token refresh bug in interceptor. started writing django filter query for student enrollments. 403 forbidden error on auth headers..."
                placeholderTextColor="#64748b"
                value={rawDump}
                onChangeText={(text) => {
                  setRawDump(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                editable={!isSaving}
              />
            </View>
          </View>

          {/* Prompt Guidelines Card */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsCardTitle}>💡 Tips for a good standup dump</Text>
            <Text style={styles.tipBullet}>
              • <Text style={styles.tipBold}>Done:</Text> What did you ship or debug today?
            </Text>
            <Text style={styles.tipBullet}>
              • <Text style={styles.tipBold}>Doing:</Text> What are you picking up next?
            </Text>
            <Text style={styles.tipBullet}>
              • <Text style={styles.tipBold}>Blockers:</Text> PR reviews, broken endpoints, or missing specs?
            </Text>
          </View>

          {/* Save Dump CTA Button */}
          <View style={styles.actionContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                (!isLengthValid || !selectedProjectId || isSaving) &&
                  styles.saveButtonDisabled,
                pressed && isLengthValid && styles.buttonPressed,
              ]}
              onPress={handleSaveDump}
              disabled={!isLengthValid || !selectedProjectId || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#020617" />
              ) : (
                <Text style={styles.saveButtonText}>Save Dump</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#020617',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  backButtonIcon: {
    color: '#38bdf8',
    fontSize: 28,
    lineHeight: 28,
    marginRight: 2,
  },
  backButtonText: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitleCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  headerRightPlaceholder: {
    width: 60,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 8,
    padding: 12,
  },
  errorBannerText: {
    color: '#f87171',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  requiredStar: {
    color: '#38bdf8',
  },
  loadingProjectsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingProjectsText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  noProjectsWarning: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  warningIcon: {
    fontSize: 20,
  },
  warningTextContainer: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fbbf24',
  },
  warningDescription: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  createProjectLink: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  createProjectLinkText: {
    fontSize: 13,
    color: '#38bdf8',
    fontWeight: '600',
  },
  projectPillsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  projectPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  projectPillSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  projectPillText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  projectPillTextSelected: {
    color: '#38bdf8',
  },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCounter: {
    fontSize: 12,
    fontWeight: '500',
  },
  charCounterValid: {
    color: '#38bdf8',
  },
  charCounterWarning: {
    color: '#94a3b8',
  },
  terminalContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  terminalHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#020617',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  terminalDots: {
    flexDirection: 'row',
    gap: 5,
  },
  terminalDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  terminalHeaderTitle: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  terminalInput: {
    minHeight: 180,
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 22,
    padding: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tipsCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    gap: 6,
  },
  tipsCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  tipBullet: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  tipBold: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#38bdf8',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
