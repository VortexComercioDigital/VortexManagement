'use client';

import { useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useKanbanStore } from '@/stores/kanban-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLeads, useStages, type LeadWithProfile } from '@/hooks/use-leads';
import type { Stage } from '@/types/database';
import { KanbanColumn } from './kanban-column';
import { KanbanFilters } from './kanban-filters';
import { LeadDetailModal } from '@/components/leads/lead-detail-modal';
import { NewLeadDialog } from '@/components/leads/new-lead-dialog';
import { useToast } from '@/hooks/use-toast';

export function KanbanBoard() {
  const { selectedLeadId, setSelectedLeadId, getLeadsByStage } = useKanbanStore();
  const { profile } = useAuthStore();
  const { leads, moveLead } = useLeads();
  const { stages } = useStages();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStageId = over.id as string;

    const lead = leads.find((l: LeadWithProfile) => l.id === leadId);
    if (!lead || lead.stage_id === newStageId) return;

    try {
      await moveLead.mutateAsync({ leadId, newStageId });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao mover lead',
        variant: 'destructive',
      });
    }
  };

  // Convert leads to match kanban-store format for filtering
  const kanbanLeads = leads.map((lead: LeadWithProfile) => ({
    ...lead,
    stage_id: lead.stage_id || '',
    vendedor_id: lead.vendedor_id || '',
  }));

  const selectedLead = leads.find((l: LeadWithProfile) => l.id === selectedLeadId);

  if (!profile) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
          <p className="text-sm text-slate-500">
            Arraste os cards entre as colunas para atualizar o status
          </p>
        </div>
        <NewLeadDialog onCreated={() => {}} />
      </div>

      <KanbanFilters />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {stages.map((stage: Stage) => {
            const stageLeads = kanbanLeads.filter((l: LeadWithProfile) => l.stage_id === stage.id);
            return (
              <SortableContext
                key={stage.id}
                items={stageLeads.map((l: LeadWithProfile) => l.id)}
                strategy={horizontalListSortingStrategy}
              >
                <KanbanColumn stage={stage as any} />
              </SortableContext>
            );
          })}
        </div>
      </DndContext>

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead as any}
          open={!!selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onUpdate={() => {}}
          userRole={profile.role}
          userId={profile.id}
        />
      )}
    </div>
  );
}
