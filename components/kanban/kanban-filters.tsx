'use client';

import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useKanbanStore } from '@/stores/kanban-store';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import type { Profile } from '@/types/database';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function KanbanFilters() {
  const { filters, setFilters } = useKanbanStore();
  const { profile } = useAuthStore();
  const [vendedores, setVendedores] = useState<Profile[]>([]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      supabase
        .from('profiles')
        .select('*')
        .order('full_name')
        .then(({ data }) => {
          if (data) setVendedores(data as Profile[]);
        });
    }
  }, [profile]);

  const hasFilters = filters.search || filters.vendedorId || filters.tag;

  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome, empresa ou e-mail..."
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          className="pl-9 h-9"
        />
      </div>

      {profile?.role === 'admin' && (
        <Select
          value={filters.vendedorId || 'all'}
          onValueChange={(v) =>
            setFilters({ vendedorId: v === 'all' ? null : v })
          }
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Todos vendedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos vendedores</SelectItem>
            {vendedores.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.full_name || 'Sem nome'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setFilters({ search: '', vendedorId: null, tag: null })
          }
          className="h-9 text-slate-500"
        >
          <X className="h-3 w-3 mr-1" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
