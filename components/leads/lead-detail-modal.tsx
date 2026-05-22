'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import {
  Building2,
  Mail,
  Phone,
  Plus,
  Trash2,
  Save,
  MessageSquare,
  Package,
  User,
} from 'lucide-react';
import type {
  Lead,
  LeadService,
  LeadNote,
  ServiceCatalog,
  DeliveryStatus,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_COLORS,
} from '@/types/database';
import { DELIVERY_STATUS_LABELS as statusLabels, DELIVERY_STATUS_COLORS as statusColors, CATEGORY_LABELS } from '@/types/database';

interface LeadDetailModalProps {
  lead: Lead;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function LeadDetailModal({ lead, open, onClose, onUpdate }: LeadDetailModalProps) {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('data');
  const [editName, setEditName] = useState(lead.name);
  const [editCompany, setEditCompany] = useState(lead.company);
  const [editEmail, setEditEmail] = useState(lead.email);
  const [editPhone, setEditPhone] = useState(lead.phone);
  const [editValue, setEditValue] = useState(lead.value.toString());
  const [editTags, setEditTags] = useState(lead.tags.join(', '));
  const [saving, setSaving] = useState(false);

  const [leadServices, setLeadServices] = useState<LeadService[]>([]);
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [negotiatedPrice, setNegotiatedPrice] = useState('');

  const fetchLeadServices = useCallback(async () => {
    const { data } = await supabase
      .from('lead_services')
      .select('*, services_catalog(*)')
      .eq('lead_id', lead.id);
    if (data) setLeadServices(data as unknown as LeadService[]);
  }, [lead.id]);

  const fetchServices = useCallback(async () => {
    const { data } = await supabase.from('services_catalog').select('*').order('name');
    if (data) setServices(data as ServiceCatalog[]);
  }, []);

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase
      .from('lead_notes')
      .select('*, profiles(*)')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
    if (data) setNotes(data as unknown as LeadNote[]);
  }, [lead.id]);

  useEffect(() => {
    if (open) {
      fetchLeadServices();
      fetchServices();
      fetchNotes();
      setEditName(lead.name);
      setEditCompany(lead.company);
      setEditEmail(lead.email);
      setEditPhone(lead.phone);
      setEditValue(lead.value.toString());
      setEditTags(lead.tags.join(', '));
    }
  }, [open, lead, fetchLeadServices, fetchServices, fetchNotes]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('leads')
      .update({
        name: editName,
        company: editCompany,
        email: editEmail,
        phone: editPhone,
        value: parseFloat(editValue) || 0,
        tags: editTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
      .eq('id', lead.id);

    if (!error) onUpdate();
    setSaving(false);
  };

  const handleAddService = async () => {
    if (!selectedServiceId) return;
    const { error } = await supabase.from('lead_services').insert({
      lead_id: lead.id,
      service_id: selectedServiceId,
      negotiated_price: parseFloat(negotiatedPrice) || 0,
    });
    if (!error) {
      fetchLeadServices();
      setSelectedServiceId('');
      setNegotiatedPrice('');
    }
  };

  const handleUpdateServiceStatus = async (serviceId: string, status: DeliveryStatus) => {
    await supabase
      .from('lead_services')
      .update({ delivery_status: status })
      .eq('id', serviceId);
    fetchLeadServices();
  };

  const handleRemoveService = async (serviceId: string) => {
    await supabase.from('lead_services').delete().eq('id', serviceId);
    fetchLeadServices();
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await supabase.from('lead_notes').insert({
      lead_id: lead.id,
      author_id: profile?.id,
      content: newNote.trim(),
    });
    setNewNote('');
    fetchNotes();
  };

  const canEdit = profile?.role === 'admin' || profile?.role === 'dev' || lead.vendedor_id === profile?.id;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">{lead.name}</DialogTitle>
            {lead.stage && (
              <Badge
                style={{
                  backgroundColor: lead.stage.color + '20',
                  color: lead.stage.color,
                }}
              >
                {lead.stage.name}
              </Badge>
            )}
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
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (separadas por vírgula)</Label>
                <Input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>
            {canEdit && (
              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="services" className="space-y-4 mt-4">
            {canEdit && (
              <div className="flex items-end gap-2 p-3 bg-slate-50 rounded-lg">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Serviço</Label>
                  <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecionar serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} - R$ {s.base_price.toLocaleString('pt-BR')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32 space-y-1">
                  <Label className="text-xs">Preço negociado</Label>
                  <Input
                    type="number"
                    placeholder="R$"
                    value={negotiatedPrice}
                    onChange={(e) => setNegotiatedPrice(e.target.value)}
                    className="h-9"
                  />
                </div>
                <Button onClick={handleAddService} size="sm" className="h-9">
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
                {leadServices.map((ls) => (
                  <div
                    key={ls.id}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{ls.service?.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {CATEGORY_LABELS[ls.service?.category || 'outros']}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Preço base: R$ {ls.service?.base_price.toLocaleString('pt-BR')} |
                        Negociado: <span className="font-medium text-emerald-600">R$ {ls.negotiated_price.toLocaleString('pt-BR')}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={ls.delivery_status}
                        onValueChange={(v) =>
                          handleUpdateServiceStatus(ls.id, v as DeliveryStatus)
                        }
                      >
                        <SelectTrigger className="h-7 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-red-500"
                          onClick={() => handleRemoveService(ls.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
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
              />
            </div>
            <Button onClick={handleAddNote} disabled={!newNote.trim()} size="sm">
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
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 bg-white border border-slate-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-700">
                        {note.author?.full_name || 'Usuário'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(note.created_at).toLocaleDateString('pt-BR')}
                      </span>
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
