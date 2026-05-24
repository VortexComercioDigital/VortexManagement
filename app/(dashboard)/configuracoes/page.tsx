'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { Plus, Pencil, Trash2, Users, Columns3 } from 'lucide-react';
import { useStagesManager } from '@/hooks/use-stages';
import { useToast } from '@/hooks/use-toast';
import type { Profile, Stage } from '@/types/database';

export default function ConfiguracoesPage() {
  const { profile } = useAuthStore();
  const [users, setUsers] = useState<Profile[]>([]);
  const [stageDialog, setStageDialog] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageForm, setStageForm] = useState({
    name: '',
    color: '#3b82f6',
    order: 0,
  });
  const { stages, createStage, updateStage, deleteStage } = useStagesManager();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.role === 'admin') {
      supabase
        .from('profiles')
        .select('*')
        .order('name')
        .then(({ data }) => {
          if (data) setUsers(data as Profile[]);
        });
    }
  }, [profile]);

  const handleStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', stageForm.name);
    formData.append('color', stageForm.color);
    formData.append('order', stageForm.order.toString());

    try {
      if (editingStageId) {
        await updateStage.mutateAsync({ id: editingStageId, data: formData });
        toast({ title: 'Sucesso', description: 'Etapa atualizada' });
      } else {
        await createStage.mutateAsync(formData);
        toast({ title: 'Sucesso', description: 'Etapa criada' });
      }
      setStageDialog(false);
      setEditingStageId(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar etapa',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    try {
      await deleteStage.mutateAsync(stageId);
      toast({ title: 'Sucesso', description: 'Etapa removida' });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao remover etapa',
        variant: 'destructive',
      });
    }
  };

  const handleEditStage = (stage: Stage) => {
    setEditingStageId(stage.id);
    setStageForm({
      name: stage.name || '',
      color: stage.color || '#3b82f6',
      order: stage.order || 0,
    });
    setStageDialog(true);
  };

  if (!profile) return null;

  if (profile.role !== 'admin') {
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
        <p className="text-sm text-slate-500">
          Gerencie usuários e etapas do pipeline
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            <CardTitle className="text-lg">Usuários</CardTitle>
          </div>
          <CardDescription>
            Lista de usuários do sistema e seus perfis
          </CardDescription>
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
                    {user.name || 'Sem nome'}
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
                setStageForm({
                  name: '',
                  color: '#3b82f6',
                  order: stages.length + 1,
                });
                setStageDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Etapa
            </Button>
          </div>
          <CardDescription>Configure as colunas do Kanban</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cor</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((stage: Stage) => (
                <TableRow key={stage.id}>
                  <TableCell>
                    <div
                      className="w-6 h-6 rounded-full border border-slate-200"
                      style={{ backgroundColor: stage.color || '#3b82f6' }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{stage.name}</TableCell>
                  <TableCell>{stage.order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditStage(stage)}
                        disabled={updateStage.isPending}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteStage(stage.id)}
                        disabled={deleteStage.isPending}
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
                onChange={(e) =>
                  setStageForm({ ...stageForm, name: e.target.value })
                }
                required
                disabled={createStage.isPending || updateStage.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={stageForm.color}
                  onChange={(e) =>
                    setStageForm({ ...stageForm, color: e.target.value })
                  }
                  className="w-12 h-9 p-1 cursor-pointer"
                  disabled={createStage.isPending || updateStage.isPending}
                />
                <Input
                  value={stageForm.color}
                  onChange={(e) =>
                    setStageForm({ ...stageForm, color: e.target.value })
                  }
                  className="flex-1"
                  disabled={createStage.isPending || updateStage.isPending}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={stageForm.order}
                onChange={(e) =>
                  setStageForm({
                    ...stageForm,
                    order: parseInt(e.target.value) || 0,
                  })
                }
                disabled={createStage.isPending || updateStage.isPending}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={createStage.isPending || updateStage.isPending}
            >
              {createStage.isPending || updateStage.isPending
                ? 'Salvando...'
                : editingStageId
                ? 'Salvar'
                : 'Criar Etapa'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
