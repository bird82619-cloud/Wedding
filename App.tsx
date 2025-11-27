import React, { useState, useEffect } from 'react';
import { FormCard } from './components/FormCard';
import { AdminDashboard } from './components/AdminDashboard';
import { generateGuestMessage } from './services/geminiService';
import { FormData, FormStatus } from './types';

// Admin passcode from requirements
const ADMIN_PASSCODE = 'Rende0619';

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
  
  // Update: Default to cover.jpg, fallback to gradient if missing
  const [headerImage, setHeaderImage] = useState('/Wedding/cover.jpg');
  const [imageError, setImageError] = useState(false);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState<'unknown' | 'server' | 'local'>('unknown');
  
  // Admin Login Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // State to track which fields are in "Custom Input" mode explicitly
  const [customInputModes, setCustomInputModes] = useState<Record<string, boolean>>({});

  // Load header image & data
  useEffect(() => {
    const savedImage = localStorage.getItem('custom_header_image');
    if (savedImage) {
      setHeaderImage(savedImage);
      setImageError(false); // Reset error if user has a custom override
    }
    // Probe AI server health on mount to determine which AI source we will use
    (async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (res.ok) {
          setAiSource('server');
        } else {
          setAiSource('local');
        }
      } catch (e) {
        setAiSource('local');
      }
    })();
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
    // Also clear the specific combo error if present
    if (validationErrors.generalCombo) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.generalCombo;
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

      // 9. Combined Logic (User Request: Children + Veg <= Attendees)
      if ((totalChildren + totalVeg) > totalAttendees) {
        const msg = "防呆機制：(兒童座椅 + 素食) 總和不可大於出席總人數";
        // Show error on both fields to ensure visibility
        errors.vegetarianCount = msg;
        errors.childSeats = msg;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAiGenerate = async (style: string) => {
    if (!formData.fullName) {
      setValidationErrors(prev => ({...prev, fullName: "請先輸入姓名以產生專屬祝福"}));
      // Scroll to name field
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setAiLoading(true);
    try {
        const msg = await generateGuestMessage(style, formData.fullName);
        setFormData(prev => ({ ...prev, comments: msg }));
    } catch (e) {
        console.error('[AI] generateGuestMessage error:', e);
        // Fallback message if something goes wrong
        setFormData(prev => ({ ...prev, comments: '祝你們百年好合！' }));
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

      // Mark as completed
      setStatus(FormStatus.COMPLETED);
    } catch (e) {
      console.error(e);
      setStatus(FormStatus.ERROR);
    }
  };

  const handleAdminLogin = () => {
    if (passwordInput === ADMIN_PASSCODE) {
      setShowAdmin(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setLoginError('');
    } else {
      setLoginError('密碼錯誤 (Incorrect Password)');
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
    const val = formData[field];
    
    // Determine if we are in custom mode.
    const isCustom = customInputModes[field] ?? (!options.includes(val) && val !== '');
    const selectValue = isCustom ? 'custom' : val;

    return (
      <div className="space-y-2">
        <select 
          className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all ${validationErrors[field] ? 'border-red-300 bg-red-50' : ''}`}
          value={selectValue}
          onChange={(e) => {
            const newVal = e.target.value;
            if (newVal === 'custom') {
              setCustomInputModes(prev => ({...prev, [field]: true}));
              handleChange(field, ''); // Clear value to let user type
            } else {
              setCustomInputModes(prev => ({...prev, [field]: false}));
              handleChange(field, newVal);
            }
          }}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          <option value="custom">Other (自填)</option>
        </select>

        {/* Show input if custom mode is active */}
        {isCustom && (
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
    return (
      <AdminDashboard 
        onBack={() => setShowAdmin(false)} 
        currentImage={headerImage} 
        onUpdateImage={(newImg) => {
          setHeaderImage(newImg);
          setImageError(false); // Reset error if admin updates image
        }} 
      />
    );
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
          <p className="text-gray-600 mb-6">我們已經收到您的出席資訊，感謝您的回應！</p>
          <button 
            onClick={() => {
              setFormData(INITIAL_DATA);
              setStatus(FormStatus.IDLE);
              setCustomInputModes({});
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
      {/* Header Image */}
      <div className="relative h-64 md:h-80 bg-gray-200 overflow-hidden shadow-sm">
         {imageError ? (
           <div className="w-full h-full bg-gradient-to-br from-rose-50 to-orange-50 flex items-center justify-center">
              <div className="text-center p-4">
                 <p className="font-serif text-4xl text-gray-400 opacity-20 italic">Wedding</p>
              </div>
           </div>
         ) : (
           <img 
             src={headerImage} 
             alt="Wedding Header" 
             className="w-full h-full object-cover" 
             onError={() => setImageError(true)}
           />
         )}
      </div>

      <div className="max-w-2xl mx-auto -mt-10 px-4 relative z-10">
        <div className="bg-white rounded-xl shadow-xl p-8 mb-6 text-center border-t-4 border-rose-400">
          <h1 className="text-3xl md:text-4xl font-serif text-gray-800 mb-4 flex items-center justify-center flex-wrap gap-2">
            <span>仁德</span>
            {/* 3D Platinum Interlocking Rings */}
            <span className="relative inline-flex items-center justify-center w-14 h-14 mx-1">
              <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform -rotate-12 drop-shadow-md">
                <defs>
                  <linearGradient id="platinumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F8FAFC" /> {/* Light Silver */}
                    <stop offset="25%" stopColor="#E2E8F0" />
                    <stop offset="50%" stopColor="#94A3B8" /> {/* Darker Silver for depth */}
                    <stop offset="75%" stopColor="#E2E8F0" />
                    <stop offset="100%" stopColor="#F1F5F9" />
                  </linearGradient>
                  <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="highlight" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="white" stopOpacity="0" />
                    <stop offset="50%" stopColor="white" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Left Ring (Bottom Layer) */}
                <path 
                  d="M20 35 A 18 18 0 1 1 56 35 A 18 18 0 1 1 20 35 Z" 
                  fill="none" 
                  stroke="url(#platinumGradient)" 
                  strokeWidth="6" 
                />
                <path 
                  d="M20 35 A 18 18 0 1 1 56 35 A 18 18 0 1 1 20 35 Z" 
                  fill="none" 
                  stroke="url(#highlight)" 
                  strokeWidth="2" 
                  opacity="0.6"
                />

                {/* Right Ring (Top Layer, Interlocking effect) */}
                <path 
                  d="M44 35 A 18 18 0 1 1 80 35 A 18 18 0 1 1 44 35 Z" 
                  fill="none" 
                  stroke="url(#platinumGradient)" 
                  strokeWidth="6" 
                />
                 <path 
                  d="M44 35 A 18 18 0 1 1 80 35 A 18 18 0 1 1 44 35 Z" 
                  fill="none" 
                  stroke="url(#highlight)" 
                  strokeWidth="2" 
                  opacity="0.6"
                />

                {/* Visual Fix for Interlocking: Draw a small segment of Left Ring ON TOP of Right Ring at the bottom intersection */}
                <path 
                  d="M38 52 A 18 18 0 0 0 49 48" 
                  fill="none" 
                  stroke="url(#platinumGradient)" 
                  strokeWidth="6" 
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>雯惠</span>
            <span className="text-2xl w-full block mt-2 text-gray-600">婚禮出席調查</span>
          </h1>
          <div className="h-1 w-20 bg-rose-200 mx-auto mb-6"></div>
          
          <div className="text-gray-700 leading-relaxed space-y-4 font-light text-justify md:text-center">
            <p>致親愛的好友們～</p>
            <p>是的，經過兩千多個日子的相處與陪伴，<br className="hidden md:block"/>我們決定執起彼此的手，步入人生另一個階段。</p>
            <div className="py-2">
              <p className="font-bold text-rose-600 text-lg">2026/5/16（六）</p>
              <p className="font-bold text-gray-800 flex items-center justify-center gap-1 flex-wrap mt-1">
                於 
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=桃園彭園八德館" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-rose-600 hover:text-rose-800 transition-colors inline-flex items-center border-b border-rose-300 hover:border-rose-600 pb-0.5 mx-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  桃園彭園八德館
                </a>
                舉辦午宴
              </p>
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
             {/* 6. Attendee Count (Changed placeholder as requested) */}
             <FormCard title="6. 出席人數" required error={validationErrors.attendeeCount}>
                {renderSelectWithOther('attendeeCount', ['1', '2', '3'], '請輸入人數')}
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
            <div className="flex items-center mb-3">
              {/* Red Shiba with 3D Dice */}
              <div className="mr-3 flex-shrink-0">
                <svg width="72" height="72" viewBox="0 0 100 100" className="drop-shadow-sm overflow-visible">
                  <defs>
                     {/* 3D Dice Gradients */}
                     <linearGradient id="diceTop" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="100%" stopColor="#F3F4F6" />
                     </linearGradient>
                     <linearGradient id="diceLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#E5E7EB" />
                        <stop offset="100%" stopColor="#D1D5DB" />
                     </linearGradient>
                     <linearGradient id="diceRight" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#D1D5DB" />
                        <stop offset="100%" stopColor="#9CA3AF" />
                     </linearGradient>
                  </defs>

                  {/* Red Shiba Head (Akita/Shiba Color) */}
                  <g transform="translate(0, 5)">
                    {/* Ears */}
                    <path d="M25 35 Q20 15 35 25" fill="#D97706" stroke="#B45309" strokeWidth="1.5" strokeLinejoin="round" /> {/* Amber-600 */}
                    <path d="M75 35 Q80 15 65 25" fill="#D97706" stroke="#B45309" strokeWidth="1.5" strokeLinejoin="round" />
                    
                    {/* Face Shape */}
                    <ellipse cx="50" cy="55" rx="32" ry="30" fill="#FFF7ED" stroke="#B45309" strokeWidth="1.5" /> {/* Cream face */}
                    
                    {/* Red Fur Pattern (Forehead & Cheeks) */}
                    <path d="M30 40 Q50 30 70 40 Q80 55 75 70 L25 70 Q20 55 30 40" fill="#D97706" opacity="0.9" />
                    
                    {/* White Eyebrows */}
                    <ellipse cx="36" cy="42" rx="3" ry="1.5" fill="white" opacity="0.8" transform="rotate(-10)" />
                    <ellipse cx="64" cy="42" rx="3" ry="1.5" fill="white" opacity="0.8" transform="rotate(10)" />

                    {/* Cheek Blush */}
                    <circle cx="28" cy="62" r="5" fill="#FDA4AF" opacity="0.6" />
                    <circle cx="72" cy="62" r="5" fill="#FDA4AF" opacity="0.6" />
                    
                    {/* Eyes */}
                    <circle cx="38" cy="54" r="3.5" fill="#374151" />
                    <circle cx="62" cy="54" r="3.5" fill="#374151" />
                    
                    {/* Snout */}
                    <ellipse cx="50" cy="66" rx="10" ry="8" fill="white" />
                    <path d="M47 63 L53 63 L50 67 Z" fill="#1F2937" strokeLinejoin="round" />
                    <path d="M47 69 Q50 72 53 69" fill="none" stroke="#1F2937" strokeWidth="1.5" strokeLinecap="round" />
                  </g>
                  
                  {/* 3D Dice (Isometric Cube) */}
                  <g transform="translate(62, 58) scale(0.9)">
                     {/* Top Face */}
                     <path d="M15 0 L30 8 L15 16 L0 8 Z" fill="url(#diceTop)" stroke="#E5E7EB" strokeWidth="0.5" />
                     {/* Left Face */}
                     <path d="M0 8 L15 16 V32 L0 24 Z" fill="url(#diceLeft)" stroke="#E5E7EB" strokeWidth="0.5" />
                     {/* Right Face */}
                     <path d="M15 16 L30 8 V24 L15 32 Z" fill="url(#diceRight)" stroke="#E5E7EB" strokeWidth="0.5" />
                     
                     {/* Dots (Red for 1 on Top) */}
                     <circle cx="15" cy="8" r="2.5" fill="#DC2626" />
                     
                     {/* Dots (2 on Right Face) */}
                     <circle cx="19" cy="15" r="1.5" fill="#374151" opacity="0.7" transform="skewY(30)"/> 
                     <circle cx="26" cy="19" r="1.5" fill="#374151" opacity="0.7" transform="skewY(30)"/>

                     {/* Dots (3 on Left Face) */}
                     <circle cx="4" cy="15" r="1.5" fill="#374151" opacity="0.7" transform="skewY(-30)"/>
                     <circle cx="7.5" cy="20" r="1.5" fill="#374151" opacity="0.7" transform="skewY(-30)"/>
                     <circle cx="11" cy="25" r="1.5" fill="#374151" opacity="0.7" transform="skewY(-30)"/>
                  </g>

                  {/* Paws */}
                  <ellipse cx="58" cy="80" rx="5" ry="4" fill="#FFF7ED" stroke="#D97706" strokeWidth="1" />
                  <ellipse cx="78" cy="82" rx="5" ry="4" fill="#FFF7ED" stroke="#D97706" strokeWidth="1" transform="rotate(-10)" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-rose-800 text-lg">AI 創意柴助理</h4>
                <p className="text-xs text-rose-600">點擊下方按鈕，讓柴柴幫你寫祝福！</p>
                <p className="text-xs text-gray-500 mt-1">
                  使用：{aiSource === 'unknown' ? '偵測中...' : aiSource === 'server' ? '伺服器 AI（/api/generate）' : '本地 fallback（無需 API key）'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-2">
               {[
                 { id: 'flower', label: '🌹 上車舞' },
                 { id: 'movie', label: '🎬 電影' },
                 { id: 'slang', label: '🔥 流行語' },
                 { id: 'familiar', label: '🤝 裝熟' },
               ].map(style => (
                 <button
                   key={style.id}
                   onClick={() => handleAiGenerate(style.id)}
                   disabled={aiLoading}
                   className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700 hover:scale-105 transition-all py-1.5 px-1 rounded-md text-xs md:text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {style.label}
                 </button>
               ))}
            </div>
          </div>

          <textarea 
            className="w-full h-32 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:bg-white focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all resize-none"
            placeholder="請輸入給新人的祝福話語..."
            value={formData.comments}
            onChange={(e) => handleChange('comments', e.target.value)}
          />
          {aiLoading && <p className="text-xs text-rose-500 mt-2 animate-pulse">✨ 柴柴正在努力思考中...</p>}
        </FormCard>

        {/* Submit */}
        <button 
          onClick={handleSubmit}
          disabled={status === FormStatus.PROCESSING}
          className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transform transition-all active:scale-95 flex items-center justify-center
            ${status === FormStatus.PROCESSING ? 'bg-gray-400 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600'}`}
        >
          {status === FormStatus.PROCESSING ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              處理中...
            </span>
          ) : '確認送出 (Send RSVP)'}
        </button>
      </div>

      {/* Admin Login Modal (Triggered by Lock Button) */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs border border-gray-200">
            <h3 className="text-lg font-serif text-gray-800 mb-2">管理員登入</h3>
            <p className="text-sm text-gray-500 mb-4">請輸入密碼以進入後台。</p>
            
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-2 focus:ring-2 focus:ring-rose-300 outline-none"
              placeholder="Password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            {loginError && <p className="text-red-500 text-xs mb-3">{loginError}</p>}
            
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                  setLoginError('');
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAdminLogin}
                className="flex-1 bg-gray-800 text-white font-medium py-2 rounded-lg hover:bg-black transition-colors"
              >
                登入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Small, almost invisible Admin Lock Button at bottom right */}
      <div className="fixed bottom-2 right-2 z-50">
         <button
            onClick={() => setShowPasswordModal(true)}
            className="bg-gray-800 text-white rounded-full p-2 opacity-[0.02] hover:opacity-50 transition-all duration-300 shadow-sm"
            style={{ transform: 'scale(0.4)' }}
            aria-label="Admin Access"
         >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
         </button>
      </div>
    </div>
  );
};

export default App;