'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import type { Service, LeadService } from '@/types/database';

export function useServices() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Service[];
    },
    enabled: !!profile,
  });

  const createService = useMutation({
    mutationFn: async (formData: FormData) => {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const price = parseFloat(formData.get('price') as string) || 0;

      if (!name || !profile) {
        throw new Error('Nome é obrigatório');
      }

      const { error } = await supabase.from('services').insert({
        name,
        description,
        price,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const name = data.get('name') as string;
      const description = data.get('description') as string;
      const price = parseFloat(data.get('price') as string) || 0;

      if (!name) {
        throw new Error('Nome é obrigatório');
      }

      const { error } = await supabase
        .from('services')
        .update({
          name,
          description,
          price,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  return {
    services,
    isLoading,
    createService,
    updateService,
    deleteService,
  };
}

export function useLeadServices(leadId: string) {
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);

  const { data: leadServices = [], isLoading } = useQuery({
    queryKey: ['lead-services', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_services')
        .select('*, service:services(*)')
        .eq('lead_id', leadId);

      if (error) throw error;
      return data as (LeadService & { service: Service })[];
    },
    enabled: !!profile && !!leadId,
  });

  const addServiceToLead = useMutation({
    mutationFn: async ({ serviceId }: { serviceId: string }) => {
      const { error } = await supabase.from('lead_services').insert({
        lead_id: leadId,
        service_id: serviceId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-services', leadId] });
    },
  });

  const removeServiceFromLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lead_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-services', leadId] });
    },
  });

  return {
    leadServices,
    isLoading,
    addServiceToLead,
    removeServiceFromLead,
  };
}
