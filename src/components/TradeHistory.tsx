import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Trade } from '../types';
import { formatCurrency } from '../lib/utils';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await fetch('/api/trades');
        const data = await res.json();
        if (data.success) {
          setTrades(data.trades);
        }
      } catch (error) {
        console.error("Failed to fetch trades", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrades();
  }, []);

  return (
    <div className="max-w-5xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">سجل الصفقات</h2>
        <p className="text-gray-400">جميع الصفقات التي قام البوت بتنفيذها.</p>
      </div>

      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">جاري التحميل...</div>
        ) : trades.length === 0 ? (
          <div className="p-12 text-center text-gray-500">لا توجد صفقات مسجلة حتى الآن.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm whitespace-nowrap min-w-[700px]">
              <thead className="bg-gray-900/50 text-gray-400 border-b border-gray-700/50">
                <tr>
                  <th className="px-6 py-4 font-medium">الوقت</th>
                  <th className="px-6 py-4 font-medium">الزوج</th>
                  <th className="px-6 py-4 font-medium">النوع</th>
                  <th className="px-6 py-4 font-medium">سعر التنفيذ</th>
                  <th className="px-6 py-4 font-medium">الكمية</th>
                  <th className="px-6 py-4 font-medium">الأرباح/الخسائر (PnL)</th>
                  <th className="px-6 py-4 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">
                      {format(new Date(trade.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">{trade.symbol}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                        trade.side === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {trade.side === 'buy' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {trade.side === 'buy' ? 'شراء' : 'بيع'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-mono">{formatCurrency(trade.price)}</td>
                    <td className="px-6 py-4 text-gray-300 font-mono">{trade.amount}</td>
                    <td className="px-6 py-4 font-mono">
                      {trade.pnl !== undefined ? (
                        <span className={trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400 text-xs">{trade.status === 'open' ? 'مفتوحة' : 'مغلقة'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
