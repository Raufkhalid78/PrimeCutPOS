
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Service, Product, Staff, Sale, SaleItem, Customer, ShopSettings, HeldSale } from '../types';
import { INITIAL_DISCOUNT_CODES, TRANSLATIONS } from '../constants';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';

interface POSProps {
  services: Service[];
  products: Product[];
  staff: Staff[];
  customers: Customer[];
  settings: ShopSettings;
  currentUser: Staff;
  onCompleteSale: (sale: Sale) => void;
  onAddCustomer: (customer: Customer) => void;
}

const POS: React.FC<POSProps> = ({ services, products, staff, customers, settings, currentUser, onCompleteSale, onAddCustomer }) => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  // Auto-select logged-in staff if they are an employee
  const [selectedStaff, setSelectedStaff] = useState<string>(currentUser.role === 'employee' ? currentUser.id : '');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [discountCode, setDiscountCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [searchTerm, setSearchTerm] = useState('');
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  
  // Feedback state
  const [scanningFeedback, setScanningFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
  
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', email: '' });
  const [isScanning, setIsScanning] = useState(false);
  
  // Ref for managing feedback timeout and scanner
  const feedbackTimeoutRef = useRef<number | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScannerActiveRef = useRef(false);
  const processingScanRef = useRef(false);
  
  const t = TRANSLATIONS[settings.language];

  // Camera Scanning Logic
  useEffect(() => {
    let isMounted = true;

    // Only attempt to start if scanning is active
    if (isScanning) {
        const startScanner = async () => {
            // Wait for modal animation to complete and DOM element to exist
            await new Promise(resolve => setTimeout(resolve, 300));
            
            if (!isMounted || !isScanning) return;
            
            // Prevent duplicate initialization
            if (html5QrCodeRef.current) return;

            try {
                // Initialize without experimental features to prevent freezing on some devices
                const html5QrCode = new Html5Qrcode("reader");
                html5QrCodeRef.current = html5QrCode;
                
                await html5QrCode.start(
                    { facingMode: "environment" }, 
                    { 
                        fps: 10, 
                        // Use a wider aspect ratio for 1D barcodes
                        qrbox: { width: 250, height: 150 },
                        aspectRatio: 1.0
                    }, 
                    (decodedText) => {
                        if (isMounted) handleScan(decodedText);
                    },
                    (errorMessage) => {
                        // Ignore frame parsing errors
                    }
                );
                
                if (isMounted) {
                    isScannerActiveRef.current = true;
                } else {
                    // Component unmounted during start sequence
                    if (html5QrCode.isScanning) {
                       await html5QrCode.stop();
                    }
                    html5QrCode.clear();
                    isScannerActiveRef.current = false;
                }
            } catch (err: any) {
                if (isMounted) {
                    console.error("Error starting scanner", err);
                    setIsScanning(false); // Close the modal
                    
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        alert("Camera permission denied. Please allow camera access in your browser settings to scan barcodes.");
                    }
                }
                // Cleanup refs on failure
                html5QrCodeRef.current = null;
                isScannerActiveRef.current = false;
            }
        };

        startScanner();
    }

    // Cleanup function
    return () => {
        isMounted = false;
        if (html5QrCodeRef.current) {
            const scanner = html5QrCodeRef.current;
            html5QrCodeRef.current = null; // Detach ref immediately
            
            if (isScannerActiveRef.current) {
                scanner.stop().catch(err => {
                    console.warn("Error stopping scanner during cleanup", err);
                }).finally(() => {
                    try { scanner.clear(); } catch(e) {}
                    isScannerActiveRef.current = false;
                });
            } else {
                try { scanner.clear(); } catch(e) {}
            }
        }
    };
  }, [isScanning]);

  const handleScan = (barcode: string) => {
    // Prevent rapid duplicate scanning
    if (processingScanRef.current) return;
    processingScanRef.current = true;

    // Reset processing flag after delay
    setTimeout(() => {
        processingScanRef.current = false;
    }, 1500);

    const product = products.find(p => p.barcode === barcode);
    
    if (product) {
        addToCart(product, 'product');
        setScanningFeedback(product.name);
        setFeedbackType('success');
    } else {
        setScanningFeedback(`Not Found: ${barcode}`);
        setFeedbackType('error');
    }

    // Clear existing timeout if scanning rapidly
    if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
    }
    
    // Set new timeout to clear feedback
    feedbackTimeoutRef.current = window.setTimeout(() => {
        setScanningFeedback(null);
        feedbackTimeoutRef.current = null;
    }, 2500);
  };

  const toggleScanner = () => {
      setIsScanning(!isScanning);
  };

  // Keyboard Barcode Support
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) barcodeBuffer = '';
      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 3) {
          handleScan(barcodeBuffer);
          barcodeBuffer = '';
        }
      } else if (e.key.length === 1) barcodeBuffer += e.key;
      lastKeyTime = currentTime;
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, [products]);

  const addToCart = (item: Service | Product, type: 'service' | 'product') => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.type === type);
      if (existing) {
        return prev.map(i => i.id === item.id && i.type === type ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, type, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, type: 'service' | 'product', delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id && item.type === type) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string, type: 'service' | 'product') => {
    setCart(prev => prev.filter(i => !(i.id === id && i.type === type)));
  };

  const totals = useMemo(() => {
    const rawSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    let discount = 0;
    const code = INITIAL_DISCOUNT_CODES.find(c => c.code === discountCode);
    if (code) {
      discount = code.type === 'percentage' ? (rawSubtotal * code.value) / 100 : code.value;
    }

    const discountedAmount = rawSubtotal - discount;
    let tax = 0;
    let total = 0;

    if (settings.taxType === 'included') {
      total = discountedAmount;
      // Tax is already inside the total. Formula: Total - (Total / (1 + Rate))
      tax = total - (total / (1 + (settings.taxRate / 100)));
    } else {
      tax = discountedAmount * (settings.taxRate / 100);
      total = discountedAmount + tax;
    }

    return { subtotal: rawSubtotal, discount, tax, total };
  }, [cart, discountCode, settings]);

  const handleHoldSale = () => {
    if (cart.length === 0) return;
    const newHold: HeldSale = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      timestamp: new Date().toISOString(),
      cart: [...cart],
      customerId: selectedCustomer || undefined,
      staffId: selectedStaff || undefined,
    };
    setHeldSales([newHold, ...heldSales]);
    setCart([]);
    setSelectedCustomer('');
    if (currentUser.role !== 'employee') {
      setSelectedStaff('');
    }
  };

  const retrieveSale = (held: HeldSale) => {
    setCart(held.cart);
    if (held.customerId) setSelectedCustomer(held.customerId);
    
    // Logic for staff ID on retrieval
    if (currentUser.role === 'employee') {
      // Always enforce current user if employee
      setSelectedStaff(currentUser.id);
    } else if (held.staffId) {
      // If admin, can retrieve the original staff ID
      setSelectedStaff(held.staffId);
    }
    
    setHeldSales(heldSales.filter(h => h.id !== held.id));
  };

  const generatePDF = (sale: Sale) => {
    const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
    const barber = staff.find(s => s.id === sale.staffId)?.name || 'N/A';
    const client = customers.find(c => c.id === sale.customerId)?.name || 'Guest Walk-in';
    const dateStr = new Date(sale.timestamp).toLocaleString();
    const primaryColor = [15, 23, 42]; // Slate-900

    // Header Branding
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 80, 10, 'F');
    doc.setTextColor(245, 158, 11); // Amber-500
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text('OFFICIAL RECEIPT', 40, 7, { align: 'center' });

    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(16).text(settings.shopName.toUpperCase(), 40, 25, { align: 'center' });
    doc.setFontSize(8).setFont('helvetica', 'normal').text('Professional Grooming & Care', 40, 30, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.3).line(5, 35, 75, 35);
    
    // Details Section
    doc.setFontSize(7).setTextColor(100, 116, 139); // Slate-400
    doc.text(`Transaction ID: #${sale.id}`, 5, 42);
    doc.text(`Date & Time: ${dateStr}`, 5, 46);
    doc.text(`Professional: ${barber}`, 5, 50);
    doc.text(`Client: ${client}`, 5, 54);
    doc.line(5, 58, 75, 58);
    
    // Items Section
    let y = 65;
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('DESCRIPTION', 5, y);
    doc.text('QTY', 52, y);
    doc.text('AMOUNT', 75, y, { align: 'right' });
    doc.line(5, y + 2, 75, y + 2);
    
    doc.setFont('helvetica', 'normal').setFontSize(7);
    y += 7;
    sale.items.forEach(item => {
      doc.text(item.name.substring(0, 25), 5, y);
      doc.text(item.quantity.toString(), 54, y, { align: 'center' });
      doc.text(`${settings.currency}${(item.price * item.quantity).toFixed(2)}`, 75, y, { align: 'right' });
      y += 5;
    });

    // Summary Section
    y += 5;
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.line(5, y, 75, y);
    y += 7;
    
    const subtotalValue = sale.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    doc.setFont('helvetica', 'normal').text('SUBTOTAL:', 5, y);
    doc.text(`${settings.currency}${subtotalValue.toFixed(2)}`, 75, y, { align: 'right' });
    y += 5;

    if (sale.discount > 0) {
      doc.text(`DISCOUNT (${sale.discountCode || 'Applied'}):`, 5, y);
      doc.text(`-${settings.currency}${sale.discount.toFixed(2)}`, 75, y, { align: 'right' });
      y += 5;
    }

    if (sale.taxType === 'excluded') {
      doc.text(`TAX (${settings.taxRate}%):`, 5, y);
      doc.text(`${settings.currency}${sale.tax.toFixed(2)}`, 75, y, { align: 'right' });
      y += 5;
    } else {
      doc.setFontSize(6).setTextColor(148, 163, 184); // Slate-400
      doc.text(`Includes ${settings.taxRate}% tax of ${settings.currency}${sale.tax.toFixed(2)}`, 5, y);
      doc.setFontSize(7).setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      y += 5;
    }

    y += 2;
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.rect(5, y - 4, 70, 8, 'F');
    doc.setFontSize(10).setFont('helvetica', 'bold').text('TOTAL PAID:', 7, y + 1.5);
    doc.text(`${settings.currency}${sale.total.toFixed(2)}`, 73, y + 1.5, { align: 'right' });
    
    y += 15;
    doc.setFontSize(7).setFont('helvetica', 'italic').setTextColor(148, 163, 184); // Slate-400
    doc.text(settings.receiptFooter, 40, y, { align: 'center' });
    doc.text('Thank you for your visit!', 40, y + 4, { align: 'center' });
    
    // Bottom Border
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 195, 80, 5, 'F');

    return doc;
  };

  const handleShareReceipt = async (sale: Sale) => {
    const doc = generatePDF(sale);
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], `Receipt-${sale.id}.pdf`, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${settings.shopName} Receipt`,
          text: `Your receipt for transaction #${sale.id}`,
        });
      } catch (error: any) {
        // Silently handle AbortError (user cancelled)
        if (error.name !== 'AbortError' && !error.message.includes('cancellation')) {
          console.error('Error sharing receipt:', error);
          doc.save(`Receipt-${sale.id}.pdf`);
        }
      }
    } else {
      doc.save(`Receipt-${sale.id}.pdf`);
    }
  };

  const handleCheckout = (paymentMethod: 'cash' | 'card') => {
    if (cart.length === 0 || !selectedStaff) {
      alert('Please add items and assign a professional.');
      return;
    }

    const sale: Sale = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      timestamp: new Date().toISOString(),
      items: [...cart],
      staffId: selectedStaff,
      customerId: selectedCustomer || undefined,
      total: totals.total,
      tax: totals.tax,
      discount: totals.discount,
      discountCode: discountCode || undefined,
      paymentMethod,
      taxType: settings.taxType,
    };

    onCompleteSale(sale);
    setLastSale(sale);
    setCart([]);
    setSelectedCustomer('');
    setDiscountCode('');
    // Reset staff only if admin, otherwise keep employee selected
    if (currentUser.role !== 'employee') {
      setSelectedStaff('');
    }
    setShowMobileCart(false);
  };

  const handleQuickAddCustomer = () => {
    if (!newCustomerData.name) return;
    const newCust: Customer = {
      id: 'c' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      name: newCustomerData.name,
      phone: newCustomerData.phone,
      email: newCustomerData.email,
      notes: '',
      createdAt: new Date().toISOString().split('T')[0]
    };
    onAddCustomer(newCust);
    setSelectedCustomer(newCust.id);
    setIsAddingCustomer(false);
    setNewCustomerData({ name: '', phone: '', email: '' });
  };

  const filteredItems = useMemo(() => {
    const search = searchTerm.toLowerCase();
    if (activeTab === 'services') {
      return services.filter(s => 
        s.name.toLowerCase().includes(search) || 
        s.category.toLowerCase().includes(search)
      );
    }
    return products.filter(p => p.name.toLowerCase().includes(search));
  }, [activeTab, services, products, searchTerm]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] relative">
      
      {/* Success Modal */}
      <AnimatePresence>
        {lastSale && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[150] flex items-center justify-center p-6 no-print"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl text-center space-y-8"
            >
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">✓</div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t.saleSuccess}</h3>
                <p className="text-slate-400 dark:text-slate-500 font-medium">{t.orderCompleted}</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleShareReceipt(lastSale)} 
                  className="w-full bg-slate-950 dark:bg-amber-500 dark:text-slate-950 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 dark:hover:bg-amber-600 transition-all shadow-xl active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                  {t.shareReceipt}
                </button>
                <button 
                  onClick={() => generatePDF(lastSale).save(`Receipt-${lastSale.id}.pdf`)} 
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  {t.downloadPdf}
                </button>
                <button onClick={() => setLastSale(null)} className="w-full py-4 text-slate-400 dark:text-slate-600 font-bold hover:text-slate-600 dark:hover:text-slate-400">{t.startNewBill}</button>
              </div>
            </motion.div>
          </motion.div>
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
                    <button onClick={toggleScanner} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-rose-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <div className="bg-black relative aspect-square">
                    <div id="reader" className="w-full h-full"></div>
                    {/* Visual Guide Overlay */}
                    <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
                        <div className="w-full h-0.5 bg-rose-500/50 absolute top-1/2 -translate-y-1/2"></div>
                    </div>
                </div>
                <div className="p-4 text-center bg-slate-50 dark:bg-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Point camera at a barcode to add to cart</p>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Catalog */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <div className="flex-1 relative">
                <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input 
                type="text" 
                placeholder={t.searchCatalog}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-6 outline-none focus:ring-4 focus:ring-amber-500/10 shadow-sm text-sm font-medium dark:text-slate-200"
                />
            </div>
            <button 
                onClick={toggleScanner}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-500/30 transition-all shadow-sm"
                title={t.scanBarcode}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
            </button>
          </div>
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <button 
              onClick={() => setActiveTab('services')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'services' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t.services}
            </button>
            <button 
              onClick={() => setActiveTab('products')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t.products}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pr-2 scrollbar-hide">
          <AnimatePresence mode='popLayout'>
            {filteredItems.map(item => (
              <motion.button
                layout
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addToCart(item, activeTab === 'services' ? 'service' : 'product')}
                className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group h-40 relative overflow-hidden"
              >
                <div className="relative z-10">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg mb-2 inline-block ${activeTab === 'services' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'}`}>
                    {activeTab === 'services' ? (item as Service).category : 'Retail'}
                  </span>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{item.name}</h4>
                </div>
                <div className="flex items-center justify-between relative z-10">
                  <p className="text-lg font-black text-slate-900 dark:text-white">{settings.currency}{item.price}</p>
                  <div className="w-8 h-8 bg-slate-900 dark:bg-slate-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Cart Panel */}
      <div className={`lg:w-96 flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden ${showMobileCart ? 'fixed inset-0 z-[70]' : 'relative hidden lg:flex'}`}>
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">{t.cart}</h3>
          <button onClick={() => setShowMobileCart(false)} className="lg:hidden p-2 text-slate-400">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <select 
            value={selectedStaff} 
            onChange={(e) => setSelectedStaff(e.target.value)} 
            disabled={currentUser.role === 'employee'}
            className={`w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 dark:text-slate-200 ${currentUser.role === 'employee' ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <option value="">{t.chooseProfessional}</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex gap-2">
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 dark:text-slate-200">
                <option value="">{t.walkInClient}</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button 
                onClick={() => setIsAddingCustomer(true)}
                className="bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 p-3 rounded-xl hover:bg-slate-800 dark:hover:bg-amber-600 transition-colors shadow-sm flex-shrink-0"
                title={t.quickAddClient}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3 scrollbar-hide">
          {cart.map(item => (
            <div key={`${item.id}-${item.type}`} className="flex items-center justify-between group">
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{settings.currency}{item.price} x {item.quantity}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.id, item.type, -1)} className="w-6 h-6 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 rounded flex items-center justify-center">-</button>
                <button onClick={() => updateQuantity(item.id, item.type, 1)} className="w-6 h-6 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 rounded flex items-center justify-center">+</button>
                <button onClick={() => removeFromCart(item.id, item.type)} className="text-rose-400 p-1 hover:text-rose-500">✕</button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 py-12">
               <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
               <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t.emptyCart}</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 space-y-3">
          <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
            <span>{t.subtotal}</span>
            <span>{settings.currency}{totals.subtotal.toFixed(2)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
              <span>{t.discount}</span>
              <span>-{settings.currency}{totals.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
            <span>{t.tax} ({settings.taxType === 'excluded' ? t.excluded : t.included})</span>
            <span>{settings.currency}{totals.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-xl font-black text-slate-900 dark:text-white">{t.total}</span>
            <span className="text-3xl font-black text-amber-600 dark:text-amber-500">{settings.currency}{totals.total.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button onClick={() => handleCheckout('cash')} className="bg-slate-900 dark:bg-slate-950 text-white py-4 rounded-2xl font-black active:scale-95 shadow-lg">{t.cash}</button>
            <button onClick={() => handleCheckout('card')} className="bg-amber-500 text-slate-900 py-4 rounded-2xl font-black active:scale-95 shadow-lg shadow-amber-500/10">{t.card}</button>
          </div>
          <button onClick={handleHoldSale} className="w-full text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 py-2 hover:text-slate-600 dark:hover:text-slate-400">{t.holdBill}</button>
        </div>
      </div>

      {/* Held Sales List */}
      <AnimatePresence>
        {heldSales.length > 0 && (
          <div className="fixed bottom-6 right-6 lg:right-96 lg:mr-8 z-40 max-w-xs w-full">
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 rounded-2xl shadow-2xl space-y-2 border border-white/5">
              <p className="text-[10px] font-black uppercase text-slate-500">{t.heldBills} ({heldSales.length})</p>
              {heldSales.map(h => (
                <div key={h.id} className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                  <span className="text-xs font-bold">#{h.id.slice(-4)}</span>
                  <button onClick={() => retrieveSale(h)} className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-3 py-1 rounded-lg">{t.resume}</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Quick Add Customer Modal */}
      <AnimatePresence>
        {isAddingCustomer && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{t.quickAddClient}</h3>
                <button onClick={() => setIsAddingCustomer(false)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">{t.name}</label>
                    <input 
                        type="text" 
                        value={newCustomerData.name}
                        onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 outline-none text-sm font-bold dark:text-slate-200"
                        placeholder=""
                        autoFocus
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">{t.mobile} ({t.optional})</label>
                    <input 
                        type="tel" 
                        value={newCustomerData.phone}
                        onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 outline-none text-sm font-bold dark:text-slate-200"
                        placeholder=""
                    />
                </div>
                <button 
                    onClick={handleQuickAddCustomer}
                    className="w-full bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 py-3.5 rounded-xl font-black text-sm hover:bg-slate-800 dark:hover:bg-amber-600 transition-all shadow-lg mt-2"
                >
                    {t.addSelectClient}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button onClick={() => setShowMobileCart(true)} className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-800 text-white px-8 py-4 rounded-full font-black shadow-2xl z-50 active:scale-95 flex gap-2 border border-white/10">
        {t.cart} ({cart.length})
      </button>

      {scanningFeedback && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-black text-sm shadow-2xl z-[100] animate-bounce ${feedbackType === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          {feedbackType === 'success' ? 'Added: ' : ''}{scanningFeedback}
        </div>
      )}
    </div>
  );
};

export default POS;
