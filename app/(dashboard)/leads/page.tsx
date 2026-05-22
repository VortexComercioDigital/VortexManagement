'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Building2, Mail, Phone } from 'lucide-react';
import { NewLeadDialog } from '@/components/leads/new-lead-dialog';
import { LeadDetailModal } from '@/components/leads/lead-detail-modal';
import type { Lead, Profile, KanbanStage } from '@/types/database';

export default function LeadsPage() {
  const { profile } = useAuthStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<KanbanStage[]>([]);
  const [vendedores, setVendedores] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState('all');

  const fetchLeads = async () => {
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
  };

  useEffect(() => {
    fetchLeads();
    supabase.from('kanban_stages').select('*').order('position').then(({ data }) => {
      if (data) setStages(data as KanbanStage[]);
    });
    if (profile?.role === 'admin' || profile?.role === 'dev') {
      supabase.from('profiles').select('*').order('full_name').then(({ data }) => {
        if (data) setVendedores(data as Profile[]);
      });
    }
  }, [profile]);

  const filteredLeads = leads.filter((lead) => {
    if (stageFilter !== 'all' && lead.stage_id !== stageFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        lead.name.toLowerCase().includes(s) ||
        lead.company.toLowerCase().includes(s) ||
        lead.email.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">Lista completa de leads e clientes</p>
        </div>
        <NewLeadDialog onCreated={fetchLeads} />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todas etapas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas etapas</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                {(profile?.role === 'admin' || profile?.role === 'dev') && <TableHead>Vendedor</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={(profile?.role === 'admin' || profile?.role === 'dev') ? 6 : 5} className="text-center py-8 text-slate-400">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>
                      {lead.company && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span className="text-sm">{lead.company}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {lead.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="text-xs">{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span className="text-xs">{lead.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.stage && (
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: lead.stage.color + '20',
                            color: lead.stage.color,
                          }}
                        >
                          {lead.stage.name}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {lead.value > 0
                        ? `R$ ${lead.value.toLocaleString('pt-BR')}`
                        : '-'}
                    </TableCell>
                    {(profile?.role === 'admin' || profile?.role === 'dev') && (
                      <TableCell>
                        {lead.vendedor?.full_name || '-'}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
