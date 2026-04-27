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
    category: 'Geral',
    unit: 'un'
  });

  const lowStockItems = products.filter(p => p.quantity <= (p.minStock || 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    add({
      name: form.name,
      quantity: parseFloat(form.quantity),
      minStock: parseFloat(form.minStock),
      category: form.category,
      unit: form.unit,
      price: 0
    });
    setIsAdding(false);
    setForm({ name: '', quantity: '', minStock: '', category: 'Geral', unit: 'un' });
  };

  return (
    <div className="space-y-6">
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-[24px] p-4 flex gap-4 items-start">
          <div className="p-2 bg-red-100 text-red-600 rounded-xl flex-shrink-0">
            <AlertCircle size={20} />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-red-800 uppercase tracking-widest">Atenção!</h4>
            <p className="text-sm font-bold text-red-600">Você tem {lowStockItems.length} itens abaixo do estoque mínimo.</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center px-1">
        <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">Inventário de Mantimentos</h3>
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

      {isAdding && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm space-y-4"
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Produto</label>
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
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Qtd Atual</label>
              <input 
                required
                type="number"
                placeholder="0"
                value={form.quantity}
                onChange={e => setForm({...form, quantity: e.target.value})}
                className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Qtd Mínima</label>
              <input 
                required
                type="number"
                placeholder="0"
                value={form.minStock}
                onChange={e => setForm({...form, minStock: e.target.value})}
                className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Unidade</label>
            <select
              value={form.unit}
              onChange={e => setForm({...form, unit: e.target.value})}
              className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
            >
              <option value="un">Unidade</option>
              <option value="kg">Quilo (kg)</option>
              <option value="g">Grama (g)</option>
              <option value="l">Litro (l)</option>
              <option value="ml">Mililitro (ml)</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-100 uppercase tracking-widest text-xs hover:bg-emerald-700 transition-colors">
            Adicionar à Despensa
          </button>
        </motion.form>
      )}

      <div className="grid grid-cols-2 gap-4 pb-12">
        {products.length === 0 && !isAdding && (
          <div className="col-span-2 py-12 bg-white rounded-[24px] border border-slate-200 border-dashed text-center">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Estoque vazio</p>
          </div>
        )}
        {products.map((p) => (
          <motion.div 
            layout
            key={p.id}
            className={cn(
              "p-4 rounded-[24px] border transition-all shadow-sm",
              p.quantity <= p.minStock ? "bg-red-50 border-red-100" : "bg-white border-slate-100"
            )}
          >
            <div className="flex justify-between items-start mb-2">
              <div className={cn(
                "p-2 rounded-xl",
                p.quantity <= p.minStock ? "bg-red-100 text-red-600" : "bg-slate-50 text-slate-600"
              )}>
                <Package size={16} />
              </div>
              <button onClick={() => remove(p.id)} className="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                <Trash2 size={14} />
              </button>
            </div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-tight truncate">{p.category}</p>
            <h4 className={cn(
              "text-sm font-bold truncate",
              p.quantity <= p.minStock ? "text-red-900" : "text-slate-900"
            )}>{p.name}</h4>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={cn("text-2xl font-black", p.quantity <= p.minStock ? "text-red-600" : "text-slate-900")}>
                {p.quantity}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{p.unit}</span>
            </div>
            
            <div className="w-full bg-slate-100 h-1 mt-3 rounded-full overflow-hidden">
               <div 
                 className={cn(
                   "h-full rounded-full transition-all",
                   p.quantity <= p.minStock ? "bg-red-500 w-[20%]" : "bg-emerald-500 w-[80%]"
                 )} 
               />
            </div>

            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => update(p.id, { quantity: Math.max(0, p.quantity - 1) })}
                className="flex-1 bg-slate-50 hover:bg-slate-100 py-2 rounded-xl text-sm font-black text-slate-400 transition-colors"
              >
                -
              </button>
              <button 
                onClick={() => update(p.id, { quantity: p.quantity + 1 })}
                className="flex-1 bg-slate-50 hover:bg-slate-100 py-2 rounded-xl text-sm font-black text-slate-400 transition-colors"
              >
                +
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
