
import React, { useState, useMemo } from 'react';
import { Sale, Expense, Staff, Language } from '../types';
import { getFinancialInsights } from '../services/geminiService';
import { TRANSLATIONS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface FinanceProps {
  sales: Sale[];
  expenses: Expense[];
  staffList: Staff[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense?: (id: string) => void;
  currency: string;
  language: Language;
}

const Finance: React.FC<FinanceProps> = ({ sales, expenses, staffList, onAddExpense, onDeleteExpense, currency, language }) => {
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState({ category: '', amount: 0, description: '' });
  
  const t = TRANSLATIONS[language];

  // Date Range State for Commission Report (Default to current month)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const profit = totalRevenue - totalExpenses;

  // Filtered Sales for Report
  const reportData = useMemo(() => {
    const filteredSales = sales.filter(s => {
      const date = s.timestamp.split('T')[0];
      return date >= startDate && date <= endDate;
    });

    const staffStats = staffList.map(staff => {
      const personalSales = filteredSales.filter(s => s.staffId === staff.id);
      const revenue = personalSales.reduce((acc, s) => acc + s.total, 0);
      const commissionEarned = (revenue * staff.commission) / 100;

      return {
        ...staff,
        salesCount: personalSales.length,
        revenue,
        commissionEarned
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const periodRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const periodCommission = staffStats.reduce((acc, s) => acc + s.commissionEarned, 0);

    return { staffStats, periodRevenue, periodCommission, salesCount: filteredSales.length };
  }, [sales, staffList, startDate, endDate]);

  const handleGenerateInsights = async () => {
    setLoadingInsights(true);
    const result = await getFinancialInsights(sales, expenses);
    setInsights(result);
    setLoadingInsights(false);
  };

  const data = [
    { name: t.total, revenue: totalRevenue, expenses: totalExpenses, profit: profit }
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
      {/* Financial Charts & AI */}
      <div className="xl:col-span-2 space-y-6 md:space-y-8 flex flex-col min-w-0">
        
        {/* General Shop Performance (All Time) */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm no-print">
          <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mb-6 md:mb-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-500">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
            </div>
            {t.shopPerformance}
          </h3>
          <div className="h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{top: 20, right: 30, left: 0, bottom: 5}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:opacity-5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" />
                <Bar dataKey="revenue" name={t.revenue} fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expenses" name={t.expenses} fill="#f43f5e" radius={[8, 8, 0, 0]} />
                <Bar dataKey="profit" name={t.netProfit} fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Commission Report Section */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm no-print">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
                <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                </div>
                {t.commissionReport}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 ml-14">{t.payrollReport}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex flex-col px-2">
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent border-none p-0 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none"
                    />
                </div>
                <div className="w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                <div className="flex flex-col px-2">
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent border-none p-0 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none"
                    />
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{t.periodRevenue}</p>
                <p className="text-2xl font-black text-indigo-900 dark:text-indigo-100">{currency}{reportData.periodRevenue.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">{t.totalPayout}</p>
                <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">{currency}{reportData.periodCommission.toFixed(2)}</p>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-hide -mx-6 md:mx-0">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <th className="px-6 pb-4">{t.professional}</th>
                  <th className="px-6 pb-4 text-center">{t.salesCount}</th>
                  <th className="px-6 pb-4">{t.totalSales}</th>
                  <th className="px-6 pb-4 text-right">{t.payout} ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {reportData.staffStats.map(perf => (
                  <tr key={perf.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 dark:text-slate-400 uppercase">
                           {perf.name.charAt(0)}
                         </div>
                         <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{perf.name}</p>
                            <p className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-tighter">{perf.role === 'admin' ? t.admin : t.employee}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <span className="text-sm font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{perf.salesCount}</span>
                    </td>
                    <td className="px-6 py-5">
                       <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{currency}{perf.revenue.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <div className="inline-flex flex-col items-end">
                         <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{currency}{perf.commissionEarned.toFixed(2)}</p>
                         <p className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase">@ {perf.commission}% {t.rate}</p>
                       </div>
                    </td>
                  </tr>
                ))}
                {reportData.staffStats.length === 0 && (
                    <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400 text-xs italic">{t.noSalesPeriod}</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insights Section */}
        <div className="bg-slate-900 dark:bg-slate-900 text-white p-6 md:p-8 rounded-[2rem] md:rounded-3xl shadow-xl relative no-print border border-slate-800/50 overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
             <svg className="w-24 h-24 md:w-32 md:h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z"/></svg>
          </div>
          <div className="relative z-10 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <span className="text-amber-400 text-2xl">✨</span> {t.smartInsights}
              </h3>
              <button
                onClick={handleGenerateInsights}
                disabled={loadingInsights}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-6 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20 active:scale-95 shrink-0"
              >
                {loadingInsights ? t.analyzing : t.generateAdvice}
              </button>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 min-h-[150px] border border-slate-700/50 w-full">
                {insights ? (
                  <div className="prose prose-invert max-w-none w-full">
                    <p className="whitespace-pre-wrap break-words leading-relaxed text-slate-300 text-sm md:text-base w-full">
                      {insights}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 py-6 md:py-8 text-center">
                    <p className="italic text-xs md:text-sm">{t.aiPrompt}</p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Expense Management Sidebar */}
      <div className="space-y-6 no-print">
        <div className="bg-white dark:bg-slate-900 p-6 md:p-7 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 flex items-center justify-center">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            {t.newExpense}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">{t.category}</label>
              <input
                type="text"
                value={newExpense.category}
                onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                placeholder=""
                className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 outline-none text-sm font-bold dark:text-slate-200"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">{t.amount} ({currency})</label>
              <input
                type="number"
                value={newExpense.amount}
                onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 outline-none text-sm font-bold dark:text-slate-200"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">{t.details}</label>
              <textarea
                value={newExpense.description}
                onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-400 outline-none h-20 resize-none text-sm font-medium dark:text-slate-300"
                placeholder={t.noteDetails}
              />
            </div>
            <button
              onClick={() => {
                if (!newExpense.category || newExpense.amount <= 0) return;
                onAddExpense({
                  id: Math.random().toString(36).substr(2, 9),
                  date: new Date().toISOString().split('T')[0],
                  category: newExpense.category,
                  amount: newExpense.amount,
                  description: newExpense.description
                });
                setNewExpense({ category: '', amount: 0, description: '' });
              }}
              className="w-full bg-slate-900 dark:bg-slate-950 text-white py-4 rounded-xl font-black text-sm hover:bg-slate-800 dark:hover:bg-slate-950/80 transition-all shadow-lg active:scale-95"
            >
              {t.addExpense}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 md:p-7 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-5">{t.history}</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
            {expenses.slice().reverse().map(exp => (
              <div key={exp.id} className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-800 last:border-0 group">
                <div>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">{exp.category}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{new Date(exp.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                    <p className="font-black text-rose-500 dark:text-rose-400">{currency}{exp.amount.toLocaleString()}</p>
                    {onDeleteExpense && (
                        <button 
                            onClick={() => {
                                if(confirm('Remove this expense record?')) onDeleteExpense(exp.id);
                            }}
                            className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    )}
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
                <p className="text-center py-8 text-slate-300 dark:text-slate-700 italic text-xs font-bold">{t.noRecords}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Finance;
