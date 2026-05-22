'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Shield, Users, Columns3 } from 'lucide-react';
import type { Profile, KanbanStage } from '@/types/database';

export default function ConfiguracoesPage() {
  const { profile } = useAuthStore();
  const [users, setUsers] = useState<Profile[]>([]);
  const [stages, setStages] = useState<KanbanStage[]>([]);
  const [stageDialog, setStageDialog] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageForm, setStageForm] = useState({ name: '', color: '#3b82f6', position: 0 });
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    if (data) setUsers(data as Profile[]);
  };

  const fetchStages = async () => {
    const { data } = await supabase.from('kanban_stages').select('*').order('position');
    if (data) setStages(data as KanbanStage[]);
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchUsers();
      fetchStages();
    }
  }, [profile]);

  const handleStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (editingStageId) {
      await supabase
        .from('kanban_stages')
        .update(stageForm)
        .eq('id', editingStageId);
    } else {
      await supabase.from('kanban_stages').insert(stageForm);
    }

    setLoading(false);
    setStageDialog(false);
    setEditingStageId(null);
    fetchStages();
  };

  const handleDeleteStage = async (id: string) => {
    await supabase.from('kanban_stages').delete().eq('id', id);
    fetchStages();
  };

  const handleEditStage = (stage: KanbanStage) => {
    setEditingStageId(stage.id);
    setStageForm({ name: stage.name, color: stage.color, position: stage.position });
    setStageDialog(true);
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p>Acesso restrito a administradores</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500">Gerencie usuários e etapas do pipeline</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-lg">Usuários</CardTitle>
          </div>
          <CardDescription>Lista de usuários do sistema e seus perfis</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || 'Sem nome'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 font-mono">
                    {user.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role === 'admin'
                          ? 'default'
                          : user.role === 'vendedor'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Columns3 className="h-5 w-5 text-slate-600" />
              <CardTitle className="text-lg">Etapas do Pipeline</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingStageId(null);
                setStageForm({ name: '', color: '#3b82f6', position: stages.length + 1 });
                setStageDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Etapa
            </Button>
          </div>
          <CardDescription>
            Configure as colunas do Kanban
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cor</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Posição</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((stage) => (
                <TableRow key={stage.id}>
                  <TableCell>
                    <div
                      className="w-6 h-6 rounded-full border border-slate-200"
                      style={{ backgroundColor: stage.color }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{stage.name}</TableCell>
                  <TableCell>{stage.position}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditStage(stage)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteStage(stage.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={stageDialog} onOpenChange={setStageDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingStageId ? 'Editar Etapa' : 'Nova Etapa'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStageSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={stageForm.name}
                onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={stageForm.color}
                  onChange={(e) => setStageForm({ ...stageForm, color: e.target.value })}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  value={stageForm.color}
                  onChange={(e) => setStageForm({ ...stageForm, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Posição</Label>
              <Input
                type="number"
                value={stageForm.position}
                onChange={(e) =>
                  setStageForm({ ...stageForm, position: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Salvando...' : editingStageId ? 'Salvar' : 'Criar Etapa'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
