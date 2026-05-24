'use client';

import { create } from 'zustand';
import type { Lead, Stage } from '@/types/database';

interface KanbanState {
  stages: Stage[];
  leads: Lead[];
  selectedLeadId: string | null;
  filters: {
    search: string;
    vendedorId: string | null;
    tag: string | null;
  };
  setStages: (stages: Stage[]) => void;
  setLeads: (leads: Lead[]) => void;
  setSelectedLeadId: (id: string | null) => void;
  setFilters: (filters: Partial<KanbanState['filters']>) => void;
  getLeadsByStage: (stageId: string) => Lead[];
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  stages: [],
  leads: [],
  selectedLeadId: null,
  filters: {
    search: '',
    vendedorId: null,
    tag: null,
  },
  setStages: (stages) => set({ stages }),
  setLeads: (leads) => set({ leads }),
  setSelectedLeadId: (id) => set({ selectedLeadId: id }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  getLeadsByStage: (stageId) => {
    const { leads, filters } = get();
    return leads.filter((lead) => {
      if (lead.stage_id !== stageId) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (
          !(lead.name && lead.name.toLowerCase().includes(s)) &&
          !(lead.company && lead.company.toLowerCase().includes(s)) &&
          !(lead.email && lead.email.toLowerCase().includes(s))
        )
          return false;
      }
      if (filters.vendedorId && lead.vendedor_id !== filters.vendedorId)
        return false;
      if (filters.tag && lead.tags && !lead.tags.includes(filters.tag)) return false;
      return true;
    });
  },
}));
