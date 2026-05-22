export type Role = 'admin' | 'vendedor' | 'dev';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface KanbanStage {
  id: string;
  name: string;
  position: number;
  color: string;
  created_at: string;
}

export interface ServiceCatalog {
  id: string;
  name: string;
  description: string;
  category: 'site' | 'landing_page' | 'design' | 'sistema' | 'seo' | 'social_media' | 'outros';
  base_price: number;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  stage_id: string;
  vendedor_id: string;
  value: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  // Joined
  stage?: KanbanStage;
  vendedor?: Profile;
  lead_services?: LeadService[];
  notes?: LeadNote[];
}

export type DeliveryStatus = 'pendente' | 'em_desenvolvimento' | 'em_revisao' | 'concluido' | 'cancelado';

export interface LeadService {
  id: string;
  lead_id: string;
  service_id: string;
  negotiated_price: number;
  delivery_status: DeliveryStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  // Joined
  service?: ServiceCatalog;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string;
  content: string;
  created_at: string;
  // Joined
  author?: Profile;
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pendente: 'Pendente',
  em_desenvolvimento: 'Em Desenvolvimento',
  em_revisao: 'Em Revisão',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  pendente: 'bg-gray-100 text-gray-700',
  em_desenvolvimento: 'bg-blue-100 text-blue-700',
  em_revisao: 'bg-amber-100 text-amber-700',
  concluido: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-red-100 text-red-700',
};

export const CATEGORY_LABELS: Record<ServiceCatalog['category'], string> = {
  site: 'Site',
  landing_page: 'Landing Page',
  design: 'Design',
  sistema: 'Sistema',
  seo: 'SEO',
  social_media: 'Social Media',
  outros: 'Outros',
};
