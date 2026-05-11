import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { Product, Meal, Finance, FinanceType, FinanceStatus, MarketItem, Market } from '../../types';
import { INGREDIENT_RATIOS, MARKET_CATALOG, MARKET_LIST } from '../../lib/constants';
import { Plus, Trash2, Package, AlertCircle, ShoppingCart, Pencil, Check, X as CloseIcon, LayoutGrid, Store, Save, ArrowRight, ListChecks, Search, RefreshCw, ChevronDown, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORY_ORDER = [
  'Mercearia',
  'Proteínas',
  'Padaria / Laticínios',
  'Hortifruti',
  'Matinais / Bebidas',
  'Higiene / Limpeza',
  'Pets',
  'Outros'
];

export function PantryView() {
  const { data: products, add, remove, update } = useFirestore<Product>('products');
  const { data: meals } = useFirestore<Meal>('meals');
  const { add: addFinance } = useFirestore<Finance>('finances');
  const { data: marketItems, add: addMarketItem, remove: removeMarketItem, update: updateMarketItem } = useFirestore<MarketItem>('market_items');
  
  const { data: componentsMarkets, add: addMarket } = useFirestore<Market>('/markets');
  const { data: publicCatalog, add: addToPublicCatalog, update: updatePublicCatalog } = useFirestore<any>('/public_catalog');
  
  const allMarkets = useMemo(() => {
    const fromFirestore = componentsMarkets.map(m => m.name);
    // Include static defaults + unique from firestore
    const merged = Array.from(new Set([...MARKET_LIST, ...fromFirestore]));
    return merged;
  }, [componentsMarkets]);

  // Merge static catalog with cloud catalog for suggestions
  const fullCatalogMap = useMemo(() => {
    const map = new Map<string, any>();
    // Start with static
    MARKET_CATALOG.forEach(item => map.set(item.name.toLowerCase(), { ...item, source: 'static' }));
    // Update with cloud (truth source)
    publicCatalog.forEach(item => map.set(item.name.toLowerCase(), { ...item, source: 'cloud' }));
    return map;
  }, [publicCatalog]);

  const [viewMode, setViewMode] = useState<'catalog' | 'market'>('catalog');
  const [selectedMarket, setSelectedMarket] = useState('Carrefour');
  const [isAddingMarket, setIsAddingMarket] = useState(false);
  const [newMarketName, setNewMarketName] = useState('');

  const [marketCategoryFilter, setMarketCategoryFilter] = useState('Todos');
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    name: '',
    quantity: '',
    minStock: '',
    category: 'Mercearia',
    unit: 'un',
    price: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState({
    name: '',
    price: 0,
    category: '',
    unit: '',
    quantity: 0,
    minStock: 0
  });

  const startEditing = (p: Product) => {
    setEditingId(p.id);
    setEditingForm({
      name: p.name,
      price: p.price,
      category: p.category,
      unit: p.unit,
      quantity: p.quantity,
      minStock: p.minStock || 0
    });
  };

  const saveEdit = async () => {
    if (editingId) {
      await update(editingId, {
        name: editingForm.name,
        price: editingForm.price,
        category: editingForm.category,
        unit: editingForm.unit,
        quantity: editingForm.quantity,
        minStock: editingForm.minStock
      });
      setEditingId(null);
    }
  };

  const recommendedQuantities = useMemo(() => {
    const totals: Record<string, number> = {};
    const units: Record<string, string> = {};

    meals.forEach(meal => {
      const people = meal.peopleCount || 3;
      
      // Use structured ingredients if available, otherwise fallback to simple ingredients + constants
      if (meal.structuredIngredients && meal.structuredIngredients.length > 0) {
        meal.structuredIngredients.forEach(ing => {
          if (ing.amountPerPerson > 0) {
            totals[ing.name] = (totals[ing.name] || 0) + (ing.amountPerPerson * people);
            units[ing.name] = ing.unit;
          }
        });
      } else {
        meal.ingredients.forEach(ingredient => {
          const foundKey = Object.keys(INGREDIENT_RATIOS).find(key => 
            ingredient.toLowerCase().includes(key.toLowerCase()) || 
            key.toLowerCase().includes(ingredient.toLowerCase())
          );

          if (foundKey) {
            const ratio = INGREDIENT_RATIOS[foundKey];
            totals[foundKey] = (totals[foundKey] || 0) + (ratio.amount * people);
            units[foundKey] = ratio.unit;
          }
        });
      }
    });

    return Object.fromEntries(
      Object.entries(totals).map(([name, total]) => [name, `${total.toFixed(1)} ${units[name]}`])
    );
  }, [meals]);

  const sortedCategories = useMemo(() => {
    const existingCategories: string[] = Array.from(new Set(products.map((p: Product) => p.category)));
    const ordered = CATEGORY_ORDER.filter(cat => existingCategories.includes(cat));
    const remaining = existingCategories.filter(cat => !CATEGORY_ORDER.includes(cat));
    return [...ordered, ...remaining];
  }, [products]);

  const lowStockItems = products.filter(p => p.quantity <= (p.minStock || 0));
  const totalFeira = products.reduce((acc, p) => acc + (p.price * p.quantity), 0);

  const filteredMarketItems = useMemo(() => {
    if (marketCategoryFilter === 'Todos') return marketItems;
    const catProducts = products.filter(p => p.category === marketCategoryFilter);
    const productIds = catProducts.map(p => p.id);
    return marketItems.filter(item => productIds.includes(item.productId));
  }, [marketItems, marketCategoryFilter, products]);

  const marketCategories = useMemo(() => {
    const categoriesInMarket = new Set<string>();
    marketItems.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      if (p) categoriesInMarket.add(p.category);
    });
    return ['Todos', ...Array.from(categoriesInMarket)];
  }, [marketItems, products]);

  const initializeMarketMode = async () => {
    // Check for minStock deficits not yet in marketItems
    for (const p of products) {
      if (p.quantity <= (p.minStock || 0)) {
        const existing = marketItems.find(mi => mi.productId === p.id);
        if (!existing) {
          await addMarketItem({
            productId: p.id,
            name: p.name,
            quantity: Math.max(1, (p.minStock || 0) - p.quantity),
            unit: p.unit,
            price: p.price,
            addedAt: new Date().toISOString()
          });
        }
      }
    }
    setViewMode('market');
  };

  const addToMarket = async (p: Product) => {
    if (marketItems.find(item => item.productId === p.id)) {
      showToast('Item já está na lista de feira!', 'error');
      return;
    }
    await addMarketItem({
      productId: p.id,
      name: p.name,
      quantity: 1,
      unit: p.unit,
      price: p.price,
      addedAt: new Date().toISOString()
    });
  };

  const finalizeMarketTrip = async () => {
    if (marketItems.length === 0) return;
    
    setConfirmingAction({
      title: 'Finalizar Feira',
      message: 'Deseja finalizar a feira? Isso atualizará seu estoque e lançará a despesa em Contas.',
      onConfirm: async () => {
        setConfirmingAction(null);
        try {
          let totalCost = 0;
          
          for (const item of marketItems) {
            const original = products.find(p => p.id === item.productId);
            if (original) {
              const newQuantity = original.quantity + (item.quantity || 0);
              totalCost += (item.price || 0) * (item.quantity || 0);
              
              await update(original.id, {
                quantity: newQuantity,
                price: item.price,
                brand: item.brand,
                updatedAt: new Date().toISOString(),
                lastPurchasedAt: new Date().toISOString()
              });

              // COLLABORATIVE SYNC: Update public catalog with the newly discovered price/brand
              const catalogKey = item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
              const cloudItem = publicCatalog.find((c: any) => c.name.toLowerCase() === item.name.toLowerCase());
              
              const priceEntry = {
                price: item.price,
                brand: item.brand,
                updatedAt: new Date().toISOString()
              };

              if (cloudItem) {
                const updatedPrices = { ...(cloudItem.marketPrices || {}), [selectedMarket]: priceEntry };
                // Also update brands list if new
                const updatedBrands = Array.from(new Set([...(cloudItem.brands || []), item.brand].filter(Boolean)));
                await updatePublicCatalog(cloudItem.id, { 
                  marketPrices: updatedPrices,
                  brands: updatedBrands 
                });
              } else {
                // If it was a static item not yet in cloud, or a custom item
                const staticItem = MARKET_CATALOG.find(c => c.name.toLowerCase() === item.name.toLowerCase());
                await addToPublicCatalog({
                  name: item.name,
                  category: original.category,
                  unit: item.unit,
                  brands: item.brand ? [item.brand] : (staticItem?.brands || []),
                  marketPrices: { [selectedMarket]: priceEntry }
                });
              }
            }
            // Remove from market suggestions
            await removeMarketItem(item.id);
          }

          if (totalCost > 0) {
            await addFinance({
              description: `Compra Supermercado (${new Date().toLocaleDateString('pt-BR')})`,
              value: totalCost,
              type: FinanceType.EXTRA,
              status: FinanceStatus.PENDENTE,
              dueDate: new Date().toISOString(),
              ownerId: 'system'
            });
          }

          showToast(`Sucesso! Estoque atualizado e R$ ${totalCost.toFixed(2)} lançado em Finanças.`);
          setViewMode('catalog');
        } catch (error) {
          console.error('Finalize market error:', error);
          showToast('Erro ao finalizar. Tente novamente.', 'error');
        }
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    add({
      name: form.name,
      quantity: parseFloat(form.quantity),
      minStock: parseFloat(form.minStock) || 0,
      category: form.category,
      unit: form.unit,
      price: parseFloat(form.price) || 0
    });
    setIsAdding(false);
    setForm({ name: '', quantity: '', minStock: '', category: 'Mercearia', unit: 'un', price: '' });
  };

  const [isResetting, setIsResetting] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSuggestedList = () => {
    MARKET_CATALOG.forEach(item => {
      // Check if item already exists to avoid duplicates (simplified check by name)
      if (!products.find(p => p.name.toLowerCase() === item.name.toLowerCase())) {
        add({ ...item, quantity: 0 }); // Start with zeroed stock
      }
    });
    showToast('Catálogo completo importado com sucesso (estoque zerado).');
  };

  const resetAllStock = async () => {
    setConfirmingAction({
      title: 'Zerar Estoque',
      message: 'Deseja realmente ZERAR todo o seu estoque atual? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setIsResetting(true);
        setConfirmingAction(null);
        try {
          await Promise.all(products.map(p => update(p.id, { quantity: 0 })));
          showToast('Todo o estoque foi zerado com sucesso!');
        } catch (error) {
          console.error('Reset all stock error:', error);
          showToast('Erro ao zerar o estoque. Verifique sua conexão.', 'error');
        } finally {
          setIsResetting(false);
        }
      }
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto relative">
      {/* Add Market Modal */}
      <AnimatePresence>
        {isAddingMarket && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
             <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingMarket(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Novo Mercado</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nome do Estabelecimento</label>
                  <input 
                    autoFocus
                    placeholder="Ex: Mercadinho do Bairro" 
                    value={newMarketName} 
                    onChange={e => setNewMarketName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (async () => {
                      if (newMarketName) {
                        await addMarket({ name: newMarketName });
                        setSelectedMarket(newMarketName);
                        setIsAddingMarket(false);
                        setNewMarketName('');
                        showToast('Mercado adicionado!');
                      }
                    })()}
                    className="w-full px-5 py-4 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                  />
                </div>
                <div className="flex gap-4 pt-4">
                   <button 
                    onClick={() => setIsAddingMarket(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={async () => {
                      if (newMarketName) {
                        await addMarket({ name: newMarketName });
                        setSelectedMarket(newMarketName);
                        setIsAddingMarket(false);
                        setNewMarketName('');
                        showToast('Mercado adicionado!');
                      }
                    }}
                    className="flex-1 py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-100 transition-all cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={cn(
              "fixed top-0 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 safe-mt",
              toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
            )}
          >
            {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmingAction && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmingAction(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">{confirmingAction.title}</h3>
              <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">{confirmingAction.message}</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setConfirmingAction(null)}
                  className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmingAction.onConfirm}
                  className="flex-1 px-6 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-colors cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* View Switcher & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em]">Inventory Workspace</p>
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
              {viewMode === 'catalog' ? (
                <>Catálogo <span className="text-slate-400">Geral</span></>
              ) : (
                <>Modo <span className="text-emerald-500">Feira</span></>
              )}
            </h2>
          </div>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
          <button 
            onClick={() => setViewMode('catalog')}
            className={cn(
              "px-5 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all",
              viewMode === 'catalog' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <LayoutGrid size={14} />
            Estoque
          </button>
          <button 
            onClick={initializeMarketMode}
            className={cn(
              "px-5 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all",
              viewMode === 'market' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Store size={14} />
            Modo Feira
          </button>
        </div>
      </div>

      {viewMode === 'catalog' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Catalog Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 text-white rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Gestão de Insumos</p>
              <h2 className="text-5xl font-black text-white tracking-tighter mb-8">
                R$ {totalFeira.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h2>
              <div className="flex flex-wrap gap-2">
                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
                   <Package size={14} className="text-emerald-400" />
                   <span className="text-[10px] font-bold uppercase">{products.length} Itens</span>
                </div>
                <button 
                  onClick={() => setIsAdding(!isAdding)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Novo Item
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isAdding && (
                <motion.form 
                  // ... existing form props
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onSubmit={handleSubmit}
                  className="bg-white rounded-[32px] p-8 border border-slate-200 gap-4 shadow-xl flex flex-col"
                >
                   {/* Re-using your form logic but styled better */}
                   <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nome do Produto</label>
                        <input required placeholder="Ex: Arroz Tio João" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="number" step="0.01" placeholder="Preço" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                        <input type="number" step="0.1" placeholder="Qtd" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                      </div>
                      <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold appearance-none">
                         {CATEGORY_ORDER.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95 cursor-pointer transition-all mt-2">
                        Adicionar ao Catálogo
                      </button>
                   </div>
                </motion.form>
              )}
            </AnimatePresence>

            {lowStockItems.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-[32px] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                    <ListChecks size={20} />
                  </div>
                  <h4 className="text-[11px] font-black text-amber-800 uppercase tracking-widest">Déficit de Insumos</h4>
                </div>
                <div className="space-y-3">
                  {lowStockItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between group">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-amber-950">{item.name}</span>
                        <span className="text-[9px] text-amber-600 font-bold uppercase italic">Faltam {(item.minStock || 0) - item.quantity} {item.unit}</span>
                      </div>
                      <button 
                        onClick={() => addToMarket(item)}
                        className="p-2 hover:bg-amber-100 rounded-lg text-amber-600 transition-colors cursor-pointer"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={initializeMarketMode}
                    className="w-full mt-4 bg-amber-600 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-700 transition-colors cursor-pointer"
                  >
                    Iniciar Modo Feira
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Catalog Listing */}
          <div className="lg:col-span-8 space-y-8">
            {sortedCategories.map(cat => {
              const catProducts = products.filter(p => p.category === cat);
              if (catProducts.length === 0) return null;
              return (
                <div key={cat} className="space-y-4">
                  <div className="flex items-center gap-4 px-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{cat}</h3>
                    <div className="h-px bg-slate-200 flex-1" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {catProducts.map(p => (
                      <ProductCard key={p.id} product={p} editingId={editingId} editingForm={editingForm} onEdit={startEditing} onSave={saveEdit} onCancel={() => setEditingId(null)} setEditingForm={setEditingForm} onDelete={remove} onUpdate={update} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Market Mode Interface */
        <div className="space-y-6">
          <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
                    <Store size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Checkout em Tempo Real</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sincronize preços e marcas na hora da compra</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="flex items-center bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-3">Estou no:</span>
                    <select 
                      value={selectedMarket}
                      onChange={(e) => setSelectedMarket(e.target.value)}
                      className="text-xs font-black text-slate-900 bg-transparent border-none outline-none appearance-none cursor-pointer pr-6 relative"
                    >
                      {allMarkets.map(market => (
                        <option key={market} value={market}>{market}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="text-slate-400 -ml-4 pointer-events-none" />
                  </div>
                  <button 
                    onClick={() => setIsAddingMarket(true)}
                    className="flex justify-center items-center gap-2 text-[8px] font-black uppercase text-emerald-600 tracking-widest hover:bg-emerald-50 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus size={10} /> Novo Mercado
                  </button>
                </div>
              </div>
              
              {/* Sticky Total Container */}
              <div className="md:sticky md:top-8 z-10 w-full md:min-w-[320px]">
                <div className="bg-slate-900 text-white p-8 rounded-[38px] shadow-2xl relative overflow-hidden group">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-all duration-700" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total no Carrinho</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-emerald-500">R$</span>
                    <span className="text-5xl font-black tracking-tighter">
                      {marketItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(marketItems.filter(i => i.checked).length / (marketItems.length || 1)) * 100}%` }}
                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      />
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {marketItems.filter(i => i.checked).length} / {marketItems.length} PEGOS
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-8 space-y-6">
              {marketItems.length === 0 ? (
                <div className="py-32 text-center space-y-4">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                     <ShoppingCart size={40} />
                   </div>
                   <p className="text-sm font-bold text-slate-300 uppercase tracking-[0.3em]">Carrinho disponível</p>
                   <button onClick={() => setViewMode('catalog')} className="px-6 py-3 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all cursor-pointer">
                     Adicionar itens do catálogo
                   </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Category Tabs for easier navigation in the cart */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {marketCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setMarketCategoryFilter(cat)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border cursor-pointer",
                          marketCategoryFilter === cat 
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100" 
                            : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {filteredMarketItems.map((item, idx) => {
                      const catalogItem = fullCatalogMap.get(item.name.toLowerCase());
                      
                      // Best price suggestion for this product across all known markets
                      const prices = catalogItem?.marketPrices || {};
                      const bestMarketPrice = Object.entries(prices).reduce((best: any, [m, p]: any) => {
                        if (!best || p.price < best.price) return { market: m, ...p };
                        return best;
                      }, null);

                      const brandSuggestions = catalogItem?.brands || [];
                      
                      return (
                        <motion.div 
                          layout
                          key={item.id} 
                          className={cn(
                            "bg-white border p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all group relative",
                            item.checked ? "border-emerald-100 bg-emerald-50/10 opacity-70" : "border-slate-100"
                          )}
                        >
                          {bestMarketPrice && bestMarketPrice.market !== selectedMarket && !item.checked && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[7px] font-black uppercase px-3 py-1 rounded-full shadow-lg z-10 animate-pulse">
                              Mais barato no {bestMarketPrice.market}: R$ {bestMarketPrice.price.toFixed(2)}
                            </div>
                          )}
                          <div className="flex flex-col md:grid md:grid-cols-12 gap-6 items-center">
                            {/* Checkbox / Product Info */}
                            <div className="md:col-span-4 w-full">
                              <div className="flex items-center gap-4">
                                <button 
                                  onClick={() => updateMarketItem(item.id, { checked: !item.checked })}
                                  className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all border cursor-pointer active:scale-90",
                                    item.checked 
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200" 
                                      : "bg-slate-50 text-slate-300 border-slate-100 hover:border-emerald-300"
                                  )}
                                >
                                  {item.checked ? <Check size={20} /> : <div className="w-4 h-4 border-2 border-slate-200 rounded-sm" />}
                                </button>
                                <div className="min-w-0">
                                  <h4 className={cn("text-base font-black truncate tracking-tight", item.checked ? "text-slate-400 line-through" : "text-slate-900")}>{item.name}</h4>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{item.unit}</p>
                                </div>
                                <button onClick={() => removeMarketItem(item.id)} className="md:hidden ml-auto p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                              </div>
                            </div>

                            {/* Brand Editing */}
                            <div className="md:col-span-3 w-full space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca / Variação</label>
                              <div className="relative group/input">
                                <input 
                                  placeholder="Digite a marca..."
                                  value={item.brand || ''}
                                  onChange={e => updateMarketItem(item.id, { brand: e.target.value, marketName: selectedMarket })}
                                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                />
                                {brandSuggestions.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {brandSuggestions.map(brand => (
                                      <button 
                                        key={brand}
                                        onClick={() => updateMarketItem(item.id, { brand, marketName: selectedMarket })}
                                        className={cn(
                                          "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all cursor-pointer",
                                          item.brand === brand 
                                            ? "bg-emerald-600 border-emerald-600 text-white" 
                                            : "bg-white border-slate-200 text-slate-400 hover:border-emerald-500 hover:text-emerald-500"
                                        )}
                                      >
                                        {brand}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Dynamic Price */}
                            <div className="md:col-span-2 w-full space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Un.</label>
                              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl group-focus-within:ring-2 group-focus-within:ring-emerald-500 transition-all">
                                <span className="text-xs font-black text-slate-400">R$</span>
                                <input 
                                  type="number"
                                  step="0.01"
                                  value={item.price}
                                  onChange={e => updateMarketItem(item.id, { price: parseFloat(e.target.value) || 0, marketName: selectedMarket })}
                                  className="w-full bg-transparent text-sm font-black text-slate-900 outline-none"
                                />
                              </div>
                            </div>

                            {/* Quantity Controls */}
                            <div className="md:col-span-2 w-full space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">Qtd</label>
                              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-1.5 rounded-2xl">
                                <button onClick={() => updateMarketItem(item.id, { quantity: Math.max(0.1, (item.quantity || 0) - 1) })} className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer active:scale-90">-</button>
                                <input 
                                   type="number"
                                   step="0.1"
                                   value={item.quantity}
                                   onChange={e => updateMarketItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                                   className="w-12 bg-transparent text-center text-sm font-black text-slate-900 outline-none"
                                 />
                                <button onClick={() => updateMarketItem(item.id, { quantity: (item.quantity || 0) + 1 })} className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer active:scale-90">+</button>
                              </div>
                            </div>

                            {/* Actions & Subtotal */}
                            <div className="md:col-span-1 hidden md:flex flex-col items-end gap-2">
                               <button onClick={() => removeMarketItem(item.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors cursor-pointer active:scale-90"><Trash2 size={16} /></button>
                               <div className="text-right">
                                 <span className="text-[10px] font-black text-emerald-600 block">Subtotal</span>
                                 <span className="text-sm font-black text-slate-900">
                                   R$ {((item.price || 0) * (item.quantity || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                 </span>
                               </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-900 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
              <button 
                onClick={() => {
                  setConfirmingAction({
                    title: 'Sair do Modo Feira',
                    message: 'Tem certeza que deseja sair? Os itens no carrinho não serão perdidos, mas você voltará para o catálogo.',
                    onConfirm: () => {
                      setConfirmingAction(null);
                      setViewMode('catalog');
                    }
                  });
                }} 
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
              >
                <CloseIcon size={14} /> Suspender Feira
              </button>
              
              <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                <div className="text-right hidden md:block">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total a Lançar</p>
                  <p className="text-xl font-black text-emerald-500 leading-none">
                    R$ {marketItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <button 
                  disabled={marketItems.length === 0}
                  onClick={finalizeMarketTrip}
                  className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-12 py-5 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-900/20 flex items-center justify-center gap-4 transition-all active:scale-95 cursor-pointer"
                >
                  Confirmar Compra no {selectedMarket}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50/50 border border-slate-100 rounded-[32px] p-6 flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
               <Filter size={18} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
              Dica: Você pode trocar a marca e o preço dos produtos direto nos cartões acima. O sistema guardará o último preço pago em cada mercado.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Extracted Sub-component for Catalog Card to keep code clean
function ProductCard({ product, editingId, editingForm, onEdit, onSave, onCancel, setEditingForm, onDelete, onUpdate }: any) {
  const p = product;
  const isEditing = editingId === p.id;

  if (isEditing) {
    return (
      <div className="bg-white p-5 rounded-[28px] border-2 border-emerald-500 shadow-xl flex flex-col gap-3">
         <div className="grid grid-cols-2 gap-2">
            <input value={editingForm.name} onChange={e => setEditingForm({...editingForm, name: e.target.value})} className="col-span-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" />
            <input type="number" step="0.01" value={editingForm.price} onChange={e => setEditingForm({...editingForm, price: parseFloat(e.target.value) || 0})} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" />
            <input type="number" step="0.1" value={editingForm.quantity} onChange={e => setEditingForm({...editingForm, quantity: parseFloat(e.target.value) || 0})} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" />
         </div>
         <div className="flex gap-2">
            <button onClick={onSave} className="flex-1 bg-emerald-600 text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest">Salvar</button>
            <button onClick={onCancel} className="px-4 bg-slate-100 text-slate-400 text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest">X</button>
         </div>
      </div>
    );
  }

  const isLowStock = p.quantity <= (p.minStock || 0);

  return (
    <motion.div layout className={cn("p-6 rounded-[28px] border transition-all flex flex-col justify-between group h-full", isLowStock ? "bg-amber-50/50 border-amber-100" : "bg-white border-slate-100 shadow-sm hover:shadow-md")}>
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border", isLowStock ? "bg-white text-amber-500 border-amber-200" : "bg-slate-50 text-slate-400 border-slate-100")}>
            <Package size={22} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-slate-900 truncate tracking-tight">{p.name}</h4>
            <p className="text-[10px] font-black text-emerald-600 italic mt-1 tracking-widest uppercase">
              R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-slate-300 font-bold">/ {p.unit}</span>
            </p>
          </div>
        </div>
        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(p)} className="p-2 text-slate-300 hover:text-slate-600 cursor-pointer"><Pencil size={14}/></button>
          <button onClick={() => onDelete(p.id)} className="p-2 text-slate-300 hover:text-red-500 cursor-pointer"><Trash2 size={14}/></button>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <div className="flex justify-between items-end">
          <div className="space-y-0.5">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Estoque Atual</span>
            <div className="text-lg font-black text-slate-900 leading-none">
              {p.quantity}{p.unit}
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => onUpdate(p.id, { quantity: Math.max(0, p.quantity - 1) })} className="w-8 h-8 bg-slate-50 text-slate-800 rounded-lg flex items-center justify-center font-black cursor-pointer hover:bg-slate-100 transition-colors">-</button>
            <button onClick={() => onUpdate(p.id, { quantity: p.quantity + 1 })} className="w-8 h-8 bg-slate-50 text-slate-800 rounded-lg flex items-center justify-center font-black cursor-pointer hover:bg-slate-100 transition-colors">+</button>
          </div>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={cn("h-full transition-all duration-700", isLowStock ? "bg-amber-400" : "bg-emerald-500")} style={{ width: `${Math.min((p.quantity / (p.minStock || 10)) * 100, 100)}%` }} />
        </div>
      </div>
    </motion.div>
  );
}
