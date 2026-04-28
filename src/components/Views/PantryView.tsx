import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { Product, Meal, Finance, FinanceType, FinanceStatus, MarketItem } from '../../types';
import { INGREDIENT_RATIOS } from '../../lib/constants';
import { Plus, Trash2, Package, AlertCircle, ShoppingCart, Pencil, Check, X as CloseIcon, LayoutGrid, Store, Save, ArrowRight, ListChecks, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORY_ORDER = [
  'Mercearia',
  'Proteínas',
  'Laticínios',
  'Hortifruti',
  'Padaria',
  'Higiene/Limpeza',
  'Pets',
  'Outros'
];

export function PantryView() {
  const { data: products, add, remove, update } = useFirestore<Product>('products');
  const { data: meals } = useFirestore<Meal>('meals');
  const { add: addFinance } = useFirestore<Finance>('finances');
  const { data: marketItems, add: addMarketItem, remove: removeMarketItem, update: updateMarketItem } = useFirestore<MarketItem>('market_items');
  
  const [viewMode, setViewMode] = useState<'catalog' | 'market'>('catalog');
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
      alert('Item já está na lista de feira!');
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
    
    const confirm = window.confirm(`Deseja finalizar a feira? Isso atualizará seu estoque e lançará a despesa em Contas.`);
    if (!confirm) return;

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

      alert(`Sucesso! Estoque atualizado e R$ ${totalCost.toFixed(2)} lançado em Finanças.`);
      setViewMode('catalog');
    } catch (error) {
      console.error('Finalize market error:', error);
      alert('Erro ao finalizar. Tente novamente.');
    }
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

  const loadSuggestedList = () => {
    const suggested = [
      // Mercearia
      { name: 'Arroz', quantity: 5, unit: 'pct', price: 4, category: 'Mercearia' },
      { name: 'Cuscuz', quantity: 8, unit: 'pct', price: 1.7, category: 'Mercearia' },
      { name: 'Macarrão', quantity: 4, unit: 'pct', price: 2.5, category: 'Mercearia' },
      { name: 'Óleo', quantity: 2, unit: 'garrafa', price: 9, category: 'Mercearia' },
      { name: 'Tapioca', quantity: 4, unit: 'pct', price: 6, category: 'Mercearia' },
      { name: 'Molho de Tomate', quantity: 8, unit: 'un', price: 2, category: 'Mercearia' },
      { name: 'Sal', quantity: 1, unit: 'pct', price: 1.2, category: 'Mercearia' },
      { name: 'Açúcar', quantity: 2, unit: 'pct', price: 2.5, category: 'Mercearia' },
      { name: 'CreamCracker', quantity: 6, unit: 'pct', price: 4.5, category: 'Mercearia' },
      { name: 'Creme de Leite', quantity: 8, unit: 'caixa', price: 3, category: 'Mercearia' },
      { name: 'Margarina', quantity: 2, unit: 'Kg', price: 10, category: 'Mercearia' },
      { name: 'Café', quantity: 2, unit: 'pct', price: 14, category: 'Mercearia' },
      { name: 'Milho e Ervilha', quantity: 2, unit: 'lata', price: 5, category: 'Mercearia' },
      { name: 'Goiabada', quantity: 1, unit: 'un', price: 8, category: 'Mercearia' },
      { name: 'Bananada', quantity: 1, unit: 'un', price: 7, category: 'Mercearia' },
      
      // Proteínas
      { name: 'Fígado', quantity: 3, unit: 'Kg', price: 15, category: 'Proteínas' },
      { name: 'Frango', quantity: 5, unit: 'Kg', price: 14, category: 'Proteínas' },
      { name: 'Carne Moída', quantity: 2, unit: 'Kg', price: 16, category: 'Proteínas' },
      { name: 'Ovo', quantity: 40, unit: 'un', price: 0.3, category: 'Proteínas' },
      { name: 'Calabresa', quantity: 3, unit: 'pct', price: 10, category: 'Proteínas' },
      { name: 'Bisteca', quantity: 2, unit: 'Kg', price: 16, category: 'Proteínas' },
      { name: 'Mortadela Defumada', quantity: 500, unit: 'g', price: 0.03, category: 'Proteínas' },
      { name: 'Queijo Mussarela', quantity: 300, unit: 'g', price: 0.066, category: 'Proteínas' },
      
      // Laticínios
      { name: 'Leite', quantity: 8, unit: 'Litro', price: 5, category: 'Laticínios' },
      
      // Padaria
      { name: 'Pão Francês', quantity: 20, unit: 'un', price: 0.75, category: 'Padaria' },
      
      // Higiene/Limpeza
      { name: 'Sabonete', quantity: 6, unit: 'un', price: 2, category: 'Higiene/Limpeza' },
      { name: 'Detergente', quantity: 8, unit: 'un', price: 2, category: 'Higiene/Limpeza' },
      { name: 'Sabão Líquido', quantity: 2, unit: 'un', price: 16, category: 'Higiene/Limpeza' },
      { name: 'Cloro', quantity: 4, unit: 'un', price: 2, category: 'Higiene/Limpeza' },
      { name: 'Papel Higiênico', quantity: 1, unit: 'pct', price: 18, category: 'Higiene/Limpeza' },
      { name: 'Pasta de Dente', quantity: 2, unit: 'un', price: 4, category: 'Higiene/Limpeza' },
      { name: 'Esponja de Louça', quantity: 6, unit: 'un', price: 2, category: 'Higiene/Limpeza' },
      { name: 'Lã de Alumínio', quantity: 2, unit: 'un', price: 4, category: 'Higiene/Limpeza' },
      { name: 'Desinfetante', quantity: 2, unit: 'un', price: 8, category: 'Higiene/Limpeza' },
      { name: 'Shampoo/Cond/Deso', quantity: 1, unit: 'kit', price: 40, category: 'Higiene/Limpeza' },
      
      // Pets
      { name: 'Ração Gato', quantity: 2, unit: 'Kg', price: 18, category: 'Pets' },
      { name: 'Ração Cachorra', quantity: 3, unit: 'Kg', price: 12, category: 'Pets' },
      
      // Hortifruti
      { name: 'Mix Vegetais/Frutas', quantity: 1, unit: 'Semanal', price: 100, category: 'Hortifruti' },
    ];

    suggested.forEach(item => {
      // Check if item already exists to avoid duplicates (simplified check by name)
      if (!products.find(p => p.name.toLowerCase() === item.name.toLowerCase())) {
        add({ ...item, minStock: 0 });
      }
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-1 md:px-0">
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
        
        <div className="flex bg-white p-1.5 rounded-[20px] border border-slate-200 shadow-sm self-start">
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
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Patrimônio em Alimentos</p>
              <h2 className="text-5xl font-black text-white tracking-tighter mb-8">
                R$ {totalFeira.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h2>
              <div className="flex flex-wrap gap-3">
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
        <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Store size={24} className="text-emerald-600" />
                Carrinho em Tempo Real
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-1">Edite preços e marcas conforme coloca os itens no carrinho físico.</p>
            </div>
            
            <div className="bg-emerald-600 text-white p-6 rounded-[28px] min-w-[240px] shadow-xl shadow-emerald-100 relative overflow-hidden group">
               <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
               <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">Total Previsto</p>
               <div className="flex items-baseline gap-2">
                 <span className="text-xs font-bold text-emerald-200">R$</span>
                 <span className="text-3xl font-black">
                   {marketItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </span>
               </div>
            </div>
          </div>

          <div className="p-4 md:p-8 space-y-4">
            {marketItems.length === 0 ? (
              <div className="py-20 text-center">
                 <ShoppingCart size={48} className="mx-auto text-slate-100 mb-4" />
                 <p className="text-sm font-bold text-slate-300 uppercase tracking-[0.2em]">Seu carrinho está vazio</p>
                 <button onClick={() => setViewMode('catalog')} className="mt-4 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:underline cursor-pointer">Voltar ao Catálogo</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                      <th className="px-6 py-2">Produto</th>
                      <th className="px-6 py-2">Marca/Detalhe</th>
                      <th className="px-6 py-2">Preço Un.</th>
                      <th className="px-6 py-2">Quantidade</th>
                      <th className="px-6 py-2">Subtotal</th>
                      <th className="px-6 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketItems.map((item, idx) => (
                      <tr key={item.id || idx} className="bg-slate-50/50 hover:bg-slate-50 transition-colors overflow-hidden group">
                        <td className="px-6 py-4 rounded-l-2xl">
                          <span className="text-sm font-black text-slate-900">{item.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            placeholder="Marca ou tipo..."
                            value={item.brand || ''}
                            onChange={e => updateMarketItem(item.id, { brand: e.target.value })}
                            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-slate-400">R$</span>
                             <input 
                               type="number"
                               step="0.01"
                               value={item.price}
                               onChange={e => updateMarketItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                               className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500 w-24"
                             />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button onClick={() => updateMarketItem(item.id, { quantity: Math.max(0.1, (item.quantity || 0) - 1) })} className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-black text-slate-400 hover:text-slate-900 cursor-pointer">-</button>
                            <input 
                               type="number"
                               step="0.1"
                               value={item.quantity}
                               onChange={e => updateMarketItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                               className="bg-white border border-slate-200 px-2 py-2 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500 w-16 text-center"
                             />
                            <button onClick={() => updateMarketItem(item.id, { quantity: (item.quantity || 0) + 1 })} className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-black text-slate-400 hover:text-slate-900 cursor-pointer">+</button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-emerald-600">
                            R$ {((item.price || 0) * (item.quantity || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-4 rounded-r-2xl">
                          <button onClick={() => removeMarketItem(item.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors cursor-pointer"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="p-8 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
            <button onClick={() => setViewMode('catalog')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors flex items-center gap-2 cursor-pointer">
              <CloseIcon size={14} /> Cancelar Feira
            </button>
            <button 
              disabled={marketItems.length === 0}
              onClick={finalizeMarketTrip}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-10 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 flex items-center gap-4 transition-all active:scale-95 cursor-pointer"
            >
              Finalizar Compra & Lançar Despesa
              <ArrowRight size={18} />
            </button>
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
