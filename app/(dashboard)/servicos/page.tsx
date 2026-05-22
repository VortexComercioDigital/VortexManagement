'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { ServiceCatalog } from '@/types/database';
import { CATEGORY_LABELS } from '@/types/database';

const emptyService = {
  name: '',
  description: '',
  category: 'site' as ServiceCatalog['category'],
  base_price: 0,
};

export default function ServicosPage() {
  const { profile } = useAuthStore();
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyService);
  const [loading, setLoading] = useState(false);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services_catalog')
      .select('*')
      .order('name');
    if (data) setServices(data as ServiceCatalog[]);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (editingId) {
      await supabase
        .from('services_catalog')
        .update(form)
        .eq('id', editingId);
    } else {
      await supabase.from('services_catalog').insert(form);
    }

    setLoading(false);
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyService);
    fetchServices();
  };

  const handleEdit = (service: ServiceCatalog) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description,
      category: service.category,
      base_price: service.base_price,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('services_catalog').delete().eq('id', id);
    fetchServices();
  };

  if (profile?.role !== 'admin' && profile?.role !== 'dev') {
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
          <h1 className="text-2xl font-bold text-slate-900">Catálogo de Serviços</h1>
          <p className="text-sm text-slate-500">
            Gerencie os serviços digitais oferecidos
          </p>
        </div>
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
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Preço Base</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhum serviço cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {CATEGORY_LABELS[service.category]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 max-w-xs truncate">
                      {service.description || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {service.base_price.toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(service)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(service.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
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
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm({ ...form, category: v as ServiceCatalog['category'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço Base (R$)</Label>
              <Input
                type="number"
                value={form.base_price}
                onChange={(e) =>
                  setForm({ ...form, base_price: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Serviço'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
