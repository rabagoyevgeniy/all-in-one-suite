import { useState } from 'react';
import { motion } from 'framer-motion';
import { Store, Plus, Edit2, Trash2, Loader2, Package, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/EmptyState';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const STORE_TYPES = [
  { value: 'student', label: 'Student Shop' },
  { value: 'coach', label: 'Coach Shop' },
  { value: 'parent', label: 'Parent Shop' },
  { value: 'pro', label: 'Pro Athlete Shop' },
];

const CATEGORIES = [
  'gear', 'merch', 'reward', 'premium', 'digital', 'discount', 'status', 'experience',
];

const defaultItem = {
  name: '',
  description: '',
  price_coins: 100,
  price_aed: 0,
  category: 'gear',
  store_type: 'student',
  is_active: true,
  is_limited: false,
  stock_count: null as number | null,
  max_per_user_per_period: null as number | null,
  sort_order: 0,
  image_url: '',
};

export default function AdminShop() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultItem);
  const [search, setSearch] = useState('');
  const [activeStore, setActiveStore] = useState('student');

  const { data: items, isLoading } = useQuery({
    queryKey: ['admin-shop-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_items')
        .select('*')
        .order('store_type')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Name is required');
      if (form.price_coins <= 0) throw new Error('Price must be > 0');

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price_coins: form.price_coins,
        price_aed: form.price_aed || null,
        category: form.category,
        store_type: form.store_type,
        is_active: form.is_active,
        is_limited: form.is_limited,
        stock_count: form.is_limited ? form.stock_count : null,
        max_per_user_per_period: form.max_per_user_per_period || null,
        sort_order: form.sort_order,
        image_url: form.image_url || null,
      };

      if (editingId) {
        const { error } = await supabase.from('store_items').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('store_items').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shop-items'] });
      toast({ title: editingId ? 'Item updated ✅' : 'Item created ✅' });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('store_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shop-items'] });
      toast({ title: 'Item deleted' });
    },
  });

  const resetForm = () => {
    setForm(defaultItem);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (item: any) => {
    setForm({
      name: item.name,
      description: item.description || '',
      price_coins: item.price_coins || 100,
      price_aed: item.price_aed || 0,
      category: item.category || 'gear',
      store_type: item.store_type || 'student',
      is_active: item.is_active ?? true,
      is_limited: item.is_limited ?? false,
      stock_count: item.stock_count,
      max_per_user_per_period: item.max_per_user_per_period,
      sort_order: item.sort_order || 0,
      image_url: item.image_url || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const filteredItems = (items || []).filter((item: any) => {
    const matchesStore = item.store_type === activeStore;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchesStore && matchesSearch;
  });

  const itemCounts = STORE_TYPES.map(st => ({
    ...st,
    count: (items || []).filter((i: any) => i.store_type === st.value).length,
  }));

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      <PageHeader title="Shop Management" subtitle="Manage store items for all roles">
        <Button size="sm" className="rounded-xl gap-1" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={16} /> Add Item
        </Button>
      </PageHeader>

      {/* Store type tabs */}
      <Tabs value={activeStore} onValueChange={setActiveStore}>
        <TabsList className="w-full flex gap-0.5 bg-muted/50 rounded-xl p-1 no-scrollbar overflow-x-auto">
          {itemCounts.map(st => (
            <TabsTrigger key={st.value} value={st.value} className="text-[11px] flex-shrink-0 px-2 py-1">
              {st.label} ({st.count})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search items..."
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Items list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.map((item: any, i: number) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                  {item.image_url && item.image_url.startsWith('http') ? (
                    <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    '🛍️'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                    {!item.is_active && <Badge variant="outline" className="text-[9px]">Inactive</Badge>}
                    {item.is_limited && <Badge variant="outline" className="text-[9px] border-warning text-warning">Limited ({item.stock_count})</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{item.description || 'No description'}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-bold text-coin">{item.price_coins} 🪙</span>
                    {item.price_aed > 0 && <span className="text-xs text-muted-foreground">{item.price_aed} AED</span>}
                    <Badge variant="outline" className="text-[9px] capitalize">{item.category}</Badge>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <Edit2 size={14} className="text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this item?')) deleteMutation.mutate(item.id); }}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title={`No items in ${STORE_TYPES.find(s => s.value === activeStore)?.label || 'shop'}`}
          description="Add your first item to this store"
          actionLabel="Add Item"
          onAction={() => { resetForm(); setForm(f => ({ ...f, store_type: activeStore })); setShowForm(true); }}
        />
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) resetForm(); }}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? 'Edit Item' : 'New Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl mt-1" placeholder="ProFit Training Cap" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl mt-1" rows={2} placeholder="Premium swim cap with ProFit logo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Price (Coins) *</Label>
                <Input type="number" min={1} value={form.price_coins} onChange={e => setForm(f => ({ ...f, price_coins: Number(e.target.value) }))} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-xs">Price (AED)</Label>
                <Input type="number" min={0} value={form.price_aed} onChange={e => setForm(f => ({ ...f, price_aed: Number(e.target.value) }))} className="rounded-xl mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Store</Label>
                <Select value={form.store_type} onValueChange={v => setForm(f => ({ ...f, store_type: v }))}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STORE_TYPES.map(st => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Image URL</Label>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} className="rounded-xl mt-1" placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-xs">Max per User</Label>
                <Input type="number" min={0} value={form.max_per_user_per_period || ''} onChange={e => setForm(f => ({ ...f, max_per_user_per_period: Number(e.target.value) || null }))} className="rounded-xl mt-1" placeholder="Unlimited" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Active</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Limited Stock</Label>
              <Switch checked={form.is_limited} onCheckedChange={v => setForm(f => ({ ...f, is_limited: v }))} />
            </div>
            {form.is_limited && (
              <div>
                <Label className="text-xs">Stock Count</Label>
                <Input type="number" min={0} value={form.stock_count || ''} onChange={e => setForm(f => ({ ...f, stock_count: Number(e.target.value) }))} className="rounded-xl mt-1" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm} className="rounded-xl">Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="rounded-xl">
              {saveMutation.isPending && <Loader2 className="animate-spin mr-2" size={14} />}
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
