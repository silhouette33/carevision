import { useState } from 'react';

function Toggle({ on, onChange }) {
    return (
        <button
            onClick={() => onChange(!on)}
            className={`w-11 h-6 rounded-full relative transition-colors border-none cursor-pointer ${
                on ? 'bg-[#FF6B3D]' : 'bg-gray-300'
            }`}
        >
            <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                    on ? 'left-[22px]' : 'left-0.5'
                }`}
            />
        </button>
    );
}

export default function MyPage({ user, patients, onLogout }) {
    const [emergencyAlert, setEmergencyAlert] = useState(true);
    const [medAlert, setMedAlert] = useState(true);

    return (
        <div className="min-h-screen">
            <div className="bg-[#FF6B3D] text-white px-5 pt-6 pb-7 rounded-b-3xl">
                <h1 className="text-2xl font-bold m-0">내 정보</h1>
            </div>

            {/* 프로필 카드 */}
            <div className="px-4 -mt-4 mb-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-[#FFE5DB] text-[#FF6B3D] flex items-center justify-center text-xl font-bold">
                        {user?.name?.[0] || '박'}
                    </div>
                    <div className="flex-1">
                        <p className="text-base font-bold text-gray-900 m-0">{user?.name || '박보호'} 님</p>
                        <p className="text-xs text-gray-500 m-0 mt-0.5">{user?.email || 'guardian@email.com'}</p>
                    </div>
                    <button className="text-xs text-[#FF6B3D] font-semibold bg-transparent border-none cursor-pointer">
                        수정 ›
                    </button>
                </div>
            </div>

            {/* 피보호자 관리 */}
            <div className="px-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-2 px-1">피보호자 관리</p>
                <div className="bg-white rounded-2xl shadow-sm">
                    {patients.map((p, i) => (
                        <div
                            key={p.id}
                            className={`flex items-center gap-3 p-4 ${i !== patients.length - 1 ? 'border-b border-gray-100' : ''}`}
                        >
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900 m-0">{p.name} ({p.age}세)</p>
                                <p className="text-xs text-gray-500 m-0 mt-0.5">
                                    {p.cameraId ? '카메라 연결됨' : '카메라 미연결'} · {p.address?.split(' ').pop() || '거실'}
                                </p>
                            </div>
                            {p.cameraId ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#10B981]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                                    연결
                                </span>
                            ) : (
                                <span className="text-xs font-semibold text-[#FF6B3D]">연결 ›</span>
                            )}
                        </div>
                    ))}
                    <button className="w-full py-4 text-[#FF6B3D] text-sm font-bold bg-transparent border-t border-gray-100 cursor-pointer">
                        + 피보호자 추가
                    </button>
                </div>
            </div>

            {/* 알림 설정 */}
            <div className="px-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-2 px-1">알림 설정</p>
                <div className="bg-white rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 m-0">응급 알림</p>
                            <p className="text-xs text-gray-500 m-0 mt-0.5">낙상·무동작 즉시 알림</p>
                        </div>
                        <Toggle on={emergencyAlert} onChange={setEmergencyAlert} />
                    </div>
                    <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 m-0">복약 누락 알림</p>
                            <p className="text-xs text-gray-500 m-0 mt-0.5">미복용 30분 후 알림</p>
                        </div>
                        <Toggle on={medAlert} onChange={setMedAlert} />
                    </div>
                    <div className="flex items-center gap-3 p-4">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 m-0">야간 무음</p>
                            <p className="text-xs text-gray-500 m-0 mt-0.5">23:00 ~ 07:00</p>
                        </div>
                        <button className="text-xs font-semibold text-[#FF6B3D] bg-transparent border-none cursor-pointer">
                            설정 ›
                        </button>
                    </div>
                </div>
            </div>

            {/* 계정 */}
            <div className="px-4 mb-6">
                <p className="text-xs font-semibold text-gray-500 mb-2 px-1">계정</p>
                <div className="bg-white rounded-2xl shadow-sm">
                    <button className="w-full flex items-center justify-between p-4 border-b border-gray-100 bg-transparent border-none cursor-pointer text-left">
                        <p className="text-sm font-semibold text-gray-900 m-0">비밀번호 변경</p>
                        <span className="text-gray-300">›</span>
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full p-4 text-left text-sm font-semibold text-[#E53935] bg-transparent border-none cursor-pointer"
                    >
                        로그아웃
                    </button>
                </div>
            </div>
        </div>
    );
}
