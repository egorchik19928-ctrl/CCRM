export type HhNamedEntity = {
  id?: string;
  name: string;
};

export type HhContact = {
  type?: HhNamedEntity;
  value?: {
    formatted?: string;
    email?: string;
    phone?: string;
  };
  preferred?: boolean;
};

export type HhExperience = {
  company?: string;
  position?: string;
  start?: string;
  end?: string | null;
  description?: string;
};

export type HhEducationItem = {
  name?: string;
  organization?: string;
  result?: string;
  year?: number;
};

export type HhResumePayload = {
  id: string;
  url?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  title?: string;
  area?: HhNamedEntity;
  contact?: HhContact[];
  skills?: string;
  skill_set?: string[];
  experience?: HhExperience[];
  education?: {
    primary?: HhEducationItem[];
    additional?: HhEducationItem[];
  };
  language?: Array<HhNamedEntity & { level?: HhNamedEntity }>;
  certificate?: Array<{
    title?: string;
    owner?: string;
    achieved_at?: string;
  }>;
  portfolio?: Array<{
    description?: string;
  }>;
};
