/** Feature lifecycle status. */
export type FeatureStatus = 'backlog' | 'in_progress' | 'completed';

/** Individual trackable feature within a project. */
export interface ProjectFeature {
  id: string;
  name: string;
  status: FeatureStatus;
  notes?: string;
}

/** Categorized tech stack metadata for a project. */
export interface TechStack {
  frontend?: string[];
  backend?: string[];
  mobile?: string[];
  tools?: string[];
}

/** Payload for creating a new project. */
export interface CreateProjectInput {
  name: string;
  techStack?: TechStack;
  features?: Omit<ProjectFeature, 'id'>[];
}

/** Payload for updating an existing project. */
export interface UpdateProjectInput {
  name?: string;
  techStack?: TechStack;
}

/** Tracked repository or project record. */
export interface Project {
  id: string;
  name: string;
  techStack: TechStack;
  features: ProjectFeature[];
  createdAt: string;
  updatedAt: string;
}
