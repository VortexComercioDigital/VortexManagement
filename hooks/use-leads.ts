'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import type { Lead, Stage, Profile } from '@/types/database';

export type LeadWithProfile = Lead & { profiles: Profile | null };

export function useLeads() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*, profiles:vendedor_id(id, name, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeadWithProfile[];
    },
    enabled: !!profile,
  });

  const createLead = useMutation({
    mutationFn: async (formData: FormData) => {
      const name = formData.get('name') as string;
      const company = formData.get('company') as string;
      const email = formData.get('email') as string;
      const phone = formData.get('phone') as string;
      const stageId = formData.get('stageId') as string;
      const value = parseFloat(formData.get('value') as string) || 0;
      const tagsStr = formData.get('tags') as string;

      if (!name || !stageId || !profile) {
        throw new Error('Nome e etapa são obrigatórios');
      }

      const tags = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { error } = await supabase.from('leads').insert({
        name,
        company,
        email,
        phone,
        stage_id: stageId,
        vendedor_id: profile.id,
        value,
        tags,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const name = data.get('name') as string;
      const company = data.get('company') as string;
      const email = data.get('email') as string;
      const phone = data.get('phone') as string;
      const value = parseFloat(data.get('value') as string) || 0;
      const tagsStr = data.get('tags') as string;

      if (!name) {
        throw new Error('Nome é obrigatório');
      }

      const tags = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from('leads')
        .update({
          name,
          company,
          email,
          phone,
          value,
          tags,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const moveLead = useMutation({
    mutationFn: async ({ leadId, newStageId }: { leadId: string; newStageId: string }) => {
      const { error } = await supabase
        .from('leads')
        .update({ stage_id: newStageId })
        .eq('id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  return {
    leads,
    isLoading,
    createLead,
    updateLead,
    moveLead,
    deleteLead,
  };
}

export function useStages() {
  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      return data as Stage[];
    },
  });

  return { stages, isLoading };
}

export function useVendedores() {
  const { data: vendedores = [], isLoading } = useQuery({
    queryKey: ['vendedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('role', ['admin', 'vendedor']);

      if (error) throw error;
      return data as Profile[];
    },
  });

  return { vendedores, isLoading };
}
