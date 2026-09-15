import React, { useEffect, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useProjects } from '../../src/hooks';
import type { StandupLog } from '../../src/models';
import {
  createStandupLog,
  getLogByProjectAndDate,
  updateStandupLog,
} from '../../src/services/logs.service';
import { validateStandupDump } from '../../src/validation';
import { generateStandup } from '../../src/api/gemini.api';

export default function NewLogScreen() {
  const router = useRouter();
  const { projects, loading: projectsLoading } = useProjects();

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayIso = useMemo(
    () => new Date(Date.now() - 86400000).toISOString().split('T')[0],
    []
  );

  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [rawDump, setRawDump] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Append Mode detection
  const [existingLog, setExistingLog] = useState<StandupLog | null>(null);
  const [isCheckingExisting, setIsCheckingExisting] = useState(false);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    const checkExisting = async () => {
      if (!selectedProjectId || !selectedDate) {
        setExistingLog(null);
        return;
      }
      try {
        setIsCheckingExisting(true);
        const found = await getLogByProjectAndDate(selectedProjectId, selectedDate);
        setExistingLog(found);
      } catch {
        setExistingLog(null);
      } finally {
        setIsCheckingExisting(false);
      }
    };

    checkExisting();
  }, [selectedProjectId, selectedDate]);

  const charCount = rawDump.trim().length;
  const isLengthValid = charCount >= 10;

  const handleGenerateAndSave = async () => {
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

    const selectedProject = projects.find((p) => p.id === selectedProjectId);

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setProcessingStatus(
        existingLog ? 'Appending thoughts...' : 'Saving raw dump...'
      );

      // Phase 1: Persist raw dump locally (auto-appends if log already exists)
      const savedLog = await createStandupLog({
        projectId: selectedProjectId,
        rawDump: rawDump.trim(),
        date: selectedDate,
      });

      if (!savedLog) {
        setErrorMessage('Failed to save log to local storage.');
        setIsProcessing(false);
        setProcessingStatus('');
        return;
      }

      // Phase 2: Call AI API to compile structured bullets and Singlish script
      setProcessingStatus('Compiling standup with AI...');

      try {
        const aiResponse = await generateStandup(savedLog.rawDump, {
          name: selectedProject?.name || '',
          description: selectedProject?.description,
          techStack: selectedProject?.techStack,
          features: selectedProject?.features,
        });

        // Update log with compiled AI output
        await updateStandupLog(savedLog.id, {
          structured: aiResponse.structured,
          singlishPitch: aiResponse.singlishPitch,
        });
      } catch (aiErr) {
        console.warn('AI compilation warning (raw dump was saved):', aiErr);
        // Raw dump is already safely saved in Phase 1, so we still proceed
      }

      // Return to Today dashboard to view the generated standup
      router.replace('/(tabs)');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save standup log.'
      );
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
            disabled={isProcessing}
            hitSlop={12}
          >
            <Text style={styles.backButtonIcon}>‹</Text>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>

          <View style={styles.headerTitleCenter}>
            <Text style={styles.headerTitle}>New DevLog</Text>
            <Text style={styles.headerSubtitle}>Daily Standup Dump</Text>
          </View>

          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Date Selector Row */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Date</Text>
            <View style={styles.dateSelectorRow}>
              <Pressable
                style={[
                  styles.datePill,
                  selectedDate === todayIso && styles.datePillSelected,
                ]}
                onPress={() => setSelectedDate(todayIso)}
                disabled={isProcessing}
              >
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={selectedDate === todayIso ? '#38bdf8' : '#71717a'}
                />
                <Text
                  style={[
                    styles.datePillText,
                    selectedDate === todayIso && styles.datePillTextSelected,
                  ]}
                >
                  Today
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.datePill,
                  selectedDate === yesterdayIso && styles.datePillSelected,
                ]}
                onPress={() => setSelectedDate(yesterdayIso)}
                disabled={isProcessing}
              >
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={selectedDate === yesterdayIso ? '#38bdf8' : '#71717a'}
                />
                <Text
                  style={[
                    styles.datePillText,
                    selectedDate === yesterdayIso && styles.datePillTextSelected,
                  ]}
                >
                  Yesterday
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Project Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Project</Text>

            {projectsLoading ? (
              <View style={styles.loadingProjectsRow}>
                <ActivityIndicator size="small" color="#fafafa" />
                <Text style={styles.loadingProjectsText}>Loading projects...</Text>
              </View>
            ) : projects.length === 0 ? (
              <View style={styles.noProjectsWarning}>
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
                      disabled={isProcessing}
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

          {/* Append Mode Banner */}
          {existingLog ? (
            <View style={styles.appendBanner}>
              <View style={styles.appendBannerHeader}>
                <Ionicons name="git-branch-outline" size={16} color="#38bdf8" />
                <Text style={styles.appendBannerTitle}>
                  Append Mode Active
                </Text>
              </View>
              <Text style={styles.appendBannerDescription}>
                A standup entry already exists for this project on{' '}
                {selectedDate === todayIso ? 'Today' : selectedDate} (
                {existingLog.structured.done.length + existingLog.structured.doing.length} bullets).
                New thoughts will be automatically appended to existing notes and recompiled.
              </Text>
            </View>
          ) : null}

          {/* Markdown Text Area */}
          <View style={styles.section}>
            <View style={styles.inputHeaderRow}>
              <Text style={styles.sectionLabel}>
                {existingLog ? 'Additional Notes / Updates' : 'Engineering Thoughts'}
              </Text>
              <Text
                style={[
                  styles.charCounter,
                  isLengthValid ? styles.charCounterValid : styles.charCounterMuted,
                ]}
              >
                {charCount} / 10 min
              </Text>
            </View>

            <View
              style={[
                styles.editorContainer,
                isInputFocused && styles.editorContainerFocused,
              ]}
            >
              <TextInput
                style={styles.editorInput}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                autoFocus
                placeholder={
                  existingLog
                    ? 'Add any additional tickets completed, afternoon progress, or blockers encountered...'
                    : 'What did you build, debug, or unblock today? Write freely in markdown or bullet points...'
                }
                placeholderTextColor="#52525b"
                value={rawDump}
                onChangeText={(text) => {
                  setRawDump(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                editable={!isProcessing}
              />
            </View>
          </View>

          {/* Action Button with Loading Indicator */}
          <View style={styles.actionContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                (!isLengthValid || !selectedProjectId || isProcessing) &&
                  styles.saveButtonDisabled,
                pressed && isLengthValid && !isProcessing && styles.buttonPressed,
              ]}
              onPress={handleGenerateAndSave}
              disabled={!isLengthValid || !selectedProjectId || isProcessing}
            >
              {isProcessing ? (
                <View style={styles.buttonProcessingRow}>
                  <ActivityIndicator size="small" color="#fafafa" />
                  <Text style={styles.saveButtonText}>
                    {processingStatus || 'Processing...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.saveButtonText}>
                  {existingLog
                    ? 'Append & Recompile Standup ✨'
                    : 'Compile Standup ✨'}
                </Text>
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
    backgroundColor: '#09090b',
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
    borderBottomColor: '#27272a',
    backgroundColor: '#09090b',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  backButtonIcon: {
    color: '#a1a1aa',
    fontSize: 26,
    lineHeight: 26,
    marginRight: 2,
  },
  backButtonText: {
    color: '#a1a1aa',
    fontSize: 15,
    fontWeight: '500',
  },
  headerTitleCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: '#71717a',
    fontSize: 11,
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
    gap: 16,
    paddingBottom: 40,
  },
  errorBanner: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 8,
    padding: 12,
  },
  errorBannerText: {
    color: '#fb7185',
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  datePillSelected: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  datePillText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '500',
  },
  datePillTextSelected: {
    color: '#38bdf8',
    fontWeight: '600',
  },
  loadingProjectsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingProjectsText: {
    color: '#71717a',
    fontSize: 13,
  },
  noProjectsWarning: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    padding: 14,
    gap: 6,
  },
  warningTitle: {
    color: '#fb7185',
    fontSize: 14,
    fontWeight: '600',
  },
  warningDescription: {
    color: '#71717a',
    fontSize: 12,
    lineHeight: 16,
  },
  createProjectLink: {
    marginTop: 4,
  },
  createProjectLinkText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  projectPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  projectPill: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  projectPillSelected: {
    borderColor: '#fafafa',
    backgroundColor: '#27272a',
  },
  projectPillText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '500',
  },
  projectPillTextSelected: {
    color: '#fafafa',
    fontWeight: '600',
  },
  appendBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  appendBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appendBannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38bdf8',
  },
  appendBannerDescription: {
    fontSize: 12,
    color: '#a1a1aa',
    lineHeight: 17,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCounter: {
    fontSize: 11,
  },
  charCounterValid: {
    color: '#34d399',
  },
  charCounterMuted: {
    color: '#52525b',
  },
  editorContainer: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    padding: 12,
    minHeight: 180,
  },
  editorContainerFocused: {
    borderColor: '#3f3f46',
  },
  editorInput: {
    color: '#fafafa',
    fontSize: 14,
    lineHeight: 22,
    minHeight: 160,
  },
  actionContainer: {
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonProcessingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
