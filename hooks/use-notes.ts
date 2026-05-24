'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import type { Note } from '@/types/database';

export function useNotes(leadId: string) {
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Note[];
    },
    enabled: !!profile && !!leadId,
  });

  const createNote = useMutation({
    mutationFn: async (content: string) => {
      if (!profile) {
        throw new Error('Não autorizado');
      }

      const { error } = await supabase.from('notes').insert({
        lead_id: leadId,
        content,
        author_id: profile.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', leadId] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', leadId] });
    },
  });

  return {
    notes,
    isLoading,
    createNote,
    deleteNote,
  };
}
