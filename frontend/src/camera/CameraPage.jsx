import { useState, useEffect } from 'react';

export default function CameraPage({ patient, patients = [], onSelectPatient, onClose }) {
    const [selectedLocal, setSelectedLocal] = useState(patient);

    useEffect(() => {
        setSelectedLocal(patient);
    }, [patient]);

    // 환자 미선택 → 목록 표시
    if (!selectedLocal) {
        return (
            <div className="min-h-screen bg-slate-100 max-w-[480px] mx-auto font-sans">
                <div className="bg-red-600 px-4 pt-5 pb-4">
                    <span className="text-white font-bold text-[17px]">🚨 긴급 모니터링</span>
                </div>
                <div className="p-3">
                    <p className="text-sm font-semibold text-gray-600 mb-3">모니터링할 환자를 선택해주세요</p>
                    <div className="flex flex-col gap-2">
                        {patients.map(p => (
                            <div
                                key={p.id}
                                className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 border border-gray-200 shadow-sm cursor-pointer"
                                onClick={() => {
                                    onSelectPatient?.(p);
                                    setSelectedLocal(p);
                                }}
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0">
                                    {p.name?.[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 m-0">{p.name}</p>
                                    <p className="text-[11px] text-gray-500 m-0">{p.age}세 · {p.address}</p>
                                </div>
                                <span className="ml-auto text-gray-400">›</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // 환자 선택 후 → 카메라 화면
    const streamUrl = `http://localhost:5000/stream/${selectedLocal.id}`;

    return (
        <div className="min-h-screen bg-slate-100 max-w-[480px] mx-auto font-sans">

            {/* 헤더 */}
            <div className="bg-red-600 px-4 pt-5 pb-4 flex justify-between items-center">
                <span className="text-white font-bold text-[17px]">🚨 실시간 모니터링</span>
                <button
                    className="bg-white text-red-600 border-none rounded-lg px-3 py-1.5 font-semibold cursor-pointer text-sm"
                    onClick={() => setSelectedLocal(null)}
                >
                    환자 변경
                </button>
            </div>

            {/* 환자 정보 */}
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {selectedLocal.name?.[0]}
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-900 m-0">{selectedLocal.name} 님 실시간 영상</p>
                    <p className="text-[11px] text-gray-500 m-0">{selectedLocal.age}세 · {selectedLocal.address}</p>
                </div>
            </div>

            {/* 스트리밍 영역 */}
            <div className="p-3">
                <div className="bg-black rounded-2xl overflow-hidden flex justify-center">
                    <img
                        src={streamUrl}
                        alt="camera stream"
                        className="w-full max-h-[70vh] object-cover"
                    />
                </div>
            </div>
        </div>
    );
}