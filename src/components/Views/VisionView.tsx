import React, { useState, useRef } from 'react';
import { processMarketReceipt, ReceiptItem, processQrUrl } from '../../lib/gemini';
import { useFirestore } from '../../hooks/useFirestore';
import { Finance, FinanceType, FinanceStatus } from '../../types';
import { cn } from '../../lib/utils';
import { Camera, Upload, Loader2, CheckCircle2, History, Trash2, Plus, Scan, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export function VisionView() {
  const [image, setImage] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState('');
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
        setQrUrl('');
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

  const handleQrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrUrl) return;
    setLoading(true);
    const extractedData = await processQrUrl(qrUrl);
    setItems(extractedData);
    setLoading(false);
  };

  const saveToFinances = async () => {
    const total = items.reduce((acc, item) => acc + item.preco, 0);
    if (total === 0) return;
    
    await addFinance({
      description: items[0]?.metadata || `Compra/Pagemento (AI Vision: ${items.length} itens)`,
      value: total,
      type: FinanceType.EXTRA,
      dueDate: new Date().toISOString(),
      status: FinanceStatus.PAGO
    });
    
    setItems([]);
    setImage(null);
    setQrUrl('');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-1 md:px-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em]">Neural Vision System</p>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            AI <span className="text-slate-400">Vision Scanner</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Gemini 1.5 Pro Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Methods */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm space-y-8">
            <div className="space-y-4">
               <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Entrada de Dados</h3>
               <form onSubmit={handleQrSubmit} className="space-y-3">
                 <div className="relative group">
                   <input 
                     type="text" 
                     value={qrUrl}
                     onChange={e => setQrUrl(e.target.value)}
                     placeholder="Sefaz QR Code URL / Link da Nota..."
                     className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-300"
                   />
                   <button 
                     type="submit"
                     disabled={!qrUrl || loading}
                     className="absolute right-2 top-2 bottom-2 bg-emerald-600 text-white px-4 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all hover:bg-emerald-700 cursor-pointer shadow-sm"
                   >
                     {loading ? <Loader2 size={18} className="animate-spin" /> : <Scan size={18} />}
                   </button>
                 </div>
               </form>
            </div>

            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-slate-100 flex-1" />
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">ou captura de imagem</span>
              <div className="h-px bg-slate-100 flex-1" />
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-[32px] aspect-sqaure min-h-[300px] flex flex-col items-center justify-center p-10 cursor-pointer relative overflow-hidden group",
                image ? "border-emerald-500 bg-emerald-50/10" : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
              )}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
              
              {image ? (
                <div className="absolute inset-0 z-0">
                  <img src={image} alt="Preview" className="w-full h-full object-cover opacity-20" />
                </div>
              ) : null}

              <div className="relative z-10 text-center">
                 <div className={cn(
                   "w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-xl transition-all",
                   image ? "bg-emerald-600 text-white" : "bg-white text-slate-300"
                 )}>
                   <Camera size={36} />
                 </div>
                 <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{image ? "Imagem Carregada" : "Capturar Scanner"}</p>
                 <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-[0.1em]">{image ? "Clique para alterar" : "Cupom, Extrato ou Recibo"}</p>
              </div>
            </div>

            {image && !loading && items.length === 0 && (
              <button 
                onClick={processImage}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px] hover:bg-slate-800 active:scale-95 cursor-pointer"
              >
                <Sparkles size={18} className="text-emerald-400" />
                Processar com AI Vision
              </button>
            )}
          </div>

          <div className="bg-amber-600 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
             <History className="absolute -right-4 -bottom-4 text-white/10" size={100} />
             <h4 className="text-[11px] font-black uppercase tracking-widest mb-3 italic">Nota Bibliográfica</h4>
             <p className="text-xs font-bold leading-relaxed opacity-90">
               O processamento via QR Code (SEFAZ) é instantâneo e possui 100% de acurácia. Capture sempre o QR Code quando disponível.
             </p>
          </div>
        </div>

        {/* Right Column: Results Area */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm h-full flex flex-col min-h-[500px]">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Resultados da Extração</h3>
               {items.length > 0 && (
                 <button 
                   onClick={() => { setItems([]); setImage(null); setQrUrl(''); }}
                   className="text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest cursor-pointer"
                 >
                   Limpar
                 </button>
               )}
             </div>

             <div className="flex-1 p-8">
               {loading ? (
                 <div className="h-full flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-emerald-100 rounded-full" />
                      <div className="absolute inset-0 w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="text-center space-y-2">
                       <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Neural Analysis em Curso</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando com Gemini 1.5 Pro...</p>
                    </div>
                 </div>
               ) : items.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <Scan size={64} className="text-slate-200 mb-6" />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center leading-loose">
                      Aguardando Entrada de Dados<br/>Digitalize para Iniciar o Audit
                    </p>
                 </div>
               ) : (
                 <div className="space-y-8">
                   <div className="space-y-4">
                     {items.map((item, i) => (
                       <motion.div 
                         key={i}
                         initial={{ opacity: 0, x: 10 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: i * 0.05 }}
                         className="flex justify-between items-end gap-6 group"
                       >
                         <div className="flex-1 border-b border-dotted border-slate-100 pb-1">
                           <p className={cn(
                             "text-sm font-black tracking-tight group-hover:text-emerald-600 transition-colors uppercase",
                             item.nome === "Desconhecido" ? "text-slate-300 italic" : "text-slate-700"
                           )}>
                             {item.nome}
                           </p>
                           {item.metadata && <p className="text-[8px] text-slate-400 font-black uppercase tracking-tight mt-0.5">{item.metadata}</p>}
                         </div>
                         <span className="font-black text-sm text-slate-900 tracking-tighter shrink-0 mb-1">
                           R$ {item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                         </span>
                       </motion.div>
                     ))}
                   </div>

                   <div className="pt-8 mt-8 border-t-2 border-slate-900 flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Total da Sincronização</p>
                        <h4 className="text-4xl font-black text-slate-900 tracking-tighter">
                          R$ {items.reduce((acc, i) => acc + i.preco, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h4>
                      </div>
                      <button 
                        onClick={saveToFinances}
                        className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 cursor-pointer"
                      >
                        Lançar em Finanças
                      </button>
                   </div>
                 </div>
               )}
             </div>

             <div className="p-8 bg-slate-900 text-white">
                <div className="flex items-center gap-4 opacity-80">
                   <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <History size={18} className="text-emerald-400" />
                   </div>
                   <p className="text-[11px] font-bold italic text-slate-400">
                     "Ecossistema integrado. Scans financeiros atualizam automaticamente o seu budget de curto prazo."
                   </p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
