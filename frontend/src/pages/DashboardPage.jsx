import { useState, useEffect } from 'react';
import {
    Bell,
    ShieldCheck,
    Pill,
    Activity,
    ZapOff,
    Info,
    Lock,
    Phone,
    ChevronRight,
    AlertTriangle,
    Users
} from 'lucide-react';

import { api } from '../api/client';
import logo from '../assets/Logo.png';
import HistoryPage from './HistoryPage.jsx';

export default function DashboardPage({ onNavigate, onPatientsLoaded }) {

    const [patients, setPatients] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState(null);

    const [detectionStatus, setDetectionStatus] = useState({});

    const [isPrivacyMode, setIsPrivacyMode] = useState(true);

    const [showSummary, setShowSummary] = useState(false);

    const [showCallActions, setShowCallActions] = useState(false);

    const [showPinModal, setShowPinModal] = useState(false);

    const [pin, setPin] = useState('');

    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {

        const init = async () => {

            const savedPatients =
                JSON.parse(localStorage.getItem('patients')) || [];

            const data = await api.getPatients();

            const extra = [
                {
                    id: 3,
                    name: '박명수',
                    age: 75,
                    address: '서울 강남구',
                    cameraId: 'cam-3'
                },
                {
                    id: 4,
                    name: '최영희',
                    age: 80,
                    address: '서울 송파구',
                    cameraId: 'cam-4'
                },
            ];

            const all = [...data, ...extra, ...savedPatients];

            setPatients(all);

            onPatientsLoaded?.(all);

            if (all.length > 0 && !selectedPatientId) {
                setSelectedPatientId(all[0].id);
            }

            const statusMap = {};

            all.forEach(p => {

                if (p.id === 3) {
                    statusMap[p.id] = 'FALL';
                }
                else if (p.id === 4) {
                    statusMap[p.id] = 'INACTIVITY';
                }
                else {
                    statusMap[p.id] = 'NORMAL';
                }
            });

            setDetectionStatus(statusMap);
        };

        init();

    }, []);

    // PIN 완료 시 히스토리 이동
    useEffect(() => {

        if (pin.length === 4) {

            setTimeout(() => {

                setShowPinModal(false);

                setPin('');

                setShowHistory(true);

            }, 200);
        }

    }, [pin]);

    const selectedPatient =
        patients.find(p => p.id === selectedPatientId);

    const currentDet =
        detectionStatus[selectedPatientId] || 'NORMAL';

    const getHeaderMessage = (type) => {

        if (type === 'FALL') {

            return {
                sub: "낙상 감지 위험 단계",
                main: "낙상 위험 상황으로 판단됩니다.",
                color: "text-red-300"
            };
        }

        if (type === 'INACTIVITY') {

            return {
                sub: "무동작 감지 주의 단계",
                main: "장시간 움직임이 없습니다.",
                color: "text-orange-300"
            };
        }

        return {
            sub: "AI 실시간 모니터링",
            main: "안전하게 잘 계세요.",
            color: "text-yellow-300"
        };
    };

    if (showHistory && selectedPatient) {

        return (
            <HistoryPage
                patient={selectedPatient}
                onBack={() => setShowHistory(false)}
            />
        );
    }

    return (

        <div className="max-w-[480px] mx-auto min-h-screen bg-gray-50 pb-10 relative overflow-x-hidden font-sans shadow-2xl">

            {/* 헤더 */}
            <div className="px-5 pt-6 pb-12 rounded-b-[40px] shadow-lg bg-blue-600">

                <div className="flex justify-between items-center mb-6">

                    <div className="flex items-center gap-3">

                        <img
                            src={logo}
                            alt="Logo"
                            className="w-8 h-8 object-contain bg-white/20 p-1 rounded-lg"
                        />

                        <div>

                            <div className="text-white text-lg font-bold tracking-tight">
                                CareVision
                            </div>

                            <div className="text-white/60 text-[9px] font-black uppercase tracking-widest">
                                Guardian
                            </div>
                        </div>
                    </div>

                    <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border-none">

                        <Bell size={20} className="text-white" />

                    </button>
                </div>

                {/* 환자 슬라이더 */}
                <div className="flex overflow-x-auto gap-2.5 mb-8 no-scrollbar p-1">

                    {patients.map(p => (

                        <button
                            key={p.id}
                            onClick={() => setSelectedPatientId(p.id)}
                            className={`px-6 py-2.5 text-[13px] rounded-full whitespace-nowrap transition-all duration-300 font-bold border-none
                            
                            ${
                                selectedPatientId === p.id
                                    ? 'bg-white text-blue-600 shadow-md scale-105'
                                    : 'bg-white/15 text-white/60'
                            }`}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>

                {/* 메인 상태 문구 */}
                {selectedPatient && (() => {

                    const msg = getHeaderMessage(currentDet);

                    return (

                        <div className="animate-in fade-in slide-in-from-left-4">

                            <p className="text-white/70 text-xs font-bold mb-1">
                                {msg.sub}
                            </p>

                            <h2 className="text-white text-2xl font-black leading-tight">

                                {selectedPatient.name}님은 현재
                                <br/>

                                <span className={msg.color}>
                                    {msg.main}
                                </span>
                            </h2>
                        </div>
                    );

                })()}
            </div>

            {/* 카드 */}
            <div className="px-5 -mt-6 space-y-5">

                <div className="grid grid-cols-2 gap-4">

                    {[
                        {
                            id: 'fall',
                            title: '낙상 감지',
                            status: currentDet === 'FALL' ? '위험' : '안전',
                            icon: ShieldCheck,
                            color: 'text-red-500',
                            isAlert: currentDet === 'FALL'
                        },
                        {
                            id: 'med',
                            title: '오늘 복약',
                            status: '2/3',
                            icon: Pill,
                            color: 'text-violet-500',
                            isAlert: false
                        },
                        {
                            id: 'activity',
                            title: '활동 상태',
                            status: '양호',
                            icon: Activity,
                            color: 'text-emerald-500',
                            isAlert: false
                        },
                        {
                            id: 'inactivity',
                            title: '무동작 감지',
                            status: currentDet === 'INACTIVITY' ? '주의' : '정상',
                            icon: ZapOff,
                            color: 'text-orange-500',
                            isAlert: currentDet === 'INACTIVITY'
                        }

                    ].map((card) => (

                        <button
                            key={card.id}
                            onClick={() => onNavigate?.('fall', selectedPatient)}
                            className={`p-5 rounded-[28px] flex flex-col justify-between h-32 transition-all active:scale-95 text-left border-none shadow-sm
                            
                            ${
                                card.isAlert
                                    ? 'bg-red-500 text-white animate-pulse'
                                    : 'bg-white'
                            }`}
                        >

                            <card.icon
                                size={24}
                                className={card.isAlert ? 'text-white' : card.color}
                            />

                            <div>

                                <p className={`text-[11px] font-bold ${
                                    card.isAlert
                                        ? 'text-white/70'
                                        : 'text-gray-400'
                                }`}>
                                    {card.title}
                                </p>

                                <p className="text-lg font-black">
                                    {card.status}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* 프로필 */}
                <div className="bg-white rounded-[35px] p-6 shadow-md">

                    <div className="flex items-center gap-4 mb-6">

                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl">

                            {selectedPatient?.name[0]}

                        </div>

                        <div className="flex-1">

                            <p className="text-sm font-black text-gray-900">
                                {selectedPatient?.name}님
                            </p>

                            <p className="text-[11px] text-gray-400 font-bold">
                                {selectedPatient?.age}세 · {selectedPatient?.address}
                            </p>
                        </div>
                    </div>

                    {/* 영상 */}
                    <div className="relative aspect-video rounded-[28px] overflow-hidden bg-gray-100">

                        {isPrivacyMode ? (

                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-md">

                                <Lock size={20} className="text-gray-300 mb-2"/>

                                <button
                                    onClick={() => setIsPrivacyMode(false)}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-full text-[11px] font-black border-none"
                                >
                                    화면 보기
                                </button>
                            </div>

                        ) : (

                            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">

                                <span className="text-white/20 text-[10px] animate-pulse">
                                    STREAMING LIVE...
                                </span>

                                <button
                                    onClick={() => setIsPrivacyMode(true)}
                                    className="absolute bottom-4 right-4 w-9 h-9 bg-black/30 text-white rounded-full flex items-center justify-center border-none"
                                >
                                    <Lock size={16}/>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-2.5 mt-6">

                        <button
                            onClick={() => setShowSummary(true)}
                            className="flex-[2.5] bg-blue-600 text-white py-4 rounded-2xl font-black text-sm border-none shadow-md active:scale-95"
                        >
                            상세 리포트 분석
                        </button>

                        <button
                            onClick={() => setShowCallActions(true)}
                            className="flex-1 bg-red-50 text-red-500 py-4 rounded-2xl font-black text-sm border-none active:scale-95"
                        >
                            호출
                        </button>
                    </div>
                </div>
            </div>

            {/* 리포트 모달 */}
            {showSummary && (

                <div className="fixed inset-0 z-[100] flex flex-col justify-end">

                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowSummary(false)}
                    />

                    <div className="relative bg-white rounded-t-[40px] p-8 w-full">

                        <h3 className="text-xl font-black mb-6">
                            상황 분석 결과
                        </h3>

                        <div className="bg-blue-50 p-5 rounded-3xl flex gap-4">

                            <Info className="text-blue-600"/>

                            <p className="text-sm font-bold text-gray-800">
                                현재 환자분은 거실에서 휴식 중인 것으로 분석됩니다.
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setShowSummary(false);
                                setShowPinModal(true);
                            }}
                            className="w-full mt-8 py-4 bg-gray-900 text-white rounded-2xl font-black border-none"
                        >
                            전체 히스토리 보기
                        </button>
                    </div>
                </div>
            )}

            {/* 호출 모달 */}
            {showCallActions && (

                <div className="fixed inset-0 z-[110] flex flex-col justify-end">

                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowCallActions(false)}
                    />

                    <div className="relative bg-white rounded-t-[40px] p-8 w-full">

                        <div className="flex items-center gap-3 mb-6">

                            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">

                                <AlertTriangle className="text-red-500"/>

                            </div>

                            <div>

                                <h3 className="text-xl font-black">
                                    긴급 호출
                                </h3>

                                <p className="text-xs text-gray-400 font-bold mt-1">
                                    긴급 상황 시 빠르게 연락할 수 있습니다
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">

                            <button className="w-full h-14 rounded-2xl bg-red-500 text-white font-black border-none flex items-center justify-center gap-2">

                                <Phone size={18}/>

                                119에 전화하기
                            </button>

                            <button className="w-full h-14 rounded-2xl bg-blue-600 text-white font-black border-none flex items-center justify-center gap-2">

                                <Users size={18}/>

                                다른 보호자에게 연락하기
                            </button>

                        </div>
                    </div>
                </div>
            )}

            {/* PIN 모달 */}
            {showPinModal && (

                <div className="fixed inset-0 z-[120] flex flex-col justify-end">

                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setShowPinModal(false)}
                    />

                    <div className="relative bg-white rounded-t-[40px] pt-8 pb-10 px-8 w-full">

                        <div className="flex flex-col items-center mb-8">

                            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">

                                <Lock size={22} className="text-blue-600"/>

                            </div>

                            <h3 className="text-lg font-black text-gray-900">
                                보안 인증 필요
                            </h3>

                            <p className="text-center text-sm text-gray-400 font-bold mt-2 leading-relaxed">
                                개인정보 보호를 위해
                                <br/>
                                히스토리 조회 전 비밀번호를 입력해주세요.
                            </p>
                        </div>

                        <div className="flex justify-center gap-4 mb-10">

                            {[0,1,2,3].map(i => (

                                <div
                                    key={i}
                                    className={`w-4 h-4 rounded-full ${
                                        i < pin.length
                                            ? 'bg-blue-600'
                                            : 'bg-gray-200'
                                    }`}
                                />
                            ))}
                        </div>

                        <div className="grid grid-cols-3 gap-3">

                            {['1','2','3','4','5','6','7','8','9','','0','del']
                                .map((k,i) => (

                                    <button
                                        key={i}
                                        onClick={() =>
                                            k === 'del'
                                                ? setPin(pin.slice(0,-1))
                                                : k && setPin(pin + k)
                                        }
                                        className="h-16 rounded-2xl bg-blue-50 text-blue-700 font-black text-xl border-none"
                                    >
                                        {k === 'del' ? '←' : k}
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}