import React, { useState } from 'react';
import { Finance, FinanceType, FinanceStatus } from '../../types';
import { useFirestore } from '../../hooks/useFirestore';
import { Plus, Trash2, Calendar, CreditCard, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
    <div className="space-y-8 max-w-5xl mx-auto px-1 md:px-0">
      {/* Header with quick stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em]">Financial Audit</p>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Fluxo de <span className="text-slate-400">Caixa</span>
          </h2>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
              isAdding ? "bg-slate-900 text-white" : "bg-emerald-600 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700"
            )}
          >
            <Plus size={14} className={cn("transition-transform", isAdding && "rotate-45")} />
            {isAdding ? "Fechar" : "Novo Lançamento"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Summary & Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 text-white rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
            
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">Impacto Mensal Estimado</p>
            <div className="mb-8">
              <h2 className="text-5xl font-black text-white tracking-tighter">
                R$ {totalMonthlyImpact.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Soma de todos os vencimentos no mês</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/5">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Budget Limite</p>
                <p className="text-lg font-black text-emerald-400 leading-none">R$ 1.300,00</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/5">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Saldo Livre</p>
                <p className={cn(
                  "text-lg font-black leading-none",
                  totalMonthlyImpact > 1300 ? "text-red-400" : "text-white"
                )}>
                  R$ {(1300 - totalMonthlyImpact).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
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
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Descrição do Gasto</label>
                  <input 
                    required
                    placeholder="Ex: Aluguel, Nubank, Internet"
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                    className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Valor Central</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={form.value}
                      onChange={e => setForm({...form, value: e.target.value})}
                      className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Categoria</label>
                    <select
                      value={form.type}
                      onChange={e => setForm({...form, type: e.target.value as FinanceType})}
                      className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer appearance-none"
                    >
                      <option value={FinanceType.FIXO}>Fixa</option>
                      <option value={FinanceType.VOLATIL}>Volátil</option>
                      <option value={FinanceType.PARCELA}>Parcelada</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {form.type === FinanceType.PARCELA && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Parcelas</label>
                      <input 
                        type="number"
                        placeholder="Qtd"
                        value={form.totalInstallments}
                        onChange={e => setForm({...form, totalInstallments: e.target.value})}
                        className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                  )}
                  <div className={cn("space-y-1.5", form.type !== FinanceType.PARCELA && "col-span-2")}>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Vencimento</label>
                    <input 
                      type="date"
                      value={form.dueDate}
                      onChange={e => setForm({...form, dueDate: e.target.value})}
                      className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-100 uppercase tracking-[0.2em] text-[10px] hover:bg-emerald-700 transition-all active:scale-95 cursor-pointer mt-4">
                  Registrar Lançamento
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: List of Expenditures */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Listagem Detalhada</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{finances.length} registros ativos</p>
            </div>
            
            <div className="divide-y divide-slate-100">
              {finances.length === 0 && (
                <div className="py-20 text-center px-12">
                   <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <Wallet size={24} className="text-slate-200" />
                   </div>
                   <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Tudo limpo por aqui</p>
                </div>
              )}
              
              {finances.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((f) => (
                <motion.div 
                  layout
                  key={f.id}
                  className="p-5 flex justify-between items-center hover:bg-slate-50/80 transition-all group"
                >
                  <div className="flex gap-4 items-center min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs transition-transform group-hover:scale-110 shrink-0 shadow-sm border border-white",
                      f.type === FinanceType.FIXO ? "bg-blue-600 text-white shadow-blue-100" :
                      f.type === FinanceType.PARCELA ? "bg-amber-500 text-white shadow-amber-100" : "bg-emerald-600 text-white shadow-emerald-100"
                    )}>
                      {f.type[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-slate-900 truncate">{f.description}</h4>
                      <div className="flex items-center gap-2 text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                        <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(f.dueDate).toLocaleDateString()}</span>
                        {f.type === FinanceType.PARCELA && <span className="bg-amber-100 text-amber-700 px-1.5 rounded-md">Parcela {f.currentInstallment}/{f.totalInstallments}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-slate-900 tracking-tighter italic">
                        R$ {(f.type === FinanceType.PARCELA ? f.value / (f.totalInstallments || 1) : f.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter">Impacto Mensal</p>
                    </div>
                    <button 
                      onClick={() => remove(f.id)} 
                      className="w-10 h-10 flex items-center justify-center text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-8 p-6 bg-amber-50 border border-amber-100 rounded-[24px] flex gap-4 items-start">
             <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 text-amber-600 shadow-sm shadow-amber-200">
                <CreditCard size={20} />
             </div>
             <div>
                <h4 className="text-[11px] font-black text-amber-800 uppercase tracking-widest mb-1">Dica Financeira</h4>
                <p className="text-xs font-semibold text-amber-700 leading-relaxed">
                   Gastos parcelados diluem o impacto imediato no budget, mas comprometem o seu fluxo de longo prazo. Evite exceder 30% do seu orçamento livre em parcelas.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
