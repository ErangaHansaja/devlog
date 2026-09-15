import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProjects, useStandupLogs } from '../../src/hooks';
import type { Project, StandupLog, StandupStructure } from '../../src/models';
import { deleteStandupLog } from '../../src/services/logs.service';
import { generateMasterStandup } from '../../src/api/gemini.api';
import { SwipeableRow } from '../../src/components';
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

  // Master Standup Compilation State
  const [isCompilingMaster, setIsCompilingMaster] = useState(false);
  const [masterModalVisible, setMasterModalVisible] = useState(false);
  const [masterResult, setMasterResult] = useState<{
    masterPitch: string;
    combinedStructured: StandupStructure;
  } | null>(null);
  const [isCopiedMaster, setIsCopiedMaster] = useState(false);

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

  const handleDeleteLog = (log: StandupLog) => {
    Alert.alert(
      'Delete Standup Log',
      'Are you sure you want to delete this standup log? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStandupLog(log.id);
              await refreshLogs();
            } catch (err) {
              Alert.alert(
                'Delete Failed',
                err instanceof Error ? err.message : 'Could not delete log.'
              );
            }
          },
        },
      ]
    );
  };

  const handleCompileMasterStandup = async () => {
    if (todaysLogs.length < 2) return;
    setIsCompilingMaster(true);
    try {
      const dumps = todaysLogs.map((log) => ({
        projectName: projectMap.get(log.projectId)?.name || 'Project',
        rawDump: log.rawDump,
        structured: log.structured,
      }));
      const result = await generateMasterStandup(dumps);
      setMasterResult(result);
      setMasterModalVisible(true);
    } catch (err) {
      Alert.alert(
        'Compilation Failed',
        err instanceof Error ? err.message : 'Could not compile master standup.'
      );
    } finally {
      setIsCompilingMaster(false);
    }
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
      <SwipeableRow
        key={item.id}
        onDelete={() => handleDeleteLog(item)}
        containerStyle={styles.swipeableContainer}
      >
        <Pressable
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
                    {isCopied ? '✓ Copied' : 'Copy'}
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
                Tap to view and compile standup →
              </Text>
            </View>
          )}
        </Pressable>
      </SwipeableRow>
    );
  };

  const renderTodayEmptyState = () => (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIconText}>🌅</Text>
      </View>
      <Text style={styles.emptyCardTitle}>No standup logged for today</Text>
      <Text style={styles.emptyCardDescription}>
        Dump your raw, unfiltered thoughts and blockers before signing off. DevLog
        turns them into crisp DSM bullets and a natural Singlish script for Ayya.
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
          <Text style={styles.logDumpButtonText}>+ Log Dump</Text>
        </Pressable>
      </View>

      {/* Body Content */}
      {isLoading && logs.length === 0 ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#fafafa" />
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
          data={[1]}
          keyExtractor={() => 'standup-feed'}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor="#fafafa"
              colors={['#fafafa']}
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

              {/* Master Standup Action Card (Visible when 2+ project logs exist) */}
              {todaysLogs.length >= 2 && (
                <View style={styles.masterCard}>
                  <View style={styles.masterCardHeader}>
                    <View style={styles.masterIconCircle}>
                      <Ionicons name="git-merge-outline" size={18} color="#a855f7" />
                    </View>
                    <View style={styles.masterMeta}>
                      <View style={styles.masterTitleRow}>
                        <Text style={styles.masterTitle}>Master Standup</Text>
                        <View style={styles.masterBadge}>
                          <Text style={styles.masterBadgeText}>
                            {todaysLogs.length} projects
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.masterSubtitle}>
                        Compile an all-in-one DSM sync script for Ayya
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={[
                      styles.masterActionButton,
                      isCompilingMaster && styles.buttonDisabled,
                    ]}
                    onPress={handleCompileMasterStandup}
                    disabled={isCompilingMaster}
                  >
                    {isCompilingMaster ? (
                      <ActivityIndicator size="small" color="#fafafa" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={14} color="#fafafa" />
                        <Text style={styles.masterActionButtonText}>
                          Compile Master Standup
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}

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

      {/* Master Standup Modal */}
      <Modal
        visible={masterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMasterModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMasterModalVisible(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Master DSM Pitch</Text>
                <Text style={styles.modalSubtitle}>
                  Unified morning script across all active projects
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseIcon}
                onPress={() => setMasterModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#71717a" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {masterResult?.masterPitch ? (
                <View style={styles.modalPitchBox}>
                  <View style={styles.pitchHeader}>
                    <Text style={styles.pitchHeaderTitle}>
                      💬 Speaking Script (Ayya Sync)
                    </Text>
                    <Pressable
                      style={[
                        styles.copyButton,
                        isCopiedMaster && styles.copyButtonActive,
                      ]}
                      onPress={() => {
                        if (
                          typeof navigator !== 'undefined' &&
                          navigator.clipboard?.writeText
                        ) {
                          navigator.clipboard.writeText(
                            masterResult.masterPitch
                          );
                        }
                        setIsCopiedMaster(true);
                        setTimeout(() => setIsCopiedMaster(false), 2000);
                      }}
                    >
                      <Text
                        style={[
                          styles.copyButtonText,
                          isCopiedMaster && styles.copyButtonTextActive,
                        ]}
                      >
                        {isCopiedMaster ? '✓ Copied' : 'Copy Script'}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={styles.pitchFullText}>
                    "{masterResult.masterPitch}"
                  </Text>
                </View>
              ) : null}

              {/* Combined Bullets summary */}
              {masterResult?.combinedStructured && (
                <View style={styles.combinedBulletsContainer}>
                  {masterResult.combinedStructured.done.length > 0 && (
                    <View style={styles.bulletCategory}>
                      <Text style={styles.bulletCategoryTitle}>
                        Done Yesterday ({masterResult.combinedStructured.done.length})
                      </Text>
                      {masterResult.combinedStructured.done.map((item, idx) => (
                        <Text key={`done-${idx}`} style={styles.bulletItemText}>
                          • {item}
                        </Text>
                      ))}
                    </View>
                  )}

                  {masterResult.combinedStructured.doing.length > 0 && (
                    <View style={styles.bulletCategory}>
                      <Text style={styles.bulletCategoryTitle}>
                        Today's Focus ({masterResult.combinedStructured.doing.length})
                      </Text>
                      {masterResult.combinedStructured.doing.map((item, idx) => (
                        <Text key={`doing-${idx}`} style={styles.bulletItemText}>
                          • {item}
                        </Text>
                      ))}
                    </View>
                  )}

                  {masterResult.combinedStructured.blockers.length > 0 && (
                    <View style={styles.bulletCategory}>
                      <Text style={styles.bulletCategoryTitleBlocker}>
                        Blockers ({masterResult.combinedStructured.blockers.length})
                      </Text>
                      {masterResult.combinedStructured.blockers.map((item, idx) => (
                        <Text key={`blocker-${idx}`} style={styles.bulletItemTextBlocker}>
                          • {item}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <Pressable
              style={styles.modalDoneButton}
              onPress={() => setMasterModalVisible(false)}
            >
              <Text style={styles.modalDoneButtonText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#09090b',
  },
  headerDate: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fafafa',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  logDumpButton: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logDumpButtonText: {
    color: '#fafafa',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
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
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fafafa',
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '500',
  },
  masterCard: {
    backgroundColor: '#121215',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b0764',
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  masterCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  masterIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  masterMeta: {
    flex: 1,
  },
  masterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  masterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fafafa',
  },
  masterBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  masterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c084fc',
    textTransform: 'uppercase',
  },
  masterSubtitle: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  masterActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#7e22ce',
    paddingVertical: 9,
    borderRadius: 8,
  },
  masterActionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  swipeableContainer: {
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#121215',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyIconText: {
    fontSize: 22,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fafafa',
    textAlign: 'center',
  },
  emptyCardDescription: {
    fontSize: 13,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 300,
  },
  emptyActionButton: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  emptyActionButtonText: {
    color: '#fafafa',
    fontSize: 13,
    fontWeight: '600',
  },
  logCard: {
    backgroundColor: '#121215',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    gap: 12,
  },
  logCardPressed: {
    backgroundColor: '#18181b',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  projectPill: {
    backgroundColor: '#18181b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  projectPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e4e4e7',
  },
  cardTimestamp: {
    fontSize: 12,
    color: '#71717a',
  },
  bulletsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bulletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  doneBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  bulletDotDone: {
    color: '#34d399',
    fontSize: 8,
  },
  doneBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34d399',
  },
  doingBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  bulletDotDoing: {
    color: '#38bdf8',
    fontSize: 8,
  },
  doingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38bdf8',
  },
  blockersBadgeActive: {
    backgroundColor: 'rgba(251, 113, 133, 0.08)',
    borderColor: 'rgba(251, 113, 133, 0.2)',
  },
  bulletDotBlockerActive: {
    color: '#fb7185',
    fontSize: 8,
  },
  blockersBadgeTextActive: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fb7185',
  },
  blockersBadgeMuted: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
  },
  bulletDotBlockerMuted: {
    color: '#52525b',
    fontSize: 8,
  },
  blockersBadgeTextMuted: {
    fontSize: 11,
    fontWeight: '500',
    color: '#71717a',
  },
  draftBadgeContainer: {
    flexDirection: 'row',
  },
  draftBadge: {
    backgroundColor: '#18181b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  draftBadgeText: {
    fontSize: 11,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  pitchBox: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 12,
    gap: 8,
  },
  pitchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pitchHeaderTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  copyButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#27272a',
    borderRadius: 4,
  },
  copyButtonActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
  },
  copyButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e4e4e7',
  },
  copyButtonTextActive: {
    color: '#34d399',
  },
  pitchText: {
    fontSize: 12,
    color: '#d4d4d8',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  pitchFullText: {
    fontSize: 13,
    color: '#fafafa',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  rawPreviewBox: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  rawPreviewLabel: {
    fontSize: 11,
    color: '#71717a',
    fontWeight: '500',
  },
  rawPreviewText: {
    fontSize: 12,
    color: '#a1a1aa',
    lineHeight: 16,
  },
  tapToTransformText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '500',
    marginTop: 2,
  },
  pastSection: {
    marginTop: 8,
    gap: 6,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#71717a',
  },
  errorText: {
    fontSize: 13,
    color: '#fb7185',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#27272a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 13,
    color: '#fafafa',
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Master Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fafafa',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  modalCloseIcon: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 380,
  },
  modalPitchBox: {
    backgroundColor: '#18181b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3b0764',
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  combinedBulletsContainer: {
    gap: 14,
  },
  bulletCategory: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  bulletCategoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  bulletCategoryTitleBlocker: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fb7185',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  bulletItemText: {
    fontSize: 13,
    color: '#d4d4d8',
    lineHeight: 18,
  },
  bulletItemTextBlocker: {
    fontSize: 13,
    color: '#fb7185',
    lineHeight: 18,
  },
  modalDoneButton: {
    backgroundColor: '#27272a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalDoneButtonText: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: '600',
  },
});
