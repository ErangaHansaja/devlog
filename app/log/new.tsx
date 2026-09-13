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
import { createStandupLog, updateStandupLog } from '../../src/services/logs.service';
import { validateStandupDump } from '../../src/validation';
import { generateStandup } from '../../src/api/gemini.api';

export default function NewLogScreen() {
  const router = useRouter();
  const { projects, loading: projectsLoading } = useProjects();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [rawDump, setRawDump] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

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
      setProcessingStatus('Saving raw dump...');

      // Phase 1: Persist raw dump locally first so user never loses work
      const newLog = await createStandupLog({
        projectId: selectedProjectId,
        rawDump: rawDump.trim(),
      });

      if (!newLog) {
        setErrorMessage(
          'A standup log already exists for this project today. Each project allows one daily log.'
        );
        setIsProcessing(false);
        setProcessingStatus('');
        return;
      }

      // Phase 2: Call Gemini API to generate structured bullets and Singlish script
      setProcessingStatus('Transforming with Gemini AI...');

      try {
        const aiResponse = await generateStandup(rawDump.trim(), {
          name: selectedProject?.name || '',
          techStack: selectedProject?.techStack,
          features: selectedProject?.features,
        });

        // Update log with AI output
        await updateStandupLog(newLog.id, {
          structured: aiResponse.structured,
          singlishPitch: aiResponse.singlishPitch,
        });
      } catch (aiErr) {
        console.warn(
          'Gemini transformation warning (raw dump was saved):',
          aiErr
        );
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
            <Text style={styles.headerSubtitle}>Evening Standup Dump</Text>
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

          {/* Markdown Text Area */}
          <View style={styles.section}>
            <View style={styles.inputHeaderRow}>
              <Text style={styles.sectionLabel}>Engineering Thoughts</Text>
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
                placeholder="What did you build, debug, or unblock today? Write freely in markdown or bullet points..."
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
                  <ActivityIndicator size="small" color="#09090b" />
                  <Text style={styles.saveButtonText}>
                    {processingStatus || 'Processing...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.saveButtonText}>
                  Generate Standup with Gemini ✨
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
    fontSize: 16,
    fontWeight: '600',
    color: '#fafafa',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 1,
  },
  headerRightPlaceholder: {
    width: 60,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 24,
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
    lineHeight: 18,
    fontWeight: '500',
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fafafa',
    letterSpacing: -0.2,
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
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  warningDescription: {
    fontSize: 13,
    color: '#71717a',
    lineHeight: 18,
  },
  createProjectLink: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  createProjectLinkText: {
    fontSize: 13,
    color: '#fafafa',
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
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  projectPillSelected: {
    backgroundColor: '#27272a',
    borderColor: '#3f3f46',
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
    color: '#10b981',
  },
  charCounterMuted: {
    color: '#71717a',
  },
  editorContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  editorContainerFocused: {
    borderColor: '#3f3f46',
  },
  editorInput: {
    minHeight: 220,
    color: '#fafafa',
    fontSize: 15,
    lineHeight: 24,
    padding: 16,
  },
  actionContainer: {
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.35,
  },
  buttonProcessingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#09090b',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
