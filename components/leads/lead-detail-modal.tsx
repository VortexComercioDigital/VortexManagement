'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import { supabase } from '@/lib/supabase';
import { useLeads } from '@/hooks/use-leads';
import { useNotes } from '@/hooks/use-notes';
import { useServices, useLeadServices } from '@/hooks/use-services';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Save,
  MessageSquare,
  Package,
  User,
} from 'lucide-react';
import type { Lead, Service, LeadService, Note } from '@/types/database';

interface LeadDetailModalProps {
  lead: Lead;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  userRole: 'admin' | 'vendedor' | 'dev';
  userId: string;
}

export function LeadDetailModal({
  lead,
  open,
  onClose,
  onUpdate,
  userRole,
  userId,
}: LeadDetailModalProps) {
  const [activeTab, setActiveTab] = useState('data');
  const { updateLead } = useLeads();
  const { notes, createNote, deleteNote } = useNotes(lead.id);
  const { services } = useServices();
  const { leadServices, addServiceToLead, removeServiceFromLead } = useLeadServices(lead.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editName, setEditName] = useState(lead.name || '');
  const [editCompany, setEditCompany] = useState(lead.company || '');
  const [editEmail, setEditEmail] = useState(lead.email || '');
  const [editPhone, setEditPhone] = useState(lead.phone || '');
  const [editValue, setEditValue] = useState(lead.value?.toString() || '0');
  const [editTags, setEditTags] = useState(lead.tags?.join(', ') || '');

  const [newNote, setNewNote] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');

  useEffect(() => {
    if (open) {
      setEditName(lead.name || '');
      setEditCompany(lead.company || '');
      setEditEmail(lead.email || '');
      setEditPhone(lead.phone || '');
      setEditValue(lead.value?.toString() || '0');
      setEditTags(lead.tags?.join(', ') || '');
    }
  }, [open, lead]);

  const handleSave = async () => {
    const formData = new FormData();
    formData.append('name', editName);
    formData.append('company', editCompany);
    formData.append('email', editEmail);
    formData.append('phone', editPhone);
    formData.append('value', editValue);
    formData.append('tags', editTags);

    try {
      await updateLead.mutateAsync({ id: lead.id!, data: formData });
      toast({ title: 'Sucesso', description: 'Lead atualizado' });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar',
        variant: 'destructive',
      });
    }
  };

  const handleAddService = async () => {
    if (!selectedServiceId) return;

    try {
      await addServiceToLead.mutateAsync({ serviceId: selectedServiceId });
      toast({ title: 'Sucesso', description: 'Serviço adicionado' });
      setSelectedServiceId('');
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao adicionar serviço',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveService = async (id: string) => {
    try {
      await removeServiceFromLead.mutateAsync(id);
      toast({ title: 'Sucesso', description: 'Serviço removido' });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao remover serviço',
        variant: 'destructive',
      });
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      await createNote.mutateAsync(newNote);
      toast({ title: 'Sucesso', description: 'Nota adicionada' });
      setNewNote('');
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao adicionar nota',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNote.mutateAsync(id);
      toast({ title: 'Sucesso', description: 'Nota removida' });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao remover nota',
        variant: 'destructive',
      });
    }
  };

  const canEdit = userRole === 'admin' || lead.vendedor_id === userId;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">{lead.name}</DialogTitle>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="data" className="flex-1">
              <User className="h-4 w-4 mr-1" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="services" className="flex-1">
              <Package className="h-4 w-4 mr-1" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-1" />
              Notas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!canEdit || updateLead.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  disabled={!canEdit || updateLead.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={!canEdit || updateLead.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={!canEdit || updateLead.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  disabled={!canEdit || updateLead.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (separadas por vírgula)</Label>
                <Input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  disabled={!canEdit || updateLead.isPending}
                />
              </div>
            </div>
            {canEdit && (
              <Button onClick={handleSave} disabled={updateLead.isPending} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {updateLead.isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="services" className="space-y-4 mt-4">
            {canEdit && (
              <div className="flex items-end gap-2 p-3 bg-slate-50 rounded-lg">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Serviço</Label>
                  <Select
                    value={selectedServiceId}
                    onValueChange={setSelectedServiceId}
                    disabled={addServiceToLead.isPending}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecionar serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s: Service) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} - R$ {(s.price || 0).toLocaleString('pt-BR')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddService}
                  size="sm"
                  className="h-9"
                  disabled={addServiceToLead.isPending || !selectedServiceId}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {leadServices.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum serviço vinculado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leadServices.map((ls: LeadService) => (
                  <div
                    key={ls.id}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{ls.service?.name}</p>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-red-500"
                        onClick={() => handleRemoveService(ls.id)}
                        disabled={removeServiceFromLead.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Adicionar nota de reunião ou interação..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px]"
                disabled={createNote.isPending}
              />
            </div>
            <Button
              onClick={handleAddNote}
              disabled={!newNote.trim() || createNote.isPending}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar nota
            </Button>

            {notes.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma nota registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note: Note) => (
                  <div
                    key={note.id}
                    className="p-3 bg-white border border-slate-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">
                        {new Date(note.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      {(userRole === 'admin' || note.author_id === userId) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-red-500"
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={deleteNote.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
