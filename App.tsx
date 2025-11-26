import React, { useState, useEffect, useRef } from 'react';
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
  attendeeCount: '',
  childSeats: '',
  vegetarianCount: '',
  comments: ''
};

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(INITIAL_DATA);
  const [status, setStatus] = useState<FormStatus>(FormStatus.IDLE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  
  // App View State
  const [view, setView] = useState<'FORM' | 'ADMIN'>('FORM');

  // Header Image State (Load from local storage or default to 1.png)
  const [headerImage, setHeaderImage] = useState<string>('1.png');

  // AI Message Generation State
  const [isGeneratingMsg, setIsGeneratingMsg] = useState(false);
  const [showAiOptions, setShowAiOptions] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const savedImage = localStorage.getItem('custom_header_image');
    if (savedImage) {
      setHeaderImage(savedImage);
    }
  }, []);

  // Admin Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  
  // Helper for "Other" text inputs
  const [customInputs, setCustomInputs] = useState({
    attendeeCount: '',
    childSeats: '',
    vegetarianCount: ''
  });

  const isAttending = formData.attendance === OPTION_ATTEND;
  
  // Dynamic Question Numbering Helper
  const getQuestionNumber = (section: string) => {
    const sequence = ['name', 'email', 'relation', 'attendance'];
    
    if (isAttending) {
      sequence.push('phone');
      sequence.push('details');
    }
    sequence.push('comments');
    
    const index = sequence.indexOf(section);
    return index !== -1 ? index + 1 : -1;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAiMessage = async (style: string) => {
    // 1. Set State & Create AbortController
    setIsGeneratingMsg(true);
    setShowAiOptions(false);
    
    // Create a new controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 2. Clear current text to show it's working
    setFormData(prev => ({ ...prev, comments: "AI 正在撰寫中 (AI is writing)..." }));

    try {
      // 3. Race between generation and abort signal check
      const msgPromise = generateGuestMessage(style, formData.fullName);
      
      const msg = await msgPromise;

      // 4. Check if aborted before updating state
      if (!controller.signal.aborted) {
        setFormData(prev => ({ ...prev, comments: msg }));
      }
    } catch (error) {
       if (!controller.signal.aborted) {
         setFormData(prev => ({ ...prev, comments: "AI 生成失敗，請稍後再試。" }));
       }
    } finally {
      // 5. Cleanup
      if (!controller.signal.aborted) {
        setIsGeneratingMsg(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleStopAi = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // Signal cancellation (logically)
      abortControllerRef.current = null;
      
      // Immediately unlock UI and clear the "Writing..." text so user can type
      setIsGeneratingMsg(false);
      setFormData(prev => ({ ...prev, comments: "" })); 
    }
  };

  const handleAdminSubmit = () => {
    if (adminInput === ADMIN_PASSCODE) {
      setShowAdminModal(false);
      setAdminInput('');
      setView('ADMIN');
    } else {
      alert("密碼錯誤 (Incorrect Passcode)");
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = '請填寫姓名';
    if (!formData.email.trim()) newErrors.email = '請填寫 Email';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = '請輸入有效的 Email';
    
    if (!formData.relationship) newErrors.relationship = '請選擇關係';
    if (!formData.attendance) newErrors.attendance = '請選擇是否出席';

    if (isAttending) {
      // Validating Phone: Must start with 09 and be 10 digits
      if (!formData.phone.trim()) {
        newErrors.phone = '請填寫電話';
      } else if (!/^09\d{8}$/.test(formData.phone.replace(/[-\s]/g, ''))) {
        newErrors.phone = '格式錯誤: 請輸入10碼手機號碼 (09xxxxxxxx)';
      }

      if (!formData.attendeeCount) newErrors.attendeeCount = '請選擇人數';
      if (!formData.childSeats) newErrors.childSeats = '請選擇兒童椅數量';
      if (!formData.vegetarianCount) newErrors.vegetarianCount = '請選擇素食數量';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveDataLocally = (data: FormData) => {
    try {
      const existing = localStorage.getItem('wedding_rsvps');
      const list = existing ? JSON.parse(existing) : [];
      list.push({ ...data, timestamp: new Date().toISOString() });
      localStorage.setItem('wedding_rsvps', JSON.stringify(list));
    } catch (e) {
      console.warn("Could not save to local storage", e);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setStatus(FormStatus.PROCESSING);

    try {
      let dataToSend = { ...formData };
      
      if (!isAttending) {
        dataToSend = {
          ...dataToSend,
          phone: 'N/A',
          attendeeCount: '0',
          childSeats: '0',
          vegetarianCount: '0'
        };
      }

      // Save to simulated DB
      saveDataLocally(dataToSend);

      const emailBody = await generateEmailSummary(dataToSend);
      
      const subject = encodeURIComponent(`婚禮出席回覆: ${formData.fullName}`);
      const body = encodeURIComponent(emailBody);
      const mailtoLink = `mailto:${TARGET_EMAIL}?subject=${subject}&body=${body}`;

      window.location.href = mailtoLink;
      setStatus(FormStatus.COMPLETED);
    } catch (error) {
      console.error(error);
      setStatus(FormStatus.ERROR);
    }
  };

  const RadioWithOther = ({ 
    name, 
    options, 
    value, 
    customValue, 
    setCustomValue,
    layout = 'vertical'
  }: { 
    name: keyof FormData, 
    options: string[], 
    value: string, 
    customValue: string, 
    setCustomValue: (val: string) => void,
    layout?: 'vertical' | 'horizontal'
  }) => {
    const isStandard = options.includes(value);
    const isOtherSelected = value === 'Other' || (!isStandard && value !== '');

    const onRadioChange = (opt: string) => {
      if (opt === 'Other') {
        setFormData(prev => ({ ...prev, [name]: customValue }));
      } else {
        setFormData(prev => ({ ...prev, [name]: opt }));
      }
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const onCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCustomValue(val);
      setFormData(prev => ({ ...prev, [name]: val }));
    };

    return (
      <div className={`flex ${layout === 'horizontal' ? 'flex-row flex-wrap gap-4' : 'flex-col space-y-3'}`}>
        {options.map((option) => (
          <label key={option} className="flex items-center space-x-2 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="radio"
                name={`${name}_group`}
                checked={value === option}
                onChange={() => onRadioChange(option)}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-gray-300 checked:border-rose-500 transition-all"
              />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
            <span className="text-gray-700 font-light">{option}</span>
          </label>
        ))}
        {/* Other Option */}
        <div className="flex items-center space-x-2 group min-w-[120px]">
           <div className="relative flex items-center">
              <input
                type="radio"
                name={`${name}_group`}
                checked={isOtherSelected && !options.includes(value)}
                onChange={() => onRadioChange('Other')}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-gray-300 checked:border-rose-500 transition-all"
              />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
           </div>
           <div className="flex items-center space-x-2">
              <span className="text-gray-700 font-light">其他:</span>
              <input 
                type="text" 
                className="border-b border-gray-300 focus:border-rose-500 outline-none py-1 px-1 bg-transparent w-20 sm:w-32 font-light"
                value={customValue}
                onChange={onCustomInputChange}
                onFocus={() => onRadioChange('Other')}
              />
           </div>
        </div>
      </div>
    );
  };

  // If Admin View
  if (view === 'ADMIN') {
    return (
      <AdminDashboard 
        onBack={() => setView('FORM')} 
        currentImage={headerImage}
        onUpdateImage={setHeaderImage}
      />
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 relative">
      
      {/* Admin Modal Overlay */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100 border border-rose-100">
            <h3 className="text-xl font-serif text-gray-800 mb-4 text-center">Admin Access</h3>
            <p className="text-sm text-gray-500 mb-4 text-center">請輸入管理員密碼以查看資料庫</p>
            <input 
              type="password" 
              value={adminInput}
              onChange={(e) => setAdminInput(e.target.value)}
              placeholder="Enter passcode"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:border-rose-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => { setShowAdminModal(false); setAdminInput(''); }}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAdminSubmit}
                className="px-4 py-2 bg-rose-500 text-white rounded hover:bg-rose-600 transition-colors"
              >
                Go
              </button>
            </div>
          </div>
        </div>
      )}

      {status === FormStatus.COMPLETED ? (
         <div className="min-h-screen flex items-center justify-center p-4 -mt-16">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-8 max-w-md w-full text-center border-t-4 border-rose-400 fade-in">
            <div className="mb-4 text-rose-500 flex justify-center">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h2 className="text-3xl serif-font text-gray-800 mb-2">Thank You</h2>
            <p className="text-gray-600 mb-6 font-light">
              感謝您的填寫！您的郵件軟體已開啟，<br/>請記得點擊「發送」以完成回覆。
            </p>
            <button 
              onClick={() => {
                setStatus(FormStatus.IDLE);
                setFormData(INITIAL_DATA);
                setCustomInputs({ attendeeCount: '', childSeats: '', vegetarianCount: '' });
              }}
              className="text-rose-600 hover:text-rose-800 underline decoration-rose-300 underline-offset-4 transition-colors"
            >
              填寫下一份表單
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto fade-in pb-12">
          
          {/* Header Image - Using state variable. 
              Aligned slightly right on mobile (60%) and center on desktop. */}
          <div className="w-full h-48 md:h-64 bg-cover rounded-t-lg shadow-sm mb-0 grayscale-[10%] hover:grayscale-0 transition-all duration-700" 
               style={{ 
                 backgroundImage: `url('${headerImage}')`,
                 backgroundPosition: '60% center' // Center-ish but nudged right for mobile
               }}>
          </div>

          {/* Title Card */}
          <div className="bg-white/90 backdrop-blur rounded-b-lg rounded-t-none border-t-4 border-rose-400 shadow-lg p-8 mb-6 relative -mt-1">
            <div className="text-center mb-6">
               {/* Updated Title with High-Quality Rendered Ring Icon */}
               <h1 className="text-4xl text-gray-800 mb-2 font-medium tracking-wide flex items-center justify-center gap-6">
                 <span className="relative top-1">仁德</span>
                 {/* Stylized Wedding Rings Icon */}
                 <svg className="w-20 h-16" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FDE68A" />
                        <stop offset="25%" stopColor="#D97706" />
                        <stop offset="50%" stopColor="#F59E0B" />
                        <stop offset="75%" stopColor="#D97706" />
                        <stop offset="100%" stopColor="#FDE68A" />
                      </linearGradient>
                       <linearGradient id="diamondGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#E0F2FE" />
                        <stop offset="50%" stopColor="#FFFFFF" />
                        <stop offset="100%" stopColor="#BAE6FD" />
                      </linearGradient>
                      <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
                        <feOffset dx="1" dy="1" result="offsetblur"/>
                        <feComponentTransfer>
                          <feFuncA type="linear" slope="0.3"/>
                        </feComponentTransfer>
                        <feMerge> 
                          <feMergeNode/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <g filter="url(#dropShadow)">
                       <circle cx="35" cy="30" r="18" stroke="url(#goldGradient)" strokeWidth="5" fill="none" />
                       <circle cx="65" cy="30" r="18" stroke="url(#goldGradient)" strokeWidth="5" fill="none" />
                       <path d="M35 12 L38 16 L35 20 L32 16 Z" fill="url(#diamondGradient)" stroke="#93C5FD" strokeWidth="0.5" />
                       <circle cx="65" cy="18" r="1.5" fill="white" opacity="0.8" />
                       <circle cx="28" cy="40" r="1" fill="white" opacity="0.6" />
                    </g>
                 </svg>
                 <span className="relative top-1">雯惠</span>
               </h1>
               <p className="text-rose-500 uppercase tracking-widest text-sm font-bold mt-2">Wedding Invitation</p>
            </div>
            
            <div className="text-gray-600 leading-relaxed text-base space-y-4 text-center font-light">
              <p>致親愛的好友們～</p>
              <p>經過一千多個日子的相處與陪伴，<br/>我們決定執起彼此的手，步入人生另一個階段。</p>
              <div className="py-4 my-4 border-t border-b border-rose-100">
                <p className="font-normal text-lg text-gray-800">
                  2026 . 05 . 16 (Sat)
                </p>
                <p className="mt-1">
                  <a 
                    href="https://www.google.com/maps/search/?api=1&query=桃園彭園八德館" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-rose-600 hover:text-rose-800 hover:underline transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    桃園彭園八德館
                  </a>
                </p>
              </div>
              <p>誠摯邀請您前來一同分享我們的喜悅，<br/>讓這個充滿意義的日子更加幸福！</p>
              <p className="italic text-rose-400 pt-2">期待您的蒞臨 ❤</p>
            </div>
          </div>

          {/* 1. Name */}
          <FormCard title={`${getQuestionNumber('name')}. 請問您的大名`} required error={errors.fullName}>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="請輸入姓名"
              className="w-full border-b border-gray-300 focus:border-rose-400 outline-none py-2 bg-transparent transition-colors focus:bg-rose-50 px-1 font-light"
            />
          </FormCard>

          {/* 2. Email */}
          <FormCard title={`${getQuestionNumber('email')}. 電子信箱 E-mail`} required description="我們會寄送電子喜帖給您" error={errors.email}>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="example@email.com"
              className="w-full border-b border-gray-300 focus:border-rose-400 outline-none py-2 bg-transparent transition-colors focus:bg-rose-50 px-1 font-light"
            />
          </FormCard>

          {/* 3. Relationship */}
          <FormCard title={`${getQuestionNumber('relation')}. 與新人的關係`} required error={errors.relationship}>
            <div className="space-y-3">
              {['男方親友', '女方親友'].map((option) => (
                <label key={option} className="flex items-center space-x-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="radio"
                      name="relationship"
                      value={option}
                      checked={formData.relationship === option}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, relationship: e.target.value }));
                        setErrors(prev => ({ ...prev, relationship: undefined }));
                      }}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-gray-300 checked:border-rose-500 transition-all"
                    />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                  </div>
                  <span className="text-gray-700 font-light">{option}</span>
                </label>
              ))}
            </div>
          </FormCard>

          {/* 4. Attendance */}
          <FormCard title={`${getQuestionNumber('attendance')}. 是否會出席婚宴`} required error={errors.attendance}>
             <div className="space-y-3">
              {[OPTION_ATTEND, OPTION_NOT_ATTEND].map((option) => (
                <label key={option} className="flex items-center space-x-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="radio"
                      name="attendance"
                      value={option}
                      checked={formData.attendance === option}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, attendance: e.target.value }));
                        setErrors(prev => ({ ...prev, attendance: undefined }));
                      }}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-gray-300 checked:border-rose-500 transition-all"
                    />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></div>
                  </div>
                  <span className="text-gray-700 font-light">{option}</span>
                </label>
              ))}
            </div>
          </FormCard>

          {/* Conditional Rendering for Attending Guests */}
          {isAttending && (
            <div className="fade-in">
              {/* Phone */}
              <FormCard title={`${getQuestionNumber('phone')}. 您的聯繫電話`} required description="格式：09xxxxxxxx (必填 10 碼)" error={errors.phone}>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="09..."
                  maxLength={10}
                  className="w-full border-b border-gray-300 focus:border-rose-400 outline-none py-2 bg-transparent transition-colors focus:bg-rose-50 px-1 font-light"
                />
              </FormCard>

              {/* Merged Details: Attendee Count, Child Seats, Veg Count */}
              <FormCard 
                title={`${getQuestionNumber('details')}. 出席細節`} 
                required 
                description="請協助確認人數與餐點"
              >
                {/* Sub-section 1: Attendees */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 font-serif">出席人數</label>
                    {errors.attendeeCount && <span className="text-xs text-red-500">{errors.attendeeCount}</span>}
                  </div>
                  <RadioWithOther
                    name="attendeeCount"
                    options={['1 位', '2 位', '3 位']}
                    value={formData.attendeeCount}
                    customValue={customInputs.attendeeCount}
                    setCustomValue={(val) => setCustomInputs(prev => ({ ...prev, attendeeCount: val }))}
                    layout="horizontal"
                  />
                </div>

                {/* Sub-section 2: Child Seats */}
                <div className="mb-6 border-t border-dotted border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 font-serif">兒童座椅</label>
                    {errors.childSeats && <span className="text-xs text-red-500">{errors.childSeats}</span>}
                  </div>
                  <RadioWithOther
                    name="childSeats"
                    options={['0', '1', '2', '3']}
                    value={formData.childSeats}
                    customValue={customInputs.childSeats}
                    setCustomValue={(val) => setCustomInputs(prev => ({ ...prev, childSeats: val }))}
                    layout="horizontal"
                  />
                </div>

                {/* Sub-section 3: Veg Count */}
                <div className="mb-2 border-t border-dotted border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 font-serif">素食餐點</label>
                    {errors.vegetarianCount && <span className="text-xs text-red-500">{errors.vegetarianCount}</span>}
                  </div>
                  <RadioWithOther
                    name="vegetarianCount"
                    options={['0', '1', '2', '3']}
                    value={formData.vegetarianCount}
                    customValue={customInputs.vegetarianCount}
                    setCustomValue={(val) => setCustomInputs(prev => ({ ...prev, vegetarianCount: val }))}
                    layout="horizontal"
                  />
                </div>
              </FormCard>
            </div>
          )}

          {/* Comments - Always shown at the end */}
          <FormCard title={`${getQuestionNumber('comments')}. 想跟我們說的話`} description="自由留言區：給新人的祝福">
            <div className="relative">
              <textarea
                name="comments"
                value={formData.comments}
                onChange={handleInputChange}
                placeholder={isGeneratingMsg ? "AI 正在努力撰寫中..." : "寫下您的祝福..."}
                rows={3}
                disabled={isGeneratingMsg}
                className="w-full border-b border-gray-300 focus:border-rose-400 outline-none py-2 bg-transparent transition-colors focus:bg-rose-50 px-1 font-light resize-none pr-8"
              />
              
              {/* AI Generator Toggle Button */}
              <div className="mt-2 flex items-center justify-end">
                  {!showAiOptions ? (
                    <div className="flex gap-2">
                        {isGeneratingMsg && (
                          <button 
                             onClick={handleStopAi}
                             className="text-xs text-red-500 flex items-center gap-1 hover:text-red-700 transition-colors bg-red-50 px-3 py-1.5 rounded-full border border-red-100"
                           >
                             <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" /></svg>
                             停止生成 (Stop)
                           </button>
                        )}
                        {!isGeneratingMsg && (
                           <button 
                             onClick={() => setShowAiOptions(true)}
                             className="text-xs text-rose-500 flex items-center gap-1 hover:text-rose-600 transition-colors bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100"
                           >
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                             不知道說什麼? AI 幫你寫
                           </button>
                        )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 w-full animate-fadeIn">
                       <span className="text-xs text-gray-400 self-center col-span-4 mb-1">選擇風格 (Pick a vibe):</span>
                       <button onClick={() => handleAiMessage('sentimental')} disabled={isGeneratingMsg} className="text-xs bg-white border border-rose-200 text-gray-600 px-2 py-1.5 rounded hover:bg-rose-50 hover:border-rose-300 transition-all">煽情</button>
                       <button onClick={() => handleAiMessage('humorous')} disabled={isGeneratingMsg} className="text-xs bg-white border border-rose-200 text-gray-600 px-2 py-1.5 rounded hover:bg-rose-50 hover:border-rose-300 transition-all">幽默</button>
                       <button onClick={() => handleAiMessage('bullshit')} disabled={isGeneratingMsg} className="text-xs bg-white border border-rose-200 text-gray-600 px-2 py-1.5 rounded hover:bg-rose-50 hover:border-rose-300 transition-all">唬爛</button>
                       <button onClick={() => handleAiMessage('familiar')} disabled={isGeneratingMsg} className="text-xs bg-white border border-rose-200 text-gray-600 px-2 py-1.5 rounded hover:bg-rose-50 hover:border-rose-300 transition-all">裝熟</button>
                       <button onClick={() => handleAiMessage('happy')} disabled={isGeneratingMsg} className="text-xs bg-white border border-rose-200 text-gray-600 px-2 py-1.5 rounded hover:bg-rose-50 hover:border-rose-300 transition-all">開心</button>
                       <button onClick={() => handleAiMessage('emotional')} disabled={isGeneratingMsg} className="text-xs bg-white border border-rose-200 text-gray-600 px-2 py-1.5 rounded hover:bg-rose-50 hover:border-rose-300 transition-all">難過</button>
                       <button onClick={() => handleAiMessage('poem')} disabled={isGeneratingMsg} className="text-xs bg-white border border-rose-200 text-gray-600 px-2 py-1.5 rounded hover:bg-rose-50 hover:border-rose-300 transition-all font-serif">作詩</button>
                       <button onClick={() => handleAiMessage('rap')} disabled={isGeneratingMsg} className="text-xs bg-white border border-rose-200 text-gray-600 px-2 py-1.5 rounded hover:bg-rose-50 hover:border-rose-300 transition-all">饒舌</button>
                       
                       <button onClick={() => setShowAiOptions(false)} className="text-xs text-gray-400 col-span-4 text-center mt-1 hover:text-gray-600">取消 (Cancel)</button>
                    </div>
                  )}
              </div>
            </div>
          </FormCard>

          {/* Submit Button */}
          <div className="flex justify-between items-center mt-10 mb-16">
             <div className="w-full text-center">
               <button
                onClick={handleSubmit}
                disabled={status === FormStatus.PROCESSING || isGeneratingMsg}
                className={`bg-rose-500 text-white font-serif tracking-widest text-lg py-3 px-12 rounded-full shadow-lg shadow-rose-200 hover:bg-rose-600 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed`}
              >
                {status === FormStatus.PROCESSING ? '傳送中...' : '送出表單'}
              </button>
             </div>
          </div>
          
          {/* Footer with Hidden Admin Access */}
          <div className="text-center pb-8 border-t border-gray-200 pt-8 mt-8 relative">
             <div className="text-gray-400 text-sm font-light tracking-wider mb-2">
                © 2026 Red & Claire
             </div>
             {/* Hidden Admin Lock Icon - Moved to Bottom Right */}
             <button 
               onClick={() => setShowAdminModal(true)}
               className="fixed bottom-0 right-0 p-3 text-gray-200 opacity-0 hover:opacity-100 hover:text-rose-300 transition-all duration-300 z-50"
               title="Admin Access"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
               </svg>
             </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default App;