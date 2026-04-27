import React, { useState } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { Product } from '../../types';
import { Plus, Trash2, Package, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function PantryView() {
  const { data: products, add, remove, update } = useFirestore<Product>('products');
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    name: '',
    quantity: '',
    minStock: '',
    category: 'Mercearia',
    unit: 'un',
    price: ''
  });

  const lowStockItems = products.filter(p => p.quantity <= (p.minStock || 1));
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

  const categories = Array.from(new Set(products.map(p => p.category)));

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
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Lista da Feira</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">Geração e Controle de Insumos</p>
      </div>

      <div className="bg-slate-900 rounded-[28px] p-6 text-white shadow-xl flex justify-between items-center overflow-hidden relative">
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Total da Lista</p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-slate-400">R$</span>
            <span className="text-3xl font-black">{totalFeira.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <Package className="absolute -right-4 -bottom-4 text-white/5" size={100} />
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-[24px] p-4 flex gap-4 items-start">
          <div className="p-2 bg-red-100 text-red-600 rounded-xl flex-shrink-0">
            <AlertCircle size={20} />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-red-800 uppercase tracking-widest text-left">Itens em Falta</h4>
            <p className="text-sm font-bold text-red-600 text-left">Você tem {lowStockItems.length} itens acabando.</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center px-1">
        <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">Produtos Cadastrados</h3>
        <div className="flex gap-2">
          <button 
            onClick={loadSuggestedList}
            className="px-4 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Sugerida
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all shadow-lg",
              isAdding ? "bg-slate-800" : "bg-emerald-600 shadow-emerald-100"
            )}
          >
            <Plus size={20} className={cn("transition-transform", isAdding && "rotate-45")} />
          </button>
        </div>
      </div>

      {isAdding && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm space-y-4"
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 text-left block">Produto</label>
            <input 
              required
              placeholder="Ex: Arroz, Leite, Café"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 text-left block">Qtd Atual</label>
              <input 
                required
                type="number"
                step="0.01"
                placeholder="0"
                value={form.quantity}
                onChange={e => setForm({...form, quantity: e.target.value})}
                className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 text-left block">Preço (R$)</label>
              <input 
                required
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.price}
                onChange={e => setForm({...form, price: e.target.value})}
                className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 text-left block">Categoria</label>
              <select
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}
                className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="Mercearia">Mercearia</option>
                <option value="Proteínas">Proteínas</option>
                <option value="Laticínios">Laticínios</option>
                <option value="Higiene/Limpeza">Higiene/Limpeza</option>
                <option value="Pets">Pets</option>
                <option value="Hortifruti">Hortifruti</option>
                <option value="Padaria">Padaria</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 text-left block">Unidade</label>
              <select
                value={form.unit}
                onChange={e => setForm({...form, unit: e.target.value})}
                className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="un">Unidade</option>
                <option value="pct">Pacote/Pct</option>
                <option value="Kg">Quilo (Kg)</option>
                <option value="g">Grama (g)</option>
                <option value="Litro">Litro (l)</option>
                <option value="caixa">Caixa</option>
                <option value="un">Lata</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-100 uppercase tracking-widest text-xs hover:bg-emerald-700 transition-colors">
            Adicionar à Feira
          </button>
        </motion.form>
      )}

      <div className="space-y-8 pb-12">
        {products.length === 0 && !isAdding && (
          <div className="py-12 bg-white rounded-[24px] border border-slate-200 border-dashed text-center">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Lista vazia</p>
          </div>
        )}

        {(categories.length > 0 ? categories : ['Geral']).map(cat => {
          const catProducts = products.filter(p => p.category === cat);
          if (catProducts.length === 0) return null;

          return (
            <div key={cat} className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{cat}</span>
                <div className="h-px bg-slate-100 flex-1" />
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {catProducts.map((p) => (
                  <motion.div 
                    layout
                    key={p.id}
                    className={cn(
                      "p-5 rounded-[24px] border transition-all shadow-sm flex items-center justify-between gap-4",
                      p.quantity <= (p.minStock || 0) ? "bg-red-50 border-red-100" : "bg-white border-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                        p.quantity <= (p.minStock || 0) ? "bg-red-100 text-red-600" : "bg-slate-50 text-slate-600"
                      )}>
                        <Package size={24} />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <h4 className={cn(
                          "text-sm font-bold truncate",
                          p.quantity <= (p.minStock || 0) ? "text-red-900" : "text-slate-900"
                        )}>{p.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{p.quantity} {p.unit}</span>
                          <span className="text-slate-200">•</span>
                          <div className="flex items-center gap-0.5 text-emerald-600">
                            <span className="text-[10px] font-bold uppercase">R$</span>
                            <input 
                              type="number"
                              step="0.01"
                              defaultValue={p.price}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val !== p.price) {
                                  update(p.id, { price: val });
                                }
                              }}
                              className="text-[10px] font-bold uppercase bg-slate-50 border border-transparent focus:border-emerald-200 rounded px-1 w-14 outline-none"
                            />
                            <span className="text-[10px] font-bold uppercase">/ {p.unit}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Subtotal</p>
                      <p className="text-sm font-black text-slate-900">R$ {(p.price * p.quantity).toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => update(p.id, { quantity: Math.max(0, p.quantity - 1) })}
                        className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors font-bold"
                      >
                        -
                      </button>
                      <button 
                        onClick={() => update(p.id, { quantity: p.quantity + 1 })}
                        className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors font-bold"
                      >
                        +
                      </button>
                      <button onClick={() => remove(p.id)} className="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-red-500 transition-all rounded-lg ml-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
