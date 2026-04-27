import React, { useState } from 'react';
import { Finance, FinanceType, FinanceStatus } from '../../types';
import { useFirestore } from '../../hooks/useFirestore';
import { Plus, Trash2, Calendar, CreditCard, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function FinanceView() {
  const { data: finances, add, remove, update } = useFirestore<Finance>('finances');
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    description: '',
    value: '',
    type: FinanceType.FIXO,
    totalInstallments: '1',
    dueDate: new Date().toISOString().split('T')[0]
  });

  const totalMonthlyImpact = finances.reduce((acc, f) => {
    if (f.type === FinanceType.PARCELA && f.totalInstallments) {
      return acc + (f.value / f.totalInstallments);
    }
    return acc + f.value;
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    add({
      description: form.description,
      value: parseFloat(form.value),
      type: form.type,
      totalInstallments: form.type === FinanceType.PARCELA ? parseInt(form.totalInstallments) : 1,
      currentInstallment: 1,
      status: FinanceStatus.PENDENTE,
      dueDate: new Date(form.dueDate).toISOString()
    });
    setIsAdding(false);
    setForm({ description: '', value: '', type: FinanceType.FIXO, totalInstallments: '1', dueDate: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Impacto Mensal Total</p>
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
          R$ {totalMonthlyImpact.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </h2>
        <div className="flex gap-2 mt-4">
          <div className="flex-1 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-[10px] font-bold text-center uppercase tracking-wider">
            Capacidade: R$ 1.000,00
          </div>
          <div className={cn(
            "flex-1 px-3 py-2 rounded-xl text-[10px] font-bold text-center uppercase tracking-wider",
            totalMonthlyImpact > 1000 ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
          )}>
            Livre: R$ {(1000 - totalMonthlyImpact).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center px-1">
        <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">Fluxo de Gastos</h3>
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
          className="bg-white rounded-[24px] p-6 border border-slate-200 space-y-4 shadow-sm"
        >
          <div className="space-y-1">
             <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Descrição</label>
             <input 
               required
               placeholder="Ex: Aluguel, Nubank, Internet"
               value={form.description}
               onChange={e => setForm({...form, description: e.target.value})}
               className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
             />
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Valor</label>
               <input 
                 required
                 type="number"
                 step="0.01"
                 placeholder="0,00"
                 value={form.value}
                 onChange={e => setForm({...form, value: e.target.value})}
                 className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
               />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Tipo</label>
               <select
                 value={form.type}
                 onChange={e => setForm({...form, type: e.target.value as FinanceType})}
                 className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
               >
                 <option value={FinanceType.FIXO}>Fixa</option>
                 <option value={FinanceType.VOLATIL}>Volátil</option>
                 <option value={FinanceType.PARCELA}>Parcelada</option>
               </select>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {form.type === FinanceType.PARCELA && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Parcelas</label>
                <input 
                  type="number"
                  placeholder="Qtd"
                  value={form.totalInstallments}
                  onChange={e => setForm({...form, totalInstallments: e.target.value})}
                  className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            )}
            <div className={cn("space-y-1", form.type !== FinanceType.PARCELA && "col-span-2")}>
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Vencimento</label>
              <input 
                type="date"
                value={form.dueDate}
                onChange={e => setForm({...form, dueDate: e.target.value})}
                className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-100 uppercase tracking-widest text-xs hover:bg-emerald-700 transition-colors">
            Adicionar Lançamento
          </button>
        </motion.form>
      )}

      <div className="space-y-3 pb-8">
        {finances.length === 0 && !isAdding && (
          <div className="py-12 bg-white rounded-[24px] border border-slate-200 border-dashed text-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum gasto registrado</p>
          </div>
        )}
        {finances.map((f) => (
          <motion.div 
            layout
            key={f.id}
            className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm hover:border-slate-200 transition-all"
          >
            <div className="flex gap-4 items-center">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-colors",
                f.type === FinanceType.FIXO ? "bg-blue-50 text-blue-600" :
                f.type === FinanceType.PARCELA ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
              )}>
                {f.type[0].toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{f.description}</h4>
                <div className="flex gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>{f.type}</span>
                  {f.type === FinanceType.PARCELA && <span>• {f.totalInstallments}x</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-black text-slate-900">
                  R$ {(f.type === FinanceType.PARCELA ? f.value / (f.totalInstallments || 1) : f.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Dia {new Date(f.dueDate).getDate()}</p>
              </div>
              <button 
                onClick={() => remove(f.id)} 
                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
