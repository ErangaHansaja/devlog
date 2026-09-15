import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { generateStandup } from '../../src/api/gemini.api';
import { FeatureStatusColors, FeatureStatusLabels } from '../../src/constants';
import type { Project, StandupLog } from '../../src/models';
import { getStandupLogById, updateStandupLog } from '../../src/services/logs.service';
import { getProjectById } from '../../src/services/projects.service';
import { formatDate, formatRelativeTime } from '../../src/utils';

export default function LogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [log, setLog] = useState<StandupLog | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        const fetchedLog = await getStandupLogById(id);
        setLog(fetchedLog);
        if (fetchedLog) {
          const fetchedProject = await getProjectById(fetchedLog.projectId);
          setProject(fetchedProject);
        }
      } catch (err) {
        console.error('Failed to load log detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleCopyPitch = () => {
    if (!log?.singlishPitch) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(log.singlishPitch);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleGenerateOrRetry = async () => {
    if (!log) return;
    try {
      setIsGenerating(true);
      setGenerationError(null);

      const projectContext = project
        ? {
            name: project.name,
            description: project.description,
            techStack: project.techStack,
            features: project.features,
          }
        : undefined;

      const aiResponse = await generateStandup(log.rawDump, projectContext);

      const updated = await updateStandupLog(log.id, {
        structured: aiResponse.structured,
        singlishPitch: aiResponse.singlishPitch,
      });

      if (updated) {
        setLog(updated);
      }
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : 'Failed to generate standup.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#fafafa" />
          <Text style={styles.loadingText}>Loading standup log...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!log) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonIcon}>‹</Text>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Standup Log</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>Standup log not found.</Text>
          <Pressable
            style={styles.returnButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.returnButtonText}>Return to Standup</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const hasDone = log.structured.done.length > 0;
  const hasDoing = log.structured.doing.length > 0;
  const hasBlockers = log.structured.blockers.length > 0;
  const hasAnyStructured = hasDone || hasDoing || hasBlockers || !!log.singlishPitch;

  const hasTechStack =
    project?.techStack &&
    ((project.techStack.frontend && project.techStack.frontend.length > 0) ||
      (project.techStack.backend && project.techStack.backend.length > 0) ||
      (project.techStack.mobile && project.techStack.mobile.length > 0) ||
      (project.techStack.tools && project.techStack.tools.length > 0));

  const allTechPills = [
    ...(project?.techStack.frontend || []),
    ...(project?.techStack.backend || []),
    ...(project?.techStack.mobile || []),
    ...(project?.techStack.tools || []),
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
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
          <Text style={styles.headerTitle}>
            {project?.name || 'Standup Log'}
          </Text>
          <Text style={styles.headerSubtitle}>{formatDate(log.createdAt)}</Text>
        </View>

        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Banner */}
        {generationError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{generationError}</Text>
          </View>
        ) : null}

        {/* Project Meta Card */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Project</Text>
            <Text style={styles.metaValue}>{project?.name || 'Unknown'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Logged</Text>
            <Text style={styles.metaValue}>
              {formatRelativeTime(log.createdAt)}
            </Text>
          </View>
        </View>

        {/* Unprocessed / Raw Dump Banner with Generate Button */}
        {!hasAnyStructured ? (
          <View style={styles.unprocessedCard}>
            <View style={styles.unprocessedHeader}>
              <Text style={styles.unprocessedTitle}>
                Standup Not Yet Generated
              </Text>
              <Text style={styles.unprocessedDescription}>
                Transform this raw brain dump into crisp DSM bullets and a natural
                Singlish pitch for Ayya.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryGenerateButton,
                isGenerating && styles.buttonDisabled,
                pressed && !isGenerating && styles.buttonPressed,
              ]}
              onPress={handleGenerateOrRetry}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <View style={styles.generatingRow}>
                  <ActivityIndicator size="small" color="#fafafa" />
                  <Text style={styles.primaryGenerateButtonText}>
                    Transforming with Gemini AI...
                  </Text>
                </View>
              ) : (
                <Text style={styles.primaryGenerateButtonText}>
                  Generate AI Standup ✨
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {/* Singlish Pitch Card */}
        {log.singlishPitch ? (
          <View style={styles.pitchCard}>
            <View style={styles.pitchCardHeader}>
              <Text style={styles.cardHeaderTitle}>
                💬 Singlish Pitch for DSM
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.copyButton,
                  isCopied && styles.copyButtonActive,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleCopyPitch}
              >
                <Text
                  style={[
                    styles.copyButtonText,
                    isCopied && styles.copyButtonTextActive,
                  ]}
                >
                  {isCopied ? '✓ Copied' : 'Copy Pitch'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.pitchBody}>"{log.singlishPitch}"</Text>
          </View>
        ) : null}

        {/* Structured Standup Bullets */}
        {hasAnyStructured ? (
          <View style={styles.structuredSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Standup Breakdown</Text>

              {/* Retry / Regenerate button */}
              <Pressable
                style={({ pressed }) => [
                  styles.retryGeminiButton,
                  isGenerating && styles.buttonDisabled,
                  pressed && !isGenerating && styles.buttonPressed,
                ]}
                onPress={handleGenerateOrRetry}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#fafafa" />
                ) : (
                  <Text style={styles.retryGeminiButtonText}>
                    ↻ Regenerate
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Done Section */}
            <View style={styles.bulletGroupCard}>
              <View style={styles.bulletGroupHeader}>
                <View
                  style={[
                    styles.statusIndicatorDot,
                    { backgroundColor: '#10b981' },
                  ]}
                />
                <Text style={[styles.bulletGroupTitle, { color: '#10b981' }]}>
                  Done ({log.structured.done.length})
                </Text>
              </View>
              {hasDone ? (
                log.structured.done.map((item, index) => (
                  <View key={`done-${index}`} style={styles.bulletItemRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletItemText}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyGroupText}>
                  No completed items recorded.
                </Text>
              )}
            </View>

            {/* Doing Section */}
            <View style={styles.bulletGroupCard}>
              <View style={styles.bulletGroupHeader}>
                <View
                  style={[
                    styles.statusIndicatorDot,
                    { backgroundColor: '#f59e0b' },
                  ]}
                />
                <Text style={[styles.bulletGroupTitle, { color: '#f59e0b' }]}>
                  Doing ({log.structured.doing.length})
                </Text>
              </View>
              {hasDoing ? (
                log.structured.doing.map((item, index) => (
                  <View key={`doing-${index}`} style={styles.bulletItemRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletItemText}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyGroupText}>
                  No in-progress items recorded.
                </Text>
              )}
            </View>

            {/* Blockers Section */}
            <View style={styles.bulletGroupCard}>
              <View style={styles.bulletGroupHeader}>
                <View
                  style={[
                    styles.statusIndicatorDot,
                    { backgroundColor: hasBlockers ? '#f43f5e' : '#71717a' },
                  ]}
                />
                <Text
                  style={[
                    styles.bulletGroupTitle,
                    { color: hasBlockers ? '#f43f5e' : '#71717a' },
                  ]}
                >
                  Blockers ({log.structured.blockers.length})
                </Text>
              </View>
              {hasBlockers ? (
                log.structured.blockers.map((item, index) => (
                  <View key={`blocker-${index}`} style={styles.bulletItemRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletItemText}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyGroupText}>No blockers for today.</Text>
              )}
            </View>
          </View>
        ) : null}

        {/* Linked Project Context Card */}
        {project ? (
          <View style={styles.projectContextCard}>
            <Text style={styles.sectionHeaderTitle}>
              Linked Project Context
            </Text>

            {/* Tech Stack Chips */}
            {hasTechStack ? (
              <View style={styles.contextSubSection}>
                <Text style={styles.contextSubLabel}>Tech Stack</Text>
                <View style={styles.techPillsRow}>
                  {allTechPills.map((tech, idx) => (
                    <View key={`tech-pill-${idx}`} style={styles.contextTechPill}>
                      <Text style={styles.contextTechPillText}>{tech}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Features with status badges */}
            <View style={styles.contextSubSection}>
              <Text style={styles.contextSubLabel}>
                Tracked Features ({project.features.length})
              </Text>
              {project.features.length > 0 ? (
                <View style={styles.featureBadgesList}>
                  {project.features.map((feature) => {
                    const statusColor = FeatureStatusColors[feature.status];
                    const isCompleted = feature.status === 'completed';
                    return (
                      <View key={feature.id} style={styles.contextFeatureRow}>
                        <View style={styles.contextFeatureBadge}>
                          <View
                            style={[
                              styles.statusIndicatorDot,
                              { backgroundColor: statusColor },
                            ]}
                          />
                          <Text
                            style={[
                              styles.contextFeatureBadgeText,
                              { color: statusColor },
                            ]}
                          >
                            {FeatureStatusLabels[feature.status]}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.contextFeatureName,
                            isCompleted && styles.contextFeatureCompleted,
                          ]}
                          numberOfLines={1}
                        >
                          {feature.name}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyGroupText}>
                  No features tracked in this project yet.
                </Text>
              )}
            </View>
          </View>
        ) : null}

        {/* Collapsible Raw Brain Dump */}
        <View style={styles.rawDumpCard}>
          <Pressable
            style={styles.rawDumpHeader}
            onPress={() => setShowRaw(!showRaw)}
          >
            <Text style={styles.rawDumpHeaderTitle}>
              Original Raw Brain Dump
            </Text>
            <Text style={styles.rawDumpToggle}>{showRaw ? 'Hide ▴' : 'Show ▾'}</Text>
          </Pressable>
          {showRaw ? (
            <Text style={styles.rawDumpContent}>{log.rawDump}</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
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
    lineHeight: 18,
    fontWeight: '500',
  },
  metaCard: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaValue: {
    fontSize: 13,
    color: '#fafafa',
    fontWeight: '500',
  },
  unprocessedCard: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  unprocessedHeader: {
    gap: 4,
  },
  unprocessedTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f59e0b',
  },
  unprocessedDescription: {
    fontSize: 13,
    color: '#71717a',
    lineHeight: 18,
  },
  primaryGenerateButton: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryGenerateButtonText: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: '600',
  },
  generatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pitchCard: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  pitchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  copyButton: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  copyButtonText: {
    color: '#fafafa',
    fontSize: 12,
    fontWeight: '500',
  },
  copyButtonTextActive: {
    color: '#10b981',
  },
  pitchBody: {
    fontSize: 14,
    color: '#fafafa',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  structuredSection: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  retryGeminiButton: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryGeminiButtonText: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '500',
  },
  bulletGroupCard: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  bulletGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  statusIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bulletGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  bulletItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletPoint: {
    color: '#71717a',
    fontSize: 14,
    lineHeight: 20,
  },
  bulletItemText: {
    flex: 1,
    color: '#e4e4e7',
    fontSize: 13,
    lineHeight: 20,
  },
  emptyGroupText: {
    color: '#52525b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  projectContextCard: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  contextSubSection: {
    gap: 8,
  },
  contextSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  techPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  contextTechPill: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  contextTechPillText: {
    color: '#e4e4e7',
    fontSize: 11,
    fontWeight: '500',
  },
  featureBadgesList: {
    gap: 6,
  },
  contextFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  contextFeatureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contextFeatureBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  contextFeatureName: {
    flex: 1,
    fontSize: 12,
    color: '#fafafa',
  },
  contextFeatureCompleted: {
    color: '#71717a',
    textDecorationLine: 'line-through',
  },
  rawDumpCard: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  rawDumpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rawDumpHeaderTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717a',
  },
  rawDumpToggle: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  rawDumpContent: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 20,
    backgroundColor: '#18181b',
    padding: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    color: '#71717a',
    fontSize: 14,
  },
  errorText: {
    color: '#fb7185',
    fontSize: 14,
    textAlign: 'center',
  },
  returnButton: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  returnButtonText: {
    color: '#fafafa',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
