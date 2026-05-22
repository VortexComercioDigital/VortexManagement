'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useKanbanStore } from '@/stores/kanban-store';
import { KanbanCard } from './kanban-card';
import type { KanbanStage } from '@/types/database';

interface KanbanColumnProps {
  stage: KanbanStage;
}

export function KanbanColumn({ stage }: KanbanColumnProps) {
  const { getLeadsByStage } = useKanbanStore();
  const leads = getLeadsByStage(stage.id);

  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] max-w-[320px] w-[280px] rounded-xl transition-colors ${
        isOver ? 'bg-emerald-50/50' : 'bg-slate-100/60'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-3">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: stage.color }}
        />
        <h3 className="font-semibold text-sm text-slate-700">{stage.name}</h3>
        <span className="ml-auto text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full">
          {leads.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <p className="text-xs">Nenhum lead nesta etapa</p>
          </div>
        )}
      </div>
    </div>
  );
}
