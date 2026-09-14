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
import type {
  CreateProjectInput,
  FeatureStatus,
  Project,
  ProjectFeature,
  TechStack,
} from '../../src/models';
import {
  addFeature,
  createProject,
  removeFeature,
  toggleFeatureStatus,
  updateFeature,
} from '../../src/services/projects.service';
import { formatRelativeTime } from '../../src/utils';
import { validateProjectInput } from '../../src/validation';
import { FeatureStatusColors, FeatureStatusLabels } from '../../src/constants';

const STATUS_CYCLE: FeatureStatus[] = ['backlog', 'in_progress', 'completed'];

export default function ProjectsScreen() {
  const { projects, loading, error, refresh } = useProjects();

  // Project creation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [frontendText, setFrontendText] = useState('');
  const [backendText, setBackendText] = useState('');
  const [mobileText, setMobileText] = useState('');
  const [toolsText, setToolsText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Expandable cards state (project ID -> boolean)
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Inline feature creation state
  const [activeFeatureProjectId, setActiveFeatureProjectId] = useState<string | null>(null);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureStatus, setNewFeatureStatus] = useState<FeatureStatus>('in_progress');
  const [isAddingFeature, setIsAddingFeature] = useState(false);
  const [featureError, setFeatureError] = useState<string | null>(null);

  const toggleExpandProject = (id: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const resetProjectForm = () => {
    setProjectName('');
    setProjectDescription('');
    setFrontendText('');
    setBackendText('');
    setMobileText('');
    setToolsText('');
    setFormError(null);
  };

  const handleOpenModal = () => {
    resetProjectForm();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isSaving) {
      setIsModalOpen(false);
      resetProjectForm();
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
        description: projectDescription.trim() || undefined,
        techStack,
      };

      const created = await createProject(input);
      await refresh();
      // Auto-expand the newly created project
      setExpandedProjects((prev) => ({ ...prev, [created.id]: true }));
      setIsModalOpen(false);
      resetProjectForm();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save project'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Feature actions
  const handleStartAddFeature = (projectId: string) => {
    setActiveFeatureProjectId(projectId);
    setNewFeatureName('');
    setNewFeatureStatus('in_progress');
    setFeatureError(null);
  };

  const handleCancelAddFeature = () => {
    setActiveFeatureProjectId(null);
    setNewFeatureName('');
    setFeatureError(null);
  };

  const handleSaveFeature = async (projectId: string) => {
    if (!newFeatureName.trim()) {
      setFeatureError('Feature name is required');
      return;
    }

    try {
      setIsAddingFeature(true);
      setFeatureError(null);

      await addFeature(projectId, {
        name: newFeatureName.trim(),
        status: newFeatureStatus,
      });

      await refresh();
      setActiveFeatureProjectId(null);
      setNewFeatureName('');
    } catch (err) {
      setFeatureError(
        err instanceof Error ? err.message : 'Failed to add feature'
      );
    } finally {
      setIsAddingFeature(false);
    }
  };

  const handleCycleFeatureStatus = async (
    projectId: string,
    feature: ProjectFeature
  ) => {
    try {
      await toggleFeatureStatus(projectId, feature.id);
      await refresh();
    } catch (err) {
      console.error('Failed to cycle feature status:', err);
    }
  };

  const handleDeleteFeature = async (projectId: string, featureId: string) => {
    try {
      await removeFeature(projectId, featureId);
      await refresh();
    } catch (err) {
      console.error('Failed to remove feature:', err);
    }
  };

  const renderTechCategory = (label: string, items: string[] | undefined) => {
    if (!items || items.length === 0) return null;

    return (
      <View style={styles.techCategoryRow}>
        <Text style={styles.techCategoryLabel}>{label}</Text>
        <View style={styles.techPillsWrapper}>
          {items.map((tech, index) => (
            <View key={`${label}-${tech}-${index}`} style={styles.techPill}>
              <Text style={styles.techPillText}>{tech}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderProjectCard = ({ item }: { item: Project }) => {
    const isExpanded = !!expandedProjects[item.id];
    const isAddingThisFeature = activeFeatureProjectId === item.id;

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
        {/* Clickable Card Header */}
        <Pressable
          style={({ pressed }) => [
            styles.cardHeaderPressable,
            pressed && styles.cardHeaderPressed,
          ]}
          onPress={() => toggleExpandProject(item.id)}
        >
          <View style={styles.cardHeaderTop}>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.projectName}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.projectCardDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <Text style={styles.cardTimestamp}>
                Updated {formatRelativeTime(item.updatedAt)}
              </Text>
            </View>

            <View style={styles.headerRightArea}>
              <View
                style={[
                  styles.featureBadge,
                  inProgressCount > 0
                    ? styles.featureBadgeActive
                    : styles.featureBadgeMuted,
                ]}
              >
                <View
                  style={[
                    styles.featureDot,
                    {
                      backgroundColor:
                        inProgressCount > 0
                          ? FeatureStatusColors.in_progress
                          : FeatureStatusColors.backlog,
                    },
                  ]}
                />
                <Text style={styles.featureBadgeText}>
                  {inProgressCount > 0
                    ? `${inProgressCount} in progress`
                    : totalFeatures > 0
                    ? `${completedCount}/${totalFeatures} done`
                    : '0 features'}
                </Text>
              </View>

              <Text style={styles.expandChevron}>
                {isExpanded ? '▴' : '▾'}
              </Text>
            </View>
          </View>

          {/* Collapsed view tech badges preview */}
          {!isExpanded && hasAnyTech && (
            <View style={styles.collapsedTechRow}>
              {[
                ...(item.techStack.frontend || []),
                ...(item.techStack.backend || []),
                ...(item.techStack.mobile || []),
                ...(item.techStack.tools || []),
              ]
                .slice(0, 4)
                .map((tech, idx) => (
                  <View key={`collapsed-tech-${idx}`} style={styles.miniTechPill}>
                    <Text style={styles.miniTechPillText}>{tech}</Text>
                  </View>
                ))}
            </View>
          )}
        </Pressable>

        {/* Expanded View Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.cardDivider} />

            {/* Categorized Tech Stack */}
            <View style={styles.techStackContainer}>
              <Text style={styles.sectionSubtitle}>Tech Stack</Text>
              {hasAnyTech ? (
                <View style={styles.techCategoriesStack}>
                  {renderTechCategory('Frontend', item.techStack.frontend)}
                  {renderTechCategory('Backend', item.techStack.backend)}
                  {renderTechCategory('Mobile', item.techStack.mobile)}
                  {renderTechCategory('Tools', item.techStack.tools)}
                </View>
              ) : (
                <Text style={styles.emptySubtext}>No tech stack configured</Text>
              )}
            </View>

            <View style={styles.cardDivider} />

            {/* Features Management Section */}
            <View style={styles.featuresSection}>
              <View style={styles.featuresSectionHeader}>
                <Text style={styles.sectionSubtitle}>
                  Features ({totalFeatures})
                </Text>

                {!isAddingThisFeature && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.addFeatureSmallButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => handleStartAddFeature(item.id)}
                  >
                    <Text style={styles.addFeatureSmallButtonText}>
                      + Add Feature
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Inline Add Feature Form */}
              {isAddingThisFeature && (
                <View style={styles.addFeatureForm}>
                  {featureError ? (
                    <Text style={styles.featureErrorText}>{featureError}</Text>
                  ) : null}

                  <TextInput
                    style={styles.featureTextInput}
                    placeholder="Feature name, e.g. Auth Tokens"
                    placeholderTextColor="#52525b"
                    value={newFeatureName}
                    onChangeText={(t) => {
                      setNewFeatureName(t);
                      if (featureError) setFeatureError(null);
                    }}
                    autoFocus
                    editable={!isAddingFeature}
                  />

                  {/* Status Pills Selector */}
                  <View style={styles.statusSelectorRow}>
                    {STATUS_CYCLE.map((status) => {
                      const isSelected = newFeatureStatus === status;
                      return (
                        <Pressable
                          key={`status-opt-${status}`}
                          style={[
                            styles.statusSelectorOption,
                            isSelected && styles.statusSelectorOptionSelected,
                          ]}
                          onPress={() => setNewFeatureStatus(status)}
                        >
                          <View
                            style={[
                              styles.featureDotSmall,
                              { backgroundColor: FeatureStatusColors[status] },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusSelectorOptionText,
                              isSelected && styles.statusSelectorOptionTextSelected,
                            ]}
                          >
                            {FeatureStatusLabels[status]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.featureFormActions}>
                    <Pressable
                      style={styles.featureCancelButton}
                      onPress={handleCancelAddFeature}
                      disabled={isAddingFeature}
                    >
                      <Text style={styles.featureCancelButtonText}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.featureSaveButton,
                        isAddingFeature && styles.buttonDisabled,
                      ]}
                      onPress={() => handleSaveFeature(item.id)}
                      disabled={isAddingFeature}
                    >
                      {isAddingFeature ? (
                        <ActivityIndicator size="small" color="#09090b" />
                      ) : (
                        <Text style={styles.featureSaveButtonText}>Save</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Feature Badges List */}
              {item.features.length === 0 && !isAddingThisFeature ? (
                <Text style={styles.emptySubtext}>
                  No features tracked yet. Tap "+ Add Feature" to track tasks.
                </Text>
              ) : (
                <View style={styles.featureList}>
                  {item.features.map((feature) => {
                    const statusColor = FeatureStatusColors[feature.status];
                    const isCompleted = feature.status === 'completed';

                    return (
                      <View key={feature.id} style={styles.featureRow}>
                        {/* Status Toggle Badge */}
                        <Pressable
                          style={({ pressed }) => [
                            styles.statusToggleBadge,
                            pressed && styles.buttonPressed,
                          ]}
                          onPress={() =>
                            handleCycleFeatureStatus(item.id, feature)
                          }
                        >
                          <View
                            style={[
                              styles.featureDotSmall,
                              { backgroundColor: statusColor },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusToggleText,
                              { color: statusColor },
                            ]}
                          >
                            {FeatureStatusLabels[feature.status]}
                          </Text>
                        </Pressable>

                        {/* Feature Name */}
                        <Text
                          style={[
                            styles.featureNameText,
                            isCompleted && styles.featureNameCompleted,
                          ]}
                          numberOfLines={1}
                        >
                          {feature.name}
                        </Text>

                        {/* Delete Button */}
                        <Pressable
                          style={({ pressed }) => [
                            styles.featureDeleteButton,
                            pressed && styles.buttonPressed,
                          ]}
                          onPress={() =>
                            handleDeleteFeature(item.id, feature.id)
                          }
                          hitSlop={8}
                        >
                          <Text style={styles.featureDeleteIcon}>✕</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}
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
              : 'Private repositories'}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.addProjectButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleOpenModal}
        >
          <Text style={styles.addProjectButtonText}>+ Add Project</Text>
        </Pressable>
      </View>

      {/* Main Content */}
      {loading && projects.length === 0 ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#fafafa" />
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
            Track private repos, categorized tech stacks, and feature milestones.
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
              tintColor="#fafafa"
              colors={['#fafafa']}
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
                  <Text style={styles.formLabel}>Project Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. devlog-mobile, payment-service"
                    placeholderTextColor="#52525b"
                    value={projectName}
                    onChangeText={(text) => {
                      setProjectName(text);
                      if (formError) setFormError(null);
                    }}
                    autoFocus
                    editable={!isSaving}
                  />
                </View>

                {/* Project Description */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Project Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textAreaInput]}
                    placeholder="e.g. Hospitality staff scheduling and fresh inventory management app"
                    placeholderTextColor="#52525b"
                    value={projectDescription}
                    onChangeText={setProjectDescription}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!isSaving}
                  />
                </View>

                {/* Frontend */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Frontend Technologies</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Comma-separated: React, Next.js, Tailwind"
                    placeholderTextColor="#52525b"
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
                    placeholderTextColor="#52525b"
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
                    placeholderTextColor="#52525b"
                    value={mobileText}
                    onChangeText={setMobileText}
                    editable={!isSaving}
                  />
                  <View style={styles.chipSuggestions}>
                    {['React Native', 'Expo', 'iOS', 'Android', 'Swift'].map(
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
                    placeholderTextColor="#52525b"
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
                      <ActivityIndicator size="small" color="#09090b" />
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
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fafafa',
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#71717a',
    marginTop: 2,
  },
  addProjectButton: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addProjectButtonText: {
    color: '#fafafa',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
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
    backgroundColor: '#121215',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
  },
  cardHeaderPressable: {
    padding: 16,
  },
  cardHeaderPressed: {
    backgroundColor: '#18181b',
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  projectName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fafafa',
    letterSpacing: -0.2,
  },
  projectCardDescription: {
    fontSize: 13,
    color: '#a1a1aa',
    marginTop: 3,
    lineHeight: 18,
  },
  cardTimestamp: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 3,
  },
  headerRightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
  },
  featureBadgeActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  featureBadgeMuted: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  featureDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  featureBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  expandChevron: {
    fontSize: 14,
    color: '#71717a',
    marginLeft: 2,
  },
  collapsedTechRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  miniTechPill: {
    backgroundColor: '#18181b',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  miniTechPillText: {
    fontSize: 11,
    color: '#71717a',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#27272a',
    marginVertical: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  techStackContainer: {
    gap: 8,
  },
  techCategoriesStack: {
    gap: 6,
  },
  techCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  techCategoryLabel: {
    fontSize: 11,
    color: '#71717a',
    width: 60,
  },
  techPillsWrapper: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  techPill: {
    backgroundColor: '#18181b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  techPillText: {
    fontSize: 11,
    color: '#e4e4e7',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#52525b',
    fontStyle: 'italic',
  },
  featuresSection: {
    gap: 10,
  },
  featuresSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addFeatureSmallButton: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addFeatureSmallButtonText: {
    color: '#fafafa',
    fontSize: 12,
    fontWeight: '500',
  },
  addFeatureForm: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  featureErrorText: {
    color: '#fb7185',
    fontSize: 12,
  },
  featureTextInput: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fafafa',
    fontSize: 13,
  },
  statusSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusSelectorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusSelectorOptionSelected: {
    borderColor: '#3f3f46',
    backgroundColor: '#27272a',
  },
  statusSelectorOptionText: {
    fontSize: 11,
    color: '#71717a',
    fontWeight: '500',
  },
  statusSelectorOptionTextSelected: {
    color: '#fafafa',
  },
  featureFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  featureCancelButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  featureCancelButtonText: {
    color: '#71717a',
    fontSize: 12,
  },
  featureSaveButton: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  featureSaveButtonText: {
    color: '#fafafa',
    fontSize: 12,
    fontWeight: '600',
  },
  featureList: {
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  statusToggleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#121215',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: '500',
  },
  featureNameText: {
    flex: 1,
    fontSize: 13,
    color: '#fafafa',
  },
  featureNameCompleted: {
    color: '#71717a',
    textDecorationLine: 'line-through',
  },
  featureDeleteButton: {
    padding: 4,
  },
  featureDeleteIcon: {
    color: '#71717a',
    fontSize: 12,
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
  retryButton: {
    backgroundColor: '#18181b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fafafa',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyIcon: {
    fontSize: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fafafa',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 13,
    color: '#71717a',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  emptyAddButton: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyAddButtonText: {
    color: '#fafafa',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#121215',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    borderBottomWidth: 0,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fafafa',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 1,
  },
  modalCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseIcon: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '600',
  },
  modalScrollView: {
    maxHeight: 500,
  },
  modalFormContent: {
    padding: 20,
    gap: 16,
  },
  formErrorBanner: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 6,
    padding: 10,
  },
  formErrorText: {
    color: '#fb7185',
    fontSize: 13,
    fontWeight: '500',
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fafafa',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textInput: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#fafafa',
    fontSize: 14,
  },
  textAreaInput: {
    minHeight: 70,
    paddingTop: 10,
  },
  chipSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  suggestionChip: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  suggestionChipText: {
    fontSize: 11,
    color: '#71717a',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  cancelButtonText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fafafa',
    fontSize: 13,
    fontWeight: '600',
  },
});
