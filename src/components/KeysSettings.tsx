import React, { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { AppStatus } from '../types';

interface KeysSettingsProps {
  status: AppStatus | null;
  onRefresh: () => void;
}

export function KeysSettings({ status, onRefresh }: KeysSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [useTestnet, setUseTestnet] = useState(status?.useTestnet ?? true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, secretKey, useTestnet }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('تم حفظ المفاتيح بنجاح.');
        onRefresh();
        setApiKey('');
        setSecretKey('');
      } else {
        setMessage('فشل في حفظ المفاتيح.');
      }
    } catch (error) {
      setMessage('حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">إعدادات Binance API</h2>
        <p className="text-gray-400">قم بإدخال مفاتيح API الخاصة بك. يتم حفظها وتشفيرها بشكل آمن على الخادم.</p>
      </div>

      <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-blue-400 font-medium">ملاحظة حول شبكة الاختبار (Testnet) والرصيد</h4>
          <p className="text-blue-500/70 text-sm mt-1">
            الرصيد يكون صفراً إذا لم تقم بإدخال مفاتيح API صحيحة. للحصول على رصيد تجريبي مجاني، يجب عليك إنشاء حساب ومفاتيح API مخصصة لشبكة الاختبار من خلال زيارة الموقع: <a href="https://testnet.binance.vision/" target="_blank" rel="noreferrer" className="text-blue-300 underline">testnet.binance.vision</a>.
            مفاتيح حسابك الحقيقي لن تعمل على شبكة الاختبار.
          </p>
        </div>
      </div>

      {status?.hasKeys && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-green-400 font-medium">مفاتيح API مسجلة مسبقاً</h4>
            <p className="text-green-500/70 text-sm mt-1">النظام متصل حالياً باستخدام المفاتيح المحفوظة. يمكنك تحديثها بإدخال مفاتيح جديدة أدناه.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 bg-gray-800/50 border border-gray-700/50 p-6 rounded-2xl">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">API Key</label>
          <input
            type="text"
            required
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono text-left"
            placeholder="ادخل API Key"
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Secret Key</label>
          <input
            type="password"
            required
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono text-left"
            placeholder="ادخل Secret Key"
            dir="ltr"
          />
        </div>

        {message && (
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 text-sm border border-blue-500/20">
            {message}
          </div>
        )}

        <div className="flex items-center gap-3 bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
          <input
            type="checkbox"
            id="useTestnet"
            checked={useTestnet}
            onChange={(e) => setUseTestnet(e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500/50 bg-gray-800"
          />
          <label htmlFor="useTestnet" className="text-sm font-medium text-gray-300 cursor-pointer">
            تفعيل شبكة الاختبار (Paper Trading / Testnet)
          </label>
        </div>

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
              حفظ المفاتيح
            </>
          )}
        </button>
      </form>
    </div>
  );
}
