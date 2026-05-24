'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useServices } from '@/hooks/use-services';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Service } from '@/types/database';

const emptyService = {
  name: '',
  description: '',
  price: 0,
};

export default function ServicosPage() {
  const { profile } = useAuthStore();
  const { services, isLoading, createService, updateService, deleteService } = useServices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyService);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('description', form.description);
    formData.append('price', form.price.toString());

    try {
      if (editingId) {
        await updateService.mutateAsync({ id: editingId, data: formData });
        toast({ title: 'Sucesso', description: 'Serviço atualizado' });
      } else {
        await createService.mutateAsync(formData);
        toast({ title: 'Sucesso', description: 'Serviço criado' });
      }
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyService);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar serviço',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setForm({
      name: service.name || '',
      description: service.description || '',
      price: service.price || 0,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (serviceId: string) => {
    try {
      await deleteService.mutateAsync(serviceId);
      toast({ title: 'Sucesso', description: 'Serviço removido' });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao remover serviço',
        variant: 'destructive',
      });
    }
  };

  if (!profile) return null;

  if (profile.role !== 'admin' && profile.role !== 'dev') {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p>Acesso restrito a administradores e desenvolvedores</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Catálogo de Serviços
          </h1>
          <p className="text-sm text-slate-500">
            Gerencie os serviços digitais oferecidos
          </p>
        </div>
        {profile.role === 'admin' && (
          <Button
            onClick={() => {
              setEditingId(null);
              setForm(emptyService);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Serviço
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                {profile.role === 'admin' && (
                  <TableHead className="w-[100px]">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhum serviço cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service: Service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">
                      {service.name}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 max-w-xs truncate">
                      {service.description || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {(service.price || 0).toLocaleString('pt-BR')}
                    </TableCell>
                    {profile.role === 'admin' && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(service)}
                            disabled={updateService.isPending}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(service.id)}
                            disabled={deleteService.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                disabled={createService.isPending || updateService.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                disabled={createService.isPending || updateService.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço (R$)</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: parseFloat(e.target.value) || 0 })
                }
                disabled={createService.isPending || updateService.isPending}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={createService.isPending || updateService.isPending}
            >
              {createService.isPending || updateService.isPending
                ? 'Salvando...'
                : editingId
                ? 'Salvar Alterações'
                : 'Criar Serviço'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
