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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Search, 
  HelpCircle, 
  Edit2, 
  Trash2, 
  Loader2, 
  Save, 
  X, 
  AlertCircle,
  GripVertical,
  CheckCircle2,
  XCircle,
  MoreVertical
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS } from '@/lib/api-config';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Faq {
  id: number;
  question: string;
  answer: string;
  is_active: boolean;
  position: number;
}

export default function FaqManagementPage() {
  const { toast } = useToast();
  
  // Data State
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [position, setPosition] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [faqToDelete, setFaqToDelete] = useState<Faq | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFaqs = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.FAQS_ADMIN, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('FAQ registry synchronization failed.');
      const data = await response.json();
      // Documentation implies list but defensively check array
      setFaqs(Array.isArray(data) ? data : (data.results || []));
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Sync Error',
        description: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const handleOpenDialog = (faq?: Faq) => {
    if (faq) {
      setEditingFaq(faq);
      setQuestion(faq.question);
      setAnswer(faq.answer);
      setIsActive(faq.is_active);
      setPosition(faq.position.toString());
    } else {
      setEditingFaq(null);
      setQuestion("");
      setAnswer("");
      setIsActive(true);
      setPosition((faqs.length + 1).toString());
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFaq(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !answer) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const payload = {
        question,
        answer,
        is_active: isActive,
        position: parseInt(position) || 0
      };

      const url = editingFaq 
        ? API_ENDPOINTS.FAQ_DETAIL_ADMIN(editingFaq.id)
        : API_ENDPOINTS.FAQS_ADMIN;
      
      const method = editingFaq ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('FAQ ingestion failed.');

      toast({
        title: editingFaq ? 'FAQ Updated' : 'FAQ Created',
        description: `Knowledge base entry has been synchronized.`,
      });

      handleCloseDialog();
      fetchFaqs();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!faqToDelete) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.FAQ_DETAIL_ADMIN(faqToDelete.id), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('FAQ purge failed.');

      toast({
        title: 'FAQ Removed',
        description: 'Entry has been permanently removed from the knowledge base.',
      });

      setFaqToDelete(null);
      fetchFaqs();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err.message
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredFaqs = faqs.filter(f => 
    f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Knowledge Base</h1>
            <p className="text-muted-foreground font-medium">Manage frequently asked questions and support triage.</p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2 shadow-xl shadow-primary/20 font-black h-12 px-8 text-md">
          <Plus className="w-5 h-5" />
          New FAQ
        </Button>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white ring-1 ring-slate-100">
        <CardHeader className="bg-slate-50/50 border-b p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search knowledge base..." 
              className="pl-11 h-12 bg-white border-slate-200 shadow-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-ping" />
                <Loader2 className="h-12 w-12 text-primary relative animate-spin" />
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing FAQ Stream...</p>
            </div>
          ) : faqs.length === 0 ? (
            <div className="py-40 text-center flex flex-col items-center justify-center gap-4 bg-slate-50/20">
              <div className="p-6 bg-white rounded-full shadow-inner ring-1 ring-slate-100">
                <HelpCircle className="h-12 w-12 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-slate-600">Knowledge base is empty</h3>
              <p className="text-sm text-slate-400 font-medium">Create your first FAQ to assist customers during checkout.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b">
                  <TableHead className="w-[80px] font-black uppercase text-[10px] tracking-widest pl-8 text-center">Pos</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Question & Context</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Visibility</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFaqs.map((faq) => (
                  <TableRow key={faq.id} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0">
                    <TableCell className="pl-8 text-center">
                      <span className="font-mono font-black text-slate-400">#{faq.position}</span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 py-4 max-w-2xl">
                        <p className="font-black text-slate-800 text-base">{faq.question}</p>
                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{faq.answer}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {faq.is_active ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-black text-[10px] uppercase px-3 py-1">
                          <CheckCircle2 className="w-3 h-3 mr-1.5" /> Published
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-400 border-slate-200 font-black text-[10px] uppercase px-3 py-1">
                          <XCircle className="w-3 h-3 mr-1.5" /> Draft
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-slate-300 hover:text-primary transition-all"
                          onClick={() => handleOpenDialog(faq)}
                        >
                          <Edit2 className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-slate-300 hover:text-destructive transition-all"
                          onClick={() => setFaqToDelete(faq)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-primary" />
              {editingFaq ? 'Edit FAQ Entry' : 'New FAQ Entry'}
            </DialogTitle>
            <DialogDescription className="font-medium">
              Maintain support resources to improve customer conversion.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="question" className="text-sm font-bold text-slate-700">Question *</Label>
              <Input 
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What is your return policy?"
                className="h-12 font-bold border-slate-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer" className="text-sm font-bold text-slate-700">Detailed Answer *</Label>
              <Textarea 
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Provide a clear, helpful response..."
                rows={6}
                className="border-slate-200 font-medium leading-relaxed"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="position" className="text-sm font-bold text-slate-700">Display Order</Label>
                <Input 
                  id="position"
                  type="number"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="h-12 font-black border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Visibility Status</Label>
                <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/50">
                  <span className="text-xs font-black uppercase text-slate-400">Live in Hub</span>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3">
              <Button type="button" variant="ghost" onClick={handleCloseDialog} className="font-bold h-12">Cancel</Button>
              <Button type="submit" className="flex-1 h-12 font-black shadow-xl" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                Sync with Hub
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!faqToDelete} onOpenChange={(open) => !open && setFaqToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive font-black text-2xl">
              <AlertCircle className="w-6 h-6" />
              Purge FAQ Entry
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 font-medium text-base leading-relaxed">
              Are you sure you want to permanently delete this question? This will immediately remove it from the public support hub.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-xl font-bold h-12 border-slate-200">Keep Entry</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold h-12 px-8 shadow-lg shadow-destructive/20"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Trash2 className="w-5 h-5 mr-2" />}
              Confirm Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
