import { useState } from 'react';
import { AlertTriangle, BedDouble, Pill, Phone, Camera, LogOut, ChevronRight, ShieldCheck } from 'lucide-react';

export default function MyPage({ user, onLogout }) {
    const [toggles, setToggles] = useState({
        fallDetect: true,
        inactivity: true,
        missedMed: true,
    });

    const toggle = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

    const Toggle = ({ on, onToggle }) => (
        <button
            onClick={onToggle}
            className={`w-10 h-[22px] rounded-full relative transition-colors duration-200 border-none cursor-pointer ${on ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
            <div className={`w-[18px] h-[18px] bg-white rounded-full absolute top-[2px] transition-all duration-200 shadow-sm ${on ? 'left-[20px]' : 'left-[2px]'}`} />
        </button>
    );

    const alarmItems = [
        {
            key: 'fallDetect',
            icon: <AlertTriangle size={16} strokeWidth={2} className="text-red-500" />,
            iconBg: 'bg-red-50',
            label: '낙상 감지 알림',
            desc: 'AI 감지 즉시 푸시',
        },
        {
            key: 'inactivity',
            icon: <BedDouble size={16} strokeWidth={2} className="text-amber-600" />,
            iconBg: 'bg-amber-50',
            label: '무동작 감지 알림',
            desc: '30분 이상 정지 시 알림',
        },
        {
            key: 'missedMed',
            icon: <Pill size={16} strokeWidth={2} className="text-blue-600" />,
            iconBg: 'bg-blue-50',
            label: '복약 미확인 알림',
            desc: '복약 후 30분 미감지 시',
        },
    ];

    const settingItems = [
        {
            icon: <Phone size={15} className="text-gray-500" />,
            label: '긴급 연락처 설정',
            desc: '119 · 가족 · 담당 의사',
            onPress: () => {},
        },
        {
            icon: <Camera size={15} className="text-gray-500" />,
            label: '카메라 연동 관리',
            desc: '연결된 기기 확인 및 수정',
            onPress: () => {},
        },
    ];

    const displayName = user?.name ?? user?.username ?? '보호자';
    const initial = displayName[0]?.toUpperCase() ?? '보';

    return (
        <div className="min-h-screen bg-slate-100 max-w-[480px] mx-auto font-sans pb-8">

            {/* 헤더 */}
            <div className="bg-blue-700 px-5 pt-6 pb-7 rounded-b-3xl">
                <div className="flex items-center gap-3">
                    <div className="w-13 h-13 w-[52px] h-[52px] rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-semibold shrink-0">
                        {initial}
                    </div>
                    <div>
                        <p className="text-white font-semibold text-base leading-tight">{displayName}</p>
                        <p className="text-blue-200 text-xs mt-0.5">{user?.email ?? 'carevision@email.com'}</p>
                        <div className="inline-flex items-center gap-1 mt-1.5 bg-white/15 rounded-full px-2.5 py-0.5">
                            <ShieldCheck size={10} className="text-blue-200" />
                            <span className="text-[11px] text-blue-200 font-medium">보호자</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 flex flex-col gap-3 mt-3">

                {/* 알림 설정 */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3.5 pb-2">알림</p>
                    {alarmItems.map(({ key, icon, iconBg, label, desc }, i) => (
                        <div key={key}>
                            {i > 0 && <div className="h-px bg-gray-50 mx-4" />}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                                    {icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-gray-800">{label}</p>
                                    <p className="text-[11px] text-gray-400">{desc}</p>
                                </div>
                                <Toggle on={toggles[key]} onToggle={() => toggle(key)} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* 설정 */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3.5 pb-2">설정</p>
                    {settingItems.map(({ icon, label, desc, onPress }, i) => (
                        <div key={label}>
                            {i > 0 && <div className="h-px bg-gray-50 mx-4" />}
                            <button
                                onClick={onPress}
                                className="flex items-center gap-3 px-4 py-3 w-full bg-transparent border-none cursor-pointer text-left"
                            >
                                <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                                    {icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-gray-800">{label}</p>
                                    <p className="text-[11px] text-gray-400">{desc}</p>
                                </div>
                                <ChevronRight size={14} className="text-gray-300 shrink-0" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* 로그아웃 */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-3 px-4 py-3.5 w-full bg-transparent border-none cursor-pointer text-left"
                    >
                        <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
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
