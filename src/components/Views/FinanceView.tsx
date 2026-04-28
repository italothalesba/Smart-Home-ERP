import React, { useState } from 'react';
import { Finance, FinanceType, FinanceStatus, Income } from '../../types';
import { useFirestore } from '../../hooks/useFirestore';
import { Plus, Trash2, Calendar, CreditCard, Wallet, TrendingUp, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function FinanceView() {
  const { data: finances, add: addFinance, remove: removeFinance } = useFirestore<Finance>('finances');
  const { data: incomes, add: addIncome, remove: removeIncome } = useFirestore<Income>('incomes');
  
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  
  const [form, setForm] = useState({
    description: '',
    value: '',
    type: FinanceType.FIXA,
    totalInstallments: '1',
    dueDate: new Date().toISOString().split('T')[0]
  });

  const [incomeForm, setIncomeForm] = useState({
    description: '',
    value: '',
    type: 'fixo' as 'fixo' | 'volatil'
  });

  const totalIncomes = incomes.reduce((acc, i) => acc + i.value, 0);
  
  const totalMonthlyExpenditure = finances.reduce((acc, f) => {
    const value = f.type === FinanceType.PARCELADO && f.totalInstallments 
      ? f.value / f.totalInstallments 
      : f.value;
    return acc + (Math.round(value * 100) / 100);
  }, 0);

  const balance = Math.round((totalIncomes - totalMonthlyExpenditure) * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let savedDueDate = form.dueDate;
    if (form.type !== FinanceType.FIXA) {
      savedDueDate = new Date(form.dueDate).toISOString();
    }

    addFinance({
      description: form.description,
      value: Math.round(parseFloat(form.value) * 100) / 100,
      type: form.type,
      totalInstallments: form.type === FinanceType.PARCELADO ? parseInt(form.totalInstallments) : 1,
      currentInstallment: 1,
      status: FinanceStatus.PENDENTE,
      dueDate: savedDueDate
    });
    setIsAdding(false);
    setForm({ description: '', value: '', type: FinanceType.FIXA, totalInstallments: '1', dueDate: '' });
  };

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addIncome({
      description: incomeForm.description,
      value: Math.round(parseFloat(incomeForm.value) * 100) / 100,
      type: incomeForm.type
    });
    setIsAddingIncome(false);
    setIncomeForm({ description: '', value: '', type: 'fixo' });
  };

  const getSortDate = (f: Finance) => {
    if (f.type === FinanceType.FIXA) {
      const day = parseInt(f.dueDate);
      const date = new Date();
      date.setDate(day);
      return date.getTime();
    }
    return new Date(f.dueDate).getTime();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-1 md:px-0">
      {/* Header with balance summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-slate-900 text-white rounded-[32px] p-6 md:p-8 shadow-xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl -mr-8 -mt-8" />
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2 md:mb-4">Saldo Previsto</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter">
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Patrimônio em circulação</p>
        </div>

        <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Ganhos Totais</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter italic">
                R$ {totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <ArrowUpCircle size={24} />
            </div>
          </div>
          <button 
            onClick={() => setIsAddingIncome(!isAddingIncome)}
            className="mt-4 flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest cursor-pointer active:scale-95"
          >
            <Plus size={14} /> {isAddingIncome ? "Fechar" : "Novo Ganho"}
          </button>
        </div>

        <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Impacto Mensal</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter italic">
                R$ {totalMonthlyExpenditure.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
              <ArrowDownCircle size={24} />
            </div>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="mt-4 flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-widest cursor-pointer active:scale-95"
          >
            <Plus size={14} /> {isAdding ? "Fechar" : "Nova Despesa"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Entradas (Incomes) */}
        <div className="space-y-6">
          <AnimatePresence>
            {isAddingIncome && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleIncomeSubmit}
                className="bg-white rounded-[32px] p-8 border border-slate-200 space-y-5 shadow-xl overflow-hidden"
              >
                <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-2 italic">Novo Recurso</p>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Origem</label>
                  <input 
                    required
                    placeholder="Ex: Salário, Freelance, Dividendos"
                    value={incomeForm.description}
                    onChange={e => setIncomeForm({...incomeForm, description: e.target.value})}
                    className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Valor</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={incomeForm.value}
                      onChange={e => setIncomeForm({...incomeForm, value: e.target.value})}
                      className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Tipo</label>
                    <select
                      value={incomeForm.type}
                      onChange={e => setIncomeForm({...incomeForm, type: e.target.value as 'fixo' | 'volatil'})}
                      className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="fixo">Mensal Fixo</option>
                      <option value="volatil">Extra / Volátil</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg uppercase tracking-[0.2em] text-[10px] cursor-pointer active:scale-95" id="btn-submit-income">
                  Confirmar Entrada
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Fluxo de Entrada</h3>
               <TrendingUp size={16} className="text-emerald-500" />
            </div>
            
            <div className="divide-y divide-slate-100">
              {incomes.length === 0 && (
                <div className="py-20 text-center px-12">
                   <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Nenhuma entrada registrada</p>
                </div>
              )}
              
              {incomes.map((i) => (
                <div key={i.id} className="p-4 md:p-5 flex justify-between items-center group">
                   <div className="flex gap-4 items-center min-w-0">
                     <div className={cn(
                       "w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0 border border-white shadow-sm",
                       i.type === 'fixo' ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                     )}>
                       {i.type[0].toUpperCase()}
                     </div>
                     <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-900 truncate tracking-tight">{i.description}</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{i.type === 'fixo' ? 'Fixo Mensal' : 'Volátil'}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2 md:gap-4 shrink-0">
                      <span className="text-sm md:text-base font-black text-emerald-600 tracking-tighter">
                        R$ {i.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <button 
                        onClick={() => removeIncome(i.id)}
                        className="w-10 h-10 flex items-center justify-center text-slate-200 hover:text-red-400 transition-colors cursor-pointer active:scale-90"
                      >
                        <Trash2 size={16} />
                      </button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Saídas (Expenses) */}
        <div className="space-y-6">
          <AnimatePresence>
            {isAdding && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="bg-white rounded-[32px] p-8 border border-slate-200 space-y-5 shadow-xl overflow-hidden"
              >
                <p className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-2 italic">Novo Desembolso</p>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Identificação</label>
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
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Preço</label>
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
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Modalidade</label>
                    <select
                      value={form.type}
                      onChange={e => setForm({...form, type: e.target.value as FinanceType})}
                      className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer appearance-none"
                    >
                      <option value={FinanceType.FIXA}>Fixa</option>
                      <option value={FinanceType.PARCELADO}>Parcelado</option>
                      <option value={FinanceType.EXTRA}>Extra</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {form.type === FinanceType.PARCELADO && (
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
                  <div className={cn("space-y-1.5", form.type !== FinanceType.PARCELADO && "col-span-2")}>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
                      {form.type === FinanceType.FIXA ? "Vencimento (Dia)" : "Vencimento (Data)"}
                    </label>
                    <input 
                      type={form.type === FinanceType.FIXA ? "number" : "date"}
                      min={form.type === FinanceType.FIXA ? "1" : undefined}
                      max={form.type === FinanceType.FIXA ? "31" : undefined}
                      value={form.dueDate}
                      onChange={e => setForm({...form, dueDate: e.target.value})}
                      className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full bg-red-500 text-white font-black py-4 rounded-2xl shadow-lg uppercase tracking-[0.2em] text-[10px] cursor-pointer active:scale-95" id="btn-submit-expense">
                  Registrar Saída
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Listagem Detalhada</h3>
            </div>
            
            <div className="divide-y divide-slate-100">
              {finances.length === 0 && (
                <div className="py-20 text-center px-12">
                   <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Tudo em ordem</p>
                </div>
              )}
              
              {finances.sort((a, b) => getSortDate(a) - getSortDate(b)).map((f) => (
                <motion.div 
                  layout
                  key={f.id}
                  className="p-4 md:p-5 flex justify-between items-center group"
                >
                  <div className="flex gap-4 items-center min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 border border-white shadow-sm",
                      f.type === FinanceType.FIXA ? "bg-slate-900 text-white" :
                      f.type === FinanceType.PARCELADO ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
                    )}>
                      {f.type[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-slate-900 truncate">{f.description}</h4>
                      <div className="flex items-center gap-2 text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> 
                          {f.type === FinanceType.FIXA ? `Todo dia ${f.dueDate}` : new Date(f.dueDate).toLocaleDateString()}
                        </span>
                        {f.type === FinanceType.PARCELADO && <span className="bg-amber-100 text-amber-700 px-1.5 rounded-md">Parcela {f.currentInstallment}/{f.totalInstallments}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-slate-900 tracking-tighter italic">
                        R$ {(() => {
                          const val = f.type === FinanceType.PARCELADO ? f.value / (f.totalInstallments || 1) : f.value;
                          return (Math.round(val * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        })()}
                      </p>
                    </div>
                    <button 
                      onClick={() => removeFinance(f.id)} 
                      className="w-10 h-10 flex items-center justify-center text-slate-200 cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
