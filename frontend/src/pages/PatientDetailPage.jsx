import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { api } from '../api/client';

const DAYS_KR = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일' };
const ALL_DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

const STATUS = {
  TAKEN:       { text: '복약 완료', color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-300', icon: '✅' },
  MISSED:      { text: '복약 누락', color: 'text-red-700',   bg: 'bg-red-50',    border: 'border-red-300',   icon: '❌' },
  UNCONFIRMED: { text: '미확인',    color: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-300', icon: '⏳' },
};

export default function PatientDetailPage({ patient, onBack }) {
  const [tab, setTab] = useState('medication');
  const [medications, setMedications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [detections, setDetections] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0,10));
  const [showForm, setShowForm] = useState(false);
  const [newMed, setNewMed] = useState({ name:'', dosage:'', scheduleTime:'08:00', days:[] });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const meds = await api.getMedications(patient.id);
    const dets = await api.getDetections(patient.id);
    const logsData = await api.getMedicationLogs(patient.id);
    setMedications(meds);
    setDetections(dets);
    setLogs(logsData);
  };

  const toggleDay = (day) => {
    setNewMed(prev => ({
      ...prev,
      days: prev.days.includes(day)
          ? prev.days.filter(d => d !== day)
          : [...prev.days, day]
    }));
  };

  const getStatus = (medId) => {
    const log = logs.find(l => l.medicationId === medId);
    return log ? STATUS[log.status] : STATUS.UNCONFIRMED;
  };

  const handleAddMed = async () => {
    if (!newMed.name || !newMed.dosage || newMed.days.length === 0) {
      alert('약 이름, 용량, 요일을 모두 입력해주세요.');
      return;
    }
    const created = {
      id: Date.now(),
      patientId: patient.id,
      name: newMed.name,
      dosage: newMed.dosage,
      scheduleTime: newMed.scheduleTime,
      days: newMed.days.join(','),
      isActive: true,
    };
    try { await api.createMedication(created); } catch {}
    setMedications(prev =>
        [...prev, created].sort((a, b) => a.scheduleTime.localeCompare(b.scheduleTime))
    );
    setShowForm(false);
    setNewMed({ name:'', dosage:'', scheduleTime:'08:00', days:[] });
  };

  const handleDeleteMed = async (id) => {
    try { await api.deleteMedication(id); } catch {}
    setMedications(prev => prev.filter(m => m.id !== id));
  };

  return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 font-sans pb-8">

        {/* 헤더 */}
        <div className="bg-blue-600 text-white px-4 pt-4 pb-0 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <button
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center justify-center border-none cursor-pointer"
                onClick={onBack}
            >
              <ChevronLeft size={18} className="text-white" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-lg font-bold shrink-0">
                {patient.name[0]}
              </div>
              <div>
                <h2 className="text-base font-bold leading-tight">{patient.name}</h2>
                <p className="text-xs opacity-80">
                  {patient.age}세 · {patient.address}{patient.phone ? ` · ${patient.phone}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-1">
            <button
                className={`px-5 py-2 border-none cursor-pointer text-sm font-medium rounded-t-lg transition-colors ${
                    tab === 'medication'
                        ? 'bg-white text-blue-600 font-bold shadow'
                        : 'text-white/70 bg-transparent'
                }`}
                onClick={() => setTab('medication')}
            >
              💊 복약 관리
            </button>
            <button
                className={`px-5 py-2 border-none cursor-pointer text-sm font-medium rounded-t-lg transition-colors ${
                    tab === 'detection'
                        ? 'bg-white text-blue-600 font-bold shadow'
                        : 'text-white/70 bg-transparent'
                }`}
                onClick={() => setTab('detection')}
            >
              🚨 감지 이력
            </button>
          </div>
        </div>

        <div className="px-4 pt-4">
          {tab === 'medication' && (
              <>
                <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-gray-900">복약 스케줄</h3>
                    <button
                        className="px-4 py-2 bg-blue-600 text-white border-none rounded-lg cursor-pointer text-xs font-semibold hover:bg-blue-700 transition"
                        onClick={() => setShowForm(!showForm)}
                    >
                      {showForm ? '✕ 닫기' : '+ 스케줄 추가'}
                    </button>
                  </div>

                  {showForm && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col gap-2 mb-4">
                        <input
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none bg-white"
                            placeholder="약 이름"
                            value={newMed.name}
                            onChange={e => setNewMed({...newMed, name: e.target.value})}
                        />
                        <input
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none bg-white"
                            placeholder="용량 (예: 1정)"
                            value={newMed.dosage}
                            onChange={e => setNewMed({...newMed, dosage: e.target.value})}
                        />
                        <input
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none bg-white"
                            type="time"
                            value={newMed.scheduleTime}
                            onChange={e => setNewMed({...newMed, scheduleTime: e.target.value})}
                        />
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-2">복약 요일 선택</p>
                          <div className="flex gap-1 flex-wrap">
                            {ALL_DAYS.map(d => (
                                <button
                                    key={d}
                                    onClick={() => toggleDay(d)}
                                    className={`w-9 h-9 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                                        newMed.days.includes(d)
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-gray-700 border-gray-300'
                                    }`}
                                >
                                  {DAYS_KR[d]}
                                </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button
                              className="flex-1 py-2 bg-blue-600 text-white border-none rounded-lg cursor-pointer font-semibold text-sm hover:bg-blue-700 transition"
                              onClick={handleAddMed}
                          >
                            추가
                          </button>
                          <button
                              className="flex-1 py-2 bg-gray-100 text-gray-700 border-none rounded-lg cursor-pointer font-semibold text-sm hover:bg-gray-200 transition"
                              onClick={() => { setShowForm(false); setNewMed({ name:'', dosage:'', scheduleTime:'08:00', days:[] }); }}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {medications.length === 0 && (
                        <p className="text-gray-400 text-sm text-center py-5">등록된 복약 스케줄이 없습니다.</p>
                    )}
                    {medications.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50">
                          <div className="text-base font-bold text-blue-600 min-w-[54px]">{m.scheduleTime}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                              {m.name}
                              <span className="bg-blue-100 text-blue-600 rounded-full px-2 py-0.5 text-xs font-medium">
                                {m.dosage}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {m.days && m.days.split(',').map(d => DAYS_KR[d]).join(' ')}
                            </div>
                          </div>
                          <button
                              className="px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-lg cursor-pointer text-xs font-semibold shrink-0 hover:bg-red-50 transition"
                              onClick={() => handleDeleteMed(m.id)}
                          >
                            삭제
                          </button>
                        </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-gray-900">복약 현황</h3>
                    <input
                        type="date"
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-700 outline-none focus:border-blue-600"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    {medications.length === 0 && (
                        <p className="text-gray-400 text-sm text-center py-5">복약 스케줄을 먼저 등록해주세요.</p>
                    )}
                    {medications.map(m => {
                      const st = getStatus(m.id);
                      return (
                          <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border ${st.bg} ${st.border}`}>
                            <span className="text-xl">{st.icon}</span>
                            <div>
                              <div className={`text-sm font-semibold ${st.color}`}>{m.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{st.text}</div>
                            </div>
                          </div>
                      );
                    })}
                  </div>
                </div>
              </>
          )}

          {tab === 'detection' && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 mb-4">감지 이력</h3>
                {detections.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-5">감지 이력이 없습니다.</p>
                )}
                {detections.map(d => (
                    <div key={d.id} className="flex gap-3 items-start py-3 border-b border-gray-100 last:border-none">
                      <span className="text-xl mt-0.5">🚨</span>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{d.type}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          신뢰도 {Math.round(d.confidence * 100)}% · {new Date(d.detectedAt).toLocaleString('ko-KR')}
                        </div>
                      </div>
                    </div>
                ))}
              </div>
          )}
        </div>
      </div>
  );
}