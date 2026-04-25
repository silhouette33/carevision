// 간단한 전역 store — localStorage 영속 + React 구독
// API 호출은 시도하되 실패 시 로컬에만 반영 (현재 백엔드 없이도 동작)

import { useEffect, useState } from 'react';
import { api } from './api/client';
import { notify, vibratePattern } from './notify';

const STORAGE_KEY = 'carevision:store:v1';

const load = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const save = (state) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
};

const DEFAULT_STATE = {
    notifications: [],
    detections: [],
    medications: {}, // { [patientId]: [{id,name,dosage,scheduleTime,days,...}] }
    logs: {},        // { [patientId]: [{id, medicationId, status, loggedAt, source}] }
};

let state = load() || DEFAULT_STATE;
const listeners = new Set();

const emit = () => {
    save(state);
    listeners.forEach((fn) => fn(state));
};

const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};

const mkId = () => Date.now() + Math.floor(Math.random() * 1000);

// ─── 유틸 ───
const DAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const todayStr = (ts = Date.now()) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const currentDayKey = (ts = Date.now()) => DAY_KEYS[new Date(ts).getDay()];

// "08:30" → 분 단위 숫자
const toMinutes = (hhmm) => {
    const [h, m] = (hhmm || '00:00').split(':').map(Number);
    return h * 60 + (m || 0);
};

const nowMinutes = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
};

// 오늘 날짜에 해당 약에 TAKEN 로그가 이미 있는지
const hasTakenToday = (patientId, medId) => {
    const logs = state.logs[patientId] || [];
    const today = todayStr();
    return logs.some(
        (l) => l.medicationId === medId && l.status === 'TAKEN' && l.loggedAt?.slice(0, 10) === today
    );
};

const hasMissedToday = (patientId, medId) => {
    const logs = state.logs[patientId] || [];
    const today = todayStr();
    return logs.some(
        (l) => l.medicationId === medId && l.status === 'MISSED' && l.loggedAt?.slice(0, 10) === today
    );
};

// AI 감지 전용: 요일·시간 제한 없이 오늘 미완료 약 중 현재 시각과 가장 가까운 것 반환
const _findDueMedicationForAI = (patientId) => {
    const meds = state.medications[patientId] || [];
    const now = nowMinutes();
    const candidates = meds
        .filter((m) => !hasTakenToday(patientId, m.id))
        .map((m) => ({ med: m, diff: Math.abs(now - toMinutes(m.scheduleTime)) }))
        .sort((a, b) => a.diff - b.diff);
    return candidates[0]?.med || null;
};

// 지금 복용 창(window) 안에 있고 아직 TAKEN 안 된 가장 가까운 약 찾기
// windowBefore/After 를 모두 null 로 주면 시간 제한 없이 오늘 중 가장 가까운 약 반환
const findDueMedication = (patientId, windowBefore = 30, windowAfter = 60) => {
    const meds = state.medications[patientId] || [];
    const now = nowMinutes();
    const today = currentDayKey();

    const candidates = meds
        .filter((m) => {
            if (m.days) {
                const daysArr = String(m.days).split(',').map((s) => s.trim());
                if (!daysArr.includes(today)) return false;
            }
            if (hasTakenToday(patientId, m.id)) return false;
            return true;
        })
        .map((m) => {
            const sched = toMinutes(m.scheduleTime);
            const diff = now - sched;
            return { med: m, diff, sched };
        })
        .filter(({ diff }) => {
            if (windowBefore === null && windowAfter === null) return true;
            return diff >= -(windowBefore ?? 30) && diff <= (windowAfter ?? 60);
        })
        .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));

    return candidates[0]?.med || null;
};

// 누락 판정용: 예정 시각이 30분 이상 지났는데 TAKEN/MISSED 둘 다 없는 약들
const findMissedMedications = (patientId, graceMinutes = 30) => {
    const meds = state.medications[patientId] || [];
    const now = nowMinutes();
    const today = currentDayKey();

    return meds.filter((m) => {
        if (m.days) {
            const daysArr = String(m.days).split(',').map((s) => s.trim());
            if (!daysArr.includes(today)) return false;
        }
        if (hasTakenToday(patientId, m.id)) return false;
        if (hasMissedToday(patientId, m.id)) return false;
        const sched = toMinutes(m.scheduleTime);
        return now - sched > graceMinutes;
    });
};

// ─── 알림 ───
const buildNotification = ({ type, patient, message }) => ({
    id: mkId(),
    type,
    message,
    isRead: false,
    sentAt: new Date().toISOString(),
    patient: patient ? { name: patient.name, id: patient.id } : null,
});

const pushNotification = (payload) => {
    const notif = buildNotification(payload);
    state = { ...state, notifications: [notif, ...state.notifications] };
    emit();

    // 네이티브/브라우저 알림 발송
    const title =
        payload.type === 'FALL'
            ? '🚨 낙상 의심 감지'
            : payload.type === 'MEDICATION'
            ? '💊 복약 확인'
            : payload.type === 'MISSED'
            ? '⏰ 복약 누락'
            : '알림';
    notify({ title, body: payload.message, type: payload.type });
    if (payload.type === 'FALL') {
        vibratePattern([200, 100, 200, 100, 500]);
    } else if (payload.type === 'MEDICATION') {
        vibratePattern([100]);
    } else if (payload.type === 'MISSED') {
        vibratePattern([150, 80, 150]);
    }
    return notif;
};

