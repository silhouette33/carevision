import { useState } from 'react';
import {
    Bell, AlertTriangle, CheckCircle, Smartphone,
    User, Lock, Phone, Camera, LogOut, ChevronRight,
    Shield
} from 'lucide-react';

export default function MyPage({ user, onLogout }) {
    const [toggles, setToggles] = useState({
        missedMed: true,
        fallDetect: true,
        takenMed: false,
        dailyReport: true,
    });

    const toggle = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

    const Toggle = ({ on, onToggle }) => (
        <button
            onClick={onToggle}
            className={`w-10 h-[22px] rounded-full relative transition-colors duration-200 border-none cursor-pointer ${on ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
            <div className={`w-[18px] h-[18px] bg-white rounded-full absolute top-[2px] transition-all duration-200 shadow-sm ${on ? 'right-[2px]' : 'left-[2px]'}`} />
        </button>
    );

    const alarmItems = [
        {
            key: 'missedMed',
            icon: <Bell size={16} strokeWidth={2} className="text-blue-600" />,
            iconBg: 'bg-blue-50',
            label: '복약 미확인 알림',
            desc: '복약 후 30분 미감지 시 알림',
        },
        {
            key: 'fallDetect',
            icon: <AlertTriangle size={16} strokeWidth={2} className="text-amber-600" />,
            iconBg: 'bg-amber-50',
            label: '낙상 감지 긴급 알림',
            desc: '카메라 AI 낙상 감지 즉시 알림',
        },
        {
            key: 'takenMed',
            icon: <CheckCircle size={16} strokeWidth={2} className="text-green-600" />,
            iconBg: 'bg-green-50',
            label: '복약 완료 알림',
            desc: '복약 감지 시 확인 알림',
        },
        {
            key: 'dailyReport',
            icon: <Smartphone size={16} strokeWidth={2} className="text-purple-600" />,
            iconBg: 'bg-purple-50',
            label: '일일 리포트 푸시',
            desc: '매일 오후 8시 복약 요약 알림',
        },
    ];

    const accountItems = [
        { icon: <User size={15} className="text-gray-500" />, label: '프로필 수정' },
        { icon: <Lock size={15} className="text-gray-500" />, label: '비밀번호 변경' },
        { icon: <Phone size={15} className="text-gray-500" />, label: '긴급 연락처 설정' },
        { icon: <Camera size={15} className="text-gray-500" />, label: '카메라 연동 관리' },
    ];

    return (
        <div className="min-h-screen bg-slate-100 max-w-[480px] mx-auto font-sans">

            {/* 상단 프로필 헤더 */}
            <div className="bg-blue-700 px-4 pt-6 pb-8">
                <p className="text-xs font-semibold text-blue-300 mb-4">마이페이지</p>
                <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-full bg-blue-500 border-2 border-blue-300 flex items-center justify-center text-white text-xl font-bold shrink-0">
                        {user?.username?.[0]?.toUpperCase() ?? '보'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-base leading-tight">{user?.name ?? user?.username ?? '보호자'}</p>
                        <p className="text-blue-200 text-xs mt-0.5 truncate">{user?.email ?? 'carevision@email.com'}</p>
                    </div>
                    <div className="bg-blue-600 border border-blue-400 rounded-full px-3 py-1 flex items-center gap-1 shrink-0">
                        <Shield size={11} className="text-blue-200" />
                        <span className="text-[11px] font-semibold text-blue-200">보호자</span>
                    </div>
                </div>

                {/* 요약 스탯 */}
                <div className="grid grid-cols-3 gap-2 mt-5">
                    {[
                        { value: '8명', label: '담당 환자', color: 'text-white' },
                        { value: '92%', label: '금주 복약률', color: 'text-green-400' },
                        { value: '3건', label: '미확인 알림', color: 'text-amber-400' },
                    ].map(({ value, label, color }) => (
                        <div key={label} className="bg-blue-800 rounded-xl p-2.5 text-center">
                            <p className={`text-lg font-bold ${color} m-0`}>{value}</p>
                            <p className="text-[10px] text-blue-300 m-0 mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="px-3 pt-3 pb-6 flex flex-col gap-2.5">

                {/* 알림 설정 */}
                <div className="bg-white rounded-2xl px-4 py-3.5 shadow-sm">
                    <p className="text-xs font-bold text-gray-900 mb-3">알림 설정</p>
                    <div className="flex flex-col">
                        {alarmItems.map(({ key, icon, iconBg, label, desc }, i) => (
                            <div
                                key={key}
                                className={`flex items-center justify-between py-2.5 ${i < alarmItems.length - 1 ? 'border-b border-gray-50' : ''}`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center shrink-0`}>
                                        {icon}
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-semibold text-gray-800 m-0">{label}</p>
                                        <p className="text-[11px] text-gray-400 m-0">{desc}</p>
                                    </div>
                                </div>
                                <Toggle on={toggles[key]} onToggle={() => toggle(key)} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* 계정 설정 */}
                <div className="bg-white rounded-2xl px-4 py-3.5 shadow-sm">
                    <p className="text-xs font-bold text-gray-900 mb-3">계정 설정</p>
                    <div className="flex flex-col">
                        {accountItems.map(({ icon, label }, i) => (
                            <button
                                key={label}
                                className={`flex items-center justify-between py-2.5 w-full bg-transparent border-none cursor-pointer text-left ${i < accountItems.length - 1 ? 'border-b border-gray-50' : ''}`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                                        {icon}
                                    </div>
                                    <span className="text-[13px] text-gray-700">{label}</span>
                                </div>
                                <ChevronRight size={14} className="text-gray-300" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* 로그아웃 */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <button
                        className="w-full flex items-center gap-2.5 px-4 py-3.5 bg-transparent border-none cursor-pointer text-left"
                        onClick={onLogout}
                    >
                        <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                            <LogOut size={15} className="text-red-500" />
                        </div>
                        <span className="text-[13px] font-semibold text-red-500">로그아웃</span>
                    </button>
                </div>

                <p className="text-center text-[11px] text-gray-400 mt-1">CareVision v1.0.0</p>
            </div>
        </div>
    );
}