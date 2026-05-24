'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth-store';
import type { Stage, Profile } from '@/types/database';
import { useLeads, useStages, useVendedores } from '@/hooks/use-leads';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface NewLeadDialogProps {
  onCreated: () => void;
}

export function NewLeadDialog({ onCreated }: NewLeadDialogProps) {
  const profile = useAuthStore((state) => state.profile);
  const [open, setOpen] = useState(false);
  const { stages } = useStages();
  const { vendedores } = useVendedores();
  const { createLead } = useLeads();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      await createLead.mutateAsync(formData);
      toast({ title: 'Sucesso', description: 'Lead criado com sucesso' });
      setOpen(false);
      onCreated();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar lead',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input name="name" required disabled={createLead.isPending} />
          </div>
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Input name="company" disabled={createLead.isPending} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input name="email" type="email" disabled={createLead.isPending} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input name="phone" disabled={createLead.isPending} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select name="stageId" disabled={createLead.isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s: Stage) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input name="value" type="number" disabled={createLead.isPending} />
            </div>
          </div>
          {profile?.role === 'admin' && vendedores.length > 0 && (
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select name="vendedorId" disabled={createLead.isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((v: Profile) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Tags (separadas por vírgula)</Label>
            <Input
              name="tags"
              placeholder="ex: site, urgente, vip"
              disabled={createLead.isPending}
            />
          </div>
          <Button type="submit" className="w-full" disabled={createLead.isPending}>
            {createLead.isPending ? 'Criando...' : 'Criar Lead'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
