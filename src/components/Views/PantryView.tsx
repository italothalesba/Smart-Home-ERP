import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { Product, Meal } from '../../types';
import { INGREDIENT_RATIOS } from '../../lib/constants';
import { Plus, Trash2, Package, AlertCircle, ShoppingCart, Pencil, Check, X as CloseIcon } from 'lucide-react';
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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em]">Inventory Control</p>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Geração de <span className="text-slate-400">Insumos</span>
          </h2>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={loadSuggestedList}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer mr-1"
          >
            Sugestão IA
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
              isAdding ? "bg-slate-900 text-white" : "bg-emerald-600 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700"
            )}
          >
            <Plus size={14} className={cn("transition-transform", isAdding && "rotate-45")} />
            {isAdding ? "Fechar" : "Novo Item"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Summary and Add Form */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-emerald-600 text-white rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
            
            <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em] mb-4">Valor Total em Estoque</p>
            <div className="mb-8">
              <h2 className="text-5xl font-black text-white tracking-tighter">
                R$ {totalFeira.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h2>
              <p className="text-emerald-100/60 text-[10px] font-bold uppercase tracking-widest mt-2">{products.length} itens registrados</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2 border border-white/5 truncate">
                <AlertCircle size={14} className="text-white" />
                <span className="text-[10px] font-black uppercase tracking-widest">{lowStockItems.length} Alertas</span>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isAdding && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="bg-white rounded-[32px] p-8 border border-slate-200 space-y-5 shadow-xl overflow-hidden"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Nome do Produto</label>
                  <input 
                    required
                    placeholder="Ex: Arroz, Leite, Café"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Qtd Atual</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={form.quantity}
                      onChange={e => setForm({...form, quantity: e.target.value})}
                      className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Preço Und (R$)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.price}
                      onChange={e => setForm({...form, price: e.target.value})}
                      className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Categoria</label>
                    <select
                      value={form.category}
                      onChange={e => setForm({...form, category: e.target.value})}
                      className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer appearance-none"
                    >
                      {CATEGORY_ORDER.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Unidade</label>
                    <select
                      value={form.unit}
                      onChange={e => setForm({...form, unit: e.target.value})}
                      className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer appearance-none"
                    >
                      <option value="un">un</option>
                      <option value="pct">pct</option>
                      <option value="Kg">Kg</option>
                      <option value="g">g</option>
                      <option value="Litro">l</option>
                      <option value="caixa">cx</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-100 uppercase tracking-[0.2em] text-[10px] hover:bg-emerald-700 transition-all active:scale-95 cursor-pointer mt-4">
                  Cadastrar na Despensa
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {lowStockItems.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-[32px] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                  <AlertCircle size={20} />
                </div>
                <h4 className="text-[11px] font-black text-red-800 uppercase tracking-widest">Lista de Reposição</h4>
              </div>
              <div className="space-y-2">
                {lowStockItems.slice(0, 5).map(item => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <span className="font-bold text-red-900">{item.name}</span>
                    <span className="font-black text-red-600">{item.quantity}{item.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Inventory List */}
        <div className="lg:col-span-8 space-y-8">
          {products.length === 0 && !isAdding && (
            <div className="py-20 text-center bg-white rounded-[32px] border border-slate-200 border-dashed">
               <Package size={48} className="mx-auto text-slate-100 mb-4" />
               <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Nenhum Insumo Localizado</p>
            </div>
          )}

          {sortedCategories.map(cat => {
            const catProducts = products.filter(p => p.category === cat);
            if (catProducts.length === 0) return null;

            const catTotal = catProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

            return (
              <div key={cat} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-4 flex-1">
                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">{cat}</h3>
                    <div className="h-px bg-slate-200 flex-1" />
                  </div>
                  <div className="ml-6 flex items-center gap-3">
                    <span className="text-[9px] font-black text-slate-400 uppercase bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">R$ {catTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catProducts.map((p) => (
                    <motion.div 
                      layout
                      key={p.id}
                      className={cn(
                        "p-5 rounded-[28px] border transition-all shadow-sm flex flex-col justify-between min-h-[160px] group",
                        p.quantity <= (p.minStock || 0) && !editingId ? "bg-red-50/50 border-red-100" : "bg-white border-slate-100 hover:border-emerald-200 hover:shadow-md"
                      )}
                    >
                      {editingId === p.id ? (
                        <div className="space-y-3 h-full flex flex-col">
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              value={editingForm.name}
                              onChange={e => setEditingForm({...editingForm, name: e.target.value})}
                              placeholder="Nome"
                              className="col-span-2 w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <select
                              value={editingForm.category}
                              onChange={e => setEditingForm({...editingForm, category: e.target.value})}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none"
                            >
                              {CATEGORY_ORDER.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            <select
                              value={editingForm.unit}
                              onChange={e => setEditingForm({...editingForm, unit: e.target.value})}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none"
                            >
                              <option value="un">un</option>
                              <option value="pct">pct</option>
                              <option value="Kg">Kg</option>
                              <option value="g">g</option>
                              <option value="Litro">l</option>
                              <option value="caixa">cx</option>
                            </select>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-50 px-2 py-1.5 border border-slate-100 rounded-xl flex flex-col">
                               <span className="text-[8px] font-black text-slate-400 uppercase">Preço</span>
                               <input 
                                 type="number"
                                 step="0.01"
                                 value={editingForm.price}
                                 onChange={e => setEditingForm({...editingForm, price: parseFloat(e.target.value) || 0})}
                                 className="w-full bg-transparent text-xs font-black outline-none"
                               />
                            </div>
                            <div className="bg-slate-50 px-2 py-1.5 border border-slate-100 rounded-xl flex flex-col">
                               <span className="text-[8px] font-black text-slate-400 uppercase">Qtd</span>
                               <input 
                                 type="number"
                                 step="0.01"
                                 value={editingForm.quantity}
                                 onChange={e => setEditingForm({...editingForm, quantity: parseFloat(e.target.value) || 0})}
                                 className="w-full bg-transparent text-xs font-black outline-none"
                               />
                            </div>
                            <div className="bg-slate-50 px-2 py-1.5 border border-slate-100 rounded-xl flex flex-col">
                               <span className="text-[8px] font-black text-slate-400 uppercase">Min</span>
                               <input 
                                 type="number"
                                 step="0.01"
                                 value={editingForm.minStock}
                                 onChange={e => setEditingForm({...editingForm, minStock: parseFloat(e.target.value) || 0})}
                                 className="w-full bg-transparent text-xs font-black outline-none"
                               />
                            </div>
                          </div>
                          <div className="mt-auto flex gap-2">
                            <button onClick={saveEdit} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-[10px] font-black uppercase cursor-pointer">Salvar</button>
                            <button onClick={() => setEditingId(null)} className="px-4 bg-slate-100 text-slate-500 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer">X</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start">
                            <div className="flex gap-4 items-center min-w-0">
                               <div className={cn(
                                 "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-white",
                                 p.quantity <= (p.minStock || 0) ? "bg-red-100 text-red-600 shadow-red-50" : "bg-white text-slate-800"
                               )}>
                                 <Package size={22} />
                               </div>
                               <div className="min-w-0">
                                 <h4 className="text-sm font-black text-slate-900 truncate tracking-tight">{p.name}</h4>
                                 <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-black text-emerald-600 italic tracking-tighter">R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / {p.unit}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">• Min: {p.minStock || 0}</span>
                                 </div>
                                 {(() => {
                                   const foundKey = Object.keys(recommendedQuantities).find(key => 
                                     p.name.toLowerCase().includes(key.toLowerCase()) || 
                                     key.toLowerCase().includes(p.name.toLowerCase())
                                   );
                                   if (foundKey) {
                                     const rawSuggested = recommendedQuantities[foundKey];
                                     const suggestedNum = parseFloat(rawSuggested);
                                     if (!isNaN(suggestedNum)) {
                                       return (
                                         <button 
                                           onClick={() => update(p.id, { quantity: suggestedNum })}
                                           className="mt-2 text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 flex items-center gap-1.5 hover:bg-emerald-100 transition-colors cursor-pointer"
                                         >
                                           <ShoppingCart size={10} />
                                           Sincronizar Dieta: {rawSuggested}
                                         </button>
                                       );
                                     }
                                   }
                                   return null;
                                 })()}
                               </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditing(p)} className="p-2 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"><Pencil size={14}/></button>
                              <button onClick={() => remove(p.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"><Trash2 size={14}/></button>
                            </div>
                          </div>

                          <div className="flex items-end justify-between mt-auto">
                            <div className="space-y-2 flex-1 mr-4">
                              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">Estoque Atual</span>
                                <span className={cn(p.quantity <= (p.minStock || 0) ? "text-red-600" : "text-emerald-600")}>
                                  {p.quantity}{p.unit}
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                 <div 
                                   className={cn(
                                     "h-full rounded-full transition-all duration-500",
                                     p.quantity <= (p.minStock || 0) ? "bg-red-500" : "bg-emerald-500"
                                   )} 
                                   style={{ width: `${Math.min((p.quantity / (p.minStock || 10)) * 100, 100)}%` }}
                                 />
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                               <button 
                                 onClick={() => update(p.id, { quantity: Math.max(0, p.quantity - 1) })}
                                 className="w-10 h-10 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl flex items-center justify-center font-black transition-all cursor-pointer"
                               >-</button>
                               <button 
                                 onClick={() => update(p.id, { quantity: p.quantity + 1 })}
                                 className="w-10 h-10 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-xl flex items-center justify-center font-black transition-all cursor-pointer"
                               >+</button>
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
