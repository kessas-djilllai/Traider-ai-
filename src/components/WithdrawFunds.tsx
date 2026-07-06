import React, { useState, useEffect } from 'react';
import { Wallet, Send, ArrowUpRight, CheckCircle, AlertTriangle, Clock, Coins, Info, ExternalLink, Loader2, ArrowRightLeft } from 'lucide-react';
import { AppStatus } from '../types';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';

interface WithdrawFundsProps {
  status: AppStatus | null;
  onRefresh: () => void;
}

export function WithdrawFunds({ status, onRefresh }: WithdrawFundsProps) {
  const [coin, setCoin] = useState('USDT');
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('TRX'); // 'TRX' is standard in CCXT Binance for Tron (TRC20)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Available coins for withdrawal
  const coins = [
    { code: 'USDT', name: 'Tether (USDT)', networkName: 'Tron (TRC20)', networkCode: 'TRX' },
    { code: 'TRX', name: 'Tron (TRX)', networkName: 'Tron (TRC20)', networkCode: 'TRX' },
    { code: 'BTC', name: 'Bitcoin (BTC)', networkName: 'Bitcoin Network', networkCode: 'BTC' },
    { code: 'ETH', name: 'Ethereum (ETH)', networkName: 'Ethereum (ERC20)', networkCode: 'ETH' },
  ];

  const fetchWithdrawalHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await fetch('/api/withdrawals');
      const data = await res.json();
      if (data.success) {
        setWithdrawals(data.withdrawals);
      }
    } catch (err) {
      console.error("Failed to fetch withdrawal history", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchWithdrawalHistory();
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Basic Validation
    if (!address) {
      setError('يرجى إدخال عنوان المحفظة المستلمة.');
      return;
    }

    // Tron address validation: must start with 'T' and be 34 characters
    if (network === 'TRX' && (!address.startsWith('T') || address.length !== 34)) {
      setError('عنوان محفظة Tron (TRC20) غير صالح. يجب أن يبدأ بـ الحرف T ويتكون من 34 حرفاً.');
      return;
    }

    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setError('يرجى إدخال مبلغ سحب صالح أكبر من الصفر.');
      return;
    }

    if (status && status.balance !== undefined && numericAmount > status.balance) {
      setError(`رصيدك المتاح الحالي هو ${status.balance} ${coin}. لا يمكن سحب مبلغ أكبر من الرصيد المتوفر.`);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: coin,
          amount: numericAmount,
          address,
          network,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message);
        setAmount('');
        setAddress('');
        fetchWithdrawalHistory();
        onRefresh();
      } else {
        setError(data.error || 'فشلت عملية السحب. يرجى التحقق من إعدادات المفاتيح أو الرصيد.');
      }
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ غير متوقع أثناء معالجة طلب السحب: ' + (err.message || String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxAmount = () => {
    if (status && status.balance !== undefined) {
      setAmount(status.balance.toString());
    }
  };

  const selectedCoinObj = coins.find(c => c.code === coin) || coins[0];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Wallet className="w-7 h-7 text-blue-500" />
          سحب الرصيد من Binance
        </h2>
        <p className="text-gray-400 text-sm">قم بسحب أموالك وأرباحك من منصة بينانس مباشرة عبر شبكة TRON TRC20 السريعة والآمنة.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form panel */}
        <div className="lg:col-span-7 bg-gray-900/50 border border-gray-800 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -z-10" />
          
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            إنشاء طلب سحب جديد
          </h3>

          <form onSubmit={handleWithdraw} className="space-y-5">
            {/* Coin selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 block">اختر العملة الرقمية</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {coins.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCoin(c.code);
                      setNetwork(c.networkCode);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      coin === c.code
                        ? 'bg-blue-600/10 border-blue-500 text-blue-400 font-bold'
                        : 'bg-gray-950/40 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
                    }`}
                  >
                    <Coins className="w-5 h-5 mx-auto mb-1.5 opacity-80" />
                    <span className="text-xs block">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Network Selector (Visual only, locked to TRC20 for TRX/USDT) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 block">شبكة التحويل (Network)</label>
              <div className="bg-gray-950/60 border border-gray-800 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-200 block text-sm">{selectedCoinObj.networkName}</span>
                  <span className="text-xs text-gray-500">عمولة تحويل منخفضة جداً وسرعة معالجة عالية جداً</span>
                </div>
                <span className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded-lg border border-blue-500/20 font-bold">
                  {selectedCoinObj.networkCode === 'TRX' ? 'TRC-20' : selectedCoinObj.networkCode}
                </span>
              </div>
            </div>

            {/* Recipient Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 block">عنوان محفظة المستلم (Address)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-left"
                placeholder="مثال: TJyG9p2Bf4X..."
              />
              {network === 'TRX' && (
                <p className="text-[11px] text-amber-500/80 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  ملاحظة: تأكد من أن عنوان المحفظة يدعم شبكة TRON (TRC20) ويبدأ دائماً بحرف T.
                </p>
              )}
            </div>

            {/* Amount and available balance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">مبلغ السحب (Amount)</label>
                <div className="text-xs text-gray-400">
                  الرصيد المتاح: <span className="text-blue-400 font-mono font-bold">{status?.balance !== undefined ? status.balance : '---'} {coin}</span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-16 pr-4 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-left font-mono"
                  placeholder="0.00"
                />
                <button
                  type="button"
                  onClick={handleMaxAmount}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs px-3 py-1.5 rounded-lg border border-blue-500/20 transition-all active:scale-95"
                >
                  الكل (MAX)
                </button>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-4 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm p-4 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/10 hover:bg-blue-500 active:scale-98 flex items-center justify-center gap-2 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري معالجة طلب السحب...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  سحب الرصيد الآن
                </>
              )}
            </button>
          </form>
        </div>

        {/* Informational sidebar */}
        <div className="lg:col-span-5 space-y-6">
          {/* Instructions card */}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 space-y-4">
            <h4 className="font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              تنبيهات أمان بالغة الأهمية ⚠️
            </h4>
            <ul className="space-y-3 text-xs text-gray-400 leading-relaxed list-disc list-inside pr-1">
              <li>يرجى مراجعة عنوان المحفظة بدقة بالغة. عمليات النقل على شبكة البلوكتشين <strong className="text-gray-200">نهائية ولا يمكن استرجاعها</strong> بأي حال من الأحوال.</li>
              <li>يرجى التأكد بنسبة 100% أن المحفظة المستلمة تدعم شبكة <strong className="text-blue-400">TRON (TRC20)</strong> لتفادي ضياع الأصول نهائياً.</li>
              <li>الحد الأدنى للسحب يعتمد على سياسة بينانس وعادةً ما يكون في حدود <strong className="text-gray-200">10 USDT</strong>.</li>
              {status?.useTestnet && (
                <li className="text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                  ⚠️ أنت تستخدم حساب تداول تجريبي حالياً (Demo Account). أي عملية سحب تقوم بها الآن ستتم <strong className="font-bold">محاكاتها وتوثيقها في السجل فقط</strong> للتأكد من نجاح البرمجة، ولن يترتب عليها أي سحب فعلي من رصيدك الحقيقي.
                </li>
              )}
            </ul>
          </div>

          {/* Fee calculator card */}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6">
            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              تقديرات الرسوم والوقت
            </h4>
            <div className="space-y-2.5 text-xs text-gray-300">
              <div className="flex justify-between border-b border-gray-700/40 pb-2">
                <span className="text-gray-400">شبكة النقل الأساسية:</span>
                <span className="font-bold text-blue-400">Tron (TRC-20)</span>
              </div>
              <div className="flex justify-between border-b border-gray-700/40 pb-2">
                <span className="text-gray-400">رسوم التحويل المقدرة:</span>
                <span className="font-mono text-green-400 font-bold">~ 1.00 USDT</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-gray-400">الوقت المتوقع للوصول:</span>
                <span className="font-bold">2 - 5 دقائق</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History log */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-800/80 flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            سجل طلبات السحب الأخيرة
          </h3>
          <button 
            onClick={fetchWithdrawalHistory}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            تحديث السجل
          </button>
        </div>

        {isLoadingHistory ? (
          <div className="p-10 text-center text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            جاري تحميل السجل التاريخي...
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            لا توجد أي عمليات سحب سابقة مسجلة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs whitespace-nowrap min-w-[700px]">
              <thead className="bg-gray-950/40 text-gray-400 border-b border-gray-800/60">
                <tr>
                  <th className="px-6 py-3 font-semibold">التاريخ والوقت</th>
                  <th className="px-6 py-3 font-semibold">المعرّف (ID)</th>
                  <th className="px-6 py-3 font-semibold">العملة والشبكة</th>
                  <th className="px-6 py-3 font-semibold">العنوان المستلم</th>
                  <th className="px-6 py-3 font-semibold text-left">المبلغ المسحوب</th>
                  <th className="px-6 py-3 font-semibold text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-800/20 transition-colors">
                    <td className="px-6 py-3.5 text-gray-400 font-mono">
                      {format(new Date(w.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-6 py-3.5 text-gray-300 font-mono max-w-[120px] truncate" title={w.id}>
                      {w.id}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{w.code}</span>
                        <span className="text-[10px] text-gray-500 bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800/55 font-mono">
                          {w.network === 'TRX' ? 'TRC20' : w.network}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-gray-400 font-mono text-xs max-w-[200px] truncate" title={w.address}>
                      {w.address}
                    </td>
                    <td className="px-6 py-3.5 text-left font-mono font-bold text-white">
                      {w.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {w.code}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                        w.status === 'success' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                          : w.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {w.status === 'success' ? 'مكتمل' : w.status === 'pending' ? 'معلق' : 'فشل'}
                        {w.isSimulated && <span className="text-[9px] text-blue-400 ml-1 font-bold">(تجريبي)</span>}
                      </span>
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
