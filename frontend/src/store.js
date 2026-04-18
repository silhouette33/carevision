// 간단한 전역 store — localStorage 영속 + React 구독
// API 호출은 시도하되 실패 시 로컬에만 반영 (현재 백엔드 없이도 동작)

import { useEffect, useState } from 'react';
import { api } from './api/client';

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
    logs: {},        // { [patientId]: [{id, medicationId, status, loggedAt}] }
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

    // 동시에 알림도 생성
    let message = '';
    if (type === 'FALL') {
        message = `${patient?.name ?? ''} 님 거실에서 낙상 패턴이 감지되었습니다. 즉시 확인해주세요.`;
    } else if (type === 'MEDICATION') {
        message = `${patient?.name ?? ''} 님 복약이 AI로 감지되었습니다.`;
    } else {
        message = `${patient?.name ?? ''} 정상 동작 감지`;
    }
    const notif = buildNotification({ type, patient, message });
    state = { ...state, notifications: [notif, ...state.notifications] };

    // 백엔드에도 시도
    if (patient?.id) {
        api.createDetection?.({ patientId: patient.id, type, confidence }).catch(() => {});
    }
    emit();
    return { detection, notif };
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

const logMedication = (patientId, medicationId, status = 'TAKEN') => {
    const log = { id: mkId(), patientId, medicationId, status, loggedAt: new Date().toISOString() };
    const list = [...(state.logs[patientId] || []).filter((l) => l.medicationId !== medicationId), log];
    state = { ...state, logs: { ...state.logs, [patientId]: list } };
    emit();
    return log;
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
            { id: mkId(), type: 'MEDICATION', message: '김순자 님 아침 복약이 AI로 감지되었습니다.', isRead: false, sentAt: new Date(now - 600000).toISOString(), patient: { name: '김순자', id: 1 } },
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
