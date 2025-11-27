import React, { useState, useEffect } from 'react';
import { FormCard } from './components/FormCard';
import { AdminDashboard } from './components/AdminDashboard';
import { generateEmailSummary, generateGuestMessage } from './services/geminiService';
import { FormData, FormStatus } from './types';

// Target email from requirements
const TARGET_EMAIL = 'bird82619@gmail.com';
const ADMIN_PASSCODE = '82619'; // Simple passcode for the owner

const OPTION_ATTEND = '有事也要前往，排除萬難一定到!';
const OPTION_NOT_ATTEND = '有事不克前往，但打從心底祝福你們!';

// Initial empty state
const INITIAL_DATA: FormData = {
  fullName: '',
  email: '',
  relationship: '',
  attendance: '',
  phone: '',
  attendeeCount: '1',
  childSeats: '0',
  vegetarianCount: '0',
  comments: '',
};

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(INITIAL_DATA);
  const [status, setStatus] = useState<FormStatus>(FormStatus.IDLE);
  const [showAdmin, setShowAdmin] = useState(false);
  const [headerImage, setHeaderImage] = useState('1.png');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [shibaAnimating, setShibaAnimating] = useState(false);

  // Load header image
  useEffect(() => {
    const savedImage = localStorage.getItem('custom_header_image');
    if (savedImage) {
      setHeaderImage(savedImage);
    }
  }, []);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user types
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    
    // 1. Name
    if (!formData.fullName.trim()) errors.fullName = "請輸入姓名";
    
    // 2. Email (Now Required)
    if (!formData.email.trim()) {
      errors.email = "請輸入電子信箱";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "請輸入有效的 Email 格式";
    }

    // 3. Relationship
    if (!formData.relationship) errors.relationship = "請選擇關係";
    
    // 4. Attendance
    if (!formData.attendance) errors.attendance = "請選擇是否出席";
    
    if (formData.attendance === OPTION_ATTEND) {
      // 5. Phone (Strict format: 09xxxxxxxx)
      if (!formData.phone.trim()) {
        errors.phone = "請輸入聯繫電話";
      } else if (!/^09\d{8}$/.test(formData.phone.replace(/-/g, ''))) {
        errors.phone = "格式錯誤，請輸入 10 碼手機號碼 (09xxxxxxxx)";
      }
      
      const totalAttendees = parseInt(formData.attendeeCount) || 0;
      const totalChildren = parseInt(formData.childSeats) || 0;
      const totalVeg = parseInt(formData.vegetarianCount) || 0;

      // 6. Attendee Count
      if (totalAttendees < 1) errors.attendeeCount = "出席人數至少 1 人";

      // 7. Child Seats Logic (Must be <= Attendee Count)
      if (totalChildren > totalAttendees) {
        errors.childSeats = `兒童座椅數量 (${totalChildren}) 不可大於出席人數 (${totalAttendees})`;
      }

      // 8. Vegetarian Logic (Must be <= Attendee Count)
      if (totalVeg > totalAttendees) {
        errors.vegetarianCount = `素食餐點數量 (${totalVeg}) 不可大於出席人數 (${totalAttendees})`;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAiGenerate = async (style: string) => {
    if (!formData.fullName) {
      setValidationErrors(prev => ({...prev, fullName: "請先輸入姓名以產生專屬祝福"}));
      return;
    }
    // show a short toast immediately and play sound/animate for the 'flower' style
    if (style === 'flower') {
      setToastMessage('上車舞已為您準備好！');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      // play a short pop sound
      try { playShibaSound(); } catch (e) { /* ignore audio errors */ }
      // trigger a small animation on textarea
      setShibaAnimating(true);
      setTimeout(() => setShibaAnimating(false), 700);
    }
    setAiLoading(true);
    try {
      const msg = await generateGuestMessage(style, formData.fullName);
      setFormData(prev => ({ ...prev, comments: msg }));
    } catch (e) {
      console.error(e);
      alert("AI 產生失敗，請稍後再試");
    } finally {
      setAiLoading(false);
    }
  };

  // Play a short pluck/pop sound using the Web Audio API
  const playShibaSound = () => {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(600, ctx.currentTime);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.45);
    // close context after a short delay where supported
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 800);
  };

  const handleSubmit = async () => {
    if (!validate()) {
      // Find the first error and scroll to it
      const firstErrorKey = Object.keys(validationErrors)[0];
      if (firstErrorKey) {
         // Simple scroll to top if error exists
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setStatus(FormStatus.PROCESSING);

    try {
      // 1. Save to Local Storage
      const existing = localStorage.getItem('wedding_rsvps');
      const list = existing ? JSON.parse(existing) : [];
      list.push(formData);
      localStorage.setItem('wedding_rsvps', JSON.stringify(list));

      // 2. Generate Summary
      const summary = await generateEmailSummary(formData);

      // 3. Open Mail Client
      const subject = encodeURIComponent(`Wedding RSVP: ${formData.fullName}`);
      const body = encodeURIComponent(summary);
      window.location.href = `mailto:${TARGET_EMAIL}?subject=${subject}&body=${body}`;

      // Mark as completed
      setStatus(FormStatus.COMPLETED);
    } catch (e) {
      console.error(e);
      setStatus(FormStatus.ERROR);
    }
  };

  /**
   * Helper to render a Select with an "Other" option that triggers a text input.
   */
  const renderSelectWithOther = (
    field: keyof FormData, 
    options: string[], 
    placeholder: string = "請輸入數量"
  ) => {
    // Check if the current value is one of the predefined options
    const isCustom = !options.includes(formData[field]) && formData[field] !== '';
    const selectValue = isCustom ? 'custom' : formData[field];

    return (
      <div className="space-y-2">
        <select 
          className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all ${validationErrors[field] ? 'border-red-300 bg-red-50' : ''}`}
          value={selectValue}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'custom') {
              handleChange(field, ''); // Clear value for custom input
            } else {
              handleChange(field, val);
            }
          }}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          <option value="custom">Other (自填)</option>
        </select>

        {(isCustom || selectValue === 'custom') && (
          <input 
            type="number"
            min="0"
            className={`w-full bg-white border border-rose-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-200 outline-none animate-fade-in`}
            placeholder={placeholder}
            value={formData[field]}
            onChange={(e) => handleChange(field, e.target.value)}
            autoFocus
          />
        )}
      </div>
    );
  };

  if (showAdmin) {
    return <AdminDashboard onBack={() => setShowAdmin(false)} currentImage={headerImage} onUpdateImage={setHeaderImage} />;
  }

  if (status === FormStatus.COMPLETED) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center fade-in border border-gray-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-serif text-gray-800 mb-2">謝謝您的回覆！</h2>
          <p className="text-gray-600 mb-6">我們已經收到您的資訊。Email 客戶端已開啟，請記得點擊發送郵件以完成通知。</p>
          <button 
            onClick={() => {
              setFormData(INITIAL_DATA);
              setStatus(FormStatus.IDLE);
            }}
            className="text-rose-500 hover:text-rose-600 underline font-medium"
          >
            填寫另一份表單
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 fade-in relative">
      {/* Inline styles for toast fade and shiba animation (scoped here) */}
      <style>{`
        .shiba-toast-enter{ opacity:0; transform:translateY(-6px) scale(0.98);} 
        .shiba-toast-enter-active{ opacity:1; transform:none; transition: all 220ms ease-out; }
        .shiba-toast-exit{ opacity:1; } 
        .shiba-toast-exit-active{ opacity:0; transition: opacity 220ms ease-in; }
        @keyframes shiba-pop { 0%{ transform: translateY(0) scale(1);} 30%{ transform: translateY(-6px) scale(1.04);} 100%{ transform: translateY(0) scale(1);} }
        .shiba-hit { animation: shiba-pop 700ms cubic-bezier(.2,.9,.3,1); }
      `}</style>
      {/* Header Image */}
      <div className="relative h-64 md:h-80 bg-gray-200 overflow-hidden shadow-sm">
         {headerImage === '1.png' ? (
           <div className="w-full h-full bg-gradient-to-br from-rose-50 to-orange-50 flex items-center justify-center">
              <div className="text-center p-4">
                 <p className="font-serif text-4xl text-gray-400 opacity-20 italic">Wedding</p>
              </div>
           </div>
         ) : (
           <img src={headerImage} alt="Wedding Header" className="w-full h-full object-cover" />
         )}
      </div>

      <div className="max-w-2xl mx-auto -mt-10 px-4 relative z-10">
        <div className="bg-white rounded-xl shadow-xl p-8 mb-6 text-center border-t-4 border-rose-400">
          <h1 className="text-3xl md:text-4xl font-serif text-gray-800 mb-4">仁德 & 雯惠<br/><span className="text-2xl">婚禮出席調查</span></h1>
          <div className="h-1 w-20 bg-rose-200 mx-auto mb-6"></div>
          
          <div className="text-gray-700 leading-relaxed space-y-4 font-light text-justify md:text-center">
            <p>致親愛的好友們～</p>
            <p>是的，經過一千多個日子的相處與陪伴，<br className="hidden md:block"/>我們決定執起彼此的手，步入人生另一個階段。</p>
            <div className="py-2">
              <p className="font-bold text-rose-600 text-lg">2026/5/16（六）</p>
              <p className="font-bold text-gray-800">於 桃園彭園八德館 舉辦午宴</p>
            </div>
            <p>誠摯邀請您前來一同分享我們的喜悅，<br className="hidden md:block"/>讓這個充滿意義的日子更加幸福！</p>
            <p>請動動手指幫我們填入以下資訊，期待您的蒞臨❤</p>
            <p className="pt-4 font-serif text-lg">仁德 & 雯惠 敬邀</p>
          </div>
        </div>

        {/* 1. Name */}
        <FormCard title="1. 請問您的大名" required error={validationErrors.fullName}>
          <input 
            type="text" 
            className="w-full bg-gray-50 border-gray-200 border rounded-lg px-4 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all"
            placeholder="請輸入您的全名"
            value={formData.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
          />
        </FormCard>

        {/* 2. Email */}
        <FormCard title="2. 電子信箱 E-mail" required description="用途：寄送電子喜帖與注意事項" error={validationErrors.email}>
          <input 
            type="email" 
            className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all ${validationErrors.email ? 'border-red-300 bg-red-50' : ''}`}
            placeholder="example@email.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </FormCard>

        {/* 3. Relationship */}
        <FormCard title="3. 與新人的關係" required error={validationErrors.relationship}>
           <select 
             className="w-full bg-gray-50 border-gray-200 border rounded-lg px-4 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all appearance-none cursor-pointer"
             value={formData.relationship}
             onChange={(e) => handleChange('relationship', e.target.value)}
             style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
           >
             <option value="">請選擇</option>
             <option value="男方親友">男方親友</option>
             <option value="女方親友">女方親友</option>
           </select>
        </FormCard>

        {/* 4. Attendance */}
        <FormCard title="4. 是否會出席婚宴" required error={validationErrors.attendance}>
          <div className="space-y-3">
            <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${formData.attendance === OPTION_ATTEND ? 'border-rose-400 bg-rose-50 shadow-sm' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input 
                type="radio" 
                name="attendance" 
                className="w-4 h-4 text-rose-500 focus:ring-rose-500 border-gray-300"
                checked={formData.attendance === OPTION_ATTEND}
                onChange={() => handleChange('attendance', OPTION_ATTEND)}
              />
              <span className={`ml-3 font-medium ${formData.attendance === OPTION_ATTEND ? 'text-rose-700' : 'text-gray-700'}`}>{OPTION_ATTEND}</span>
            </label>
            <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${formData.attendance === OPTION_NOT_ATTEND ? 'border-gray-400 bg-gray-100' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input 
                type="radio" 
                name="attendance" 
                className="w-4 h-4 text-gray-500 focus:ring-gray-500 border-gray-300"
                checked={formData.attendance === OPTION_NOT_ATTEND}
                onChange={() => handleChange('attendance', OPTION_NOT_ATTEND)}
              />
              <span className="ml-3 text-gray-700">{OPTION_NOT_ATTEND}</span>
            </label>
          </div>
        </FormCard>

        {/* Dynamic Section for Attendees */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${formData.attendance === OPTION_ATTEND ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          
          {/* 5. Phone */}
          <FormCard title="5. 您的聯繫電話" required description="格式要求：09xxxxxxxx（10碼）" error={validationErrors.phone}>
            <input 
              type="tel" 
              className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all ${validationErrors.phone ? 'border-red-300 bg-red-50' : ''}`}
              placeholder="09xxxxxxxx"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              maxLength={10}
            />
          </FormCard>

          <div className="grid grid-cols-1 gap-4">
             {/* 6. Attendee Count */}
             <FormCard title="6. 出席人數" required error={validationErrors.attendeeCount}>
                {renderSelectWithOther('attendeeCount', ['1', '2', '3'])}
             </FormCard>

             {/* 7. Child Seats */}
             <FormCard title="7. 需要幾張兒童座椅？" required description="若不需要請填 0" error={validationErrors.childSeats}>
                {renderSelectWithOther('childSeats', ['0', '1', '2', '3'])}
             </FormCard>

             {/* 8. Vegetarian */}
             <FormCard title="8. 素食餐點" required description="若不需要請填 0" error={validationErrors.vegetarianCount}>
                {renderSelectWithOther('vegetarianCount', ['0', '1', '2', '3'])}
             </FormCard>
          </div>
        </div>

        {/* AI Message Generator */}
        <FormCard title="給新人的祝福 / Message to Couple">
          <div className="mb-4 bg-rose-50 p-4 rounded-lg border border-rose-100">
            <p className="text-sm text-rose-800 font-medium mb-2 flex items-center gap-2">
              <img src="/shiba-dice.svg" alt="柴犬抱骰子" className="w-5 h-5 inline-block" />
              AI 創意柴助理
            </p>
            <p className="text-xs text-rose-600 mb-3">不知道該寫什麼嗎？點擊按鈕讓 AI 幫您產生專屬祝福（每次點擊都會產生不同內容）：</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'happy', label: '🎉 熱情奔放' },
                { id: 'sentimental', label: '💕 感性浪漫' },
                { id: 'humorous', label: '🤣 幽默搞笑' },
                { id: 'poem', label: '📜 文藝詩詞' },
                { id: 'movie', label: '🎬 電影台詞' },
                { id: 'slang', label: '😎 網路流行' },
                { id: 'chengyu', label: '🧧 成語連發' },
                { id: 'rap', label: '🎤 帥氣饒舌' },
                { id: 'flower', label: '🌹 上車舞' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleAiGenerate(s.id)}
                  disabled={aiLoading}
                  className="px-3 py-1.5 bg-white text-rose-600 border border-rose-200 rounded-md text-xs font-medium hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
             <textarea 
                className="w-full bg-gray-50 border-gray-200 border rounded-lg px-4 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all h-32 resize-none"
                placeholder="寫下您對新人的祝福..."
                value={formData.comments}
                onChange={(e) => handleChange('comments', e.target.value)}
              />
              {aiLoading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                   <div className="flex items-center space-x-2 text-rose-500">
                     <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     <span className="text-sm font-medium">AI 正在撰寫中...</span>
                   </div>
                </div>
              )}
          </div>
        </FormCard>

        <button 
          onClick={handleSubmit}
          disabled={status === FormStatus.PROCESSING}
          className="w-full bg-rose-600 text-white font-serif text-lg py-4 rounded-xl shadow-lg hover:bg-rose-700 hover:shadow-xl transition-all transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {status === FormStatus.PROCESSING ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>處理中...</span>
            </>
          ) : (
             <span>送出回覆 / Submit</span>
          )}
        </button>
        
        <p className="text-center text-gray-400 text-xs mt-6 pb-4">
          © 2024 Wedding RSVP.
        </p>

      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-md shadow-lg z-50 shiba-toast-enter-active">
          {toastMessage}
        </div>
      )}

      {/* small animation overlay applied to textarea when shiba activates */}
      {shibaAnimating && (
        <div aria-hidden className="pointer-events-none fixed inset-0 flex items-center justify-center z-40">
          <div className="w-40 h-40 rounded-full opacity-10 bg-rose-400 shiba-hit" />
        </div>
      )}

      {/* Admin Login Button - Repositioned to Bottom Right with Lock Icon */}
      <button 
        className="fixed bottom-2 right-2 p-2 opacity-[0.02] hover:opacity-100 transition-opacity duration-300 z-50 text-gray-700 bg-white/50 rounded-full hover:bg-white hover:shadow-md"
        title="Admin Access"
        onClick={() => {
          const pwd = prompt("Admin Password:");
          if (pwd === ADMIN_PASSCODE) setShowAdmin(true);
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
      </button>

    </div>
  );
};

export default App;