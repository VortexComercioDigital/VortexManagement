'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import type { Stage } from '@/types/database';

export function useStagesManager() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);

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
    enabled: !!profile,
  });

  const createStage = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!profile || profile.role !== 'admin') {
        throw new Error('Apenas admins podem criar etapas');
      }

      const name = formData.get('name') as string;
      const color = formData.get('color') as string;
      const order = parseInt(formData.get('order') as string) || stages.length;

      if (!name) {
        throw new Error('Nome é obrigatório');
      }

      const { error } = await supabase.from('stages').insert({
        name,
        color,
        order,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      if (!profile || profile.role !== 'admin') {
        throw new Error('Apenas admins podem editar etapas');
      }

      const name = data.get('name') as string;
      const color = data.get('color') as string;
      const order = parseInt(data.get('order') as string);

      if (!name) {
        throw new Error('Nome é obrigatório');
      }

      const updateData: Partial<Stage> = { name, color };
      if (!isNaN(order)) updateData.order = order;

      const { error } = await supabase
        .from('stages')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      if (!profile || profile.role !== 'admin') {
        throw new Error('Apenas admins podem deletar etapas');
      }

      const { error } = await supabase.from('stages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    },
  });

  return {
    stages,
    isLoading,
    createStage,
    updateStage,
    deleteStage,
  };
}
