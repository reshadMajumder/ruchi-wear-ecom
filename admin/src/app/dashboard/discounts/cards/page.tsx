"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ImageIcon, Loader2, Plus } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Discount {
  id: number;
  name: string;
  discount_type: 'percentage' | 'fixed';
  value: string;
  scope: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  priority: number;
  image_url: string | null;
  make_card: boolean;
}

interface Draft {
  id: number | null;
  name: string;
  discount_type: 'percentage' | 'fixed';
  value: string;
  scope: string;
  start: string;
  end: string;
  is_active: boolean;
  image_url: string | null;
}

function authHeaders(json = false): HeadersInit {
  const token = localStorage.getItem('commercehub_access_token');
  return json
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { Authorization: `Bearer ${token}` };
}

function errorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') return fallback;
  const record = data as Record<string, unknown>;
  if (typeof record.error === 'string') return record.error;
  if (typeof record.message === 'string') return record.message;
  const first = Object.values(record).flat()[0];
  return typeof first === 'string' ? first : fallback;
}

function toLocalInput(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function blankDraft(): Draft {
  const start = new Date();
  const end = new Date();
  end.setFullYear(end.getFullYear() + 1);
  return {
    id: null,
    name: '',
    discount_type: 'percentage',
    value: '10',
    scope: 'global',
    start: toLocalInput(start),
    end: toLocalInput(end),
    is_active: true,
    image_url: null,
  };
}

function offerLabel(discount: Pick<Discount, 'discount_type' | 'value'>) {
  const amount = Number(discount.value);
  return discount.discount_type === 'percentage' ? `${amount}%` : `Tk ${amount.toLocaleString()}`;
}

function byPriority(a: Discount, b: Discount) {
  return b.priority - a.priority || b.id - a.id;
}

export default function DiscountCardsPage() {
  const { toast } = useToast();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingRemove, setPendingRemove] = useState<Discount | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.DISCOUNT_LIST, { headers: authHeaders() });
      if (!response.ok) throw new Error('Could not load discounts.');
      const data = await response.json();
      setDiscounts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Load failed', description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const cards = useMemo(() => discounts.filter((item) => item.make_card).sort(byPriority), [discounts]);
  const offHomepage = useMemo(() => discounts.filter((item) => !item.make_card).sort((a, b) => a.name.localeCompare(b.name)), [discounts]);

  const patchDiscount = async (id: number, body: Record<string, unknown>) => {
    const response = await fetch(API_ENDPOINTS.UPDATE_DISCOUNT(id), {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(errorMessage(data, 'Update failed.'));
    return data;
  };

  const replaceDiscount = (id: number, changes: Partial<Discount>) => {
    setDiscounts((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  const toggleLive = async (card: Discount) => {
    const next = !card.is_active;
    replaceDiscount(card.id, { is_active: next });
    setBusyId(card.id);
    try {
      await patchDiscount(card.id, { is_active: next });
    } catch (err: any) {
      replaceDiscount(card.id, { is_active: card.is_active });
      toast({ variant: 'destructive', title: 'Could not update', description: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const move = async (card: Discount, direction: -1 | 1) => {
    const index = cards.findIndex((item) => item.id === card.id);
    const neighbor = cards[index + direction];
    if (!neighbor) return;
    const nextPriority = card.priority === neighbor.priority
      ? neighbor.priority + (direction === -1 ? 1 : -1)
      : neighbor.priority;
    const neighborPriority = card.priority === neighbor.priority ? neighbor.priority : card.priority;
    replaceDiscount(card.id, { priority: nextPriority });
    replaceDiscount(neighbor.id, { priority: neighborPriority });
    setBusyId(card.id);
    try {
      await Promise.all([
        patchDiscount(card.id, { priority: nextPriority }),
        patchDiscount(neighbor.id, { priority: neighborPriority }),
      ]);
    } catch (err: any) {
      replaceDiscount(card.id, { priority: card.priority });
      replaceDiscount(neighbor.id, { priority: neighbor.priority });
      toast({ variant: 'destructive', title: 'Could not reorder', description: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const showOnHomepage = async (discount: Discount) => {
    const top = cards[0]?.priority ?? 0;
    setBusyId(discount.id);
    try {
      await patchDiscount(discount.id, { make_card: true, is_active: true, priority: top + 1 });
      toast({ title: 'On the homepage', description: discount.name });
      await load(true);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not add card', description: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const openCreate = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setDraft(blankDraft());
  };

  const openEdit = (card: Discount) => {
    setImageFile(null);
    setPreviewUrl(card.image_url);
    setDraft({
      id: card.id,
      name: card.name,
      discount_type: card.discount_type,
      value: String(Number(card.value)),
      scope: card.scope || 'global',
      start: toLocalInput(card.start_date),
      end: toLocalInput(card.end_date),
      is_active: card.is_active,
      image_url: card.image_url,
    });
  };

  const closeDraft = () => {
    setDraft(null);
    setImageFile(null);
    setPreviewUrl(null);
  };

  const onImage = (file: File | undefined) => {
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const saveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setIsSaving(true);
    try {
      let imageUrl = draft.image_url;
      if (imageFile) {
        const body = new FormData();
        body.append('image', imageFile);
        const upload = await fetch(API_ENDPOINTS.IMAGE_UPLOAD, { method: 'POST', headers: authHeaders(), body });
        const uploaded = await upload.json().catch(() => ({}));
        if (!upload.ok) throw new Error(errorMessage(uploaded, 'Could not upload the image.'));
        imageUrl = uploaded.image_url;
      }

      const payload = {
        name: draft.name.trim(),
        discount_type: draft.discount_type,
        value: parseFloat(draft.value),
        scope: draft.scope,
        is_active: draft.is_active,
        start_date: new Date(draft.start).toISOString(),
        end_date: new Date(draft.end).toISOString(),
        priority: draft.id ? discounts.find((item) => item.id === draft.id)?.priority ?? 0 : (cards[0]?.priority ?? 0) + 1,
        image_url: imageUrl,
        make_card: true,
      };

      const response = await fetch(
        draft.id ? API_ENDPOINTS.UPDATE_DISCOUNT(draft.id) : API_ENDPOINTS.CREATE_DISCOUNT,
        {
          method: draft.id ? 'PUT' : 'POST',
          headers: authHeaders(true),
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(data, 'Save failed.'));
      toast({ title: draft.id ? 'Card updated' : 'Card added', description: payload.name });
      closeDraft();
      await load(true);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const takeOffHomepage = async () => {
    if (!pendingRemove) return;
    setIsRemoving(true);
    try {
      await patchDiscount(pendingRemove.id, { make_card: false });
      toast({ title: 'Removed from homepage', description: pendingRemove.name });
      setPendingRemove(null);
      await load(true);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not remove', description: err.message });
    } finally {
      setIsRemoving(false);
    }
  };

  const deleteDiscount = async () => {
    if (!pendingRemove) return;
    setIsRemoving(true);
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_DISCOUNT(pendingRemove.id), {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(errorMessage(data, 'Delete failed.'));
      }
      toast({ title: 'Discount deleted', description: pendingRemove.name });
      setPendingRemove(null);
      await load(true);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: err.message });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Discount cards</h1>
          <p className="text-xs text-muted-foreground">Homepage offers. The top row shows first.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          New card
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Order</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>Offer</TableHead>
                <TableHead>Live</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">No homepage cards yet.</TableCell>
                </TableRow>
              ) : cards.map((card, index) => (
                <TableRow key={card.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0 || busyId === card.id} onClick={() => move(card, -1)} aria-label={`Move ${card.name} up`}>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === cards.length - 1 || busyId === card.id} onClick={() => move(card, 1)} aria-label={`Move ${card.name} down`}>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-12 overflow-hidden rounded border bg-muted">
                        {card.image_url ? (
                          <img src={card.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="m-auto mt-1.5 h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{card.name}</div>
                        <div className="text-[11px] capitalize text-muted-foreground">{card.scope}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{offerLabel(card)}</TableCell>
                  <TableCell>
                    <Switch checked={card.is_active} disabled={busyId === card.id} onCheckedChange={() => toggleLive(card)} aria-label={`${card.name} live`} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(card)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => setPendingRemove(card)}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && offHomepage.length > 0 && (
        <div className="border rounded-md">
          <div className="border-b px-2 py-1.5 text-xs text-muted-foreground">Discounts not on the homepage</div>
          <Table>
            <TableBody>
              {offHomepage.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell className="font-medium">{discount.name}</TableCell>
                  <TableCell>{offerLabel(discount)}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{discount.scope}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" disabled={busyId === discount.id} onClick={() => showOnHomepage(discount)}>
                      {busyId === discount.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Show'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(open) => !open && closeDraft()}>
        <DialogContent>
          {draft && (
            <form onSubmit={saveDraft}>
              <DialogHeader>
                <DialogTitle>{draft.id ? 'Edit card' : 'New card'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-3">
                <div className="space-y-1">
                  <Label htmlFor="card-name">Name</Label>
                  <Input id="card-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required autoFocus />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="card-value">Offer</Label>
                  <div className="flex gap-2">
                    <div className="flex rounded-md border p-0.5">
                      <Button type="button" size="sm" variant={draft.discount_type === 'percentage' ? 'default' : 'ghost'} onClick={() => setDraft({ ...draft, discount_type: 'percentage' })}>%</Button>
                      <Button type="button" size="sm" variant={draft.discount_type === 'fixed' ? 'default' : 'ghost'} onClick={() => setDraft({ ...draft, discount_type: 'fixed' })}>Tk</Button>
                    </div>
                    <Input id="card-value" type="number" min="0" step="0.01" value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="card-image">Image</Label>
                  <div className="flex items-center gap-2">
                    <div className="h-12 w-16 overflow-hidden rounded border bg-muted">
                      {previewUrl ? <img src={previewUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="m-auto mt-3 h-4 w-4 text-muted-foreground" />}
                    </div>
                    <Input id="card-image" type="file" accept="image/*" className="h-8" onChange={(event) => onImage(event.target.files?.[0])} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="card-start">Starts</Label>
                    <Input id="card-start" type="datetime-local" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="card-end">Ends</Label>
                    <Input id="card-end" type="datetime-local" value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Applies to</Label>
                  <Select value={draft.scope} onValueChange={(scope) => setDraft({ ...draft, scope })}>
                    <SelectTrigger aria-label="Applies to">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Whole shop</SelectItem>
                      <SelectItem value="category">One category</SelectItem>
                      <SelectItem value="product">One product</SelectItem>
                    </SelectContent>
                  </Select>
                  {draft.scope !== 'global' && (
                    <p className="text-[11px] text-muted-foreground">Assign the category or product from Assign Discount after saving.</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="card-live">Live on the homepage</Label>
                  <Switch id="card-live" checked={draft.is_active} onCheckedChange={(is_active) => setDraft({ ...draft, is_active })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDraft}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingRemove} onOpenChange={(open) => !open && !isRemoving && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingRemove?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Taking it off the homepage keeps the discount. Deleting removes the discount itself.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Keep</AlertDialogCancel>
            <Button variant="outline" disabled={isRemoving} onClick={takeOffHomepage}>
              {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Off homepage'}
            </Button>
            <Button variant="destructive" disabled={isRemoving} onClick={deleteDiscount}>Delete discount</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
