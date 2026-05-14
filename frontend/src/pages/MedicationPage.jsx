import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Clock, CheckCircle2, AlertCircle, Pill, X, Info, Calendar, ChevronRight } from 'lucide-react';
import { api } from '../api/client';

export default function MedicationPage({ onBack }) {
    const [patients, setPatients] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [activeTab, setActiveTab] = useState('today');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- 날짜 관련 로직 ---
    const now = new Date();
    // 월요일을 0으로 설정 (0:월, 1:화 ... 6:일)
    const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const [selectedDayIdx, setSelectedDayIdx] = useState(todayIdx);

    // 상단 표시용 날짜 포맷 (ex: 5월 3일 일요일)
    const formattedDate = new Intl.DateTimeFormat('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    }).format(now);

    // --- 상태 관리 ---
    const [newMed, setNewMed] = useState({
        name: '', time: '09:00', instruction: '식후 30분', dose: '1정',
        frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6]
    });

    const [allData, setAllData] = useState({
        1: {
            meds: [
                { id: 101, name: '혈압약', time: '08:00', instruction: '식전 30분', dose: '1정', targetDays: [0,1,2,3,4,5,6] },
                { id: 102, name: '당뇨약', time: '12:30', instruction: '식후 즉시', dose: '1정', targetDays: [0,1,2,3,4,5,6] }
            ],
            logs: []
        },
        3: { meds: [], logs: [] },
        4: { meds: [], logs: [] }
    });

    const daysOfWeek = [
        { id: 0, label: '월' }, { id: 1, label: '화' }, { id: 2, label: '수' },
        { id: 3, label: '목' }, { id: 4, label: '금' }, { id: 5, label: '토' }, { id: 6, label: '일' }
    ];

    useEffect(() => { fetchPatients(); }, []);

    const fetchPatients = async () => {
        const data = await api.getPatients();
        const extra = [{ id: 3, name: '박명수' }, { id: 4, name: '최영희' }];
        const all = [...data, ...extra];
        setPatients(all);
        if (all.length > 0) setSelectedPatientId(all[0].id);
    };

    const currentData = allData[selectedPatientId] || { meds: [], logs: [] };

    // --- 핸들러 함수 ---
    const handleAddMed = () => {
        if (!newMed.name) return alert("약 이름을 입력해주세요.");

        const newId = Date.now();
        const targetDays = newMed.frequency === 'daily' ? [0,1,2,3,4,5,6] : newMed.selectedDays;

        const medEntry = {
            id: newId,
            name: newMed.name,
            time: newMed.time,
            instruction: newMed.instruction,
            dose: newMed.dose,
            targetDays: targetDays
        };

        setAllData(prev => ({
            ...prev,
            [selectedPatientId]: {
                ...prev[selectedPatientId],
                meds: [...(prev[selectedPatientId]?.meds || []), medEntry].sort((a, b) => a.time.localeCompare(b.time))
            }
        }));

        setIsModalOpen(false);
        setNewMed({ name: '', time: '09:00', instruction: '식후 30분', dose: '1정', frequency: 'daily', selectedDays: [0,1,2,3,4,5,6] });
    };

    const toggleDay = (id) => {
        setNewMed(prev => ({
            ...prev,
            selectedDays: prev.selectedDays.includes(id)
                ? prev.selectedDays.filter(d => d !== id)
                : [...prev.selectedDays, id]
        }));
    };

    const getTodayMeds = () => currentData.meds.filter(m => m.targetDays.includes(todayIdx));
    const getLogsByDay = (dayIdx) => currentData.meds.filter(m => m.targetDays.includes(dayIdx));

    return (
        <div className="min-h-screen bg-gray-50 max-w-[480px] mx-auto pb-24 relative font-sans">
            {/* 고정 헤더 */}
            <div className="bg-white px-4 pt-6 pb-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <button onClick={onBack} className="p-2 -ml-2 border-none bg-transparent cursor-pointer"><ChevronLeft size={24}/></button>
                <h1 className="text-lg font-bold text-gray-800">복약 관리</h1>
                <button onClick={() => setIsModalOpen(true)} className="w-10 h-10 flex items-center justify-center text-blue-600 bg-blue-50 rounded-xl border-none cursor-pointer hover:bg-blue-100 transition shadow-sm"><Plus size={22} /></button>
            </div>

            {/* 피보호자 탭 */}
            <div className="flex gap-2 overflow-x-auto px-4 py-4 no-scrollbar bg-white border-b border-gray-100">
                {patients.map(p => (
                    <button key={p.id} onClick={() => setSelectedPatientId(p.id)} className={`px-5 py-2.5 text-xs rounded-full whitespace-nowrap border-none font-bold cursor-pointer transition-all ${selectedPatientId === p.id ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>{p.name}</button>
                ))}
            </div>

            <div className="p-4">
                {/* 메인 탭 메뉴 */}
                <div className="flex bg-gray-200/50 rounded-2xl p-1 mb-6 border border-gray-200">
                    <button onClick={() => setActiveTab('today')} className={`flex-1 py-3 text-sm font-bold rounded-xl border-none cursor-pointer transition-all ${activeTab === 'today' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>오늘 일정</button>
                    <button onClick={() => setActiveTab('week')} className={`flex-1 py-3 text-sm font-bold rounded-xl border-none cursor-pointer transition-all ${activeTab === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>주간 기록</button>
                </div>

                {activeTab === 'today' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* 상단 날짜 표시 섹션 */}
                        <div className="flex justify-between items-end mb-6 px-1">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{formattedDate}</h2>
                                <p className="text-sm text-gray-400 font-bold mt-1 tracking-tight">잊지 말고 약을 챙겨주세요!</p>
                            </div>
                            <div className="bg-blue-600 px-3 py-2 rounded-2xl shadow-lg shadow-blue-100">
                                <span className="text-[11px] text-white font-bold">오늘 {getTodayMeds().length}건</span>
                            </div>
                        </div>

                        {/* 타임라인 리스트 */}
                        <div className="relative ml-2">
                            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-blue-100/50"></div>
                            <div className="space-y-6 relative z-10">
                                {getTodayMeds().length > 0 ? getTodayMeds().map((m) => (
                                    <div key={m.id} className="flex gap-4 items-start group">
                                        <div className="w-6 h-6 rounded-full border-4 border-white bg-blue-600 flex-shrink-0 mt-1 shadow-md group-hover:scale-110 transition-transform"></div>
                                        <div className="flex-1 bg-white rounded-[28px] p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-blue-600 font-black text-sm tracking-tighter">{m.time}</span>
                                                        <h3 className="font-bold text-[17px] text-gray-900">{m.name}</h3>
                                                    </div>
                                                    <div className="flex gap-1.5 mt-2.5">
                                                        <span className="text-[10px] px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg font-bold border border-blue-100">{m.instruction}</span>
                                                        <span className="text-[10px] px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg font-bold">{m.dose}</span>
                                                    </div>
                                                </div>
                                                <button className="bg-gray-50 p-2 rounded-xl border-none text-gray-300"><ChevronRight size={18}/></button>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-24 bg-white rounded-[32px] border border-dashed border-gray-200">
                                        <Pill size={40} className="mx-auto text-gray-200 mb-4" />
                                        <p className="text-gray-400 font-bold text-sm">등록된 복약 일정이 없습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 주간 기록 탭 */
                    <div className="animate-in fade-in duration-500">
                        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 mb-6">
                            <h3 className="text-sm font-bold text-gray-900 mb-5 px-1 flex items-center gap-2"><Calendar size={18} className="text-blue-500"/> 복약 캘린더</h3>
                            <div className="flex justify-between">
                                {daysOfWeek.map((day, idx) => (
                                    <div key={idx} onClick={() => setSelectedDayIdx(idx)} className="flex flex-col items-center gap-3 cursor-pointer">
                                        <span className={`text-[11px] font-bold ${selectedDayIdx === idx ? 'text-blue-600' : 'text-gray-400'}`}>{day.label}</span>
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all ${selectedDayIdx === idx ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-50' : 'border-transparent bg-gray-50'}`}>
                                            <div className={`w-2 h-2 rounded-full ${getLogsByDay(idx).length > 0 ? 'bg-blue-400 shadow-sm' : 'bg-gray-300'}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-black text-gray-900 px-2">{daysOfWeek[selectedDayIdx].label}요일 복약 리스트</h3>
                            {getLogsByDay(selectedDayIdx).length > 0 ? getLogsByDay(selectedDayIdx).map((m, i) => (
                                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400"><Pill size={24}/></div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{m.name}</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">{m.time} · {m.instruction}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl">복용 대기</span>
                                </div>
                            )) : (
                                <div className="text-center py-12 text-gray-300 text-sm font-medium">해당 요일은 일정이 없습니다.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* --- 중앙 배치 약 등록 모달 --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-5">
                    <div className="bg-white w-full max-w-[400px] max-h-[85vh] overflow-y-auto rounded-[32px] p-7 shadow-2xl animate-in zoom-in-95 duration-200 no-scrollbar">
                        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-2">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">새 약물 등록</h2>
                                <p className="text-[11px] text-gray-400 font-bold mt-1">상세 복용 설정을 입력하세요.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full border-none cursor-pointer hover:bg-gray-200 transition"><X size={20}/></button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[11px] font-black text-gray-400 ml-1">약 이름</label>
                                <input type="text" placeholder="예: 혈압약, 유산균" className="w-full mt-2 px-4 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold focus:ring-2 focus:ring-blue-100 transition" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 ml-1">복용 시간</label>
                                    <input type="time" className="w-full mt-2 px-4 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold text-center" value={newMed.time} onChange={e => setNewMed({...newMed, time: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-gray-400 ml-1">1회 복용량</label>
                                    <input type="text" placeholder="1정" className="w-full mt-2 px-4 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold text-center" value={newMed.dose} onChange={e => setNewMed({...newMed, dose: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-black text-gray-400 ml-1">복용 주기</label>
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => setNewMed({...newMed, frequency: 'daily'})} className={`flex-1 py-3.5 rounded-xl font-bold text-xs border-none cursor-pointer transition-all ${newMed.frequency === 'daily' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-gray-100 text-gray-500'}`}>매일 복용</button>
                                    <button onClick={() => setNewMed({...newMed, frequency: 'weekly'})} className={`flex-1 py-3.5 rounded-xl font-bold text-xs border-none cursor-pointer transition-all ${newMed.frequency === 'weekly' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-gray-100 text-gray-500'}`}>특정 요일</button>
                                </div>
                            </div>

                            {newMed.frequency === 'weekly' && (
                                <div className="animate-in fade-in zoom-in-95 duration-200">
                                    <label className="text-[11px] font-black text-gray-400 ml-1">복용할 요일을 선택하세요</label>
                                    <div className="flex justify-between mt-3">
                                        {daysOfWeek.map(day => (
                                            <button key={day.id} onClick={() => toggleDay(day.id)} className={`w-10 h-10 rounded-xl font-bold text-xs border-none cursor-pointer transition-all ${newMed.selectedDays.includes(day.id) ? 'bg-blue-100 text-blue-600 shadow-inner' : 'bg-gray-50 text-gray-400'}`}>
                                                {day.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[11px] font-black text-gray-400 ml-1">복용 시점</label>
                      1          <select className="w-full mt-2 px-4 py-4 bg-gray-50 border-none rounded-2xl outline-none font-bold appearance-none cursor-pointer" value={newMed.instruction} onChange={e => setNewMed({...newMed, instruction: e.target.value})}>
                                    <option>식전 30분</option>
                                    <option>식후 10분</option>
                                    <option>식후 30분</option>
                                    <option>식후 즉시</option>
                                    <option>취침 전</option>
                                </select>
                            </div>

                            <button onClick={handleAddMed} className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-bold text-base shadow-xl shadow-blue-100 mt-4 active:scale-95 transition-all cursor-pointer">등록 완료</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}