import React, { useEffect, useState } from 'react';
import { FormData } from '../types';

interface AdminDashboardProps {
  onBack: () => void;
  currentImage: string;
  onUpdateImage: (newImage: string) => void;
}

const ADMIN_PASSCODE = 'Rende0619';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, currentImage, onUpdateImage }) => {
  const [data, setData] = useState<FormData[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // State for Clear Data Modal
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearPassword, setClearPassword] = useState('');
  const [clearError, setClearError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('wedding_rsvps');
      if (saved) {
        setData(JSON.parse(saved).reverse()); // Newest first
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = event.target.files?.[0];
    if (!file) return;

    // Size limit check (approx 4MB)
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg("Image is too large. Please select an image under 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      try {
        localStorage.setItem('custom_header_image', base64String);
        onUpdateImage(base64String); // Instant update
      } catch (e) {
        setErrorMsg("Failed to save image. It might be too large for browser storage.");
        console.error("Storage failed", e);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetImage = () => {
    localStorage.removeItem('custom_header_image');
    // Default to file based cover.jpg
    onUpdateImage('./cover.jpg'); 
  };

  const handleConfirmClear = () => {
    if (clearPassword === ADMIN_PASSCODE) {
      // Removing window.confirm to prevent stuck UI on mobile browsers.
      // The password entry itself is sufficient confirmation for this danger zone.
      try {
        localStorage.removeItem('wedding_rsvps');
        setData([]);
        setShowClearModal(false);
        setClearPassword('');
        setClearError('');
      } catch (e) {
        console.error("Failed to clear data", e);
        setClearError("清除失敗，請重試");
      }
    } else {
      setClearError("密碼錯誤 (Incorrect password)");
    }
  };

  const handleExport = () => {
    // 1. Create CSV Content
    const headers = [
      "姓名 (Name)", 
      "Email", 
      "關係 (Relation)", 
      "出席 (Status)", 
      "電話 (Phone)", 
      "人數 (Adults)", 
      "兒童 (Kids)", 
      "素食 (Veg)", 
      "留言 (Comments)"
    ];

    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

    const rows = data.map(row => [
      escapeCsv(row.fullName),
      escapeCsv(row.email),
      escapeCsv(row.relationship),
      escapeCsv(row.attendance),
      escapeCsv(row.phone),
      escapeCsv(row.attendeeCount),
      escapeCsv(row.childSeats),
      escapeCsv(row.vegetarianCount),
      escapeCsv(row.comments)
    ].join(','));

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n'); // BOM for Excel

    // 2. Download File
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wedding_rsvps_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the object URL
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-8 font-sans fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h2 className="text-3xl font-serif text-gray-800">Admin Dashboard</h2>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={onBack}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border rounded bg-white"
            >
              Back
            </button>
            <button 
              onClick={() => {
                setShowClearModal(true);
                setClearPassword('');
                setClearError('');
              }}
              className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Clear Data
            </button>
            <button 
              onClick={handleExport}
              className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Cover Image Settings */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
           <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Cover Image Settings</h3>
           
           <div className="bg-blue-50 text-blue-800 p-3 rounded mb-4 text-sm">
             <p className="font-bold">如何設定全體賓客預設照片 (Setup Global Default Photo):</p>
             <p>請將您的婚紗照命名為 <code>cover.jpg</code> 並放入專案的 <code>public</code> 資料夾中。</p>
             <p>Please place a file named <code>cover.jpg</code> in the public folder. It will be used as the default for everyone.</p>
           </div>

           <div className="flex flex-col md:flex-row gap-6 items-start">
              <div 
                className="w-full md:w-64 h-32 bg-cover bg-center rounded-lg border border-gray-200"
                style={{ backgroundImage: `url('${currentImage}')` }}
              ></div>
              <div className="flex-1">
                 <p className="text-sm text-gray-600 mb-2">上傳「僅限這台電腦」看到的暫時預覽圖 (Local Preview Override):</p>
                 <div className="flex items-center gap-3 flex-wrap">
                   <label className="bg-rose-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-rose-600 transition-colors shadow-sm text-sm">
                      Upload Preview Image
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload}
                      />
                   </label>
                   <button 
                    onClick={handleResetImage}
                    className="text-gray-500 hover:text-gray-700 text-sm underline"
                   >
                     Reset to Default (cover.jpg)
                   </button>
                 </div>
                 {errorMsg && <p className="text-red-600 text-sm mt-2">{errorMsg}</p>}
              </div>
           </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
          <div className="px-6 py-4 border-b border-gray-200">
             <h3 className="text-lg font-medium text-gray-900">Guest Responses ({data.length})</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Email", "Relation", "Status", "Phone", "Adults", "Kids", "Veg", "Message"].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No data found yet.
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{row.fullName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline cursor-pointer select-all">
                      <a href={`mailto:${row.email}`}>{row.email}</a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.relationship}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${row.attendance.includes('一定到') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {row.attendance.includes('一定到') ? 'Attending' : 'Decline'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {row.attendance.includes('一定到') ? row.attendeeCount : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {row.attendance.includes('一定到') ? row.childSeats : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {row.attendance.includes('一定到') ? row.vegetarianCount : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-[200px] truncate" title={row.comments}>
                        {row.comments}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear Data Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs border border-red-100">
             <h3 className="text-lg font-bold text-red-600 mb-2">危險動作 (Danger Zone)</h3>
             <p className="text-sm text-gray-600 mb-4">
               請輸入密碼以確認清除所有資料。<br/>
               Enter password to clear ALL data.
             </p>
             <input
                type="password"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-2 focus:ring-2 focus:ring-red-300 outline-none"
                placeholder="Password"
                value={clearPassword}
                onChange={(e) => setClearPassword(e.target.value)}
             />
             {clearError && <p className="text-red-500 text-xs mb-3">{clearError}</p>}
             <div className="flex gap-2 mt-2">
               <button
                 onClick={() => setShowClearModal(false)}
                 className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
               >
                 Cancel
               </button>
               <button
                 onClick={handleConfirmClear}
                 className="flex-1 bg-red-500 text-white font-medium py-2 rounded-lg hover:bg-red-600 transition-colors"
               >
                 Confirm Clear
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};