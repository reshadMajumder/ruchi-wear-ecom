"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Edit2, 
  Tag,
  Loader2,
  Settings2,
  Layers,
  Info,
  Save,
  Eye,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { API_ENDPOINTS, BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';

interface ApiAttributeValue {
  id: number;
  value: string;
}

interface ApiProductType {
  id: number;
  name: string;
}

interface ApiAttribute {
  id: number;
  name: string;
  values?: ApiAttributeValue[];
  connected_type_names?: string[];
}

export default function AttributesPage() {
  const [attributes, setAttributes] = useState<ApiAttribute[]>([]);
  const [productTypes, setProductTypes] = useState<ApiProductType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [attributeToDelete, setAttributeToDelete] = useState<ApiAttribute | null>(null);
  
  // Attribute Create State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newAttributeProductTypeId, setNewAttributeProductTypeId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Attribute Detail / Edit State
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedAttributeForDetail, setSelectedAttributeForDetail] = useState<ApiAttribute | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  
  // Edit Form Fields
  const [editName, setEditName] = useState("");
  const [editValuesText, setEditValuesText] = useState("");
  const [editProductTypeIds, setEditProductTypeIds] = useState<number[]>([]);
  const [isPatching, setIsPatching] = useState(false);

  const { toast } = useToast();

  const fetchAttributes = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.ATTRIBUTES, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to synchronize attributes');
      const data = await response.json();
      setAttributes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Sync Error',
        description: err.message
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  const fetchProductTypes = useCallback(async () => {
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.PRODUCT_TYPES, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to synchronize product types');
      const data = await response.json();
      setProductTypes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load product types', err);
    }
  }, []);

  useEffect(() => {
    fetchAttributes();
    fetchProductTypes();
  }, [fetchAttributes, fetchProductTypes]);

  const handleViewDetail = async (attr: ApiAttribute) => {
    setSelectedAttributeForDetail(attr);
    setEditName(attr.name);
    setEditValuesText(attr.values?.map(v => v.value).join('\n') || "");
    
    const connectedTypeIds = productTypes
      .filter(pt => attr.connected_type_names?.includes(pt.name))
      .map(pt => pt.id);
    
    setEditProductTypeIds(connectedTypeIds);
    setIsEditingDetail(false);
    setIsDetailDialogOpen(true);
  };

  const handlePatchAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttributeForDetail) return;

    setIsPatching(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const values = editValuesText.split('\n').map(v => v.trim()).filter(v => v !== "");
      
      const payload = {
        name: editName,
        values: values,
        product_type_ids: editProductTypeIds
      };

      const response = await fetch(`${API_ENDPOINTS.ATTRIBUTES}${selectedAttributeForDetail.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = data.error || data.detail || data.message || 'Failed to update attribute details.';
        if (data.used_values) {
          errorMsg = `${errorMsg} Used in variants: ${data.used_values.join(', ')}`;
        }
        if (data.used_product_type_ids) {
          errorMsg = `${errorMsg} Mapping IDs in use: ${data.used_product_type_ids.join(', ')}`;
        }
        throw new Error(errorMsg);
      }

      toast({
        title: 'Update Successful',
        description: 'Attribute catalog details have been synchronized.',
      });

      setIsDetailDialogOpen(false);
      fetchAttributes(true);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err.message
      });
    } finally {
      setIsPatching(false);
    }
  };

  const confirmDelete = async () => {
    if (!attributeToDelete) return;

    setDeletingId(attributeToDelete.id);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(`${API_ENDPOINTS.ATTRIBUTES}${attributeToDelete.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || data.detail || data.message || 'Failed to delete attribute.');
      }

      toast({
        title: 'Attribute Deleted',
        description: 'The attribute has been removed from the catalog.',
      });

      setIsDetailDialogOpen(false);
      fetchAttributes(true);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err.message
      });
    } finally {
      setDeletingId(null);
      setAttributeToDelete(null);
    }
  };

  const handleSubmitAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttributeName.trim() || !newAttributeProductTypeId) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const url = `${BASE_URL}/api/foundation/admin/product-types/${newAttributeProductTypeId}/attributes/`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newAttributeName.trim() })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || errData.detail || errData.message || 'Failed to create attribute.');
      }

      setIsDialogOpen(false);
      setNewAttributeName("");
      setNewAttributeProductTypeId("");
      
      toast({
        title: 'Attribute Created',
        description: `${newAttributeName} successfully processed.`,
      });
      
      fetchAttributes(true);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTypeSelection = (typeId: number) => {
    setEditProductTypeIds(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId) 
        : [...prev, typeId]
    );
  };

  const filteredAttributes = attributes.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Tag className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              Attributes
              {isRefreshing && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground font-medium">Manage characteristics and their global catalog mapping.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-xl shadow-primary/20 px-6 h-12 text-md font-bold transition-all active:scale-95">
              <Plus className="w-5 h-5" />
              New Attribute
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Create Attribute</DialogTitle>
              <DialogDescription className="font-medium">
                Define a new property and link it to a product type.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitAttribute} className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="attr-type-select" className="text-sm font-bold text-slate-700">Target Classification</Label>
                <Select 
                  value={newAttributeProductTypeId} 
                  onValueChange={setNewAttributeProductTypeId}
                >
                  <SelectTrigger id="attr-type-select" className="h-12 bg-slate-50 font-bold border-slate-200">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()} className="font-bold py-3">
                        <div className="flex items-center gap-3">
                          <Settings2 className="w-4 h-4 text-primary" />
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attr-name" className="text-sm font-bold text-slate-700">Attribute Label</Label>
                <Input 
                  id="attr-name" 
                  placeholder="e.g. Color, Size, RAM" 
                  value={newAttributeName}
                  onChange={(e) => setNewAttributeName(e.target.value)}
                  className="h-12 text-md font-medium border-slate-200"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full font-bold h-12 text-md shadow-lg" disabled={isSubmitting || !newAttributeProductTypeId}>
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                  {isSubmitting ? 'Syncing...' : 'Save Attribute'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white/80 backdrop-blur-sm ring-1 ring-slate-100">
        <CardHeader className="bg-slate-50/50 border-b p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search global attributes..." 
                className="pl-10 h-11 bg-white border-slate-200 shadow-sm" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-lg border shadow-sm">
              <Info className="w-4 h-4 text-primary" />
              <span>{filteredAttributes.length} Total Definitions</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-ping" />
                <Loader2 className="h-12 w-12 text-primary relative animate-spin" />
              </div>
              <p className="text-md font-bold text-slate-400 tracking-widest uppercase animate-pulse">Syncing catalog taxonomy...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/50 border-b">
                  <TableHead className="w-[100px] font-black uppercase text-[10px] tracking-widest text-slate-400 pl-8">ID</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-600">Attribute Label</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-600">Defined Values</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-600">Type Mapping</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400 pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttributes.map((attr) => (
                  <TableRow key={attr.id} className="hover:bg-slate-50/50 transition-colors group border-b last:border-0">
                    <TableCell className="font-mono text-xs font-bold text-slate-400 pl-8">#{attr.id}</TableCell>
                    <TableCell>
                      <button 
                        onClick={() => handleViewDetail(attr)}
                        className="flex items-center gap-2 text-left hover:text-primary transition-colors"
                      >
                        <span className="font-extrabold text-slate-700 text-base">{attr.name}</span>
                        <Badge variant="outline" className="text-[9px] font-black uppercase bg-slate-50 text-slate-400 border-slate-200 py-0 h-4">Active</Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5 items-center max-w-xs">
                        {attr.values && attr.values.length > 0 ? (
                          attr.values.map((val) => (
                            <Badge key={val.id} variant="secondary" className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-white text-slate-600 border shadow-sm">
                              {val.value}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic font-medium">No values defined</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {attr.connected_type_names && attr.connected_type_names.length > 0 ? (
                          attr.connected_type_names.map((typeName, idx) => (
                            <Badge key={`${attr.id}-${typeName}-${idx}`} variant="outline" className="px-2.5 py-1 text-[10px] font-black uppercase bg-blue-50/50 text-blue-700 border-blue-100 flex items-center gap-1.5 shadow-sm">
                              <Layers className="w-3.5 h-3.5" />
                              {typeName}
                            </Badge>
                          ))
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-tight bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                            <Info className="w-3 h-3" />
                            Unmapped
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 transition-all rounded-full hover:bg-primary/5 hover:text-primary"
                          onClick={() => handleViewDetail(attr)}
                        >
                          <Eye className="h-6 w-6" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 transition-all rounded-full hover:bg-destructive/5 hover:text-destructive"
                          onClick={() => setAttributeToDelete(attr)}
                          disabled={deletingId === attr.id}
                        >
                          {deletingId === attr.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!isLoading && filteredAttributes.length === 0 && (
            <div className="py-40 text-center flex flex-col items-center justify-center gap-4 bg-slate-50/30">
              <div className="p-6 bg-white rounded-full shadow-inner ring-1 ring-slate-100">
                <Search className="h-12 w-12 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-600">No attributes found</h3>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attribute Detail & Edit Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <Settings2 className="w-7 h-7 text-primary" />
                {isEditingDetail ? 'Edit Attribute' : 'Attribute Intelligence'}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {!isEditingDetail && (
                  <>
                    <Button variant="outline" size="sm" className="font-bold h-9 gap-2" onClick={() => setIsEditingDetail(true)}>
                      <Edit2 className="w-4 h-4" /> Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="font-bold h-9 gap-2 text-destructive hover:bg-destructive/10" 
                      onClick={() => setAttributeToDelete(selectedAttributeForDetail)}
                      disabled={deletingId !== null}
                    >
                      {deletingId !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
            <DialogDescription className="font-medium text-slate-500">
              {isEditingDetail 
                ? 'Modify catalog labels, associated variant options, and type mappings.' 
                : `Comprehensive breakdown for system attribute #${selectedAttributeForDetail?.id}.`}
            </DialogDescription>
          </DialogHeader>

          {isEditingDetail ? (
            <form onSubmit={handlePatchAttribute} className="space-y-6 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Global Label</Label>
                <Input 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-12 text-md font-bold border-slate-200 focus:bg-white"
                  placeholder="e.g. Color"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Option Values (One per line)</Label>
                  <Badge variant="outline" className="text-[10px] font-bold h-5 bg-slate-50">Bulk Editor</Badge>
                </div>
                <Textarea 
                  value={editValuesText} 
                  onChange={(e) => setEditValuesText(e.target.value)}
                  rows={6}
                  className="font-mono text-sm border-slate-200 resize-none focus:bg-white"
                  placeholder="Red\nBlue\nGreen"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Type Mapping Selection</Label>
                <div className="border rounded-xl p-4 bg-slate-50/50">
                  <ScrollArea className="h-[150px] pr-4">
                    <div className="space-y-3">
                      {productTypes.map((type) => (
                        <div key={type.id} className="flex items-center space-x-3 bg-white p-2 rounded-lg border shadow-sm">
                          <Checkbox 
                            id={`edit-type-${type.id}`} 
                            checked={editProductTypeIds.includes(type.id)}
                            onCheckedChange={() => toggleTypeSelection(type.id)}
                          />
                          <Label 
                            htmlFor={`edit-type-${type.id}`}
                            className="text-sm font-bold flex items-center gap-2 cursor-pointer flex-1"
                          >
                            <Layers className="w-3.5 h-3.5 text-primary" />
                            {type.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  <strong>Critical Update Notice:</strong> Saving these changes will replace the entire set of values and type mappings. Existing mappings cannot be removed if used by active products.
                </p>
              </div>

              <DialogFooter className="gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsEditingDetail(false)} className="font-bold">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 font-bold h-12 text-md shadow-xl" disabled={isPatching}>
                  {isPatching ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                  {isPatching ? 'Synchronizing...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-8 py-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Label</span>
                  <p className="text-lg font-black text-slate-800">{selectedAttributeForDetail?.name}</p>
                </div>
                <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">System Reference</span>
                  <p className="text-lg font-mono font-bold text-primary">#{selectedAttributeForDetail?.id}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Selectable Variant Values</h4>
                  <Badge className="font-bold bg-primary/5 text-primary border-primary/10">
                    {selectedAttributeForDetail?.values?.length || 0} Defined
                  </Badge>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-inner flex flex-wrap gap-2 min-h-[100px] items-start">
                  {selectedAttributeForDetail?.values && selectedAttributeForDetail.values.length > 0 ? (
                    selectedAttributeForDetail.values.map(val => (
                      <Badge key={val.id} variant="secondary" className="px-3 py-1.5 text-xs font-bold uppercase bg-slate-100 text-slate-700 hover:bg-primary hover:text-white transition-colors cursor-default">
                        {val.value}
                      </Badge>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 gap-2">
                      <Tag className="w-8 h-8 opacity-20" />
                      <p className="text-xs font-bold italic">No variants defined for this attribute.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Associated Classifications</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAttributeForDetail?.connected_type_names && selectedAttributeForDetail.connected_type_names.length > 0 ? (
                    selectedAttributeForDetail.connected_type_names.map(typeName => (
                      <Badge key={typeName} className="px-4 py-2 text-[10px] font-black uppercase bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-2 shadow-sm">
                        <Layers className="w-3.5 h-3.5" />
                        {typeName}
                      </Badge>
                    ))
                  ) : (
                    <div className="px-4 py-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 flex items-center gap-3 w-full">
                      <Info className="w-5 h-5" />
                      <p className="text-xs font-bold">Unmapped. This attribute is not yet linked to any product classifications.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!attributeToDelete} onOpenChange={(open) => !open && setAttributeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-600">
              Are you sure you want to permanently delete the attribute <strong>"{attributeToDelete?.name}"</strong>? This action cannot be undone and may affect active inventory mapping.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold px-6"
            >
              {deletingId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
