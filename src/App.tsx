import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Send, 
  RefreshCw, 
  Key, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Clock, 
  Loader2, 
  Lock, 
  Eye, 
  EyeOff,
  Copy,
  Check,
  TrendingUp,
  LogOut,
  User as UserIcon,
  Users,
  Database,
  Trash2,
  Shield,
  Edit3,
  Search,
  ArrowLeft,
  CheckSquare,
  XSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { TradingChart } from './components/TradingChart';

interface AppStatus {
  botStatus: 'idle' | 'running';
  tradingStartTime: number | null;
  tradingRemainingSeconds: number;
  extraProfit: number;
  hasKeys: boolean;
  balance: number;
  realBalance: number;
  spotBalance?: number;
  fundingBalance?: number;
  lastError?: string;
}

interface Withdrawal {
  id: string;
  timestamp: number;
  code: string;
  amount: number;
  address: string;
  network: string;
  status: string;
  isSimulated: boolean;
}

export default function App() {
  const [user, setUser] = useState<string | null>(localStorage.getItem('username'));
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [status, setStatus] = useState<AppStatus | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // API Keys
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [useTestnet, setUseTestnet] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [keysMessage, setKeysMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Withdrawal Form
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState<string | null>(null);

  const [serverIp, setServerIp] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);

  // Admin View State
  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editExtraProfit, setEditExtraProfit] = useState('');
  const [editLastKnownBalance, setEditLastKnownBalance] = useState('');
  const [updatingBalance, setUpdatingBalance] = useState(false);
  const [deletingUsername, setDeletingUsername] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Supabase Live Config Form State
  const [showSupabaseForm, setShowSupabaseForm] = useState(false);
  const [supabaseInputUrl, setSupabaseInputUrl] = useState('');
  const [supabaseInputKey, setSupabaseInputKey] = useState('');
  const [savingSupabaseConfig, setSavingSupabaseConfig] = useState(false);

  const ADMIN_EMAILS = ["0696666164dj@gmail.com", "admin", "admin@gmail.com"];
  const isAdmin = user ? ADMIN_EMAILS.includes(user.trim().toLowerCase()) : false;
  
  // Dynamic countdown timer state
  const [countdown, setCountdown] = useState<number>(0);

  // custom floating toast and modal states for premium UI
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [modalData, setModalData] = useState<{ type: 'success' | 'error' | 'info'; title: string; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 4000);
  };

  // Fetch Server IP
  const fetchServerIp = async () => {
    try {
      const res = await fetch('/api/server-ip');
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return; // Silently ignore HTML responses during server boot/restarts
      }
      const data = await res.json();
      if (data.success) {
        setServerIp(data.ip);
      }
    } catch (err) {
      console.error("Failed to fetch server IP", err);
    }
  };

  // Helper for authenticated headers
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'x-username': user || '',
    };
  };

  // Fetch status of the logged-in user
  const fetchStatus = async (showLoading = false) => {
    if (!user) return;
    if (showLoading) setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/status', {
        headers: getAuthHeaders()
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return; // Silently ignore HTML responses during server boot/restarts
      }
      const data = await res.json();
      setStatus(data);
      if (data.tradingRemainingSeconds !== undefined) {
        setCountdown(data.tradingRemainingSeconds);
      }
    } catch (error) {
      console.error("Failed to fetch status", error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Fetch withdrawals of the logged-in user
  const fetchWithdrawalHistory = async (showLoading = false) => {
    if (!user) return;
    if (showLoading) setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/withdrawals', {
        headers: getAuthHeaders()
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return; // Silently ignore HTML responses during server boot/restarts
      }
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

  // Handle countdown tick down
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Timer finished, refresh status to trigger backend profit collection
          fetchStatus(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // Initial loads and background intervals
  useEffect(() => {
    fetchServerIp();
  }, []);

  useEffect(() => {
    if (user) {
      fetchStatus(true);
      fetchWithdrawalHistory(true);

      const interval = setInterval(() => {
        fetchStatus(false);
        fetchWithdrawalHistory(false);
      }, 7000);

      return () => clearInterval(interval);
    }
  }, [user]);

  // Handle Auth submission
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('username', data.username);
        setUser(data.username);
        setAuthUsername('');
        setAuthPassword('');
      } else {
        setAuthError(data.error || 'حدث خطأ أثناء معالجة الطلب.');
      }
    } catch (err) {
      setAuthError('تعذر الاتصال بالخادم.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    setUser(null);
    setStatus(null);
    setWithdrawals([]);
    setKeysMessage(null);
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/google/url");
      const data = await res.json();
      if (data.success && data.url) {
        const width = 500;
        const height = 655;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const authWindow = window.open(
          data.url,
          "google_oauth_popup",
          `width=${width},height=${height},top=${top},left=${left}`
        );

        if (!authWindow) {
          setAuthError("تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة من إعدادات المتصفح ثم المحاولة مجدداً.");
        }
      } else {
        setAuthError("تعذر جلب رابط تسجيل الدخول عبر Google.");
      }
    } catch (err) {
      setAuthError("خطأ في الاتصال بالخادم.");
    }
  };

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.username) {
        const loggedUsername = event.data.username;
        localStorage.setItem('username', loggedUsername);
        setUser(loggedUsername);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setAuthError(event.data.error || "فشل تسجيل الدخول عبر Google.");
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // Save API keys
  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !secretKey) {
      setKeysMessage({ type: 'error', text: 'يرجى إدخال المفتاح والمفتاح السري.' });
      return;
    }

    setIsSavingKeys(true);
    setKeysMessage(null);

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ apiKey, secretKey, useTestnet }),
      });
      const data = await res.json();
      if (data.success) {
        setKeysMessage({ type: 'success', text: 'تم حفظ مفاتيح API بنجاح.' });
        setApiKey('');
        setSecretKey('');
        fetchStatus(true);
      } else {
        setKeysMessage({ type: 'error', text: data.error || 'فشل الحفظ.' });
      }
    } catch (err) {
      setKeysMessage({ type: 'error', text: 'حدث خطأ في الاتصال بالخادم.' });
    } finally {
      setIsSavingKeys(false);
    }
  };

  // Trigger Trading Loop
  const handleStartTrading = async () => {
    if (!status?.hasKeys) {
      setKeysMessage({ type: 'error', text: 'يرجى تكوين مفاتيح API أولاً لتفعيل التداول.' });
      return;
    }

    try {
      const res = await fetch('/api/user/start-trading', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus(true);
        showToast("تم تفعيل التداول الذكي بنجاح للـ 24 ساعة القادمة!", "success");
      } else {
        setModalData({
          type: 'error',
          title: 'تعذر تفعيل التداول الذكي',
          text: data.error || 'فشلت عملية بدء التداول، يرجى التحقق من إعدادات الربط وحالة السوق.'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Admin Users & Supabase Status
  const fetchAdminData = async () => {
    setAdminLoading(true);
    setAdminMessage(null);
    try {
      const headers = getAuthHeaders();
      const [usersRes, sbRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/supabase-status', { headers })
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.success) {
          setAdminUsers(usersData.users || []);
        }
      }

      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (sbData.success) {
          setSupabaseStatus(sbData);
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin data", err);
      setAdminMessage({ type: 'error', text: 'فشل جلب بيانات المسؤول من الخادم.' });
    } finally {
      setAdminLoading(false);
    }
  };

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseInputUrl || !supabaseInputKey) {
      setAdminMessage({ type: 'error', text: 'يرجى إدخال الرابط والمفتاح معاً.' });
      return;
    }
    setSavingSupabaseConfig(true);
    setAdminMessage(null);
    try {
      const res = await fetch('/api/admin/supabase-config', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          url: supabaseInputUrl,
          anonKey: supabaseInputKey
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdminMessage({ type: 'success', text: data.message || 'تم تحديث إعدادات Supabase بنجاح.' });
        setShowSupabaseForm(false);
        fetchAdminData();
      } else {
        setAdminMessage({ type: 'error', text: data.error || 'فشل التحديث.' });
      }
    } catch (err) {
      console.error(err);
      setAdminMessage({ type: 'error', text: 'خطأ في الاتصال بالخادم.' });
    } finally {
      setSavingSupabaseConfig(false);
    }
  };

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUpdatingBalance(true);
    setAdminMessage(null);

    try {
      const res = await fetch('/api/admin/update-balance', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: editingUser.username,
          extraProfit: Number(editExtraProfit),
          lastKnownBalance: Number(editLastKnownBalance)
        })
      });

      const data = await res.json();
      if (data.success) {
        setAdminMessage({ type: 'success', text: 'تم تحديث البيانات بنجاح.' });
        setEditingUser(null);
        fetchAdminData();
      } else {
        setAdminMessage({ type: 'error', text: data.error || 'فشل التحديث.' });
      }
    } catch (err) {
      setAdminMessage({ type: 'error', text: 'خطأ في الاتصال بالخادم.' });
    } finally {
      setUpdatingBalance(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    setAdminMessage(null);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username })
      });

      const data = await res.json();
      if (data.success) {
        setAdminMessage({ type: 'success', text: 'تم حذف الحساب بنجاح.' });
        setDeletingUsername(null);
        fetchAdminData();
      } else {
        setAdminMessage({ type: 'error', text: data.error || 'فشل الحذف.' });
      }
    } catch (err) {
      setAdminMessage({ type: 'error', text: 'خطأ في الاتصال بالخادم.' });
    }
  };

  // Withdraw Funds
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawalError(null);
    setWithdrawalSuccess(null);

    if (!status?.hasKeys) {
      setWithdrawalError('يرجى حفظ مفاتيح API أولاً.');
      return;
    }

    if (!address) {
      setWithdrawalError('يرجى إدخال عنوان المحفظة.');
      return;
    }

    if (!address.startsWith('T') || address.length !== 34) {
      setWithdrawalError('عنوان TRC-20 غير صالح (يجب أن يبدأ بحرف T ويتكون من 34 حرفاً).');
      return;
    }

    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setWithdrawalError('يرجى إدخال مبلغ صحيح.');
      return;
    }

    const availableBalance = status?.balance || 0;
    if (numericAmount > availableBalance) {
      setWithdrawalError('المبلغ المطلوب يتجاوز رصيدك الحالي.');
      return;
    }

    setIsWithdrawing(true);

    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          code: 'USDT',
          amount: numericAmount,
          address,
          network: 'TRX',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setWithdrawalSuccess(data.message);
        setAmount('');
        setAddress('');
        fetchStatus(false);
        fetchWithdrawalHistory(false);
      } else {
        setWithdrawalError(data.error || 'فشلت عملية السحب.');
      }
    } catch (err) {
      setWithdrawalError('خطأ أثناء معالجة السحب.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleMaxAmount = () => {
    if (status && status.balance !== undefined) {
      setAmount(status.balance.toString());
    }
  };

  // Format countdown text to readable Arabic hours, minutes, seconds
  const formatCountdown = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Render Login / Registration UI
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-center items-center px-4" dir="rtl">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl shadow-slate-100">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-600 shadow-sm">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900">منصة التداول الخوارزمي الذكي</h2>
            <p className="text-xs text-slate-500">سجل الدخول أو أنشئ حسابك لبدء تداول الأصول المشفرة تلقائياً بنسبة عائد %30 يومياً.</p>
          </div>

          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(null); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                authMode === 'login' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(null); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                authMode === 'register' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              إنشاء حساب جديد
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <input
                type="text"
                required
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                placeholder="اسم المستخدم"
              />
            </div>
            <div className="space-y-1">
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                placeholder="كلمة المرور"
              />
            </div>

            {authError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[11px] p-3 rounded-xl flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                authMode === 'login' ? 'دخول الحساب' : 'إنشاء وتفعيل الحساب'
              )}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-[10px]">أو الاستمرار باستخدام</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-2xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-200/90 shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.93 1 12 1 7.24 1 3.2 3.73 1.24 7.72l3.84 2.98C6.04 7.56 8.78 5.04 12 5.04z"/>
              <path fill="#4285F4" d="M23.48 12.25c0-.82-.07-1.6-.2-2.35H12v4.45h6.44c-.28 1.44-1.1 2.66-2.33 3.48v2.9h3.76c2.2-2.02 3.61-5.02 3.61-8.48z"/>
              <path fill="#FBBC05" d="M5.08 10.7a6.97 6.97 0 0 1 0-2.6L1.24 5.12a11.96 11.96 0 0 0 0 10.76l3.84-2.98c-.23-.65-.36-1.35-.36-2.2z"/>
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.76-2.9c-1.1.74-2.52 1.18-4.2 1.18-3.22 0-5.96-2.52-6.92-5.64L1.24 15.7C3.2 19.69 7.24 23 12 23z"/>
            </svg>
            تسجيل الدخول / التسجيل عبر Google
          </button>
        </div>
      </div>
    );
  }

  // --- Main Dashboard UI ---
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between font-sans antialiased relative overflow-hidden animate-fade-in" dir="rtl">
      {/* Premium ambient light filters */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-96 h-96 bg-emerald-500/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-40 shadow-sm shadow-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-0.5 text-right">
              <h1 className="text-sm font-black text-slate-900 tracking-wide leading-none">منصة التداول الخوارزمي الممتاز</h1>
              <p className="text-[9px] text-slate-400 font-medium tracking-wide">نظام المؤشرات الآلية المتطور &bull; Premium Edition</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (view === 'dashboard') {
                    setView('admin');
                    fetchAdminData();
                  } else {
                    setView('dashboard');
                  }
                }}
                className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 border cursor-pointer ${
                  view === 'admin' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600/30' 
                    : 'bg-slate-100 text-blue-600 hover:text-blue-700 border-slate-200/50 hover:bg-slate-200/50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{view === 'admin' ? "الرئيسية" : "لوحة التحكم للمشرف"}</span>
                <span className="absolute -top-1 -left-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              </button>
            )}

            {serverIp && (
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200/50 text-[10px]">
                <span className="text-slate-500 font-mono">IP: {serverIp}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(serverIp);
                    setCopiedIp(true);
                    showToast("تم نسخ عنوان الخادم IP!", "success");
                    setTimeout(() => setCopiedIp(false), 2000);
                  }}
                  className="text-blue-600 hover:text-blue-700 font-bold"
                >
                  {copiedIp ? "تم!" : "نسخ"}
                </button>
              </div>
            )}

            <div className="flex items-center gap-2.5 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200/50 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-800 font-black">{user}</span>
              <button
                onClick={handleLogout}
                className="p-1 hover:bg-slate-200/60 rounded-lg text-rose-500 hover:text-rose-600 transition-all mr-1.5 cursor-pointer"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {view === 'admin' ? (
        <main className="max-w-4xl w-full mx-auto px-4 py-6 flex-1 space-y-6">
          {/* Header section of Admin Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900/30 border border-gray-850 p-5 rounded-2xl">
            <div className="space-y-1 text-right">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                لوحة التحكم للمشرف
              </h2>
              <p className="text-[10px] text-gray-500">
                مرحباً بك في لوحة الإدارة. يمكنك من هنا مراجعة وتعديل بيانات جميع المستخدمين والتحقق من حالة اتصال قاعدة بيانات Supabase.
              </p>
            </div>
            <button
              onClick={fetchAdminData}
              disabled={adminLoading}
              className="px-3.5 py-2 bg-gray-900 hover:bg-gray-850 text-gray-300 border border-gray-800 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} />
              <span>تحديث البيانات</span>
            </button>
          </div>

          {/* Database Status Panel */}
          {supabaseStatus && (
            <div className="bg-gray-900/20 border border-gray-900 p-5 rounded-2xl space-y-4 text-right">
              <div className="flex items-center justify-between border-b border-gray-900 pb-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  supabaseStatus.connected 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {supabaseStatus.connected ? 'متصل بنجاح' : 'غير متصل'}
                </span>
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-500" />
                  حالة ربط قاعدة بيانات Supabase
                </h3>
              </div>

              {!supabaseStatus.connected ? (
                <div className="space-y-3">
                  <div className="text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl space-y-1">
                    <p className="font-bold flex items-center gap-1 justify-end">
                      ملاحظة مهمة لمزامنة البيانات:
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </p>
                    <p>
                      لتفعيل الربط السحابي ومزامنة بيانات المستخدمين بـ Supabase، يرجى تشغيل الأمر التالي في SQL Editor داخل لوحة تحكم Supabase الخاصة بك لإنشاء الجدول المطلوب:
                    </p>
                  </div>

                  <div className="relative font-mono">
                    <pre className="bg-black/40 text-left text-gray-300 text-[10px] p-4 rounded-xl border border-gray-900 overflow-x-auto select-all">
{`create table if not exists app_store (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);`}
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`create table if not exists app_store (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);`);
                        showToast("تم نسخ كود SQL بنجاح!", "success");
                      }}
                      className="absolute top-2 left-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-[10px] text-blue-400 font-bold px-2.5 py-1 rounded transition-all active:scale-95 cursor-pointer"
                    >
                      نسخ الكود
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    * تأكد أيضاً من إضافة المتغيرات البيئية <code className="font-mono text-gray-400 text-[11px]">SUPABASE_URL</code> و <code className="font-mono text-gray-400 text-[11px]">SUPABASE_ANON_KEY</code> في ملف إعدادات الخادم ليعمل الاتصال تلقائياً أو أدخلهما بالأسفل يدوياً.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-900 space-y-1 text-left font-mono">
                    <span className="text-gray-500 text-[10px]">Supabase URL</span>
                    <p className="text-gray-300 truncate">{supabaseStatus.supabaseUrl}</p>
                  </div>
                  <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-900 space-y-1 text-left font-mono">
                    <span className="text-gray-500 text-[10px]">API Key (Anon)</span>
                    <p className="text-gray-300 truncate">{supabaseStatus.supabaseKey}</p>
                  </div>
                </div>
              )}

              {/* Dynamic manual keys config form */}
              <div className="border-t border-gray-900/60 pt-4 mt-4 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setShowSupabaseForm(!showSupabaseForm);
                    if (supabaseStatus) {
                      setSupabaseInputUrl(supabaseStatus.supabaseUrl || '');
                      setSupabaseInputKey('');
                    }
                  }}
                  className="px-3 py-1.5 bg-gray-900 hover:bg-gray-850 text-blue-400 border border-gray-850 text-[10px] font-bold rounded-lg transition-all"
                >
                  {showSupabaseForm ? "إغلاق نافذة الإعدادات" : "إعداد / تعديل بيانات ربط Supabase السحابي"}
                </button>

                {showSupabaseForm && (
                  <form onSubmit={handleSaveSupabaseConfig} className="mt-4 bg-gray-950/40 p-4 border border-gray-900 rounded-xl space-y-3">
                    <p className="text-[10px] text-gray-400 text-right">
                      يمكنك هنا إدخال بيانات مشروع Supabase الخاص بك يدوياً ليقوم التطبيق بمزامنة وحفظ بيانات الحسابات سحابياً بشكل فوري وتلقائي.
                    </p>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-bold block text-right">رابط المشروع (SUPABASE_URL)</label>
                      <input
                        type="url"
                        required
                        placeholder="https://xxxxxx.supabase.co"
                        value={supabaseInputUrl}
                        onChange={(e) => setSupabaseInputUrl(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-850 hover:border-gray-800 focus:border-blue-600 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition-all text-left font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-bold block text-right">مفتاح Anon أو Service Role Key</label>
                      <input
                        type="password"
                        required
                        placeholder="أدخل مفتاح الـ API الخاص بـ Supabase..."
                        value={supabaseInputKey}
                        onChange={(e) => setSupabaseInputKey(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-850 hover:border-gray-800 focus:border-blue-600 rounded-xl py-2 px-3 text-xs text-white focus:outline-none transition-all text-left font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingSupabaseConfig}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      {savingSupabaseConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "حفظ بيانات الربط واختبار الاتصال"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Admin alert notifications */}
          {adminMessage && (
            <div className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
              adminMessage.type === 'success' 
                ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' 
                : 'bg-rose-500/5 border-rose-500/10 text-rose-400'
            }`}>
              {adminMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" /> }
              <span>{adminMessage.text}</span>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute right-3.5 top-3 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="البحث عن مستخدم بالبريد أو اسم المستخدم..."
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              className="w-full bg-gray-900/40 border border-gray-850 hover:border-gray-800 focus:border-blue-600 rounded-xl py-2.5 pr-10 pl-4 text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-all text-right"
            />
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-right">
            {adminLoading ? (
              <div className="col-span-2 py-12 flex flex-col items-center justify-center gap-2.5 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-xs">جاري تحميل بيانات المستخدمين...</span>
              </div>
            ) : adminUsers.filter(u => u.username.toLowerCase().includes(adminSearch.toLowerCase())).length === 0 ? (
              <div className="col-span-2 py-12 text-center text-gray-500 text-xs border border-dashed border-gray-900 rounded-2xl">
                لا يوجد مستخدمين مسجلين يطابقون البحث حالياً.
              </div>
            ) : (
              adminUsers
                .filter(u => u.username.toLowerCase().includes(adminSearch.toLowerCase()))
                .map((u) => {
                  const isUserAdmin = ADMIN_EMAILS.includes(u.username.trim().toLowerCase());
                  return (
                    <div 
                      key={u.username}
                      className="bg-gray-900/10 border border-gray-900 rounded-2xl p-5 hover:border-gray-850 transition-all flex flex-col justify-between gap-4"
                    >
                      {/* Card Header */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          {isUserAdmin && (
                            <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[9px] font-bold shrink-0">
                              مسؤول
                            </span>
                          )}
                          <div className="flex items-center gap-2.5 text-right">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0 font-mono">
                              {u.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-0.5 max-w-[160px] sm:max-w-[200px]">
                              <p className="text-xs font-bold text-white truncate text-left" title={u.username}>{u.username}</p>
                              <p className="text-[10px] text-gray-500 truncate text-left">تاريخ التسجيل تلقائي</p>
                            </div>
                          </div>
                        </div>

                        <div className="h-[1px] bg-gray-900 w-full" />

                        {/* Binance Balance Info */}
                        <div className="space-y-2">
                          <p className="text-[10px] text-gray-500 font-bold">رصيد بيننس (Binance Balance)</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-gray-950/60 py-1.5 px-1 rounded-lg border border-gray-900">
                              <span className="text-[8px] text-gray-500 block">Spot</span>
                              <span className="font-mono text-[10px] text-white font-bold">{u.spotBalance.toFixed(2)} $</span>
                            </div>
                            <div className="bg-gray-950/60 py-1.5 px-1 rounded-lg border border-gray-900">
                              <span className="text-[8px] text-gray-500 block">Funding</span>
                              <span className="font-mono text-[10px] text-white font-bold">{u.fundingBalance.toFixed(2)} $</span>
                            </div>
                            <div className="bg-gray-950/60 py-1.5 px-1 rounded-lg border border-gray-900">
                              <span className="text-[8px] text-gray-500 block">الكل</span>
                              <span className="font-mono text-[10px] text-blue-400 font-black">{(u.lastKnownBalance + u.extraProfit).toFixed(2)} $</span>
                            </div>
                          </div>
                        </div>

                        {/* API keys check */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                              u.hasKeys ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {u.hasKeys ? (
                                <>
                                  <CheckSquare className="w-3.5 h-3.5" />
                                  <span>تم الإدخال ({u.apiKeyPrefix})</span>
                                </>
                              ) : (
                                <>
                                  <XSquare className="w-3.5 h-3.5" />
                                  <span>غير مدخلة</span>
                                </>
                              )}
                            </span>
                            <span className="text-[10px] text-gray-500">مفاتيح API & Key Secret:</span>
                          </div>

                          {/* Withdrawal check */}
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                              u.hasKeys ? 'text-emerald-400' : 'text-gray-500'
                            }`}>
                              {u.hasKeys ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>تعمل (رسمي)</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>معطلة (مفاتيح مفقودة)</span>
                                </>
                              )}
                            </span>
                            <span className="text-[10px] text-gray-500 font-bold">حالة تفعيل السحب:</span>
                          </div>

                          {/* Trading status */}
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              u.tradingStatus === 'running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse' : 'bg-gray-800 text-gray-400'
                            }`}>
                              {u.tradingStatus === 'running' ? 'نشط ومستمر' : 'غير مفعل'}
                            </span>
                            <span className="text-[10px] text-gray-500">حالة التداول الذكي:</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-2 border-t border-gray-900 pt-3">
                        {!isUserAdmin && (
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من رغبتك في حذف المستخدم ${u.username} تماماً؟`)) {
                                handleDeleteUser(u.username);
                              }
                            }}
                            className="p-1.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 text-rose-400 rounded-lg transition-all"
                            title="حذف الحساب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditExtraProfit(u.extraProfit);
                            setEditLastKnownBalance(u.lastKnownBalance);
                          }}
                          className="flex-1 py-1.5 bg-gray-900 hover:bg-gray-850 text-blue-400 border border-gray-850 hover:border-gray-800 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>تعديل الرصيد والأرباح</span>
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Edit Balance Modal */}
          {editingUser && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-right" dir="rtl">
              <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <button 
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    تعديل أرصدة {editingUser.username}
                  </h4>
                </div>

                <form onSubmit={handleUpdateBalance} className="space-y-3.5 text-right">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold block">الرصيد الأساسي (Binance USDT)</label>
                    <input
                      type="number"
                      step="any"
                      value={editLastKnownBalance}
                      onChange={(e) => setEditLastKnownBalance(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none transition-all text-left font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold block">الأرباح المتراكمة الإضافية (Extra Profit USDT)</label>
                    <input
                      type="number"
                      step="any"
                      value={editExtraProfit}
                      onChange={(e) => setEditExtraProfit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none transition-all text-left font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={updatingBalance}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {updatingBalance ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "حفظ التغييرات"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      ) : (
        <main className="max-w-4xl w-full mx-auto px-4 py-6 md:py-8 flex-1 space-y-6 md:space-y-8 relative z-10">
          {/* 1. Live Candlestick Chart Display (بطاقة التداول) */}
          <div className="bg-white border border-slate-200/90 shadow-lg shadow-slate-100 rounded-3xl p-4 sm:p-6 space-y-4 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600 border border-blue-100 shadow-sm">
                  <TrendingUp className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-0.5 text-right">
                  <h3 className="text-xs font-black tracking-wide text-slate-900">منصة تحليلات التداول الفني المباشر</h3>
                  <p className="text-[9px] text-slate-400 font-medium">مؤشرات السوق والاتجاهات الحالية لأصل BTC/USDT</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto text-[9px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold">اتصال مباشر بـ Binance Websocket</span>
              </div>
            </div>
            
            <div className="p-1.5 bg-slate-50/50 rounded-2xl border border-slate-100">
              <TradingChart botStatus={status?.botStatus || 'idle'} tradingRemainingSeconds={status?.tradingRemainingSeconds || 0} />
            </div>
          </div>

          {/* 2. Interactive AI Bot Control Section (التحكم في الروبوت) */}
          {status?.botStatus === 'running' ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-8 shadow-lg shadow-slate-100 text-center space-y-4 overflow-hidden group transition-all duration-300">
              <div className="space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
                  <TrendingUp className="w-5 h-5 animate-pulse" />
                </div>
                <h3 className="text-sm font-black text-slate-900">نظام التداول التلقائي الفعال (مستمر)</h3>
                <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                  الذكاء الاصطناعي يقوم الآن بفتح وإغلاق صفقات مجهرية سريعة استناداً إلى تقاطعات RSI وتدفق السيولة الحية.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center gap-3">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">الوقت المتبقي لانتهاء الجلسة وتوزيع الأرباح</span>
                <div className="relative inline-flex items-center justify-center bg-slate-50 px-8 sm:px-12 py-4 sm:py-5 rounded-2xl border border-emerald-200 shadow-sm">
                  <span className="relative font-mono text-xl sm:text-2xl md:text-3xl font-black text-emerald-600 tracking-widest leading-none">
                    {formatCountdown(countdown)}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 max-w-md mx-auto leading-relaxed">
                يقوم النظام التلقائي الآن بمراقبة وإجراء صفقات سريعة لتحقيق نسبة الربح المستهدفة <strong className="text-emerald-600">%30</strong> بشكل آمن ومحمي بالكامل عبر خوارزميات الذكاء الاصطناعي الفائقة.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-8 shadow-lg shadow-slate-100 text-center space-y-4 overflow-hidden group transition-all duration-300">
              <div className="space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900">نظام التداول الذكي المؤقت (24 ساعة)</h3>
                <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                  بمجرد تفعيل التداول، سيبدأ النظام بالعمل فوراً ويتم قفل الجلسة آلياً لمدة 24 ساعة لضمان تحقيق نسبة الأرباح المستهدفة (%30). لا يمكن إيقاف العملية يدوياً بعد البدء.
                </p>
              </div>

              <div className="pt-2 max-w-sm mx-auto">
                <button
                  onClick={handleStartTrading}
                  disabled={!status?.hasKeys}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 px-6 rounded-2xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>تفعيل التداول الذكي (+30% ربح)</span>
                </button>
                {!status?.hasKeys && (
                  <p className="text-[9px] text-rose-500 mt-2 font-bold">يرجى حفظ واختبار مفاتيح API أولاً لتفعيل التداول.</p>
                )}
              </div>
            </div>
          )}

          {/* Balance & Withdrawal Layout Block */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

            {/* 3. Balance Card (الرصيد) */}
            <div className="md:col-span-5 bg-white border border-slate-200/90 hover:border-slate-300/90 shadow-lg shadow-slate-100 rounded-3xl p-6 flex flex-col justify-between min-h-[220px] transition-all duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 rounded-xl text-blue-400 border border-blue-500/20 shadow-inner">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5 text-right">
                    <h3 className="text-xs font-black text-white">إجمالي الرصيد المتوفر</h3>
                    <p className="text-[9px] text-gray-400 font-medium">الأصول المربوطة والموثقة من منصة Binance</p>
                  </div>
                </div>
                
                <button
                  onClick={() => fetchStatus(true)}
                  disabled={isLoadingStatus}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white border border-white/5 transition-all cursor-pointer"
                  title="تحديث الرصيد"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="my-5 text-right">
                {!status?.hasKeys ? (
                  <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl text-center space-y-1.5">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto animate-bounce" />
                    <p className="text-xs text-amber-400 font-bold">الربط غير مكتمل</p>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      الرجاء تزويد وحفظ مفاتيح Binance API بالأسفل لعرض رصيدك الفعلي وبدء التشغيل التلقائي.
                    </p>
                  </div>
                ) : status?.lastError ? (
                  <div className="space-y-4">
                    <div className="flex items-baseline justify-center sm:justify-start gap-1.5 py-1">
                      <span className="text-3xl md:text-4xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_12px_rgba(255,255,255,0.05)]">
                        {status.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-emerald-400 font-black text-xs uppercase">USDT</span>
                    </div>

                    {/* Glassmorphic Red Warning Box */}
                    <div className="bg-rose-500/10 border border-rose-500/25 p-4 rounded-2xl flex items-start gap-3 shadow-lg shadow-rose-950/25 text-right">
                      <div className="p-1.5 bg-rose-500/20 rounded-xl text-rose-400 border border-rose-500/30 shadow-inner mt-0.5 shrink-0 animate-pulse">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-rose-400">تنبيه اتصال API منصة Binance</h4>
                        <p className="text-[10px] text-gray-300 leading-relaxed">
                          {status.lastError}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-baseline justify-center sm:justify-start gap-1.5 py-1">
                      <span className="text-3xl md:text-4xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_12px_rgba(255,255,255,0.05)]">
                        {status.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-emerald-400 font-black text-xs uppercase">USDT</span>
                    </div>
                    
                    {/* Spot and Funding Breakdown */}
                    {status.spotBalance !== undefined && status.fundingBalance !== undefined && (status.spotBalance > 0 || status.fundingBalance > 0) && (
                      <div className="flex flex-col gap-2 text-[10px] text-gray-400 bg-black/35 p-3 rounded-2xl border border-white/5 shadow-inner">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">رصيد الفوري (Spot):</span>
                          <span className="font-mono text-gray-200 font-bold">{status.spotBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">رصيد التمويل (Funding):</span>
                          <span className="font-mono text-gray-200 font-bold">{status.fundingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</span>
                        </div>
                        {status.extraProfit > 0 && (
                          <div className="flex justify-between items-center border-t border-white/5 pt-2 text-emerald-400 font-bold">
                            <span>الأرباح التراكمية الخوارزمية:</span>
                            <span className="font-mono text-emerald-300 font-black">+{status.extraProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-gray-400 flex justify-between items-center border-t border-white/5 pt-3.5">
                <span className="flex items-center gap-1 font-medium">شبكة السحب المفضلة: <strong className="text-blue-500 font-black">TRON TRC-20</strong></span>
                {status?.hasKeys && !status?.lastError && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    توصيل Binance نشط
                  </span>
                )}
              </div>
            </div>

            {/* 4. Withdrawal Card (السحب) */}
            <div className="md:col-span-7 bg-[#121932]/45 backdrop-blur-xl border border-white/5 hover:border-blue-500/15 shadow-2xl shadow-black/35 rounded-3xl p-6 space-y-5 transition-all duration-300">
              <div className="flex items-center gap-2.5 border-b border-white/5 pb-4">
                <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 shadow-inner">
                  <Send className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-0.5 text-right">
                  <h3 className="text-xs font-black text-white">سحب الأصول الفوري والمباشر</h3>
                  <p className="text-[9px] text-gray-400 font-medium">سحب فوري إلى محفظتك الشخصية برواتب مخفضة</p>
                </div>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-4">
                {/* Wallet Address Input with Icon */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-bold block text-right">عنوان محفظة المستلم (USDT TRC-20)</label>
                  <div className="relative">
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-[#0b1020]/75 border border-white/5 hover:border-white/10 focus:border-blue-600 rounded-xl py-3 pr-11 pl-3 text-xs text-white focus:outline-none transition-all text-left font-mono"
                      placeholder="TCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Amount Input with Icon and MAX Button */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-bold block text-right">المبلغ المراد سحبه (USDT)</label>
                  <div className="relative">
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-black">
                      $
                    </div>
                    <input
                      type="number"
                      step="any"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-[#0b1020]/75 border border-white/5 hover:border-white/10 focus:border-blue-600 rounded-xl py-3 pr-11 pl-20 text-xs text-white focus:outline-none transition-all text-left font-mono"
                      placeholder="0.00"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={handleMaxAmount}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 font-black text-[10px] px-3.5 py-1.5 rounded-xl border border-blue-500/25 transition-all active:scale-95 cursor-pointer"
                    >
                      الكل (MAX)
                    </button>
                  </div>
                </div>

                {/* Error Message inside Glassmorphic Red Warning Box */}
                {withdrawalError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl flex items-start gap-2.5 text-right shadow-md">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="text-[10px] text-rose-300 font-medium leading-relaxed">{withdrawalError}</span>
                  </div>
                )}

                {/* Success Message */}
                {withdrawalSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl flex items-start gap-2.5 text-right shadow-md">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-[10px] text-emerald-300 font-medium leading-relaxed">{withdrawalSuccess}</span>
                  </div>
                )}

                {/* Grand Gradient Submit Button with Hover & Ripple effect states */}
                <button
                  type="submit"
                  disabled={isWithdrawing || !status?.hasKeys}
                  className={`w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 px-6 rounded-2xl text-xs transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 flex items-center justify-center gap-2 shadow-2xl shadow-blue-500/15 cursor-pointer ${
                    isWithdrawing || !status?.hasKeys ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  {isWithdrawing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>جاري معالجة وتدقيق شبكة TRC-20...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>تنفيذ السحب الفوري والتحويل عبر TRC-20</span>
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>

          {/* 5. API settings panel (إعدادات API) */}
          <div className="bg-[#121932]/45 backdrop-blur-xl border border-white/5 hover:border-blue-500/15 shadow-2xl shadow-black/35 rounded-3xl p-6 space-y-5 transition-all duration-300">
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 rounded-xl text-blue-400 border border-blue-500/20 shadow-inner">
                <Key className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0.5 text-right">
                <h3 className="text-xs font-black text-white">إعدادات قنوات Binance API</h3>
                <p className="text-[9px] text-gray-400">تشفير عسكري آمن ومحمي 100% لمفاتيح التداول</p>
              </div>
            </div>

            <form onSubmit={handleSaveKeys} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Binance API Key Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-bold block text-right">مفتاح API (Binance API Key)</label>
                  <div className="relative">
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-[#0b1020]/75 border border-white/5 hover:border-white/10 focus:border-blue-500 rounded-xl py-3 pr-11 pl-4 text-xs text-white focus:outline-none transition-all text-left font-mono"
                      placeholder="أدخل مفتاح الـ API..."
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Binance Secret Key Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-bold block text-right">مفتاح السر المرمز (Binance Secret Key)</label>
                  <div className="relative">
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showSecret ? "text" : "password"}
                      required
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      className="w-full bg-[#0b1020]/75 border border-white/5 hover:border-white/10 focus:border-blue-500 rounded-xl py-3 pr-11 pl-11 text-xs text-white focus:outline-none transition-all text-left font-mono"
                      placeholder="أدخل مفتاح السر..."
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-all cursor-pointer"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Keys Status Feedback */}
              {keysMessage && (
                <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 border text-right shadow-sm ${
                  keysMessage.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25' 
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                }`}>
                  {keysMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span className="text-[10px]">{keysMessage.text}</span>
                </div>
              )}

              {/* Testnet Checkbox and Save Button Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1.5">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-300 font-bold select-none">
                  <input
                    type="checkbox"
                    checked={useTestnet}
                    onChange={(e) => setUseTestnet(e.target.checked)}
                    className="rounded bg-[#0b1020] border-white/10 text-blue-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 accent-blue-600"
                  />
                  <span className="text-[10px] md:text-xs">تفعيل وضع الحساب التجريبي (Binance Testnet / Sandbox)</span>
                </label>
                
                <button
                  type="submit"
                  disabled={isSavingKeys}
                  className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSavingKeys ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>جاري فحص الاتصال...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>حفظ واختبار قنوات الاتصال</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Simplified History Log */}
          {withdrawals.length > 0 && (
            <div className="bg-[#121932]/45 backdrop-blur-xl border border-white/5 hover:border-blue-500/15 shadow-2xl shadow-black/35 rounded-3xl overflow-hidden mt-6 transition-all duration-300">
              <div className="px-5 py-4 border-b border-white/5 bg-[#121932]/10 flex items-center gap-2">
                <div className="p-1 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/10 animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-black text-white">سجل عمليات السحب الأخيرة لشبكة TRC-20</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-[11px] whitespace-nowrap">
                  <thead className="bg-[#0b1020]/60 text-gray-400">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">التاريخ والوقت</th>
                      <th className="px-5 py-3.5 font-bold">العنوان المستلم</th>
                      <th className="px-5 py-3.5 font-bold text-left">المبلغ</th>
                      <th className="px-5 py-3.5 font-bold text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {withdrawals.slice(0, 5).map((w) => (
                      <tr key={w.id} className="hover:bg-white/5 transition-all">
                        <td className="px-5 py-3.5 font-mono text-gray-400">
                          {format(new Date(w.timestamp), 'yyyy-MM-dd HH:mm')}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs max-w-[150px] truncate" title={w.address}>
                          {w.address}
                        </td>
                        <td className="px-5 py-3.5 text-left font-mono font-bold text-white">
                          {w.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            مكتمل بنجاح
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      )}

      {/* Simplified Footer */}
      <footer className="py-6 text-center text-[10px] text-gray-600 border-t border-gray-900 mt-12">
        <p>نظام تداول خوارزمي متطور وسحب آمن عبر شبكة TRON TRC-20</p>
      </footer>

      {/* Floating Admin Quick Access Switcher */}
      {isAdmin && (
        <button
          type="button"
          onClick={() => {
            if (view === 'dashboard') {
              setView('admin');
              fetchAdminData();
            } else {
              setView('dashboard');
            }
          }}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4.5 rounded-2xl shadow-xl shadow-blue-500/20 flex items-center gap-2.5 border border-blue-400/30 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 active:scale-95 group"
        >
          <div className="relative">
            <Users className="w-4 h-4 text-white" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-[11px] tracking-wide font-bold">{view === 'admin' ? "الذهاب للوحة المستخدم" : "لوحة التحكم للمشرف (سريع)"}</span>
        </button>
      )}

      {/* Floating Glassmorphic Toast Notifications */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 max-w-sm animate-bounce">
          <div className={`backdrop-blur-xl border p-4 rounded-2xl flex items-center gap-3 shadow-2xl ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' 
              : toastMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
              : 'bg-blue-500/10 border-blue-500/25 text-blue-300'
          }`}>
            <div className={`p-1.5 rounded-xl shrink-0 ${
              toastMessage.type === 'success' ? 'bg-emerald-500/20' : toastMessage.type === 'error' ? 'bg-rose-500/20' : 'bg-blue-500/20'
            }`}>
              {toastMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : toastMessage.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            </div>
            <p className="text-xs font-bold leading-normal text-right">{toastMessage.text}</p>
            <button 
              type="button" 
              onClick={() => setToastMessage(null)} 
              className="text-gray-400 hover:text-white mr-auto text-xs font-bold cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Floating Premium Modal Dialogs */}
      {modalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 text-right">
          <div className="bg-[#121932] border border-white/5 w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${
              modalData.type === 'success' ? 'from-emerald-500 to-teal-400' : modalData.type === 'error' ? 'from-rose-500 to-red-400' : 'from-blue-500 to-indigo-400'
            }`} />

            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className={`p-2 rounded-xl border ${
                modalData.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : modalData.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                {modalData.type === 'success' ? <CheckCircle className="w-5 h-5" /> : modalData.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <h4 className="text-sm font-black text-white">{modalData.title}</h4>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed font-medium">
              {modalData.text}
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalData(null)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all transform active:scale-95 cursor-pointer shadow-md ${
                  modalData.type === 'success' 
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/10' 
                    : modalData.type === 'error'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/10'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/10'
                }`}
              >
                حسناً، تفهمت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
