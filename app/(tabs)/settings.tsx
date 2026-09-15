import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  GEMINI_API_KEY_STORAGE_KEY,
  testGeminiApiKey,
} from '../../src/api/gemini.api';
import { STORAGE_KEYS } from '../../src/services/storage';
import { getProjects } from '../../src/services/projects.service';
import { getStandupLogs } from '../../src/services/logs.service';

export default function SettingsScreen() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isSavedInStorage, setIsSavedInStorage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Ping test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // App & storage statistics
  const [stats, setStats] = useState<{
    projectsCount: number;
    logsCount: number;
    hasEnvKey: boolean;
  }>({
    projectsCount: 0,
    logsCount: 0,
    hasEnvKey: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedKey = await AsyncStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
      if (storedKey) {
        setApiKeyInput(storedKey);
        setIsSavedInStorage(true);
      } else {
        setIsSavedInStorage(false);
      }

      const projects = await getProjects().catch(() => []);
      const logs = await getStandupLogs().catch(() => []);
      const hasEnv = Boolean(process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim());

      setStats({
        projectsCount: projects.length,
        logsCount: logs.length,
        hasEnvKey: hasEnv,
      });
    } catch (err) {
      console.error('[settings] Failed to load settings:', err);
    }
  };

  const handleSaveKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      Alert.alert('Empty Key', 'Please enter a valid Gemini API key.');
      return;
    }

    try {
      setIsSaving(true);
      await AsyncStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, trimmed);
      setIsSavedInStorage(true);
      setTestResult(null);
      Alert.alert('Key Saved', 'Your Gemini API key has been securely saved.');
    } catch (err) {
      Alert.alert(
        'Save Failed',
        err instanceof Error ? err.message : 'Could not save key to storage.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearKey = async () => {
    Alert.alert(
      'Clear API Key',
      'Are you sure you want to remove your custom Gemini API key from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
              setApiKeyInput('');
              setIsSavedInStorage(false);
              setTestResult(null);
            } catch (err) {
              Alert.alert('Error', 'Failed to clear key.');
            }
          },
        },
      ]
    );
  };

  const handleTestConnection = async () => {
    const keyToTest =
      apiKeyInput.trim() || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

    if (!keyToTest) {
      setTestResult({
        ok: false,
        message: 'No API key entered or found in environment.',
      });
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await testGeminiApiKey(keyToTest);
      setTestResult(res);
    } catch (err) {
      setTestResult({
        ok: false,
        message:
          err instanceof Error ? err.message : 'Connection request failed.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Settings</Text>
            <Text style={styles.screenSubtitle}>
              API configuration & offline storage
            </Text>
          </View>

          {/* AI Configuration Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="sparkles" size={18} color="#38bdf8" />
              </View>
              <View style={styles.cardHeaderMeta}>
                <Text style={styles.cardTitle}>AI Configuration</Text>
                <Text style={styles.cardSubtitle}>
                  Google Gemini 1.5 Flash endpoint
                </Text>
              </View>
            </View>

            {/* Key Status Pill */}
            <View style={styles.statusBannerRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              {isSavedInStorage ? (
                <View style={[styles.badge, styles.badgeSuccess]}>
                  <View style={[styles.dot, styles.dotSuccess]} />
                  <Text style={[styles.badgeText, styles.badgeTextSuccess]}>
                    Custom Key Configured
                  </Text>
                </View>
              ) : stats.hasEnvKey ? (
                <View style={[styles.badge, styles.badgeInfo]}>
                  <View style={[styles.dot, styles.dotInfo]} />
                  <Text style={[styles.badgeText, styles.badgeTextInfo]}>
                    Using .env fallback
                  </Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.badgeWarning]}>
                  <View style={[styles.dot, styles.dotWarning]} />
                  <Text style={[styles.badgeText, styles.badgeTextWarning]}>
                    No API Key Set
                  </Text>
                </View>
              )}
            </View>

            {/* Input Section */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Gemini API Key</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  secureTextEntry={!isKeyVisible}
                  placeholder="Paste your Gemini API key (AIzaSy...)"
                  placeholderTextColor="#52525b"
                  value={apiKeyInput}
                  onChangeText={(t) => {
                    setApiKeyInput(t);
                    if (testResult) setTestResult(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setIsKeyVisible(!isKeyVisible)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={isKeyVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#71717a"
                  />
                </Pressable>
              </View>
              <Text style={styles.helperText}>
                Stored exclusively in local AsyncStorage under @gemini_api_key.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsRow}>
              <Pressable
                style={[
                  styles.primaryButton,
                  isSaving && styles.buttonDisabled,
                ]}
                onPress={handleSaveKey}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fafafa" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={16} color="#fafafa" />
                    <Text style={styles.primaryButtonText}>Save Key</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[
                  styles.secondaryButton,
                  isTesting && styles.buttonDisabled,
                ]}
                onPress={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color="#38bdf8" />
                ) : (
                  <>
                    <Ionicons name="flash-outline" size={16} color="#38bdf8" />
                    <Text style={styles.secondaryButtonText}>Test Ping</Text>
                  </>
                )}
              </Pressable>

              {isSavedInStorage ? (
                <Pressable
                  style={styles.clearButton}
                  onPress={handleClearKey}
                >
                  <Ionicons name="trash-outline" size={16} color="#fb7185" />
                </Pressable>
              ) : null}
            </View>

            {/* Inline Test Result */}
            {testResult ? (
              <View
                style={[
                  styles.testResultBox,
                  testResult.ok
                    ? styles.testResultSuccess
                    : styles.testResultError,
                ]}
              >
                <Ionicons
                  name={
                    testResult.ok
                      ? 'checkmark-circle-outline'
                      : 'alert-circle-outline'
                  }
                  size={18}
                  color={testResult.ok ? '#34d399' : '#fb7185'}
                />
                <Text
                  style={[
                    styles.testResultText,
                    testResult.ok
                      ? styles.testResultTextSuccess
                      : styles.testResultTextError,
                  ]}
                >
                  {testResult.message}
                </Text>
              </View>
            ) : null}
          </View>

          {/* App Info Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons name="information-circle" size={18} color="#a1a1aa" />
              </View>
              <View style={styles.cardHeaderMeta}>
                <Text style={styles.cardTitle}>Application Information</Text>
                <Text style={styles.cardSubtitle}>
                  Architecture & storage health
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>1.0.0 (Standalone APK)</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Local Database</Text>
              <Text style={styles.infoValue}>AsyncStorage (100% Offline)</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Active Projects</Text>
              <Text style={styles.infoValue}>
                {stats.projectsCount} {stats.projectsCount === 1 ? 'repo' : 'repos'}
              </Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Standup Dumps</Text>
              <Text style={styles.infoValue}>
                {stats.logsCount} {stats.logsCount === 1 ? 'log' : 'logs'}
              </Text>
            </View>
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fafafa',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#71717a',
    marginTop: 3,
  },
  card: {
    backgroundColor: '#121215',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 18,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderMeta: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fafafa',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  statusBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  badgeInfo: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotSuccess: {
    backgroundColor: '#34d399',
  },
  dotInfo: {
    backgroundColor: '#38bdf8',
  },
  dotWarning: {
    backgroundColor: '#f59e0b',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextSuccess: {
    color: '#34d399',
  },
  badgeTextInfo: {
    color: '#38bdf8',
  },
  badgeTextWarning: {
    color: '#f59e0b',
  },
  inputWrapper: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    color: '#fafafa',
    fontSize: 14,
    paddingVertical: 10,
  },
  eyeButton: {
    padding: 6,
  },
  helperText: {
    fontSize: 11,
    color: '#52525b',
    lineHeight: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fafafa',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  clearButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  testResultSuccess: {
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  testResultError: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  testResultText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  testResultTextSuccess: {
    color: '#34d399',
  },
  testResultTextError: {
    color: '#fb7185',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#71717a',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fafafa',
  },
  divider: {
    height: 1,
    backgroundColor: '#1f1f23',
  },
});
