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
import { getStandupLogById } from '../../src/services/logs.service';
import { getProjectById } from '../../src/services/projects.service';
import type { Project, StandupLog } from '../../src/models';
import { formatDate, formatRelativeTime } from '../../src/utils';

export default function LogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [log, setLog] = useState<StandupLog | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

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
          <Pressable style={styles.returnButton} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.returnButtonText}>Return to Standup</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const hasDone = log.structured.done.length > 0;
  const hasDoing = log.structured.doing.length > 0;
  const hasBlockers = log.structured.blockers.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={styles.backButtonIcon}>‹</Text>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <View style={styles.headerTitleCenter}>
          <Text style={styles.headerTitle}>{project?.name || 'Standup Log'}</Text>
          <Text style={styles.headerSubtitle}>{formatDate(log.createdAt)}</Text>
        </View>

        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Project Meta Card */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Project</Text>
            <Text style={styles.metaValue}>{project?.name || 'Unknown'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Logged</Text>
            <Text style={styles.metaValue}>{formatRelativeTime(log.createdAt)}</Text>
          </View>
        </View>

        {/* Singlish Pitch Card */}
        {log.singlishPitch ? (
          <View style={styles.pitchCard}>
            <View style={styles.pitchCardHeader}>
              <Text style={styles.cardHeaderTitle}>💬 Singlish Pitch for DSM</Text>
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
        <View style={styles.structuredSection}>
          <Text style={styles.sectionHeaderTitle}>Standup Breakdown</Text>

          {/* Done Section */}
          <View style={styles.bulletGroupCard}>
            <View style={styles.bulletGroupHeader}>
              <View style={[styles.statusIndicatorDot, { backgroundColor: '#10b981' }]} />
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
              <Text style={styles.emptyGroupText}>No completed items recorded.</Text>
            )}
          </View>

          {/* Doing Section */}
          <View style={styles.bulletGroupCard}>
            <View style={styles.bulletGroupHeader}>
              <View style={[styles.statusIndicatorDot, { backgroundColor: '#f59e0b' }]} />
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
              <Text style={styles.emptyGroupText}>No in-progress items recorded.</Text>
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

        {/* Collapsible Raw Brain Dump */}
        <View style={styles.rawDumpCard}>
          <Pressable
            style={styles.rawDumpHeader}
            onPress={() => setShowRaw(!showRaw)}
          >
            <Text style={styles.rawDumpHeaderTitle}>Original Raw Brain Dump</Text>
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
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
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
    backgroundColor: '#fafafa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  returnButtonText: {
    color: '#09090b',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
