import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Storage key constants — namespaced to prevent collisions
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  PROJECTS: 'devlog:projects',
  STANDUP_LOGS: 'devlog:standup_logs',
  SETTINGS: 'devlog:settings',
  SCHEMA_VERSION: 'devlog:schema_version',
} as const;

/** Current schema version. Bump when model shapes change. */
const CURRENT_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve and parse a JSON value from AsyncStorage.
 * Returns `null` on missing key or parse error.
 */
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

/**
 * Serialise a value to JSON and persist it in AsyncStorage.
 */
export async function setItem<T>(key: string, value: T): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[storage] setItem("${key}") failed:`, error);
    return false;
  }
}

/**
 * Remove a key from AsyncStorage.
 */
export async function removeItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[storage] removeItem("${key}") failed:`, error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Schema versioning
// ---------------------------------------------------------------------------

/**
 * Ensures the stored schema version matches the current code version.
 * Call once on app boot. When a future version introduces breaking model
 * changes, migration logic will be added here.
 */
export async function ensureSchemaVersion(): Promise<void> {
  try {
    const stored = await getItem<number>(STORAGE_KEYS.SCHEMA_VERSION);

    if (stored === null) {
      // First launch — stamp current version
      await setItem(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
      return;
    }

    if (stored < CURRENT_SCHEMA_VERSION) {
      // Future: run migrations sequentially (v1→v2, v2→v3, etc.)
      // For now, just update the version stamp.
      await setItem(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
    }
  } catch (error) {
    console.error('[storage] ensureSchemaVersion failed:', error);
  }
}
