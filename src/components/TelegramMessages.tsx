import React, { useState, useEffect } from 'react';
import { Send, ChevronDown, CheckCircle, AlertCircle, Save, Sun, Lightbulb, Megaphone, HelpCircle, Moon, Loader2 } from 'lucide-react';

export function TelegramMessages() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [messageSent, setMessageSent] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [messageContent, setMessageContent] = useState('');

  // Fetch initial telegram settings
  useEffect(() => {
    fetch('/api/telegram')
      .then(res => res.json())
      .then(data => {
        if (data.botToken) setBotToken(data.botToken);
        if (data.chatId) setChatId(data.chatId);
      })
      .catch(err => console.error("Failed to fetch telegram settings", err));
  }, []);

  const messageTypes = [
    { id: 'morning_analysis', label: 'صباح الخير + تحليل', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'trading_advice', label: 'نصيحة تداول', icon: Lightbulb, color: 'text-green-500', bg: 'bg-green-500/10' },
    { id: 'market_news', label: 'أخبار السوق', icon: Megaphone, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'interactive_question', label: 'سؤال تفاعلي', icon: HelpCircle, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'bedtime_summary', label: 'ملخص + نصيحة قبل النوم', icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  ];

  const fetchMarketDataAndFormatMessage = async (typeId: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const statusRes = await fetch('/api/status');
      const statusData = await statusRes.json();
      const symbol = statusData?.settings?.symbol || 'BTC/USDT';
      
      const marketRes = await fetch('/api/market/data');
      const marketData = await marketRes.json();
      
      if (!marketData.success || !marketData.data || marketData.data.length === 0) {
        throw new Error('فشل في جلب بيانات السوق المباشرة.');
      }
      
      const candles = marketData.data;
      const lastCandle = candles[candles.length - 1];
      
      const currentPrice = lastCandle.close ? lastCandle.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---';
      const support = lastCandle.support ? lastCandle.support.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---';
      const resistance = lastCandle.resistance ? lastCandle.resistance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---';
      const rsi = lastCandle.rsi !== null && lastCandle.rsi !== undefined ? Number(lastCandle.rsi) : 50;
      const ema20 = lastCandle.ema20;
      const ema50 = lastCandle.ema50;
      
      let trendDirection = 'جانبي (Neutral) 🟡';
      let emaStatus = 'المتوسطات متقاربة';
      if (ema20 && ema50) {
        if (ema20 > ema50) {
          trendDirection = 'صاعد (Bullish) 🚀';
          emaStatus = 'تقاطع إيجابي للمتوسطات (Golden Cross)';
        } else if (ema20 < ema50) {
          trendDirection = 'هابط (Bearish) 📉';
          emaStatus = 'تقاطع سلبي للمتوسطات (Death Cross)';
        }
      }
      
      let rsiStatus = 'زخم معتدل ⚖️';
      let indicatorAnalysis = 'مؤشر RSI مستقر مما يرجح استمرار الحركة الجانبية.';
      if (rsi < 35) {
        rsiStatus = 'تشبع بيعي شديد (Oversold) 📉';
        indicatorAnalysis = 'السوق في منطقة تشبع بيعي، مما يشير إلى فرصة ارتداد صعودي قريبة.';
      } else if (rsi > 65) {
        rsiStatus = 'تشبع شرائي شديد (Overbought) 📈';
        indicatorAnalysis = 'السوق في منطقة تشبع شرائي، مما يرجح إمكانية حدوث تصحيح هبوطي جني أرباح.';
      }
      
      let generatedText = '';
      
      if (typeId === 'morning_analysis') {
        generatedText = `☀️ صباح الخير للجميع!
        
📊 تحليل فني سريع ومؤتمت لحالة السوق اليوم:
الزوج: ${symbol}
السعر الحالي: ${currentPrice} USDT

📈 الاتجاه المتوقع: ${trendDirection}
🛡️ الدعم الرئيسي: ${support} USDT
⚔️ المقاومة الرئيسية: ${resistance} USDT

🕯️ مؤشر القوة النسبية (RSI): ${rsi.toFixed(1)} (${rsiStatus})
🛠️ تحليل المؤشرات: ${indicatorAnalysis}`;
      } else if (typeId === 'trading_advice') {
        let adviceText = '';
        if (rsi < 35) {
          adviceText = `🟢 توصية شراء تكتيكية:\nمؤشر RSI عند المستويات الحالية (${rsi.toFixed(1)}) يعطي إشارة تشبع بيعي ممتازة. يفضل الدخول بصفقات شراء تدريجية (Spot) مع وضع حد وقف خسارة قريب أسفل مستويات الدعم الحالية.`;
        } else if (rsi > 65) {
          adviceText = `🔴 توصية جني أرباح / انتظار:\nالسوق في مستويات تشبع شرائي مرتفعة (${rsi.toFixed(1)}). لا ننصح بالدخول في صفقات شراء جديدة عند هذه الأسعار لتفادي الهبوط التصحيحي المفاجئ.`;
        } else if (ema20 && ema50 && ema20 > ema50) {
          adviceText = `🟢 توصية مع الاتجاه الصاعد:\nالاتجاه السائد صاعد بناءً على التقاطعات الإيجابية لمتوسطات EMA. استغل أي تصحيح ملامس لمستويات الدعم ${support} USDT للشراء مع استهداف المقاومة عند ${resistance} USDT.`;
        } else {
          adviceText = `🔴 توصية الحذر والانتظار:\nالاتجاه الحالي يميل للهبوط الفني. يفضل تأمين الأرباح الحالية وانتظار استقرار السعر أعلى مستويات الدعم لضمان نقطة دخول مثالية.`;
        }
        
        generatedText = `💡 نصيحة تداول ذكية ومؤتمتة لـ ${symbol}:

السعر الحالي: ${currentPrice} USDT

⚠️ التوصية الفنية:
${adviceText}

📌 المستويات الأساسية:
• الدعم: ${support} USDT
• المقاومة: ${resistance} USDT`;
      } else if (typeId === 'market_news') {
        let generalOutlook = '';
        if (ema20 && ema50 && ema20 > ema50) {
          generalOutlook = `يظهر الزخم الصعودي تفوقاً واضحاً مع الحفاظ على التداول أعلى مستويات الدعم. هذا يدعم استمرار الصعود واختبار المقاومة مجدداً.`;
        } else {
          generalOutlook = `الضغوط البيعية مستمرة والسعر يتداول أسفل المتوسطات المتحركة، مما يبقي النظرة سلبية مؤقتاً لحين اختراق المقاومة الفنية.`;
        }
        
        generatedText = `📰 تحديث فني عاجل لحركة سوق ${symbol}:

السوق يتحرك حالياً عند السعر ${currentPrice} USDT.

• زخم مؤشر RSI: ${rsiStatus} (${rsi.toFixed(1)})
• مستويات الدعم: ${support} USDT
• مستويات المقاومة: ${resistance} USDT
• حالة التقاطعات: ${emaStatus}

🔍 النظرة الفنية لليوم:
${generalOutlook}`;
      } else if (typeId === 'interactive_question') {
        generatedText = `❓ سؤال تفاعلي للمناقشة والتحليل:

مع وصول سعر ${symbol} حالياً إلى مستوى ${currentPrice} USDT واقترابه من مستويات الدعم الرئيسية (${support} USDT) والمقاومة (${resistance} USDT)...

برأيكم ما هي الحركة القادمة للسوق؟ 🤔
1️⃣ صعود قوي واختراق المقاومة لقمة جديدة 🚀
2️⃣ هبوط وكسر مستوى الدعم لأسفل 📉

شاركونا تحليلاتكم وتوقعاتكم في التعليقات أسفل المنشور! 👇`;
      } else if (typeId === 'bedtime_summary') {
        let bedtimeAdvice = '';
        if (rsi > 60) {
          bedtimeAdvice = `تجنب الإفراط في الطمع ليلاً، السوق في مستويات عالية والتقلبات واردة جداً. يفضل تفعيل خاصية الوقف المتحرك لتأمين الأرباح الحالية.`;
        } else {
          bedtimeAdvice = `تأمين الصفقات الحالية بوضع أمر وقف خسارة (Stop Loss) واضح عند مستوى ${support} USDT هو الخيار الأمثل للحفاظ على المحفظة أثناء فترة النوم.`;
        }
        
        generatedText = `🌙 ملخص حركة السوق ونصيحة قبل النوم لـ ${symbol}:

📊 السعر الحالي قبل الإغلاق: ${currentPrice} USDT
📈 اتجاه الحركة السائدة اليوم: ${trendDirection}

🛌 نصيحة النوم الآمن للمتداولين:
• ${bedtimeAdvice}
• الدعم القريب والأهم لليوم: ${support} USDT
• المقاومة الأبرز: ${resistance} USDT

تمنياتنا لكم بنوم هادئ وأرباح متواصلة! 💤`;
      }
      
      setMessageContent(generatedText);
    } catch (err: any) {
      console.error(err);
      setError('فشل في جلب بيانات التحليل التلقائي: ' + (err.message || 'حدث خطأ أثناء الاتصال بالخادم.'));
      
      if (typeId === 'morning_analysis') {
        setMessageContent(`☀️ صباح الخير للجميع!\n\n📊 تحليل سريع لحالة السوق اليوم:\nالزوج: BTC/USDT\nالسعر الحالي: (يرجى مراجعة الاتصال بالمنصة لتحديث السعر)\n\nالاتجاه المتوقع: جانبي\nالدعم الرئيسي: يتم تحديده لاحقاً\nالمقاومة الرئيسية: يتم تحديده لاحقاً`);
      } else if (typeId === 'trading_advice') {
        setMessageContent(`💡 نصيحة تداول اليوم:\nتأكد دائماً من إدارة المخاطر وتجنب الدخول بكامل المحفظة في صفقة واحدة.`);
      } else if (typeId === 'market_news') {
        setMessageContent(`📰 أخبار السوق العاجلة:\nتشهد الأسواق تحركات ترقباً لصدور مؤشرات السيولة والتضخم.`);
      } else if (typeId === 'interactive_question') {
        setMessageContent(`❓ سؤال تفاعلي للمناقشة:\nما هي توقعاتكم لحركة السوق خلال الساعات القادمة؟`);
      } else if (typeId === 'bedtime_summary') {
        setMessageContent(`🌙 ملخص اليوم ونصيحة قبل النوم:\nلا تنسَ إغلاق صفقاتك أو تأمينها ووضع وقف الخسارة قبل النوم. نوم هادئ للجميع!`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelect = (typeId: string) => {
    setSelectedType(typeId);
    setIsOpen(false);
    setMessageSent(false);
    setError(null);
    fetchMarketDataAndFormatMessage(typeId);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSettingsError(null);
    setSettingsSuccess(false);
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, chatId })
      });
      const data = await res.json();
      if (data.success) {
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 4000);
      } else {
        setSettingsError(data.error || 'حدث خطأ أثناء حفظ الإعدادات');
      }
    } catch (e: any) {
      setSettingsError(e.message || 'فشل الاتصال بالخادم لحفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!botToken || !chatId) {
      setError("يجب حفظ توكن البوت ومعرف القناة أولاً في الإعدادات أدناه.");
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageContent })
      });
      const data = await res.json();
      
      if (data.success) {
        setMessageSent(true);
        setTimeout(() => setMessageSent(false), 3000);
      } else {
        setError(data.error || 'حدث خطأ أثناء الإرسال.');
      }
    } catch (e: any) {
      setError(e.message || 'حدث خطأ أثناء الإرسال.');
    } finally {
      setIsSending(false);
    }
  };

  const selectedItem = messageTypes.find(t => t.id === selectedType);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">رسائل القناة</h2>
        <p className="text-gray-400">قم بإعداد معلومات بوت تليجرام وأرسل التحديثات إلى قناتك.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-white mb-4">إعدادات تليجرام</h3>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">توكن البوت (Bot Token)</label>
            <input 
              type="text" 
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="123456789:ABCdefGHIjklMNO..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">معرف القناة (Chat ID)</label>
            <input 
              type="text" 
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="-1001234567890 أو @channel_username"
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className={`font-medium py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                settingsSuccess 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
            >
              {settingsSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  تم حفظ الإعدادات بنجاح!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </>
              )}
            </button>

            {settingsSuccess && (
              <p className="text-sm text-green-400 mt-1">✓ تم حفظ توكن البوت ومعرف القناة بنجاح في نظام التطبيق.</p>
            )}

            {settingsError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 mt-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-400">{settingsError}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 relative">
        <h3 className="text-lg font-medium text-white mb-4">إرسال رسالة يدوية</h3>
        <div className="flex flex-col items-start gap-4">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between text-white transition-colors"
            >
              <span>{selectedItem ? selectedItem.label : 'اختر نوع الرسالة...'}</span>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-10">
                {messageTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleSelect(type.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors text-right"
                    >
                      <div className={`p-2 rounded-lg ${type.bg}`}>
                        <Icon className={`w-4 h-4 ${type.color}`} />
                      </div>
                      <span className="text-gray-200">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedType && (
            <div className="w-full max-w-md space-y-4 mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-400">تفاصيل الرسالة</label>
                  {isAnalyzing && (
                    <span className="text-xs text-blue-400 animate-pulse flex items-center gap-1.5 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      جاري تحليل بيانات السوق وتوليد الرسالة...
                    </span>
                  )}
                </div>
                <textarea 
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  disabled={isAnalyzing}
                  className={`w-full h-64 bg-gray-950 border border-gray-800 rounded-xl p-4 text-gray-200 focus:outline-none focus:border-blue-500 transition-all resize-none ${isAnalyzing ? 'opacity-40 cursor-wait' : ''}`}
                  placeholder="اكتب تفاصيل الإشارة أو التحديث هنا..."
                />
              </div>
              
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={isSending || !messageContent.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {messageSent ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    تم الإرسال بنجاح
                  </>
                ) : isSending ? (
                  <>جاري الإرسال...</>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    إرسال إلى القناة
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

