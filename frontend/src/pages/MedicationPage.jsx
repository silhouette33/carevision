import { useState } from 'react';
import { store, useStore } from '../store';

const MEAL = (t) => {
    const h = parseInt(t?.split(':')[0] || '0', 10);
    if (h < 11) return '아침';
    if (h < 16) return '점심';
    if (h < 19) return '저녁';
    return '밤';
};

const DAYS_KR = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일' };
const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function MedicationFormModal({ onClose, onSubmit, initial }) {
    const [form, setForm] = useState(
        initial || { name: '', dosage: '1정', scheduleTime: '08:00', days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] }
    );

    const toggleDay = (d) =>
        setForm((f) => ({
            ...f,
            days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d],
        }));

    const submit = () => {
        if (!form.name.trim()) return alert('약 이름을 입력해주세요');
        if (form.days.length === 0) return alert('요일을 하나 이상 선택해주세요');
        onSubmit({ ...form, days: form.days.join(',') });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end justify-center">
            <div className="w-full max-w-[480px] bg-white rounded-t-3xl p-5 pb-8 animate-[slideUp_0.25s_ease-out]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900 m-0">복약 스케줄 추가</h2>
                    <button
                        onClick={onClose}
                        className="text-2xl text-gray-400 bg-transparent border-none cursor-pointer leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">약 이름</label>
                        <input
                            className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 focus:border-[#FF6B3D] focus:ring-2 focus:ring-[#FFE5DB]"
                            placeholder="예: 혈압약"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">용량</label>
                            <input
                                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 focus:border-[#FF6B3D] focus:ring-2 focus:ring-[#FFE5DB]"
                                placeholder="1정"
                                value={form.dosage}
                                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">복용 시각</label>
                            <input
                                type="time"
                                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm outline-none bg-gray-50 focus:border-[#FF6B3D] focus:ring-2 focus:ring-[#FFE5DB]"
                                value={form.scheduleTime}
                                onChange={(e) => setForm({ ...form, scheduleTime: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">복용 요일</label>
                        <div className="flex gap-1.5 flex-wrap">
                            {ALL_DAYS.map((d) => (
                                <button
                                    key={d}
                                    onClick={() => toggleDay(d)}
                                    className={`w-10 h-10 rounded-full text-sm font-bold border cursor-pointer transition-colors ${
                                        form.days.includes(d)
                                            ? 'bg-[#FF6B3D] text-white border-[#FF6B3D]'
                                            : 'bg-white text-gray-500 border-gray-200'
                                    }`}
                                >
                                    {DAYS_KR[d]}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={submit}
                        className="mt-3 w-full bg-[#FF6B3D] text-white rounded-xl py-3.5 font-bold text-sm border-none cursor-pointer"
                    >
                        추가하기
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function MedicationPage({ patient, patients, onSelectPatient }) {
    const [tab, setTab] = useState('today');
    const [showForm, setShowForm] = useState(false);
    const [showPatientList, setShowPatientList] = useState(false);

    const medications = useStore((s) => (patient ? s.medications[patient.id] || [] : []));
    const logs = useStore((s) => (patient ? s.logs[patient.id] || [] : []));

    const sorted = [...medications].sort((a, b) => a.scheduleTime.localeCompare(b.scheduleTime));
    const taken = logs.filter((l) => l.status === 'TAKEN').length;
    const total = medications.length;
    const pct = total > 0 ? (taken / total) * 100 : 0;

    const getStatus = (m) => {
        const log = logs.find((l) => l.medicationId === m.id);
        if (log?.status === 'TAKEN') {
            const at = new Date(log.loggedAt);
            const hh = String(at.getHours()).padStart(2, '0');
            const mm = String(at.getMinutes()).padStart(2, '0');
            return {
                label: log.source === 'manual' ? '수동 체크' : 'AI 감지',
                tone: 'bg-[#E8F8F0] text-[#10B981]',
                line: `${m.scheduleTime} 예정 · ${hh}:${mm} 감지됨`,
                dotColor: 'bg-[#10B981]',
            };
        }
        if (log?.status === 'MISSED') {
            return { label: '누락', tone: 'bg-red-50 text-red-600', line: `${m.scheduleTime} 예정`, dotColor: 'bg-red-500' };
        }
        return { label: '대기중', tone: 'bg-[#FFE5DB] text-[#FF6B3D]', line: `${m.scheduleTime} 예정`, dotColor: 'bg-gray-300' };
    };

    const handleAdd = async (data) => {
        if (!patient) return;
        await store.addMedication(patient.id, data);
        setShowForm(false);
    };

    const handleDelete = (medId) => {
        if (!patient) return;
        if (!confirm('이 스케줄을 삭제하시겠습니까?')) return;
        store.deleteMedication(patient.id, medId);
    };

    const handleManualCheck = (medId) => {
        if (!patient) return;
        store.logMedication(patient.id, medId, 'TAKEN');
    };

    return (
        <div className="min-h-screen">
            {/* 헤더 */}
            <div className="bg-[#FF6B3D] text-white px-5 pt-6 pb-7 rounded-b-3xl">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold m-0">복약 관리</h1>
                        <button
                            onClick={() => setShowPatientList(!showPatientList)}
                            className="bg-transparent border-none text-white text-sm opacity-90 mt-1 p-0 cursor-pointer"
                        >
                            {patient?.name} 님 ▾
                        </button>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-white/25 border-none text-white text-sm font-semibold rounded-full px-4 py-1.5 cursor-pointer"
                    >
                        + 추가
                    </button>
                </div>
                {showPatientList && (
                    <div className="bg-white rounded-xl mt-3 p-2 shadow-lg">
                        {patients.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => { onSelectPatient(p); setShowPatientList(false); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                                    patient?.id === p.id ? 'bg-[#FFE5DB] text-[#FF6B3D] font-bold' : 'text-gray-700'
                                }`}
                            >
                                {p.name} ({p.age}세)
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 탭 */}
            <div className="px-4 -mt-5 mb-4">
                <div className="bg-white rounded-full p-1 shadow-sm inline-flex">
                    <button
                        onClick={() => setTab('today')}
                        className={`px-5 py-1.5 rounded-full text-sm font-semibold border-none cursor-pointer ${
                            tab === 'today' ? 'bg-[#FF6B3D] text-white' : 'bg-transparent text-gray-500'
                        }`}
                    >
                        오늘
                    </button>
                    <button
                        onClick={() => setTab('all')}
                        className={`px-5 py-1.5 rounded-full text-sm font-semibold border-none cursor-pointer ${
                            tab === 'all' ? 'bg-[#FF6B3D] text-white' : 'bg-transparent text-gray-500'
                        }`}
                    >
                        전체 스케줄
                    </button>
                </div>
            </div>

            {/* 오늘 복약 현황 */}
            <div className="px-4 mb-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-base font-bold text-gray-900 m-0">오늘 복약 현황</h3>
                        <span className="text-[#FF6B3D] text-base font-bold">
                            {taken}/{total || 0}
                        </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div
                            className="h-full bg-[#FF6B3D] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-[#10B981] font-semibold">완료 {taken}회</span>
                        <span className="text-gray-400">잔여 {Math.max(0, total - taken)}회</span>
                    </div>
                </div>
            </div>

            {/* 복약 타임라인 / 전체 스케줄 */}
            <div className="px-4 mb-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="text-base font-bold text-gray-900 mb-3">
                        {tab === 'today' ? '복약 타임라인' : '전체 스케줄'}
                    </h3>
                    <div className="flex flex-col">
                        {sorted.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-sm text-gray-400 mb-3">등록된 복약 스케줄이 없습니다</p>
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="px-4 py-2 bg-[#FF6B3D] text-white text-sm font-semibold rounded-xl border-none cursor-pointer"
                                >
                                    + 첫 스케줄 추가
                                </button>
                            </div>
                        )}
                        {tab === 'today' && sorted.map((m) => {
                            const s = getStatus(m);
                            return (
                                <div key={m.id} className="flex items-start gap-3 py-3 border-b last:border-0 border-gray-100">
                                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${s.dotColor}`} />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-gray-900 m-0">
                                                {MEAL(m.scheduleTime)} {m.name}
                                            </p>
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${s.tone}`}>
                                                {s.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 m-0 mt-1">
                                            {s.line} · {m.dosage}
                                        </p>
                                        {s.label === '대기중' && (
                                            <button
                                                onClick={() => handleManualCheck(m.id)}
                                                className="mt-2 text-xs text-[#FF6B3D] font-semibold bg-transparent border-none cursor-pointer"
                                            >
                                                수동으로 완료 처리 체크 ›
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {tab === 'all' && sorted.map((m) => (
                            <div key={m.id} className="flex items-center gap-3 py-3 border-b last:border-0 border-gray-100">
                                <div className="w-12 text-sm font-bold text-[#FF6B3D]">{m.scheduleTime}</div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900 m-0">{m.name}</p>
                                    <p className="text-xs text-gray-500 m-0 mt-0.5">
                                        {m.dosage} ·{' '}
                                        {m.days?.split(',').map((d) => DAYS_KR[d]).join(' ')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(m.id)}
                                    className="text-xs text-red-500 bg-transparent border-none cursor-pointer"
                                >
                                    삭제
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI 복약 감지 배너 */}
            <div className="px-4 mb-6">
                <div className="bg-[#FFF4ED] rounded-2xl p-4 flex items-center gap-3 border border-[#FFDCC8]">
                    <div className="w-10 h-10 rounded-full bg-[#FF6B3D] flex items-center justify-center shrink-0">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <rect x="2" y="8" width="20" height="8" rx="4" stroke="white" strokeWidth="2"/>
                            <line x1="12" y1="8" x2="12" y2="16" stroke="white" strokeWidth="2"/>
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900 m-0">AI 복약 감지 활성화됨</p>
                        <p className="text-xs text-gray-500 m-0 mt-0.5">홈 → LIVE 모니터링으로 바로 감지</p>
                    </div>
                </div>
            </div>

            {showForm && (
                <MedicationFormModal
                    onClose={() => setShowForm(false)}
                    onSubmit={handleAdd}
                />
            )}
        </div>
    );
}
