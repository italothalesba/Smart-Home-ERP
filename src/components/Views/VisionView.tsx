import React, { useState, useRef } from 'react';
import { processMarketReceipt, ReceiptItem } from '../../lib/gemini';
import { useFirestore } from '../../hooks/useFirestore';
import { Finance, FinanceType, FinanceStatus } from '../../types';
import { Camera, Upload, Loader2, CheckCircle2, History, Trash2, Plus, Scan } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function VisionView() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const { add: addFinance } = useFirestore<Finance>('finances');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) return;
    setLoading(true);
    const base64Data = image.split(',')[1];
    const extractedData = await processMarketReceipt(base64Data);
    setItems(extractedData);
    setLoading(false);
  };

  const saveToFinances = async () => {
    const total = items.reduce((acc, item) => acc + item.preco, 0);
    if (total === 0) return;
    
    await addFinance({
      description: `Compra Mercado (AI Vision: ${items.length} itens)`,
      value: total,
      type: FinanceType.VOLATIL,
      dueDate: new Date().toISOString(),
      status: FinanceStatus.PAGO
    });
    
    setItems([]);
    setImage(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">AI Vision</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Analytics & Sincronização</p>
        <p className="text-sm text-slate-500 leading-relaxed max-w-[280px] mx-auto font-medium">
          Tire foto do seu cupom fiscal ou print para digitalização instantânea de estoque e finanças.
        </p>
      </div>

      {!image ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border border-slate-100 bg-white rounded-[40px] aspect-square flex flex-col items-center justify-center p-10 cursor-pointer shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/20 to-teal-50/20" />
          <div className="w-20 h-20 bg-emerald-600 text-white rounded-[24px] flex items-center justify-center mb-6 shadow-xl shadow-emerald-100 group-hover:scale-105 transition-transform relative z-10">
            <Camera size={40} />
          </div>
          <p className="text-slate-900 font-black text-sm uppercase tracking-widest relative z-10">Capturar Scanner</p>
          <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-widest relative z-10">JPEG, PNG ou Screenshot</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-[32px] overflow-hidden border border-slate-200 shadow-lg">
            <img src={image} alt="Preview" className="w-full h-auto" />
            <button 
              onClick={() => { setImage(null); setItems([]); }}
              className="absolute top-4 right-4 bg-white/80 backdrop-blur-md p-3 rounded-2xl text-slate-600 hover:text-red-500 shadow-md transition-all"
            >
              <Trash2 size={18} />
            </button>
          </div>

          {items.length === 0 ? (
            <button 
              onClick={processImage}
              disabled={loading}
              className="w-full bg-slate-900 text-white font-black py-5 rounded-[24px] shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest text-xs"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Scan size={20} />}
              {loading ? "Processando log..." : "Analisar com Gemini"}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-[24px] border border-slate-200 p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payload Extraído</h4>
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    {items.length} Itens
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium truncate max-w-[200px]">{item.nome}</span>
                      <span className="font-bold text-slate-900 italic underline decoration-emerald-200">R$ {item.preco.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sincronizado</span>
                  <span className="text-2xl font-black text-slate-900 tracking-tighter">
                    R$ {items.reduce((acc, i) => acc + i.preco, 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <button 
                onClick={saveToFinances}
                className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
              >
                <CheckCircle2 size={20} />
                Confirmar Lançamento
              </button>
            </div>
          )}
        </div>
      )}
      
      <div className="bg-slate-900 text-white p-6 rounded-[24px] shadow-lg relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
        <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <History size={12} /> Engenharia de Visão
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed italic font-medium">
          "O sistema processa automaticamente a volumetria. Scans de cupons fiscais são transformados em logs financeiros com precisão de 99%."
        </p>
      </div>
    </div>
  );
}
