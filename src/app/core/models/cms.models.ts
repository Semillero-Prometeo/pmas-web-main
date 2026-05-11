export interface ModelBar {
  label: string;
  value: string;
  color: string;
  bgClass: string;
  width: string;
}

export interface MethodologyStep {
  step: string;
  label: string;
  icon: string;
}

export interface Impact {
  icon: string;
  colorClass: string;
  bgClass: string;
  label: string;
  desc: string;
}

export interface HomeContent {
  id: string;
  hero_title: string;
  hero_desc: string;
  enfoques: string[];
  methodology: MethodologyStep[];
  model_bars: ModelBar[];
  impacts: Impact[];
  created_at: string;
  updated_at: string;
}

export interface CmsProject {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: string;
  image: string | null;
  year: string;
  icon: string | null;
  display_order: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type CreateProjectPayload = Omit<CmsProject, 'id' | 'created_at' | 'updated_at'>;
export type UpdateProjectPayload = Partial<CreateProjectPayload>;

export type CreateMemberPayload = Omit<CmsMember, 'id' | 'created_at' | 'updated_at'>;
export type UpdateMemberPayload = Partial<CreateMemberPayload>;
