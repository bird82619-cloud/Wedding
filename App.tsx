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
    if (!formData.fullName.trim()) errors.fullName = "請輸入姓名";
    if (!formData.relationship) errors.relationship = "請選擇關係";
    if (!formData.attendance) errors.attendance = "請選擇是否出席";
    
    if (formData.attendance === OPTION_ATTEND) {
      if (!formData.phone.trim()) errors.phone = "請輸入電話";
      
      const total = parseInt(formData.attendeeCount) || 0;
      if (total < 1) errors.attendeeCount = "至少 1 人";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAiGenerate = async (style: string) => {
    if (!formData.fullName) {
      setValidationErrors(prev => ({...prev, fullName: "請先輸入姓名以產生專屬祝福"}));
      return;
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

  const handleSubmit = async () => {
    if (!validate()) {
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
      // Create a mailto link with the summary
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
    <div className="min-h-screen pb-12 fade-in">
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
         
         {/* Subtle Admin Trigger */}
         <button 
           className="absolute top-4 right-4 bg-white/30 p-2 rounded-full hover:bg-white/80 transition backdrop-blur-sm"
           onClick={() => {
             const pwd = prompt("Admin Password:");
             if (pwd === ADMIN_PASSCODE) setShowAdmin(true);
           }}
         >
           <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
           </svg>
         </button>
      </div>

      <div className="max-w-2xl mx-auto -mt-10 px-4 relative z-10">
        <div className="bg-white rounded-xl shadow-xl p-8 mb-6 text-center border-t-4 border-rose-400">
          <h1 className="text-4xl md:text-5xl font-serif text-gray-800 mb-3">仁德 & 雯惠</h1>
          <div className="h-1 w-20 bg-rose-200 mx-auto mb-4"></div>
          <p className="text-rose-500 uppercase tracking-widest text-xs font-bold mb-4">Wedding Invitation</p>
          <p className="text-gray-600 leading-relaxed font-light">
            我們決定攜手共度下半輩子。<br/>
            誠摯邀請您參與我們的婚禮，見證我們的幸福時刻。<br/>
            <span className="text-sm text-gray-400 mt-2 block">(請協助填寫以下回覆，讓我們為您安排座位)</span>
          </p>
        </div>

        {/* Basic Info */}
        <FormCard title="您的姓名 / Full Name" required error={validationErrors.fullName}>
          <input 
            type="text" 
            className="w-full bg-gray-50 border-gray-200 border rounded-lg px-4 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all"
            placeholder="請輸入您的全名"
            value={formData.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
          />
        </FormCard>

        <FormCard title="與新人的關係 / Relationship" required error={validationErrors.relationship}>
           <select 
             className="w-full bg-gray-50 border-gray-200 border rounded-lg px-4 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all appearance-none cursor-pointer"
             value={formData.relationship}
             onChange={(e) => handleChange('relationship', e.target.value)}
             style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
           >
             <option value="">請選擇您與新人的關係</option>
             <option value="男方親戚">男方親戚 (Groom's Family)</option>
             <option value="男方朋友/同事">男方朋友/同事 (Groom's Friend)</option>
             <option value="女方親戚">女方親戚 (Bride's Family)</option>
             <option value="女方朋友/同事">女方朋友/同事 (Bride's Friend)</option>
           </select>
        </FormCard>

        {/* Attendance */}
        <FormCard title="是否出席 / Attendance" required error={validationErrors.attendance}>
          <div className="space-y-3">
            <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${formData.attendance === OPTION_ATTEND ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:bg-gray-50'}`}>
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

        {/* Details Section (Conditional) */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${formData.attendance === OPTION_ATTEND ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <FormCard title="聯絡電話 / Phone Number" required error={validationErrors.phone}>
            <input 
              type="tel" 
              className="w-full bg-gray-50 border-gray-200 border rounded-lg px-4 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all"
              placeholder="09xx-xxx-xxx"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </FormCard>

          <FormCard title="電子信箱 / Email (Optional)">
            <input 
              type="email" 
              className="w-full bg-gray-50 border-gray-200 border rounded-lg px-4 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all"
              placeholder="example@email.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </FormCard>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <FormCard title="出席人數 / Adults" required error={validationErrors.attendeeCount}>
                <select 
                   className="w-full bg-gray-50 border-gray-200 border rounded-lg px-3 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all"
                   value={formData.attendeeCount}
                   onChange={(e) => handleChange('attendeeCount', e.target.value)}
                 >
                   {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                   <option value="More">6+</option>
                 </select>
             </FormCard>
             <FormCard title="兒童座椅 / Child Seats">
                <select 
                   className="w-full bg-gray-50 border-gray-200 border rounded-lg px-3 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all"
                   value={formData.childSeats}
                   onChange={(e) => handleChange('childSeats', e.target.value)}
                 >
                   {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                 </select>
             </FormCard>
             <FormCard title="素食餐點 / Vegetarian">
                <select 
                   className="w-full bg-gray-50 border-gray-200 border rounded-lg px-3 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all"
                   value={formData.vegetarianCount}
                   onChange={(e) => handleChange('vegetarianCount', e.target.value)}
                 >
                   {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                 </select>
             </FormCard>
          </div>
        </div>

        {/* AI Message Generator */}
        <FormCard title="給新人的祝福 / Message to Couple">
          <div className="mb-4 bg-rose-50 p-4 rounded-lg border border-rose-100">
            <p className="text-sm text-rose-800 font-medium mb-2 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>
              AI 創意助理 (AI Assistant)
            </p>
            <p className="text-xs text-rose-600 mb-3">點擊下方按鈕，讓 AI 為您生成專屬祝福語：</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'happy', label: '🎉 熱情奔放' },
                { id: 'sentimental', label: '💕 感性浪漫' },
                { id: 'humorous', label: '🤣 幽默搞笑' },
                { id: 'poem', label: '📜 文藝詩詞' },
                { id: 'rap', label: '🎤 帥氣饒舌' },
                { id: 'bullshit', label: '🤪 一本正經胡說' },
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
                placeholder="寫下您對新人的祝福，或使用上方 AI 按鈕產生..."
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
             <span>送出回覆 / Submit RSVP</span>
          )}
        </button>
        
        <p className="text-center text-gray-400 text-xs mt-6 pb-4">
          © 2024 Wedding RSVP. Made with ❤️ & AI.
        </p>

      </div>
    </div>
  );
};

export default App;