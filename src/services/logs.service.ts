import type {
  CreateStandupLogInput,
  StandupLog,
  StandupStructure,
} from '../models';
import { generateId, isToday } from '../utils';
import { getItem, setItem, STORAGE_KEYS } from './storage';

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

/** Fetches all standup logs sorted by creation date descending. */
export async function getStandupLogs(): Promise<StandupLog[]> {
  const logs = await readLogs();
  return logs.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Finds a single standup log by ID. */
export async function getStandupLogById(
  id: string
): Promise<StandupLog | null> {
  const logs = await readLogs();
  return logs.find((l) => l.id === id) ?? null;
}

/** Fetches all standup logs belonging to a specific project. */
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

/** Finds today's standup log for a given project if it exists. */
export async function getTodaysLog(
  projectId: string
): Promise<StandupLog | null> {
  const logs = await readLogs();
  return (
    logs.find((l) => l.projectId === projectId && isToday(l.createdAt)) ?? null
  );
}

/** Persists a raw standup dump, enforcing one log per project per day. */
export async function createStandupLog(
  input: CreateStandupLogInput
): Promise<StandupLog | null> {
  const existing = await getTodaysLog(input.projectId);
  if (existing) {
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

/** Updates an existing standup log with AI results or manual edits. */
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

/** Deletes a standup log by ID. */
export async function deleteStandupLog(id: string): Promise<boolean> {
  const logs = await readLogs();
  const filtered = logs.filter((l) => l.id !== id);
  if (filtered.length === logs.length) return false;
  return writeLogs(filtered);
}
