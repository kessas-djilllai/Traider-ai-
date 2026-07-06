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
  const [activeTab, setActiveTab] = useState<'chart' | 'wallet' | 'settings' | 'admin'>('chart');
  
  const handleTabChange = (tab: 'chart' | 'wallet' | 'settings' | 'admin') => {
    setActiveTab(tab);
    if (tab === 'admin') {
      setView('admin');
      fetchAdminData();
    } else {
      setView('dashboard');
    }
  };

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
      <div className="min-h-screen bg-[#f0f4f8] text-slate-800 flex flex-col justify-center items-center px-4 relative overflow-hidden" dir="rtl">
        {/* Animated glowing liquid blobs for liquid glassmorphic background */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-rose-300/30 rounded-full filter blur-[100px] animate-blob-slow pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-300/30 rounded-full filter blur-[120px] animate-blob-slower pointer-events-none" />
        <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-violet-300/25 rounded-full filter blur-[110px] animate-blob-slowest pointer-events-none" />
        <div className="absolute top-3/4 right-10 w-80 h-80 bg-amber-200/35 rounded-full filter blur-[100px] animate-blob-slow pointer-events-none" />

        <div className="w-full max-w-md glass-card rounded-3xl p-6 md:p-8 space-y-6 relative z-10 shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-white/80 text-blue-600 shadow-sm backdrop-blur-md">
              <TrendingUp className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">منصة التداول الخوارزمي الذكي</h2>
            <p className="text-xs text-slate-500 leading-relaxed">سجل الدخول أو أنشئ حسابك لبدء تداول الأصول المشفرة تلقائياً بنسبة عائد %30 يومياً.</p>
          </div>

          <div className="flex bg-white/45 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200/50">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(null); }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                authMode === 'login' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(null); }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                authMode === 'register' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15' : 'text-slate-500 hover:text-slate-900'
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
                className="w-full glass-input rounded-xl px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
                placeholder="اسم المستخدم"
              />
            </div>
            <div className="space-y-1">
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
                placeholder="كلمة المرور"
              />
            </div>

            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[11px] p-3 rounded-xl flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                authMode === 'login' ? 'دخول الحساب' : 'إنشاء وتفعيل الحساب'
              )}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200/50"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-[10px]">أو الاستمرار باستخدام</span>
            <div className="flex-grow border-t border-slate-200/50"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-white/50 hover:bg-white/80 text-slate-700 font-bold py-3 rounded-2xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-200/40 shadow-sm cursor-pointer backdrop-blur-sm"
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
    <div className="min-h-screen bg-[#f0f4f8] text-slate-800 flex flex-col justify-between font-sans antialiased relative overflow-hidden animate-fade-in" dir="rtl">
      {/* Animated glowing liquid blobs for liquid glassmorphic background */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-rose-300/30 rounded-full filter blur-[100px] animate-blob-slow pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-300/30 rounded-full filter blur-[120px] animate-blob-slower pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-violet-300/25 rounded-full filter blur-[110px] animate-blob-slowest pointer-events-none" />
      <div className="absolute top-3/4 right-10 w-80 h-80 bg-amber-200/35 rounded-full filter blur-[100px] animate-blob-slow pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/60 bg-white/45 backdrop-blur-xl sticky top-0 z-40 shadow-[0_4px_20px_0_rgba(148,163,184,0.04)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-white/50 rounded-2xl border border-white/80 shadow-sm backdrop-blur-sm shrink-0">
              <TrendingUp className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 animate-pulse" />
            </div>
            <div className="space-y-0.5 text-right max-w-[130px] xs:max-w-[180px] sm:max-w-none">
              <h1 className="text-[10px] sm:text-xs md:text-sm font-black text-slate-900 tracking-wide leading-tight line-clamp-1">منصة التداول الخوارزمي الممتاز</h1>
              <p className="hidden xs:block text-[8px] sm:text-[9px] text-slate-400 font-bold tracking-wide">نظام المؤشرات الآلية المتطور &bull; Premium</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2.5">
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
                className={`relative hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 border cursor-pointer ${
                  view === 'admin' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600/30' 
                    : 'bg-white/50 text-blue-600 hover:text-blue-700 border-white/80 hover:bg-white/80 backdrop-blur-sm'
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
              <div className="hidden sm:flex items-center gap-1.5 bg-white/40 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/60 text-[10px]">
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

            <div className="flex items-center gap-1.5 sm:gap-2.5 bg-white/40 backdrop-blur-sm px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-white/60 shadow-sm">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[10px] sm:text-xs text-slate-800 font-black max-w-[70px] sm:max-w-[120px] truncate" title={user || ''}>{user}</span>
              <button
                onClick={handleLogout}
                className="p-1 hover:bg-white/60 rounded-lg text-rose-500 hover:text-rose-600 transition-all mr-1 sm:mr-1.5 cursor-pointer shrink-0"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {view === 'admin' ? (
        <main className="max-w-4xl w-full mx-auto px-4 py-6 flex-1 space-y-6 md:space-y-8 relative z-10 pb-20 md:pb-8">
          {/* Header section of Admin Panel */}
          <div className="glass-card rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/60 bg-white/45 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-right">
              <h2 className="text-sm font-black text-slate-900 flex items-center justify-end gap-2">
                <Shield className="w-4.5 h-4.5 text-blue-600" />
                <span>لوحة التحكم للمشرف والمراقبة</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 font-bold leading-relaxed">
                مرحباً بك في لوحة الإدارة. يمكنك من هنا مراجعة وتعديل بيانات جميع المستخدمين والتحقق من حالة اتصال قاعدة بيانات Supabase.
              </p>
            </div>
            <button
              onClick={fetchAdminData}
              disabled={adminLoading}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/10 active:scale-95 self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} />
              <span>تحديث البيانات</span>
            </button>
          </div>

          {/* Database Status Panel */}
          {supabaseStatus && (
            <div className="glass-card rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/60 bg-white/45 backdrop-blur-xl space-y-4 text-right">
              <div className="flex items-center justify-between border-b border-white/50 pb-3">
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-wide ${
                  supabaseStatus.connected 
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 animate-pulse' 
                    : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                }`}>
                  {supabaseStatus.connected ? 'متصل بنجاح' : 'غير متصل'}
                </span>
                <h3 className="text-xs font-black text-slate-850 flex items-center gap-2">
                  <Database className="w-4.5 h-4.5 text-emerald-600" />
                  حالة ربط قاعدة بيانات Supabase
                </h3>
              </div>

              {!supabaseStatus.connected ? (
                <div className="space-y-3">
                  <div className="text-[11px] text-amber-700 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl space-y-1">
                    <p className="font-black flex items-center gap-1 justify-end">
                      <span>ملاحظة مهمة لمزامنة البيانات:</span>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    </p>
                    <p className="leading-relaxed">
                      لتفعيل الربط السحابي ومزامنة بيانات المستخدمين بـ Supabase، يرجى تشغيل الأمر التالي في SQL Editor داخل لوحة تحكم Supabase الخاصة بك لإنشاء الجدول المطلوب:
                    </p>
                  </div>

                  <div className="relative font-mono">
                    <pre className="bg-slate-900/5 text-left text-slate-800 text-[10px] p-4 rounded-xl border border-slate-200 overflow-x-auto select-all">
{`-- 1. جدول الإعدادات العامة والتحديثات
create table if not exists app_store (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. جدول المستخدمين المفصل (أعمدة مخصصة وسحب فوري)
create table if not exists app_users (
  username text primary key,
  password text,
  api_key text,
  secret_key text,
  use_testnet boolean default false,
  trading_status text default 'idle',
  trading_start_time bigint,
  extra_profit numeric default 0,
  last_known_balance numeric default 0,
  spot_balance numeric default 0,
  funding_balance numeric default 0,
  last_error text,
  withdrawals jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);`}
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`-- 1. جدول الإعدادات العامة والتحديثات
create table if not exists app_store (
  id text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. جدول المستخدمين المفصل (أعمدة مخصصة وسحب فوري)
create table if not exists app_users (
  username text primary key,
  password text,
  api_key text,
  secret_key text,
  use_testnet boolean default false,
  trading_status text default 'idle',
  trading_start_time bigint,
  extra_profit numeric default 0,
  last_known_balance numeric default 0,
  spot_balance numeric default 0,
  funding_balance numeric default 0,
  last_error text,
  withdrawals jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);`);
                        showToast("تم نسخ كود SQL بنجاح!", "success");
                      }}
                      className="absolute top-2 left-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-[10px] text-blue-600 font-bold px-2.5 py-1 rounded transition-all active:scale-95 cursor-pointer"
                    >
                      نسخ الكود
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                    * تأكد أيضاً من إضافة المتغيرات البيئية <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[11px]">SUPABASE_URL</code> و <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[11px]">SUPABASE_ANON_KEY</code> في ملف إعدادات الخادم ليعمل الاتصال تلقائياً أو أدخلهما بالأسفل يدوياً.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white/40 backdrop-blur-sm p-3.5 rounded-2xl border border-white/85 space-y-1 text-left font-mono">
                    <span className="text-slate-400 text-[9px] font-black block">Supabase URL</span>
                    <p className="text-slate-700 truncate text-[11px] font-bold">{supabaseStatus.supabaseUrl}</p>
                  </div>
                  <div className="bg-white/40 backdrop-blur-sm p-3.5 rounded-2xl border border-white/85 space-y-1 text-left font-mono">
                    <span className="text-slate-400 text-[9px] font-black block">API Key (Anon)</span>
                    <p className="text-slate-700 truncate text-[11px] font-bold">{supabaseStatus.supabaseKey}</p>
                  </div>
                </div>
              )}

              {/* Dynamic manual keys config form */}
              <div className="border-t border-white/50 pt-4 mt-4 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setShowSupabaseForm(!showSupabaseForm);
                    if (supabaseStatus) {
                      setSupabaseInputUrl(supabaseStatus.supabaseUrl || '');
                      setSupabaseInputKey('');
                    }
                  }}
                  className="px-3.5 py-2 bg-white/40 hover:bg-white/80 text-blue-600 border border-white/80 hover:border-white text-[10px] font-black rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {showSupabaseForm ? "إغلاق نافذة الإعدادات" : "إعداد / تعديل بيانات ربط Supabase السحابي"}
                </button>

                {showSupabaseForm && (
                  <form onSubmit={handleSaveSupabaseConfig} className="mt-4 bg-white/30 backdrop-blur-md p-4 border border-white/50 rounded-2xl space-y-3.5">
                    <p className="text-[10px] text-slate-500 text-right leading-relaxed font-bold">
                      يمكنك هنا إدخال بيانات مشروع Supabase الخاص بك يدوياً ليقوم التطبيق بمزامنة وحفظ بيانات الحسابات سحابياً بشكل فوري وتلقائي.
                    </p>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-black block text-right">رابط المشروع (SUPABASE_URL)</label>
                      <input
                        type="url"
                        required
                        placeholder="https://xxxxxx.supabase.co"
                        value={supabaseInputUrl}
                        onChange={(e) => setSupabaseInputUrl(e.target.value)}
                        className="w-full glass-input rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all text-left font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-black block text-right">مفتاح Anon أو Service Role Key</label>
                      <input
                        type="password"
                        required
                        placeholder="أدخل مفتاح الـ API الخاص بـ Supabase..."
                        value={supabaseInputKey}
                        onChange={(e) => setSupabaseInputKey(e.target.value)}
                        className="w-full glass-input rounded-xl py-3 px-4 text-xs text-slate-800 focus:outline-none transition-all text-left font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingSupabaseConfig}
                      className="w-full bg-blue-600 hover:bg-blue-750 text-white font-black py-3.5 rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/10"
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
            <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2 text-right shadow-sm ${
              adminMessage.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700' 
                : 'bg-rose-500/10 border-rose-500/25 text-rose-700'
            }`}>
              {adminMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" /> }
              <span className="font-bold">{adminMessage.text}</span>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-4.5 h-4.5" />
            </div>
            <input
              type="text"
              placeholder="البحث عن مستخدم بالبريد أو اسم المستخدم..."
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              className="w-full glass-input rounded-xl py-3.5 pr-11 pl-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all text-right"
            />
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-right">
            {adminLoading ? (
              <div className="col-span-2 py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                <span className="text-xs font-bold">جاري تحميل بيانات المستخدمين...</span>
              </div>
            ) : adminUsers.filter(u => u.username.toLowerCase().includes(adminSearch.toLowerCase())).length === 0 ? (
              <div className="col-span-2 py-16 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-3xl bg-white/20">
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
                      className="glass-card rounded-3xl p-5 border border-white/60 bg-white/45 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-4"
                    >
                      {/* Card Header */}
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          {isUserAdmin && (
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-md text-[9px] font-black shrink-0">
                              مسؤول النظام
                            </span>
                          )}
                          <div className="flex items-center gap-2.5 text-right">
                            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 text-xs font-black shrink-0 font-mono shadow-sm">
                              {u.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-0.5 max-w-[150px] sm:max-w-[180px]">
                              <p className="text-xs font-black text-slate-800 truncate text-left" title={u.username}>{u.username}</p>
                              <p className="text-[9px] text-slate-400 font-bold truncate text-left">مستخدم نشط بالنظام</p>
                            </div>
                          </div>
                        </div>

                        <div className="h-[1px] bg-white/50 w-full" />

                        {/* Binance Balance Info */}
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500 font-black">رصيد بيننس الفعلي والمربوط (USDT)</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white/40 backdrop-blur-sm py-2 px-1 rounded-xl border border-white/80 shadow-inner">
                              <span className="text-[8px] text-slate-400 font-bold block">الفوري (Spot)</span>
                              <span className="font-mono text-[10px] text-slate-800 font-black">{u.spotBalance.toFixed(2)} $</span>
                            </div>
                            <div className="bg-white/40 backdrop-blur-sm py-2 px-1 rounded-xl border border-white/80 shadow-inner">
                              <span className="text-[8px] text-slate-400 font-bold block">تمويل (Funding)</span>
                              <span className="font-mono text-[10px] text-slate-800 font-black">{u.fundingBalance.toFixed(2)} $</span>
                            </div>
                            <div className="bg-white/40 backdrop-blur-sm py-2 px-1 rounded-xl border border-white/80 shadow-inner">
                              <span className="text-[8px] text-blue-500 font-bold block">إجمالي الأصول</span>
                              <span className="font-mono text-[10px] text-blue-600 font-black">{(u.lastKnownBalance + u.extraProfit).toFixed(2)} $</span>
                            </div>
                          </div>
                        </div>

                        {/* API keys check */}
                        <div className="space-y-2 text-xs border-t border-white/30 pt-3">
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-black ${
                              u.hasKeys ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {u.hasKeys ? (
                                <>
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>مكتملة ({u.apiKeyPrefix})</span>
                                </>
                              ) : (
                                <>
                                  <XSquare className="w-3.5 h-3.5 text-rose-500" />
                                  <span>غير متوفرة</span>
                                </>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">مفاتيح اتصال Binance:</span>
                          </div>

                          {/* Withdrawal check */}
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-black ${
                              u.hasKeys ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                              {u.hasKeys ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>فعال تلقائياً</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5 text-slate-300" />
                                  <span>موقوف (مفاتيح غائبة)</span>
                                </>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">بوابة السحب الفوري (TRC20):</span>
                          </div>

                          {/* Trading status */}
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${
                              u.tradingStatus === 'running' 
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 animate-pulse' 
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}>
                              {u.tradingStatus === 'running' ? 'تداول تلقائي نشط' : 'غير نشط'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">حالة الروبوت الخوارزمي:</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-2 border-t border-white/50 pt-3.5">
                        {!isUserAdmin && (
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من رغبتك في حذف المستخدم ${u.username} تماماً؟`)) {
                                handleDeleteUser(u.username);
                              }
                            }}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-600 rounded-xl transition-all cursor-pointer"
                            title="حذف الحساب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditExtraProfit(u.extraProfit);
                            setEditLastKnownBalance(u.lastKnownBalance);
                          }}
                          className="flex-1 py-2 bg-white/50 hover:bg-white/80 text-blue-600 border border-white/80 hover:border-white text-[10px] font-black rounded-xl flex items-center justify-center gap-1 transition-all shadow-sm cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3 text-blue-500" />
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
        <main className="max-w-4xl w-full mx-auto px-4 py-6 md:py-8 flex-1 space-y-6 md:space-y-8 relative z-10 pb-20 md:pb-8">
          
          {/* --- Section 1 & 2: Chart & Bot Control --- */}
          <div className={activeTab === 'chart' ? 'space-y-6 md:space-y-8 animate-fade-in' : 'hidden md:block md:space-y-8'}>
            {/* 1. Live Candlestick Chart Display (بطاقة التداول) */}
            <div className="glass-card glass-card-hover rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/50 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 border border-white/80 shadow-sm backdrop-blur-sm">
                    <TrendingUp className="w-4.5 h-4.5" />
                  </div>
                  <div className="space-y-0.5 text-right">
                    <h3 className="text-xs font-black tracking-wide text-slate-900">منصة تحليلات التداول الفني المباشر</h3>
                    <p className="text-[9px] text-slate-400 font-medium">مؤشرات السوق والاتجاهات الحالية لأصل BTC/USDT</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto text-[9px] text-slate-500 bg-white/45 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-black text-slate-600">اتصال مباشر بـ Binance Websocket</span>
                </div>
              </div>
              
              <div className="p-1.5 bg-white/30 backdrop-blur-md rounded-2xl border border-white/40">
                <TradingChart botStatus={status?.botStatus || 'idle'} tradingRemainingSeconds={status?.tradingRemainingSeconds || 0} />
              </div>
            </div>

            {/* 2. Interactive AI Bot Control Section (التحكم في الروبوت) */}
            {status?.botStatus === 'running' ? (
              <div className="glass-card glass-card-hover rounded-3xl p-5 sm:p-8 text-center space-y-4 overflow-hidden group shadow-2xl">
                <div className="space-y-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-white/80 flex items-center justify-center text-emerald-600 mx-auto backdrop-blur-sm">
                    <TrendingUp className="w-5 h-5 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">نظام التداول التلقائي الفعال (مستمر)</h3>
                  <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                    الذكاء الاصطناعي يقوم الآن بفتح وإغلاق صفقات مجهرية سريعة استناداً إلى تقاطعات RSI وتدفق السيولة الحية.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center gap-3">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">الوقت المتبقي لانتهاء الجلسة وتوزيع الأرباح</span>
                  <div className="relative inline-flex items-center justify-center bg-white/40 backdrop-blur-sm px-8 sm:px-12 py-4 sm:py-5 rounded-2xl border border-white/80 shadow-inner">
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
              <div className="glass-card glass-card-hover rounded-3xl p-5 sm:p-8 text-center space-y-4 overflow-hidden group shadow-2xl">
                <div className="space-y-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-white/80 flex items-center justify-center text-blue-600 mx-auto backdrop-blur-sm">
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
          </div>

          {/* --- Section 3 & 4: Wallet View (Balance & Withdrawal Grid) --- */}
          <div className={activeTab === 'wallet' ? 'space-y-6 md:space-y-8 animate-fade-in' : 'hidden md:block md:space-y-8'}>
            {/* Balance & Withdrawal Layout Block */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

              {/* 3. Balance Card (الرصيد) */}
              <div className="md:col-span-5 glass-card glass-card-hover rounded-3xl p-6 flex flex-col justify-between min-h-[220px] shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/50 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 border border-white/80 shadow-sm backdrop-blur-sm">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 text-right">
                      <h3 className="text-xs font-black text-slate-800">إجمالي الرصيد المتوفر</h3>
                      <p className="text-[9px] text-slate-500 font-bold">الأصول المربوطة والموثقة من منصة Binance</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => fetchStatus(true)}
                    disabled={isLoadingStatus}
                    className="p-2 bg-white/40 hover:bg-white/80 rounded-xl text-slate-500 hover:text-slate-800 border border-white/80 transition-all cursor-pointer shadow-sm backdrop-blur-sm"
                    title="تحديث الرصيد"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="my-5 text-right">
                  {!status?.hasKeys ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-center space-y-1.5">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto animate-bounce" />
                      <p className="text-xs text-amber-700 font-black">الربط غير مكتمل</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-bold">
                        الرجاء تزويد وحفظ مفاتيح Binance API بالأسفل لعرض رصيدك الفعلي وبدء التشغيل التلقائي.
                      </p>
                    </div>
                  ) : status?.lastError ? (
                    <div className="space-y-4">
                      <div className="flex items-baseline justify-center sm:justify-start gap-1.5 py-1">
                        <span className="text-3xl md:text-4xl font-black text-slate-900 font-mono tracking-tight">
                          {status.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-emerald-600 font-black text-xs uppercase">USDT</span>
                      </div>

                      {/* Glassmorphic Red Warning Box */}
                      <div className="bg-rose-500/10 border border-rose-500/25 p-4 rounded-2xl flex items-start gap-3 shadow-lg text-right">
                        <div className="p-1.5 bg-rose-500/20 rounded-xl text-rose-600 border border-white/80 shadow-inner mt-0.5 shrink-0 animate-pulse">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-rose-600">تنبيه اتصال API منصة Binance</h4>
                          <p className="text-[10px] text-slate-600 leading-relaxed">
                            {status.lastError}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-baseline justify-center sm:justify-start gap-1.5 py-1">
                        <span className="text-3xl md:text-4xl font-black text-slate-900 font-mono tracking-tight">
                          {status.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-emerald-600 font-black text-xs uppercase">USDT</span>
                      </div>
                      
                      {/* Spot and Funding Breakdown */}
                      {status.spotBalance !== undefined && status.fundingBalance !== undefined && (status.spotBalance > 0 || status.fundingBalance > 0) && (
                        <div className="flex flex-col gap-2 text-[10px] text-slate-500 bg-white/45 p-3 rounded-2xl border border-white/80 shadow-inner">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-bold">رصيد الفوري (Spot):</span>
                            <span className="font-mono text-slate-800 font-black">{status.spotBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-bold">رصيد التمويل (Funding):</span>
                            <span className="font-mono text-slate-800 font-black">{status.fundingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</span>
                          </div>
                          {status.extraProfit > 0 && (
                            <div className="flex justify-between items-center border-t border-white/50 pt-2 text-emerald-600 font-black">
                              <span>الأرباح التراكمية الخوارزمية:</span>
                              <span className="font-mono text-emerald-600 font-black">+{status.extraProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-500 flex justify-between items-center border-t border-white/50 pt-3.5">
                  <span className="flex items-center gap-1 font-bold">شبكة السحب المفضلة: <strong className="text-blue-600 font-black">TRON TRC-20</strong></span>
                  {status?.hasKeys && !status?.lastError && (
                    <span className="text-emerald-600 font-black flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      توصيل Binance نشط
                    </span>
                  )}
                </div>
              </div>

              {/* 4. Withdrawal Card (السحب) */}
              <div className="md:col-span-7 glass-card glass-card-hover rounded-3xl p-6 space-y-5 shadow-2xl">
                <div className="flex items-center gap-2.5 border-b border-white/50 pb-4">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600 border border-white/80 shadow-sm backdrop-blur-sm">
                    <Send className="w-4.5 h-4.5" />
                  </div>
                  <div className="space-y-0.5 text-right">
                    <h3 className="text-xs font-black text-slate-800">سحب الأصول الفوري والمباشر</h3>
                    <p className="text-[9px] text-slate-500 font-bold">سحب فوري إلى محفظتك الشخصية برواتب مخفضة</p>
                  </div>
                </div>

                <form onSubmit={handleWithdraw} className="space-y-4">
                  {/* Wallet Address Input with Icon */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-black block text-right">عنوان محفظة المستلم (USDT TRC-20)</label>
                    <div className="relative">
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full glass-input rounded-xl py-3 pr-11 pl-3 text-xs text-slate-800 focus:outline-none transition-all text-left font-mono"
                        placeholder="TCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Amount Input with Icon and MAX Button */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-black block text-right">المبلغ المراد سحبه (USDT)</label>
                    <div className="relative">
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black">
                        $
                      </div>
                      <input
                        type="number"
                        step="any"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full glass-input rounded-xl py-3 pr-11 pl-20 text-xs text-slate-800 focus:outline-none transition-all text-left font-mono"
                        placeholder="0.00"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={handleMaxAmount}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 font-black text-[10px] px-3.5 py-1.5 rounded-xl border border-blue-600/20 transition-all active:scale-95 cursor-pointer"
                      >
                        الكل (MAX)
                      </button>
                    </div>
                  </div>

                  {/* Error Message inside Glassmorphic Red Warning Box */}
                  {withdrawalError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl flex items-start gap-2.5 text-right shadow-md">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="text-[10px] text-rose-700 font-black leading-relaxed">{withdrawalError}</span>
                    </div>
                  )}

                  {/* Success Message */}
                  {withdrawalSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl flex items-start gap-2.5 text-right shadow-md">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-[10px] text-emerald-700 font-black leading-relaxed">{withdrawalSuccess}</span>
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
          </div>

          {/* --- Section 5: API Settings --- */}
          <div className={activeTab === 'settings' ? 'space-y-6 animate-fade-in' : 'hidden md:block'}>
            {/* 5. API settings panel (إعدادات API) */}
            <div className="glass-card glass-card-hover rounded-3xl p-6 space-y-5 shadow-2xl">
              <div className="flex items-center gap-2.5 border-b border-white/50 pb-4">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 border border-white/80 shadow-sm backdrop-blur-sm">
                  <Key className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-0.5 text-right">
                  <h3 className="text-xs font-black text-slate-800">إعدادات قنوات Binance API</h3>
                  <p className="text-[9px] text-slate-500 font-bold">تشفير عسكري آمن ومحمي 100% لمفاتيح التداول</p>
                </div>
              </div>

              <form onSubmit={handleSaveKeys} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Binance API Key Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-black block text-right">مفتاح API (Binance API Key)</label>
                    <div className="relative">
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Key className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full glass-input rounded-xl py-3 pr-11 pl-4 text-xs text-slate-800 focus:outline-none transition-all text-left font-mono"
                        placeholder="أدخل مفتاح الـ API..."
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Binance Secret Key Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-black block text-right">مفتاح السر المرمز (Binance Secret Key)</label>
                    <div className="relative">
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showSecret ? "text" : "password"}
                        required
                        value={secretKey}
                        onChange={(e) => setSecretKey(e.target.value)}
                        className="w-full glass-input rounded-xl py-3 pr-11 pl-11 text-xs text-slate-800 focus:outline-none transition-all text-left font-mono"
                        placeholder="أدخل مفتاح السر..."
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
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
                      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25' 
                      : 'bg-rose-500/10 text-rose-700 border-rose-500/25'
                  }`}>
                    {keysMessage.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span className="text-[10px]">{keysMessage.text}</span>
                  </div>
                )}

                {/* Testnet Checkbox and Save Button Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1.5">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-600 font-bold select-none">
                    <input
                      type="checkbox"
                      checked={useTestnet}
                      onChange={(e) => setUseTestnet(e.target.checked)}
                      className="rounded bg-white/50 border-slate-200 text-blue-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 accent-blue-600"
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
          </div>



        </main>
      )}

      {/* Simplified Footer */}
      <footer className="py-6 text-center text-[10px] text-slate-500 border-t border-white/50 mt-12 pb-24">
        <p>نظام تداول خوارزمي متطور وسحب آمن عبر شبكة TRON TRC-20</p>
      </footer>

      {/* Floating Bottom Navigation Dock */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/60 bg-white/75 backdrop-blur-xl shadow-2xl z-40 px-3 py-2 flex items-center justify-around transition-all hover:scale-[1.01]">
        <button
          type="button"
          onClick={() => handleTabChange('chart')}
          className={`flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
            activeTab === 'chart' ? 'text-blue-600 font-black' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <TrendingUp className={`w-5 h-5 ${activeTab === 'chart' ? 'scale-110' : ''} transition-transform`} />
          <span className="text-[10px] font-black">التداول</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('wallet')}
          className={`flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
            activeTab === 'wallet' ? 'text-blue-600 font-black' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Wallet className={`w-5 h-5 ${activeTab === 'wallet' ? 'scale-110' : ''} transition-transform`} />
          <span className="text-[10px] font-black">المحفظة</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('settings')}
          className={`flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
            activeTab === 'settings' ? 'text-blue-600 font-black' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Key className={`w-5 h-5 ${activeTab === 'settings' ? 'scale-110' : ''} transition-transform`} />
          <span className="text-[10px] font-black">الإعدادات</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => handleTabChange('admin')}
            className={`flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
              activeTab === 'admin' ? 'text-blue-600 font-black' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className={`w-5 h-5 ${activeTab === 'admin' ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] font-black">الإدارة</span>
          </button>
        )}
      </div>

      {/* Floating Glassmorphic Toast Notifications */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 max-w-sm animate-bounce">
          <div className={`backdrop-blur-xl border p-4 rounded-2xl flex items-center gap-3 shadow-2xl ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-700' 
              : toastMessage.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/25 text-rose-700'
              : 'bg-blue-500/15 border-blue-500/25 text-blue-700'
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
              className="text-slate-400 hover:text-slate-700 mr-auto text-xs font-bold cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Floating Premium Modal Dialogs */}
      {modalData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 text-right">
          <div className="glass-card w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${
              modalData.type === 'success' ? 'from-emerald-500 to-teal-400' : modalData.type === 'error' ? 'from-rose-500 to-red-400' : 'from-blue-500 to-indigo-400'
            }`} />

            <div className="flex items-center gap-3 border-b border-white/60 pb-3">
              <div className={`p-2 rounded-xl border ${
                modalData.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                  : modalData.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-600'
              }`}>
                {modalData.type === 'success' ? <CheckCircle className="w-5 h-5" /> : modalData.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <h4 className="text-sm font-black text-slate-800">{modalData.title}</h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
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
