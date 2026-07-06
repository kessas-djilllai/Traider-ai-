import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { AppStatus, BotSettings } from '../types';

interface BotSettingsProps {
  status: AppStatus | null;
  onRefresh: () => void;
}

export function BotConfiguration({ status, onRefresh }: BotSettingsProps) {
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status) {
      setSettings(status.settings);
    }
  }, [status]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('تم حفظ الإعدادات بنجاح.');
        onRefresh();
      }
    } catch (error) {
      setMessage('حدث خطأ أثناء الحفظ.');
    } finally {
      setLoading(false);
    }
  };

  if (!settings) return null;

  return (
    <div className="max-w-3xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">إعدادات استراتيجية التداول</h2>
        <p className="text-gray-400">تكوين مؤشرات الخطر وأزواج التداول والوقف التلقائي.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 md:space-y-8 bg-gray-800/50 border border-gray-700/50 p-4 md:p-8 rounded-2xl">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">زوج التداول (Symbol)</label>
            <select
              value={settings.symbol}
              onChange={(e) => setSettings({ ...settings, symbol: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-left"
              dir="ltr"
            >
              <option value="BTC/USDT">BTC/USDT</option>
              <option value="ETH/USDT">ETH/USDT</option>
              <option value="SOL/USDT">SOL/USDT</option>
              <option value="BNB/USDT">BNB/USDT</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">الإطار الزمني (Timeframe)</label>
            <select
              value={settings.timeframe}
              onChange={(e) => setSettings({ ...settings, timeframe: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-left"
              dir="ltr"
            >
              <option value="1m">1 Minute</option>
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
            </select>
          </div>
        </div>

        <hr className="border-gray-700" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">حجم المخاطرة (%)</label>
            <input
              type="number"
              step="0.1"
              value={settings.riskPercentage}
              onChange={(e) => setSettings({ ...settings, riskPercentage: parseFloat(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-left"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">جني الأرباح (TP %)</label>
            <input
              type="number"
              step="0.1"
              value={settings.takeProfit}
              onChange={(e) => setSettings({ ...settings, takeProfit: parseFloat(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-left"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">وقف الخسارة (SL %)</label>
            <input
              type="number"
              step="0.1"
              value={settings.stopLoss}
              onChange={(e) => setSettings({ ...settings, stopLoss: parseFloat(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-left"
              dir="ltr"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
          <input
            type="checkbox"
            id="trailingStop"
            checked={settings.trailingStop}
            onChange={(e) => setSettings({ ...settings, trailingStop: e.target.checked })}
            className="w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500/50 bg-gray-800"
          />
          <label htmlFor="trailingStop" className="text-sm font-medium text-gray-300 cursor-pointer">
            تفعيل الوقف المتحرك (Trailing Stop)
          </label>
        </div>

        {message && (
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 text-sm border border-blue-500/20">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="animate-pulse">جاري الحفظ...</span>
          ) : (
            <>
              <Save className="w-5 h-5" />
              حفظ الإعدادات
            </>
          )}
        </button>
      </form>
    </div>
  );
}
