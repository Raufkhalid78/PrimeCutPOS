
import React, { useState, useRef, useEffect } from 'react';
import { Service, Product, ShopSettings } from '../types';
import { TRANSLATIONS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';

interface InventoryProps {
  services: Service[];
  products: Product[];
  settings: ShopSettings;
  onUpdateServices: (services: Service[]) => void;
  onUpdateProducts: (products: Product[]) => void;
}

const Inventory: React.FC<InventoryProps> = ({ services, products, settings, onUpdateServices, onUpdateProducts }) => {
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [isEditing, setIsEditing] = useState<any>(null);
  
  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScannerActiveRef = useRef(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[settings.language];

  // Scanner Logic
  useEffect(() => {
    let isMounted = true;
    if (isScanning) {
        const startScanner = async () => {
            await new Promise(resolve => setTimeout(resolve, 300));
            if (!isMounted || !isScanning) return;
            if (html5QrCodeRef.current) return;

            try {
                // Initialize without experimental features to prevent freezing on some devices
                const html5QrCode = new Html5Qrcode("reader-inventory");
                html5QrCodeRef.current = html5QrCode;
                
                await html5QrCode.start(
                    { facingMode: "environment" }, 
                    { 
                        fps: 10, 
                        qrbox: { width: 250, height: 150 },
                        aspectRatio: 1.0
                    }, 
                    (decodedText) => {
                        if (isMounted) {
                            if (barcodeInputRef.current) {
                                barcodeInputRef.current.value = decodedText;
                            }
                            // Stop scanning after successful scan
                            setIsScanning(false);
                        }
                    },
                    (errorMessage) => {}
                );
                
                if (isMounted) {
                    isScannerActiveRef.current = true;
                } else {
                    if (html5QrCode.isScanning) {
                       await html5QrCode.stop();
                    }
                    html5QrCode.clear();
                    isScannerActiveRef.current = false;
                }
            } catch (err) {
                 console.error("Error starting scanner", err);
                 setIsScanning(false);
            }
        };
        startScanner();
    }
    return () => {
        isMounted = false;
        if (html5QrCodeRef.current) {
            const scanner = html5QrCodeRef.current;
            html5QrCodeRef.current = null;
            if (isScannerActiveRef.current) {
                scanner.stop().catch(console.warn).finally(() => {
                    try { scanner.clear(); } catch(e) {}
                    isScannerActiveRef.current = false;
                });
            } else {
                try { scanner.clear(); } catch(e) {}
            }
        }
    };
  }, [isScanning]);

  const deleteItem = (id: string, type: 'service' | 'product') => {
    if (!confirm('Permanently delete this entry?')) return;
    if (type === 'service') {
      onUpdateServices(services.filter(s => s.id !== id));
    } else {
      onUpdateProducts(products.filter(p => p.id !== id));
    }
  };

  const saveItem = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const itemData = Object.fromEntries(formData.entries());

    if (activeTab === 'services') {
      const newService: Service = {
        id: isEditing?.id || Math.random().toString(36).substr(2, 9).toUpperCase(),
        name: itemData.name as string,
        price: parseFloat(itemData.price as string),
        duration: parseInt(itemData.duration as string),
        category: itemData.category as string,
      };
      if (isEditing.id) {
        onUpdateServices(services.map(s => s.id === isEditing.id ? newService : s));
      } else {
        onUpdateServices([...services, newService]);
      }
    } else {
      const newProduct: Product = {
        id: isEditing?.id || Math.random().toString(36).substr(2, 9).toUpperCase(),
        name: itemData.name as string,
        price: parseFloat(itemData.price as string),
        cost: parseFloat(itemData.cost as string),
        stock: parseInt(itemData.stock as string),
        barcode: itemData.barcode as string || undefined,
      };
      if (isEditing.id) {
        onUpdateProducts(products.map(p => p.id === isEditing.id ? newProduct : p));
      } else {
        onUpdateProducts([...products, newProduct]);
      }
    }
    setIsEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white font-brand">{t.shopCatalog}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t.updatePrices}</p>
        </div>
        <button 
          onClick={() => setIsEditing({})}
          className="bg-slate-950 dark:bg-slate-800 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg text-sm w-full sm:w-auto justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
          {activeTab === 'services' ? t.newService : t.newProduct}
        </button>
      </div>

      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 self-start w-full sm:w-auto">
        <button 
          onClick={() => setActiveTab('services')}
          className={`flex-1 sm:px-8 py-2.5 rounded-lg font-bold transition-all text-xs md:text-sm ${activeTab === 'services' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'}`}
        >
          {t.services}
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex-1 sm:px-8 py-2.5 rounded-lg font-bold transition-all text-xs md:text-sm ${activeTab === 'products' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'}`}
        >
          {t.inventory}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                <th className="px-8 py-5">{t.itemDetails}</th>
                <th className="px-8 py-5">{activeTab === 'services' ? t.category : t.stockStatus}</th>
                <th className="px-8 py-5">{t.price}</th>
                <th className="px-8 py-5 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {activeTab === 'services' ? (
                services.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{s.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-600 font-mono tracking-tighter uppercase">{s.duration} {t.mins} {t.session}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">{s.category}</span>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-950 dark:text-white">{settings.currency}{s.price}</td>
                    <td className="px-8 py-6 text-right space-x-2">
                      <button onClick={() => setIsEditing(s)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-amber-500 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                      <button onClick={() => deleteItem(s.id, 'service')} className="p-2 text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                    </td>
                  </tr>
                ))
              ) : (
                products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{p.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-600 font-mono">{t.barcode}: {p.barcode || '---'}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-300">{t.cost}: {settings.currency}{p.cost}</p>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${p.stock < 10 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                           {p.stock} {t.unitsLeft}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-950 dark:text-white">{settings.currency}{p.price}</td>
                    <td className="px-8 py-6 text-right space-x-2">
                      <button onClick={() => setIsEditing(p)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-amber-500 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                      <button onClick={() => deleteItem(p.id, 'product')} className="p-2 text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md p-8 md:p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{isEditing.id ? t.editEntry : t.newEntry}</h3>
                <button onClick={() => setIsEditing(null)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <form onSubmit={saveItem} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">{t.labelName}</label>
                  <input name="name" type="text" defaultValue={isEditing.name || ''} required className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-bold dark:text-slate-200" />
                </div>
                {activeTab === 'products' && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">{t.barcode}</label>
                    <div className="flex gap-2">
                        <input ref={barcodeInputRef} name="barcode" type="text" defaultValue={isEditing.barcode || ''} className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-bold dark:text-slate-200" placeholder="" />
                        <button 
                            type="button"
                            onClick={() => setIsScanning(true)}
                            className="bg-slate-900 dark:bg-slate-800 text-white p-3.5 rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                            title={t.scanBarcode}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                        </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">{t.price} ({settings.currency})</label>
                    <input name="price" type="number" step="0.01" defaultValue={isEditing.price || ''} required className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-bold dark:text-slate-200" />
                  </div>
                  {activeTab === 'services' ? (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">{t.mins}</label>
                      <input name="duration" type="number" defaultValue={isEditing.duration || 30} required className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-bold dark:text-slate-200" />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">{t.cost} ({settings.currency})</label>
                      <input name="cost" type="number" step="0.01" defaultValue={isEditing.cost || ''} required className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-bold dark:text-slate-200" />
                    </div>
                  )}
                </div>
                {activeTab === 'services' ? (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">{t.category}</label>
                    <input name="category" type="text" defaultValue={isEditing.category || ''} required className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-bold dark:text-slate-200" />
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">{t.initialStock}</label>
                    <input name="stock" type="number" defaultValue={isEditing.stock || 0} required className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-bold dark:text-slate-200" />
                  </div>
                )}
                <div className="flex gap-4 mt-8">
                  <button type="submit" className="flex-1 px-4 py-4 bg-slate-950 dark:bg-amber-500 text-white dark:text-slate-950 rounded-2xl font-black text-base hover:bg-slate-800 dark:hover:bg-amber-600 transition-all shadow-xl">
                    {t.saveChanges}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Scanner Modal */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl relative">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                        {t.scanBarcode}
                    </h3>
                    <button onClick={() => setIsScanning(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-rose-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <div className="bg-black relative aspect-square">
                    <div id="reader-inventory" className="w-full h-full"></div>
                    {/* Visual Guide Overlay */}
                    <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
                        <div className="w-full h-0.5 bg-rose-500/50 absolute top-1/2 -translate-y-1/2"></div>
                    </div>
                </div>
                <div className="p-4 text-center bg-slate-50 dark:bg-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Point camera at a barcode to scan</p>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Inventory;
