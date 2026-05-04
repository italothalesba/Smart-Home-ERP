import React, { useState } from 'react';
import { Finance, FinanceType, FinanceStatus, Income } from '../../types';
import { useFirestore } from '../../hooks/useFirestore';
import { Plus, Trash2, Calendar, CreditCard, Wallet, TrendingUp, ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function FinanceView() {
  const { data: finances, add: addFinance, remove: removeFinance, update: updateFinance } = useFirestore<Finance>('finances');
  const { data: incomes, add: addIncome, remove: removeIncome } = useFirestore<Income>('incomes');
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  
  const [form, setForm] = useState({
    description: '',
    value: '',
    type: FinanceType.FIXA,
    totalInstallments: '1',
    currentInstallment: '1',
    dueDate: new Date().toISOString().split('T')[0]
  });

  const [incomeForm, setIncomeForm] = useState({
    description: '',
    value: '',
    type: 'fixo' as 'fixo' | 'volatil'
  });

  // Month navigation helpers
  const nextMonth = () => {
    const next = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
    setSelectedDate(next);
  };

  const prevMonth = () => {
    const prev = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
    setSelectedDate(prev);
  };

  const resetToToday = () => setSelectedDate(new Date());

  const isSameMonth = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();

  // Smart Filtering Logic
  const filteredFinances = finances.filter(f => {
    if (f.type === FinanceType.FIXA) return true; // Fixed expenses are always visible
    
    const financeDate = new Date(f.dueDate);
    
    if (f.type === FinanceType.EXTRA) {
      return isSameMonth(financeDate, selectedDate);
    }

    if (f.type === FinanceType.PARCELADO || f.type === FinanceType.RENEGOCIACAO) {
      const startMonth = financeDate.getFullYear() * 12 + financeDate.getMonth();
      const currentMonth = selectedDate.getFullYear() * 12 + selectedDate.getMonth();
      const diff = currentMonth - startMonth;
      
      const installmentAtMonth = (f.currentInstallment || 1) + diff;
      return installmentAtMonth >= 1 && installmentAtMonth <= (f.totalInstallments || 1);
    }

    return false;
  });

  // Calculate dynamic properties for filtered items (like current installment number)
  const processedFinances = filteredFinances.map(f => {
    if (f.type === FinanceType.PARCELADO || f.type === FinanceType.RENEGOCIACAO) {
      const financeDate = new Date(f.dueDate);
      const startMonth = financeDate.getFullYear() * 12 + financeDate.getMonth();
      const currentMonth = selectedDate.getFullYear() * 12 + selectedDate.getMonth();
      const diff = currentMonth - startMonth;
      const calculatedInstallment = (f.currentInstallment || 1) + diff;
      
      return { ...f, displayInstallment: calculatedInstallment };
    }
    return f;
  });

  const filteredIncomes = incomes.filter(i => {
    if (i.type === 'fixo') return true;
    if (!i.date) return true; // Legacy items
    return isSameMonth(new Date(i.date), selectedDate);
  });

  const totalIncomes = filteredIncomes.reduce((acc, i) => acc + i.value, 0);
  
  const totalMonthlyExpenditure = processedFinances.reduce((acc, f) => {
    const isInstallmentBased = f.type === FinanceType.PARCELADO || f.type === FinanceType.RENEGOCIACAO;
    const value = isInstallmentBased && f.totalInstallments 
      ? f.value / f.totalInstallments 
      : f.value;
    return acc + (Math.round(value * 100) / 100);
  }, 0);

  const totalPaidExpenditure = processedFinances.reduce((acc, f) => {
    if (f.status !== FinanceStatus.PAGO) return acc;
    const isInstallmentBased = f.type === FinanceType.PARCELADO || f.type === FinanceType.RENEGOCIACAO;
    const value = isInstallmentBased && f.totalInstallments 
      ? f.value / f.totalInstallments 
      : f.value;
    return acc + (Math.round(value * 100) / 100);
  }, 0);

  // Grouped totals for monthly tracking
  const totalsByType = processedFinances.reduce((acc, f) => {
    const isInstallmentBased = f.type === FinanceType.PARCELADO || f.type === FinanceType.RENEGOCIACAO;
    const value = isInstallmentBased && f.totalInstallments 
      ? f.value / f.totalInstallments 
      : f.value;
    
    if (!acc[f.type]) acc[f.type] = 0;
    acc[f.type] += Math.round(value * 100) / 100;
    return acc;
  }, {} as Record<FinanceType, number>);

  const totalPendingExpenditure = Math.round((totalMonthlyExpenditure - totalPaidExpenditure) * 100) / 100;
  const balance = Math.round((totalIncomes - totalPaidExpenditure) * 100) / 100;
  const projectedBalance = Math.round((totalIncomes - totalMonthlyExpenditure) * 100) / 100;

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
      totalInstallments: (form.type === FinanceType.PARCELADO || form.type === FinanceType.RENEGOCIACAO) ? parseInt(form.totalInstallments) : 1,
      currentInstallment: (form.type === FinanceType.PARCELADO || form.type === FinanceType.RENEGOCIACAO) ? parseInt(form.currentInstallment) : 1,
      status: FinanceStatus.PENDENTE,
      dueDate: savedDueDate
    });
    setIsAdding(false);
    setForm({ description: '', value: '', type: FinanceType.FIXA, totalInstallments: '1', currentInstallment: '1', dueDate: '' });
  };

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addIncome({
      description: incomeForm.description,
      value: Math.round(parseFloat(incomeForm.value) * 100) / 100,
      type: incomeForm.type,
      date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString()
    });
    setIsAddingIncome(false);
    setIncomeForm({ description: '', value: '', type: 'fixo' });
  };

  const toggleStatus = async (id: string, currentStatus: FinanceStatus) => {
    await updateFinance(id, {
      status: currentStatus === FinanceStatus.PAGO ? FinanceStatus.PENDENTE : FinanceStatus.PAGO
    });
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

  const overdueFinances = finances.filter(f => {
    if (f.status === FinanceStatus.PAGO) return false;
    
    if (f.type === FinanceType.FIXA) return false;
    
    const financeDate = new Date(f.dueDate);
    const selectedMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    
    // Check if it belongs to a month BEFORE the selected month
    return financeDate < selectedMonthStart;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-1 md:px-0">
      {/* Month Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden relative">
             <Calendar size={20} className="relative z-10" />
             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tighter capitalize">
              {selectedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Visão Mensal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={prevMonth}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
          >
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          
          <button 
            onClick={resetToToday}
            className={cn(
              "px-4 h-10 flex items-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95",
              isSameMonth(selectedDate, new Date()) 
                ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                : "bg-slate-900 text-white shadow-md hover:-translate-y-0.5"
            )}
            disabled={isSameMonth(selectedDate, new Date())}
          >
            <RotateCcw size={14} /> Hoje
          </button>

          <button 
            onClick={nextMonth}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
          >
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Header with balance summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-slate-900 text-white rounded-[32px] p-6 md:p-8 shadow-xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl -mr-8 -mt-8" />
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2 md:mb-4">Saldo Disponível</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter">
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Previsto: R$ {projectedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Ganhos Totais</p>
              <h3 className="text-xl md:text-2xl font-black text-emerald-600 tracking-tighter italic">
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
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Pendente p/ Pagar</p>
              <h3 className="text-xl md:text-2xl font-black text-red-500 tracking-tighter italic">
                R$ {totalPendingExpenditure.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

      {/* Monthly Breakdown by Type */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Fixas', type: FinanceType.FIXA, color: 'text-slate-900', bg: 'bg-slate-50' },
          { label: 'Parceladas', type: FinanceType.PARCELADO, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Extras', type: FinanceType.EXTRA, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Renegociadas', type: FinanceType.RENEGOCIACAO, color: 'text-red-700', bg: 'bg-red-50' },
        ].map((item) => (
          <div key={item.type} className={cn("p-4 rounded-2xl border border-slate-100 flex flex-col gap-1", item.bg)}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
            <p className={cn("text-lg font-black tracking-tighter", item.color)}>
              R$ {(totalsByType[item.type] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        ))}
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
              {filteredIncomes.length === 0 && (
                <div className="py-20 text-center px-12">
                   <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Nenhuma entrada registrada</p>
                </div>
              )}
              
              {filteredIncomes.map((i) => (
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
                      <option value={FinanceType.RENEGOCIACAO}>Renegociação Cartão</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {(form.type === FinanceType.PARCELADO || form.type === FinanceType.RENEGOCIACAO) && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
                        {form.type === FinanceType.RENEGOCIACAO ? "Meses Pagos" : "Parcela Atual"}
                      </label>
                      <input 
                        type="number"
                        placeholder="Ex: 5"
                        value={form.currentInstallment}
                        onChange={e => setForm({...form, currentInstallment: e.target.value})}
                        className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                  )}
                  {(form.type === FinanceType.PARCELADO || form.type === FinanceType.RENEGOCIACAO) && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Total de Parcelas</label>
                      <input 
                        type="number"
                        placeholder="Qtd"
                        value={form.totalInstallments}
                        onChange={e => setForm({...form, totalInstallments: e.target.value})}
                        className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
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
              {processedFinances.length === 0 && overdueFinances.length === 0 && (
                <div className="py-20 text-center px-12">
                   <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Tudo em ordem</p>
                </div>
              )}

              {/* Overdue Section */}
              {overdueFinances.length > 0 && (
                <div className="bg-red-50/50">
                  <div className="px-5 py-3 border-b border-red-100 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] font-black text-red-600 uppercase tracking-[0.2em]">Pendências de Meses Anteriores</span>
                  </div>
                  {overdueFinances.map((f) => (
                    <motion.div 
                      layout
                      key={`overdue-${f.id}`}
                      className="p-4 md:p-5 flex justify-between items-center group"
                    >
                      {/* Reuse list item layout - slightly dimmed */}
                      <div className="flex gap-4 items-center min-w-0 opacity-75">
                        <button 
                          onClick={() => toggleStatus(f.id, f.status)}
                          className="w-6 h-6 rounded-full border-2 border-red-200 hover:border-red-500 flex items-center justify-center transition-all cursor-pointer"
                        >
                        </button>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 bg-red-100 text-red-700 border border-white shadow-sm">
                          !
                        </div>
                        <div className="min-w-0 text-left">
                          <h4 className="text-sm font-black text-slate-900 truncate">{f.description}</h4>
                          <div className="flex items-center gap-2 text-[9px] text-red-400 font-black uppercase tracking-widest mt-1">
                            <Calendar size={10} /> 
                            {new Date(f.dueDate).toLocaleDateString()} (Atrasado)
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-black text-red-600 tracking-tighter italic">
                          R$ {f.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  <div className="h-4 bg-white" />
                </div>
              )}
              
              {processedFinances.sort((a, b) => getSortDate(a) - getSortDate(b)).map((f) => (
                <motion.div 
                  layout
                  key={f.id}
                  className={cn(
                    "p-4 md:p-5 flex justify-between items-center group transition-opacity",
                    f.status === FinanceStatus.PAGO && "opacity-50"
                  )}
                >
                  <div className="flex gap-4 items-center min-w-0">
                    <button 
                      onClick={() => toggleStatus(f.id, f.status)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer",
                        f.status === FinanceStatus.PAGO 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : "border-slate-200 hover:border-emerald-500"
                      )}
                    >
                      {f.status === FinanceStatus.PAGO && <div className="w-2 h-2 bg-white rounded-full" />}
                    </button>
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 border border-white shadow-sm",
                      f.type === FinanceType.FIXA ? "bg-slate-900 text-white" :
                      f.type === FinanceType.PARCELADO ? "bg-amber-500 text-white" : 
                      f.type === FinanceType.RENEGOCIACAO ? "bg-red-900 text-white" : "bg-emerald-600 text-white"
                    )}>
                      {f.type[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 text-left">
                      <h4 className={cn(
                        "text-sm font-black text-slate-900 truncate",
                        f.status === FinanceStatus.PAGO && "line-through text-slate-400"
                      )}>{f.description}</h4>
                      <div className="flex items-center gap-2 text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> 
                          {f.type === FinanceType.FIXA ? `Todo dia ${f.dueDate}` : new Date(f.dueDate).toLocaleDateString()}
                        </span>
                            {(f.type === FinanceType.PARCELADO || f.type === FinanceType.RENEGOCIACAO) && (
                          <span className={cn(
                            "px-1.5 rounded-md",
                            f.type === FinanceType.RENEGOCIACAO ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {f.type === FinanceType.RENEGOCIACAO ? "Negociação" : "Parcela"} {f.displayInstallment || f.currentInstallment}/{f.totalInstallments}
                          </span>
                        )}
                        {f.status === FinanceStatus.PAGO && (
                          <span className="bg-emerald-100 text-emerald-700 px-1.5 rounded-md">PAGO</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-base font-black tracking-tighter italic",
                        f.status === FinanceStatus.PAGO ? "text-slate-400" : "text-slate-900"
                      )}>
                        R$ {(() => {
                          const isInstallmentBased = f.type === FinanceType.PARCELADO || f.type === FinanceType.RENEGOCIACAO;
                          const val = isInstallmentBased ? f.value / (f.totalInstallments || 1) : f.value;
                          return (Math.round(val * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        })()}
                      </p>
                    </div>
                    <button 
                      onClick={() => removeFinance(f.id)} 
                      className="w-10 h-10 flex items-center justify-center text-slate-200 hover:text-red-500 cursor-pointer active:scale-95"
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
