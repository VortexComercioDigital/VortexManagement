'use client';

import { useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { supabase } from '@/lib/supabase';
import { useKanbanStore } from '@/stores/kanban-store';
import { useAuthStore } from '@/stores/auth-store';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { KanbanFilters } from './kanban-filters';
import { LeadDetailModal } from '@/components/leads/lead-detail-modal';
import { NewLeadDialog } from '@/components/leads/new-lead-dialog';
import type { Lead, KanbanStage } from '@/types/database';

export function KanbanBoard() {
  const { stages, leads, setStages, setLeads, setSelectedLeadId, selectedLeadId } =
    useKanbanStore();
  const { profile } = useAuthStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchStages = useCallback(async () => {
    const { data } = await supabase
      .from('kanban_stages')
      .select('*')
      .order('position');
    if (data) setStages(data as KanbanStage[]);
  }, [setStages]);

  const fetchLeads = useCallback(async () => {
    let query = supabase
      .from('leads')
      .select('*, kanban_stages(*), profiles!leads_vendedor_id_fkey(*)')
      .order('created_at', { ascending: false });

    if (profile?.role === 'vendedor') {
      query = query.eq('vendedor_id', profile.id);
    }
    // admin and dev see all leads

    const { data } = await query;
    if (data) setLeads(data as unknown as Lead[]);
  }, [setLeads, profile]);

  useEffect(() => {
    fetchStages();
    fetchLeads();
  }, [fetchStages, fetchLeads]);

  const handleDragStart = () => {};

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStageId = over.id as string;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage_id === newStageId) return;

    setLeads(
      leads.map((l) => (l.id === leadId ? { ...l, stage_id: newStageId } : l))
    );

    const { error } = await supabase
      .from('leads')
      .update({ stage_id: newStageId })
      .eq('id', leadId);

    if (error) {
      setLeads(
        leads.map((l) => (l.id === leadId ? { ...l, stage_id: lead.stage_id } : l))
      );
    }
  };

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
          <p className="text-sm text-slate-500">
            Arraste os cards entre as colunas para atualizar o status
          </p>
        </div>
        <NewLeadDialog onCreated={fetchLeads} />
      </div>

      <KanbanFilters />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {stages.map((stage) => (
            <SortableContext
              key={stage.id}
              items={leads
                .filter((l) => l.stage_id === stage.id)
                .map((l) => l.id)}
              strategy={horizontalListSortingStrategy}
            >
              <KanbanColumn stage={stage} />
            </SortableContext>
          ))}
        </div>
      </DndContext>

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          open={!!selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onUpdate={fetchLeads}
        />
      )}
    </div>
  );
}
