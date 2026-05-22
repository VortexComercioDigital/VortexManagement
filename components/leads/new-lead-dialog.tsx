'use client';

import { useState, useEffect } from 'react';
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
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Plus } from 'lucide-react';
import type { KanbanStage, Profile } from '@/types/database';

interface NewLeadDialogProps {
  onCreated: () => void;
}

export function NewLeadDialog({ onCreated }: NewLeadDialogProps) {
  const { profile } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [stages, setStages] = useState<KanbanStage[]>([]);
  const [vendedores, setVendedores] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stageId, setStageId] = useState('');
  const [vendedorId, setVendedorId] = useState(profile?.id || '');
  const [value, setValue] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (open) {
      supabase
        .from('kanban_stages')
        .select('*')
        .order('position')
        .then(({ data }) => {
          if (data) {
            setStages(data as KanbanStage[]);
            if (!stageId) setStageId(data[0]?.id || '');
          }
        });

      if (profile?.role === 'admin' || profile?.role === 'dev') {
        supabase
          .from('profiles')
          .select('*')
          .order('full_name')
          .then(({ data }) => {
            if (data) setVendedores(data as Profile[]);
          });
      }
    }
  }, [open, profile, stageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('leads').insert({
      name,
      company,
      email,
      phone,
      stage_id: stageId,
      vendedor_id: vendedorId || profile?.id,
      value: parseFloat(value) || 0,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });

    setLoading(false);

    if (!error) {
      setOpen(false);
      setName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setValue('');
      setTags('');
      onCreated();
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
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>
          {(profile?.role === 'admin' || profile?.role === 'dev') && vendedores.length > 0 && (
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select value={vendedorId} onValueChange={setVendedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.full_name || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Tags (separadas por vírgula)</Label>
            <Input
              placeholder="ex: site, urgente, vip"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Lead'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
