import AsyncStorage from '@react-native-async-storage/async-storage';

/** Namespaced AsyncStorage keys used across the app. */
export const STORAGE_KEYS = {
  PROJECTS: 'devlog:projects',
  STANDUP_LOGS: 'devlog:standup_logs',
  SETTINGS: 'devlog:settings',
  SCHEMA_VERSION: 'devlog:schema_version',
  GEMINI_API_KEY: '@gemini_api_key',
} as const;

const CURRENT_SCHEMA_VERSION = 1;

/** Retrieves and parses a JSON record from AsyncStorage. */
export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[storage] getItem("${key}") failed:`, error);
    return null;
  }
}

/** Serializes and saves a record into AsyncStorage. */
export async function setItem<T>(key: string, value: T): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[storage] setItem("${key}") failed:`, error);
    return false;
  }
}

/** Removes a key from AsyncStorage. */
export async function removeItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[storage] removeItem("${key}") failed:`, error);
    return false;
  }
}

/** Validates and synchronizes the local storage schema version. */
export async function ensureSchemaVersion(): Promise<void> {
  try {
    const stored = await getItem<number>(STORAGE_KEYS.SCHEMA_VERSION);

    if (stored === null) {
      await setItem(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
      return;
    }

    if (stored < CURRENT_SCHEMA_VERSION) {
      await setItem(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
    }
  } catch (error) {
    console.error('[storage] ensureSchemaVersion failed:', error);
  }
}
