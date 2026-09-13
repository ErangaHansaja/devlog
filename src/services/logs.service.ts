import type {
  CreateStandupLogInput,
  StandupLog,
  StandupStructure,
} from '../models';
import { generateId, isToday } from '../utils';
import { getItem, setItem, STORAGE_KEYS } from './storage';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Empty standup structure used for phase-1 (raw dump only) saves. */
const EMPTY_STRUCTURE: StandupStructure = {
  done: [],
  doing: [],
  blockers: [],
};

async function readLogs(): Promise<StandupLog[]> {
  return (await getItem<StandupLog[]>(STORAGE_KEYS.STANDUP_LOGS)) ?? [];
}

async function writeLogs(logs: StandupLog[]): Promise<boolean> {
  return setItem(STORAGE_KEYS.STANDUP_LOGS, logs);
}

// ---------------------------------------------------------------------------
// Public CRUD API
// ---------------------------------------------------------------------------

/**
 * Returns all standup logs sorted by `createdAt` descending.
 */
export async function getStandupLogs(): Promise<StandupLog[]> {
  const logs = await readLogs();
  return logs.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Find a single standup log by ID.
 */
export async function getStandupLogById(
  id: string
): Promise<StandupLog | null> {
  const logs = await readLogs();
  return logs.find((l) => l.id === id) ?? null;
}

/**
 * Returns all standup logs for a given project, sorted by `createdAt` desc.
 */
export async function getStandupLogsByProject(
  projectId: string
): Promise<StandupLog[]> {
  const logs = await readLogs();
  return logs
    .filter((l) => l.projectId === projectId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

/**
 * Returns today's standup log for a project, if one exists.
 * Enforces the one-log-per-project-per-day constraint.
 */
export async function getTodaysLog(
  projectId: string
): Promise<StandupLog | null> {
  const logs = await readLogs();
  return (
    logs.find((l) => l.projectId === projectId && isToday(l.createdAt)) ?? null
  );
}

/**
 * Phase 1 — persist raw dump immediately with empty structured/singlishPitch.
 *
 * Enforces one-log-per-project-per-day: if a log already exists for this
 * project today, returns `null` (caller should use `updateStandupLog` instead).
 */
export async function createStandupLog(
  input: CreateStandupLogInput
): Promise<StandupLog | null> {
  const existing = await getTodaysLog(input.projectId);
  if (existing) {
    // One log per project per day — caller should update the existing log
    return null;
  }

  const newLog: StandupLog = {
    id: generateId(),
    projectId: input.projectId,
    rawDump: input.rawDump,
    structured: EMPTY_STRUCTURE,
    singlishPitch: '',
    createdAt: new Date().toISOString(),
  };

  const logs = await readLogs();
  logs.push(newLog);
  await writeLogs(logs);
  return newLog;
}

/**
 * Phase 2 — update a standup log with AI-generated structured output
 * and Singlish pitch, or edit the raw dump.
 */
export async function updateStandupLog(
  id: string,
  updates: Partial<Omit<StandupLog, 'id' | 'createdAt'>>
): Promise<StandupLog | null> {
  const logs = await readLogs();
  const index = logs.findIndex((l) => l.id === id);
  if (index === -1) return null;

  logs[index] = {
    ...logs[index],
    ...updates,
  };
  await writeLogs(logs);
  return logs[index];
}

/**
 * Delete a standup log by ID.
 */
export async function deleteStandupLog(id: string): Promise<boolean> {
  const logs = await readLogs();
  const filtered = logs.filter((l) => l.id !== id);
  if (filtered.length === logs.length) return false;
  return writeLogs(filtered);
}
