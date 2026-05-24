'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  DollarSign,
  TrendingUp,
  KanbanSquare,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react';

interface DashboardStats {
  totalLeads: number;
  leadsThisMonth: number;
  totalRevenue: number;
  closedThisMonth: number;
  conversionRate: number;
  activeDeals: number;
}

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    leadsThisMonth: 0,
    totalRevenue: 0,
    closedThisMonth: 0,
    conversionRate: 0,
    activeDeals: 0,
  });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStats() {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      const { count: leadsThisMonth } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDay);

      const { data: closedLeads } = await supabase
        .from('leads')
        .select('value')
        .eq('stage_id', (
          await supabase.from('kanban_stages').select('id').eq('name', 'Fechado').maybeSingle()
        ).data?.id ?? '');

      const { count: closedThisMonth } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('stage_id', (
          await supabase.from('kanban_stages').select('id').eq('name', 'Fechado').maybeSingle()
        ).data?.id ?? '')
        .gte('updated_at', firstDay);

      const totalRevenue = (closedLeads || []).reduce((sum: number, l: { value: number }) => sum + (l.value || 0), 0);
      const conversionRate = totalLeads ? ((closedLeads?.length || 0) / totalLeads) * 100 : 0;

      const { count: activeDeals } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .not('stage_id', 'eq', (
          await supabase.from('kanban_stages').select('id').eq('name', 'Fechado').maybeSingle()
        ).data?.id ?? '')
        .not('stage_id', 'eq', (
          await supabase.from('kanban_stages').select('id').eq('name', 'Perdido').maybeSingle()
        ).data?.id ?? '');

      setStats({
        totalLeads: totalLeads || 0,
        leadsThisMonth: leadsThisMonth || 0,
        totalRevenue,
        closedThisMonth: closedThisMonth || 0,
        conversionRate: Math.round(conversionRate * 10) / 10,
        activeDeals: activeDeals || 0,
      });

      const { data: recent } = await supabase
        .from('leads')
        .select('*, kanban_stages(name, color)')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentLeads(recent || []);
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total de Leads',
      value: stats.totalLeads,
      change: `+${stats.leadsThisMonth} este mês`,
      trend: 'up' as const,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Receita Total',
      value: `R$ ${stats.totalRevenue.toLocaleString('pt-BR')}`,
      change: `${stats.closedThisMonth} fechados este mês`,
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Taxa de Conversão',
      value: `${stats.conversionRate}%`,
      change: 'Leads fechados / Total',
      trend: stats.conversionRate > 20 ? ('up' as const) : ('down' as const),
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Negócios Ativos',
      value: stats.activeDeals,
      change: 'No pipeline atual',
      trend: 'up' as const,
      icon: KanbanSquare,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Olá, {profile?.name || 'Usuário'}
        </h1>
        <p className="text-slate-500 mt-1">
          Aqui está um resumo do seu pipeline hoje.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="flex items-center gap-1 mt-1">
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <p className="text-xs text-slate-500">{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Leads Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum lead cadastrado ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm text-slate-900">{lead.name}</p>
                      <p className="text-xs text-slate-500">{lead.company || lead.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        style={{
                          backgroundColor: lead.kanban_stages?.color + '20',
                          color: lead.kanban_stages?.color,
                        }}
                      >
                        {lead.kanban_stages?.name}
                      </Badge>
                      {lead.value > 0 && (
                        <span className="text-xs font-medium text-slate-600">
                          R$ {lead.value.toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-slate-400">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Histórico de atividades em breve</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
