import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProjects } from '../../src/hooks';
import type { CreateProjectInput, Project, TechStack } from '../../src/models';
import { createProject } from '../../src/services/projects.service';
import { formatRelativeTime } from '../../src/utils';
import { validateProjectInput } from '../../src/validation';

export default function ProjectsScreen() {
  const { projects, loading, error, refresh } = useProjects();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [frontendText, setFrontendText] = useState('');
  const [backendText, setBackendText] = useState('');
  const [mobileText, setMobileText] = useState('');
  const [toolsText, setToolsText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setProjectName('');
    setFrontendText('');
    setBackendText('');
    setMobileText('');
    setToolsText('');
    setFormError(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isSaving) {
      setIsModalOpen(false);
      resetForm();
    }
  };

  const parseChips = (csv: string): string[] => {
    return csv
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const appendChip = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    chip: string
  ) => {
    setter((prev) => {
      const existing = parseChips(prev);
      if (existing.includes(chip)) return prev;
      return existing.length > 0 ? `${prev}, ${chip}` : chip;
    });
  };

  const handleSaveProject = async () => {
    const techStack: TechStack = {
      frontend: parseChips(frontendText),
      backend: parseChips(backendText),
      mobile: parseChips(mobileText),
      tools: parseChips(toolsText),
    };

    const validation = validateProjectInput(projectName, techStack);
    if (!validation.isValid) {
      setFormError(
        validation.errors?.name ||
          validation.errors?.frontend ||
          validation.errors?.backend ||
          validation.errors?.mobile ||
          validation.errors?.tools ||
          'Please provide a valid project name.'
      );
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const input: CreateProjectInput = {
        name: projectName.trim(),
        techStack,
      };

      await createProject(input);
      await refresh();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save project'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderTechCategory = (
    label: string,
    items: string[] | undefined,
    pillStyle: object,
    pillTextStyle: object
  ) => {
    if (!items || items.length === 0) return null;

    return (
      <View style={styles.techCategoryRow}>
        <Text style={styles.techCategoryLabel}>{label}:</Text>
        <View style={styles.techPillsWrapper}>
          {items.map((tech, index) => (
            <View key={`${label}-${tech}-${index}`} style={[styles.techPill, pillStyle]}>
              <Text style={[styles.techPillText, pillTextStyle]}>{tech}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderProjectCard = ({ item }: { item: Project }) => {
    const inProgressCount = item.features.filter(
      (f) => f.status === 'in_progress'
    ).length;
    const completedCount = item.features.filter(
      (f) => f.status === 'completed'
    ).length;
    const totalFeatures = item.features.length;

    const hasAnyTech =
      (item.techStack.frontend && item.techStack.frontend.length > 0) ||
      (item.techStack.backend && item.techStack.backend.length > 0) ||
      (item.techStack.mobile && item.techStack.mobile.length > 0) ||
      (item.techStack.tools && item.techStack.tools.length > 0);

    return (
      <View style={styles.projectCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.projectName}>{item.name}</Text>
            <Text style={styles.cardTimestamp}>
              Updated {formatRelativeTime(item.updatedAt)}
            </Text>
          </View>

          <View
            style={[
              styles.featureBadge,
              inProgressCount > 0 ? styles.featureBadgeActive : styles.featureBadgeMuted,
            ]}
          >
            <View
              style={[
                styles.featureDot,
                inProgressCount > 0 ? styles.featureDotActive : styles.featureDotMuted,
              ]}
            />
            <Text
              style={[
                styles.featureBadgeText,
                inProgressCount > 0
                  ? styles.featureBadgeTextActive
                  : styles.featureBadgeTextMuted,
              ]}
            >
              {inProgressCount > 0
                ? `${inProgressCount} ${inProgressCount === 1 ? 'feature' : 'features'} in progress`
                : totalFeatures > 0
                ? `${totalFeatures} ${totalFeatures === 1 ? 'feature' : 'features'} (${completedCount} done)`
                : '0 features'}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBody}>
          {hasAnyTech ? (
            <View style={styles.techStackContainer}>
              {renderTechCategory(
                'Frontend',
                item.techStack.frontend,
                styles.fePill,
                styles.fePillText
              )}
              {renderTechCategory(
                'Backend',
                item.techStack.backend,
                styles.bePill,
                styles.bePillText
              )}
              {renderTechCategory(
                'Mobile',
                item.techStack.mobile,
                styles.mobilePill,
                styles.mobilePillText
              )}
              {renderTechCategory(
                'Tools',
                item.techStack.tools,
                styles.toolsPill,
                styles.toolsPillText
              )}
            </View>
          ) : (
            <Text style={styles.noTechText}>No tech stack configured</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Projects</Text>
          <Text style={styles.screenSubtitle}>
            {projects.length > 0
              ? `${projects.length} active ${projects.length === 1 ? 'repository' : 'repositories'}`
              : 'Manage private repositories'}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.addProjectButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleOpenModal}
        >
          <Text style={styles.addProjectButtonIcon}>+</Text>
          <Text style={styles.addProjectButtonText}>Add Project</Text>
        </Pressable>
      </View>

      {/* Main Content */}
      {loading && projects.length === 0 ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.loadingText}>Loading repositories...</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredState}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>📁</Text>
          </View>
          <Text style={styles.emptyTitle}>No projects added yet</Text>
          <Text style={styles.emptyDescription}>
            Tap + to track your first repo.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.emptyAddButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleOpenModal}
          >
            <Text style={styles.emptyAddButtonText}>+ Add First Project</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          renderItem={renderProjectCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor="#38bdf8"
              colors={['#38bdf8']}
            />
          }
        />
      )}

      {/* Create Project Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseModal} />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>New Project</Text>
                  <Text style={styles.modalSubtitle}>
                    Track repository stack and features
                  </Text>
                </View>
                <Pressable
                  onPress={handleCloseModal}
                  style={styles.modalCloseButton}
                  hitSlop={12}
                >
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalFormContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {formError ? (
                  <View style={styles.formErrorBanner}>
                    <Text style={styles.formErrorText}>{formError}</Text>
                  </View>
                ) : null}

                {/* Project Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Project Name <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. devlog-mobile, payment-gateway"
                    placeholderTextColor="#64748b"
                    value={projectName}
                    onChangeText={(text) => {
                      setProjectName(text);
                      if (formError) setFormError(null);
                    }}
                    autoFocus
                    editable={!isSaving}
                  />
                </View>

                {/* Frontend */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Frontend Technologies</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Comma-separated: React, Next.js, Tailwind"
                    placeholderTextColor="#64748b"
                    value={frontendText}
                    onChangeText={setFrontendText}
                    editable={!isSaving}
                  />
                  <View style={styles.chipSuggestions}>
                    {['React', 'Next.js', 'Tailwind', 'Vue', 'TypeScript'].map(
                      (chip) => (
                        <Pressable
                          key={`fe-chip-${chip}`}
                          style={styles.suggestionChip}
                          onPress={() => appendChip(setFrontendText, chip)}
                        >
                          <Text style={styles.suggestionChipText}>+ {chip}</Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>

                {/* Backend */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Backend Technologies</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Comma-separated: Node.js, Express, PostgreSQL"
                    placeholderTextColor="#64748b"
                    value={backendText}
                    onChangeText={setBackendText}
                    editable={!isSaving}
                  />
                  <View style={styles.chipSuggestions}>
                    {['Node.js', 'Express', 'PostgreSQL', 'Python', 'Go', 'GraphQL'].map(
                      (chip) => (
                        <Pressable
                          key={`be-chip-${chip}`}
                          style={styles.suggestionChip}
                          onPress={() => appendChip(setBackendText, chip)}
                        >
                          <Text style={styles.suggestionChipText}>+ {chip}</Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>

                {/* Mobile */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Mobile Technologies</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Comma-separated: React Native, Expo, iOS"
                    placeholderTextColor="#64748b"
                    value={mobileText}
                    onChangeText={setMobileText}
                    editable={!isSaving}
                  />
                  <View style={styles.chipSuggestions}>
                    {['React Native', 'Expo', 'iOS', 'Android', 'Swift', 'Kotlin'].map(
                      (chip) => (
                        <Pressable
                          key={`mobile-chip-${chip}`}
                          style={styles.suggestionChip}
                          onPress={() => appendChip(setMobileText, chip)}
                        >
                          <Text style={styles.suggestionChipText}>+ {chip}</Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>

                {/* Tools */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Tools & Infrastructure</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Comma-separated: Docker, GitHub Actions, AWS"
                    placeholderTextColor="#64748b"
                    value={toolsText}
                    onChangeText={setToolsText}
                    editable={!isSaving}
                  />
                  <View style={styles.chipSuggestions}>
                    {['Docker', 'GitHub Actions', 'AWS', 'Vercel', 'Supabase'].map(
                      (chip) => (
                        <Pressable
                          key={`tools-chip-${chip}`}
                          style={styles.suggestionChip}
                          onPress={() => appendChip(setToolsText, chip)}
                        >
                          <Text style={styles.suggestionChipText}>+ {chip}</Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.modalActions}>
                  <Pressable
                    style={[styles.cancelButton, isSaving && styles.buttonDisabled]}
                    onPress={handleCloseModal}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.saveButton,
                      isSaving && styles.buttonDisabled,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleSaveProject}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#020617" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Project</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  addProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addProjectButtonIcon: {
    color: '#020617',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
  },
  addProjectButtonText: {
    color: '#020617',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  projectCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitleContainer: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  cardTimestamp: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  featureBadgeActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  featureBadgeMuted: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  featureDotActive: {
    backgroundColor: '#f59e0b',
  },
  featureDotMuted: {
    backgroundColor: '#64748b',
  },
  featureBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  featureBadgeTextActive: {
    color: '#fbbf24',
  },
  featureBadgeTextMuted: {
    color: '#94a3b8',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 12,
  },
  cardBody: {
    gap: 8,
  },
  techStackContainer: {
    gap: 8,
  },
  techCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  techCategoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    width: 65,
  },
  techPillsWrapper: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  techPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  techPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  fePill: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  fePillText: {
    color: '#38bdf8',
  },
  bePill: {
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    borderColor: 'rgba(129, 140, 248, 0.3)',
  },
  bePillText: {
    color: '#818cf8',
  },
  mobilePill: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  mobilePillText: {
    color: '#c084fc',
  },
  toolsPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  toolsPillText: {
    color: '#fbbf24',
  },
  noTechText: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  emptyAddButton: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  emptyAddButtonText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    borderBottomWidth: 0,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseIcon: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  modalScrollView: {
    maxHeight: 520,
  },
  modalFormContent: {
    padding: 20,
    gap: 16,
  },
  formErrorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 10,
  },
  formErrorText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '500',
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  requiredStar: {
    color: '#38bdf8',
  },
  textInput: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
  },
  chipSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  suggestionChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  suggestionChipText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cancelButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#020617',
    fontSize: 14,
    fontWeight: '700',
  },
});