// ─── 감지 이벤트 (낙상/복약) ───
const recordDetection = ({ type, confidence, patient, extra }) => {
    const detection = {
        id: mkId(),
        type,
        confidence: confidence ?? 0,
        detectedAt: new Date().toISOString(),
        patient: patient ? { name: patient.name, id: patient.id } : null,
        ...(extra || {}),
    };
    state = { ...state, detections: [detection, ...state.detections] };

    let message = '';
    if (type === 'FALL') {
        message = `${patient?.name ?? ''} 님 거실에서 낙상 패턴이 감지되었습니다. 즉시 확인해주세요.`;
    } else if (type === 'MEDICATION') {
        message = `${patient?.name ?? ''} 님 복약이 AI로 감지되었습니다.`;
    } else {
        message = `${patient?.name ?? ''} 정상 동작 감지`;
    }

    // 알림 발송 (buildNotification + native)
    pushNotification({ type, patient, message });

    // 복약 감지면 스케줄 자동 체크
    // AI 감지는 시간·요일 제한 없이 오늘 미완료 약 중 현재 시각과 가장 가까운 것에 매칭
    if (type === 'MEDICATION' && patient?.id) {
        const due = _findDueMedicationForAI(patient.id);
        if (due) {
            logMedication(patient.id, due.id, 'TAKEN', { source: 'ai', confidence });
        }
    }

    // 백엔드에도 시도
    if (patient?.id) {
        api.createDetection?.({ patientId: patient.id, type, confidence }).catch(() => {});
    }

    emit();
    return { detection };
};

// ─── 복약 스케줄 ───
const getMedications = (patientId) => state.medications[patientId] || [];
const getLogs = (patientId) => state.logs[patientId] || [];

const addMedication = async (patientId, data) => {
    const med = { id: mkId(), patientId, isActive: true, ...data };
    try {
        const created = await api.createMedication({ patientId, ...data });
        if (created?.id) med.id = created.id;
    } catch {}
    const list = [...(state.medications[patientId] || []), med].sort((a, b) =>
        a.scheduleTime.localeCompare(b.scheduleTime)
    );
    state = { ...state, medications: { ...state.medications, [patientId]: list } };
    emit();
    return med;
};

const deleteMedication = async (patientId, medId) => {
    try { await api.deleteMedication(medId); } catch {}
    const list = (state.medications[patientId] || []).filter((m) => m.id !== medId);
    state = { ...state, medications: { ...state.medications, [patientId]: list } };
    emit();
};

// 로그 기록 - 중복(TAKEN 오늘 이미 있음) 방지, 필요 시 알림 생성
const logMedication = (patientId, medicationId, status = 'TAKEN', meta = {}) => {
    if (status === 'TAKEN' && hasTakenToday(patientId, medicationId)) return null;

    const log = {
        id: mkId(),
        patientId,
        medicationId,
        status,
        loggedAt: new Date().toISOString(),
        source: meta.source || 'manual',
        confidence: meta.confidence,
    };
    const list = [...(state.logs[patientId] || []), log];
    state = { ...state, logs: { ...state.logs, [patientId]: list } };

    // 관련 알림 생성
    const meds = state.medications[patientId] || [];
    const med = meds.find((m) => m.id === medicationId);
    const patientName = state.notifications.find((n) => n.patient?.id === patientId)?.patient?.name || '';

    if (status === 'TAKEN' && med && meta.source === 'ai') {
        // AI 감지는 이미 recordDetection에서 알림 발생했으므로 중복 방지
    } else if (status === 'TAKEN' && med) {
        pushNotification({
            type: 'MEDICATION',
            patient: { id: patientId, name: patientName },
            message: `${med.name} 복약 완료 처리 (${log.source === 'manual' ? '수동 체크' : 'AI 감지'})`,
        });
    } else if (status === 'MISSED' && med) {
        pushNotification({
            type: 'MISSED',
            patient: { id: patientId, name: patientName },
            message: `${med.scheduleTime} 예정 ${med.name} 복약이 누락되었습니다.`,
        });
    }

    emit();
    return log;
};

// 주기적으로 호출: 누락된 약 찾아서 MISSED 로그 + 알림 추가
const checkMissedMedications = (patientId) => {
    if (!patientId) return [];
    const missed = findMissedMedications(patientId);
    missed.forEach((m) => {
        logMedication(patientId, m.id, 'MISSED', { source: 'auto' });
    });
    return missed;
};

// ─── 알림 관리 ───
const markRead = (id) => {
    state = {
        ...state,
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    };
    emit();
};

const markAllRead = () => {
    state = {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    };
    emit();
};

// 초기 목업 (빈 상태일 때만 1회 채움)
const seedIfEmpty = () => {
    if (state.notifications.length === 0 && state.detections.length === 0) {
        const now = Date.now();
        const seed = [
            { id: mkId(), type: 'NORMAL', message: '거실 카메라가 정상 연결되었습니다.', isRead: true, sentAt: new Date(now - 7200000).toISOString(), patient: null },
        ];
        state = { ...state, notifications: seed };
        save(state);
    }
};
seedIfEmpty();

export const store = {
    getState: () => state,
    subscribe,
    recordDetection,
    pushNotification,
    getMedications,
    getLogs,
    addMedication,
    deleteMedication,
    logMedication,
    markRead,
    markAllRead,
    // 신규 헬퍼
    findDueMedication,
    findMissedMedications,
    hasTakenToday,
    checkMissedMedications,
};

// ─── React 훅 ───
export function useStore(selector = (s) => s) {
    const [value, setValue] = useState(() => selector(state));
    useEffect(() => {
        return subscribe((s) => setValue(selector(s)));
        // eslint-disable-next-line
    }, []);
    return value;
}
