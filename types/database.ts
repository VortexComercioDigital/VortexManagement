export type Role = 'admin' | 'vendedor' | 'dev';

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: string;
  name: string | null;
  color: string | null;
  order: number | null;
  created_at: string;
}

export interface Service {
  id: string;
  name: string | null;
  description: string | null;
  price: number | null;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  stage_id: string | null;
  vendedor_id: string | null;
  value: number | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  stage?: Stage | null;
  profiles?: Profile | null;
}

export interface LeadService {
  id: string;
  lead_id: string;
  service_id: string;
  created_at: string;
  // Joined relation
  service?: Service | null;
}

export interface Note {
  id: string;
  lead_id: string;
  author_id: string;
  content: string;
  created_at: string;
}
