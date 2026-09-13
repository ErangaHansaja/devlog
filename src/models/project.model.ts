/** Feature lifecycle status */
export type FeatureStatus = 'backlog' | 'in_progress' | 'completed';

/** Individual trackable feature within a project */
export interface ProjectFeature {
  id: string;
  name: string;
  status: FeatureStatus;
  notes?: string;
}

/** Categorised tech stack metadata for a project */
export interface TechStack {
  frontend?: string[];
  backend?: string[];
  mobile?: string[];
  tools?: string[];
}

/** Input type for creating a new project */
export interface CreateProjectInput {
  name: string;
  techStack?: TechStack;
  features?: Omit<ProjectFeature, 'id'>[];
}

/** Input type for updating an existing project */
export interface UpdateProjectInput {
  name?: string;
  techStack?: TechStack;
}

/** A tracked private repository / project */
export interface Project {
  id: string;
  name: string;
  techStack: TechStack;
  features: ProjectFeature[];
  createdAt: string;
  updatedAt: string;
}
