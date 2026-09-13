import type {
  CreateProjectInput,
  Project,
  ProjectFeature,
  UpdateProjectInput,
} from '../models';
import { generateId } from '../utils';
import { getItem, setItem, STORAGE_KEYS } from './storage';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function readProjects(): Promise<Project[]> {
  return (await getItem<Project[]>(STORAGE_KEYS.PROJECTS)) ?? [];
}

async function writeProjects(projects: Project[]): Promise<boolean> {
  return setItem(STORAGE_KEYS.PROJECTS, projects);
}

// ---------------------------------------------------------------------------
// Public CRUD API
// ---------------------------------------------------------------------------

/**
 * Returns all projects sorted by `updatedAt` descending (most recent first).
 */
export async function getProjects(): Promise<Project[]> {
  const projects = await readProjects();
  return projects.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Find a single project by its ID.
 */
export async function getProjectById(id: string): Promise<Project | null> {
  const projects = await readProjects();
  return projects.find((p) => p.id === id) ?? null;
}

/**
 * Create a new project with auto-generated ID and timestamps.
 */
export async function createProject(
  input: CreateProjectInput
): Promise<Project> {
  const now = new Date().toISOString();
  const newProject: Project = {
    id: generateId(),
    name: input.name.trim(),
    techStack: input.techStack ?? {},
    features: (input.features ?? []).map((f) => ({
      ...f,
      id: generateId(),
    })),
    createdAt: now,
    updatedAt: now,
  };

  const projects = await readProjects();
  projects.push(newProject);
  await writeProjects(projects);
  return newProject;
}

/**
 * Partially update a project. Bumps `updatedAt`.
 * Returns the updated project, or `null` if not found.
 */
export async function updateProject(
  id: string,
  input: UpdateProjectInput
): Promise<Project | null> {
  const projects = await readProjects();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const existing = projects[index];
  const updated: Project = {
    ...existing,
    ...(input.name !== undefined && { name: input.name.trim() }),
    ...(input.techStack !== undefined && { techStack: input.techStack }),
    updatedAt: new Date().toISOString(),
  };

  projects[index] = updated;
  await writeProjects(projects);
  return updated;
}

/**
 * Delete a project by ID. Returns `true` on success.
 */
export async function deleteProject(id: string): Promise<boolean> {
  const projects = await readProjects();
  const filtered = projects.filter((p) => p.id !== id);
  if (filtered.length === projects.length) return false;
  return writeProjects(filtered);
}

// ---------------------------------------------------------------------------
// Feature management
// ---------------------------------------------------------------------------

/**
 * Add a feature to a project. Auto-generates feature ID.
 */
export async function addFeature(
  projectId: string,
  feature: Omit<ProjectFeature, 'id'>
): Promise<Project | null> {
  const projects = await readProjects();
  const index = projects.findIndex((p) => p.id === projectId);
  if (index === -1) return null;

  const newFeature: ProjectFeature = {
    ...feature,
    id: generateId(),
  };

  projects[index].features.push(newFeature);
  projects[index].updatedAt = new Date().toISOString();
  await writeProjects(projects);
  return projects[index];
}

/**
 * Partially update a feature within a project.
 */
export async function updateFeature(
  projectId: string,
  featureId: string,
  updates: Partial<Omit<ProjectFeature, 'id'>>
): Promise<Project | null> {
  const projects = await readProjects();
  const pIndex = projects.findIndex((p) => p.id === projectId);
  if (pIndex === -1) return null;

  const fIndex = projects[pIndex].features.findIndex(
    (f) => f.id === featureId
  );
  if (fIndex === -1) return null;

  projects[pIndex].features[fIndex] = {
    ...projects[pIndex].features[fIndex],
    ...updates,
  };
  projects[pIndex].updatedAt = new Date().toISOString();
  await writeProjects(projects);
  return projects[pIndex];
}

/**
 * Remove a feature from a project by feature ID.
 */
export async function removeFeature(
  projectId: string,
  featureId: string
): Promise<Project | null> {
  const projects = await readProjects();
  const pIndex = projects.findIndex((p) => p.id === projectId);
  if (pIndex === -1) return null;

  const before = projects[pIndex].features.length;
  projects[pIndex].features = projects[pIndex].features.filter(
    (f) => f.id !== featureId
  );
  if (projects[pIndex].features.length === before) return null;

  projects[pIndex].updatedAt = new Date().toISOString();
  await writeProjects(projects);
  return projects[pIndex];
}
