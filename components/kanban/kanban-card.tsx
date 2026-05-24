'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, Mail, Phone, Tag } from 'lucide-react';
import { useKanbanStore } from '@/stores/kanban-store';
import { Badge } from '@/components/ui/badge';
import type { Lead } from '@/types/database';

interface KanbanCardProps {
  lead: Lead;
}

export function KanbanCard({ lead }: KanbanCardProps) {
  const { setSelectedLeadId } = useKanbanStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setSelectedLeadId(lead.id)}
      className={`group bg-white rounded-lg border border-slate-200 p-3 cursor-pointer
        hover:shadow-md hover:border-slate-300 transition-all
        ${isDragging ? 'opacity-50 shadow-lg scale-105' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm text-slate-900 leading-tight">
          {lead.name || 'Sem nome'}
        </h4>
        {lead.value && lead.value > 0 && (
          <span className="text-xs font-bold text-emerald-600 whitespace-nowrap">
            R$ {lead.value.toLocaleString('pt-BR')}
          </span>
        )}
      </div>

      {lead.company && (
        <div className="flex items-center gap-1 mt-1.5">
          <Building2 className="h-3 w-3 text-slate-400" />
          <span className="text-xs text-slate-500 truncate">{lead.company}</span>
        </div>
      )}

      <div className="flex items-center gap-3 mt-2">
        {lead.email && (
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3 text-slate-400" />
            <span className="text-xs text-slate-500 truncate">{lead.email}</span>
          </div>
        )}
      </div>

      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {lead.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              {tag}
            </Badge>
          ))}
          {lead.tags.length > 3 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              +{lead.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {lead.profiles && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
            <span className="text-[9px] font-bold text-slate-500">
              {lead.profiles.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'V'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 truncate">
            {lead.profiles.name}
          </span>
        </div>
      )}
    </div>
  );
}
