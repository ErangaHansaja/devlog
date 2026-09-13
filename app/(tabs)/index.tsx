import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useProjects, useStandupLogs } from '../../src/hooks';
import type { Project, StandupLog } from '../../src/models';
import { formatRelativeTime, isToday } from '../../src/utils';

export default function StandupScreen() {
  const router = useRouter();
  const {
    logs,
    loading: logsLoading,
    error: logsError,
    refresh: refreshLogs,
  } = useStandupLogs();
  const {
    projects,
    loading: projectsLoading,
    refresh: refreshProjects,
  } = useProjects();

  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshLogs();
      refreshProjects();
    }, [refreshLogs, refreshProjects])
  );

  const onRefresh = useCallback(async () => {
    await Promise.all([refreshLogs(), refreshProjects()]);
  }, [refreshLogs, refreshProjects]);

  const todayLabel = useMemo(() => {
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return `Today, ${formattedDate}`;
  }, []);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const todaysLogs = useMemo(
    () => logs.filter((log) => isToday(log.createdAt)),
    [logs]
  );

  const pastLogs = useMemo(
    () => logs.filter((log) => !isToday(log.createdAt)),
    [logs]
  );

  const handleCopyPitch = (logId: string, pitch: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(pitch);
    }
    setCopiedLogId(logId);
    setTimeout(() => {
      setCopiedLogId((current) => (current === logId ? null : current));
    }, 2000);
  };

  const renderLogCard = (item: StandupLog) => {
    const project = projectMap.get(item.projectId);
    const projectName = project ? project.name : 'Unknown Project';
    const isCopied = copiedLogId === item.id;
    const hasStructured =
      item.structured.done.length > 0 ||
      item.structured.doing.length > 0 ||
      item.structured.blockers.length > 0;
    const hasPitch = item.singlishPitch.trim().length > 0;

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.logCard,
          pressed && styles.logCardPressed,
        ]}
        onPress={() => router.push(`/log/${item.id}`)}
      >
        {/* Card Header: Project Badge & Timestamp */}
        <View style={styles.cardHeader}>
          <View style={styles.projectPill}>
            <Text style={styles.projectPillText}>{projectName}</Text>
          </View>
          <Text style={styles.cardTimestamp}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>

        {/* Structured Bullets Counter Preview */}
        {hasStructured ? (
          <View style={styles.bulletsRow}>
            <View style={[styles.bulletBadge, styles.doneBadge]}>
              <Text style={styles.bulletDotDone}>●</Text>
              <Text style={styles.doneBadgeText}>
                {item.structured.done.length} Done
              </Text>
            </View>

            <View style={[styles.bulletBadge, styles.doingBadge]}>
              <Text style={styles.bulletDotDoing}>●</Text>
              <Text style={styles.doingBadgeText}>
                {item.structured.doing.length} Doing
              </Text>
            </View>

            <View
              style={[
                styles.bulletBadge,
                item.structured.blockers.length > 0
                  ? styles.blockersBadgeActive
                  : styles.blockersBadgeMuted,
              ]}
            >
              <Text
                style={
                  item.structured.blockers.length > 0
                    ? styles.bulletDotBlockerActive
                    : styles.bulletDotBlockerMuted
                }
              >
                ●
              </Text>
              <Text
                style={
                  item.structured.blockers.length > 0
                    ? styles.blockersBadgeTextActive
                    : styles.blockersBadgeTextMuted
                }
              >
                {item.structured.blockers.length} Blockers
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.draftBadgeContainer}>
            <View style={styles.draftBadge}>
              <Text style={styles.draftBadgeText}>📝 Raw Dump Saved</Text>
            </View>
          </View>
        )}

        {/* Singlish Pitch Preview or Raw Dump Snippet */}
        {hasPitch ? (
          <View style={styles.pitchBox}>
            <View style={styles.pitchHeader}>
              <Text style={styles.pitchHeaderTitle}>
                💬 Singlish Pitch (Ayya Sync)
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.copyButton,
                  isCopied && styles.copyButtonActive,
                  pressed && styles.buttonPressed,
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleCopyPitch(item.id, item.singlishPitch);
                }}
              >
                <Text
                  style={[
                    styles.copyButtonText,
                    isCopied && styles.copyButtonTextActive,
                  ]}
                >
                  {isCopied ? '✓ Copied' : '📋 Copy'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.pitchText} numberOfLines={2}>
              "{item.singlishPitch}"
            </Text>
          </View>
        ) : (
          <View style={styles.rawPreviewBox}>
            <Text style={styles.rawPreviewLabel}>Raw Dump Preview:</Text>
            <Text style={styles.rawPreviewText} numberOfLines={2}>
              {item.rawDump}
            </Text>
            <Text style={styles.tapToTransformText}>
              Tap to view and generate AI standup →
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  const renderTodayEmptyState = () => (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIconText}>🌅</Text>
      </View>
      <Text style={styles.emptyCardTitle}>No standup logged for today</Text>
      <Text style={styles.emptyCardDescription}>
        Dump your raw, unfiltered engineering thoughts and blockers before signing
        off. DevLog turns them into crisp DSM bullets and a natural Singlish
        script for Ayya.
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.emptyActionButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => router.push('/log/new')}
      >
        <Text style={styles.emptyActionButtonText}>+ Log Today's Work</Text>
      </Pressable>
    </View>
  );

  const isLoading = logsLoading || projectsLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerDate}>{todayLabel}</Text>
          <Text style={styles.headerSubtitle}>Morning DSM Companion</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logDumpButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.push('/log/new')}
        >
          <Text style={styles.logDumpButtonIcon}>+</Text>
          <Text style={styles.logDumpButtonText}>Log Dump</Text>
        </Pressable>
      </View>

      {/* Body Content */}
      {isLoading && logs.length === 0 ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.loadingText}>Loading standup logs...</Text>
        </View>
      ) : logsError ? (
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>{logsError}</Text>
          <Pressable style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={[1]} // Single item list to wrap sectioned content with pull-to-refresh
          keyExtractor={() => 'standup-feed'}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor="#38bdf8"
              colors={['#38bdf8']}
            />
          }
          renderItem={() => (
            <View style={styles.feedWrapper}>
              {/* Today's Section */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Standup</Text>
                {todaysLogs.length > 0 ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {todaysLogs.length} logged
                    </Text>
                  </View>
                ) : null}
              </View>

              {todaysLogs.length === 0
                ? renderTodayEmptyState()
                : todaysLogs.map(renderLogCard)}

              {/* Past Logs Section */}
              {pastLogs.length > 0 ? (
                <View style={styles.pastSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Previous Standups</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {pastLogs.length} total
                      </Text>
                    </View>
                  </View>
                  {pastLogs.map(renderLogCard)}
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#020617',
  },
  headerDate: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  logDumpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  logDumpButtonIcon: {
    color: '#020617',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
  },
  logDumpButtonText: {
    color: '#020617',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  scrollContent: {
    padding: 16,
  },
  feedWrapper: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyIconText: {
    fontSize: 24,
  },
  emptyCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
  },
  emptyCardDescription: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  emptyActionButton: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
    marginTop: 6,
  },
  emptyActionButtonText: {
    color: '#020617',
    fontSize: 14,
    fontWeight: '700',
  },
  logCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  logCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  projectPillText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  cardTimestamp: {
    fontSize: 12,
    color: '#64748b',
  },
  bulletsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bulletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 5,
  },
  doneBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  bulletDotDone: {
    color: '#22c55e',
    fontSize: 8,
  },
  doneBadgeText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '600',
  },
  doingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  bulletDotDoing: {
    color: '#f59e0b',
    fontSize: 8,
  },
  doingBadgeText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600',
  },
  blockersBadgeActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  bulletDotBlockerActive: {
    color: '#ef4444',
    fontSize: 8,
  },
  blockersBadgeTextActive: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
  },
  blockersBadgeMuted: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderColor: 'rgba(100, 116, 139, 0.2)',
  },
  bulletDotBlockerMuted: {
    color: '#64748b',
    fontSize: 8,
  },
  blockersBadgeTextMuted: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  draftBadgeContainer: {
    flexDirection: 'row',
  },
  draftBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  draftBadgeText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '500',
  },
  pitchBox: {
    backgroundColor: '#020617',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    gap: 6,
  },
  pitchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pitchHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  copyButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  copyButtonActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  copyButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38bdf8',
  },
  copyButtonTextActive: {
    color: '#4ade80',
  },
  pitchText: {
    fontSize: 13,
    color: '#e2e8f0',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  rawPreviewBox: {
    backgroundColor: '#020617',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    gap: 4,
  },
  rawPreviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rawPreviewText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  tapToTransformText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38bdf8',
    marginTop: 4,
  },
  pastSection: {
    marginTop: 8,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
});
