const BASE_URL = 'http://localhost:3000/api';

// 개발 테스트용 mock 데이터
const MOCK = {
  patients: [
    { id: 1, name: '김순자', age: 78, address: '서울 강북구', phone: '010-1234-5678', cameraId: 'cam-1' },
    { id: 2, name: '이복순', age: 82, address: '서울 노원구', phone: '010-9876-5432', cameraId: 'cam-2' },
  ],
  medications: [
    { id: 1, patientId: 1, name: '혈압약', dosage: '1정', scheduleTime: '08:00', days: 'MON,TUE,WED,THU,FRI,SAT,SUN', isActive: true },
    { id: 2, patientId: 1, name: '당뇨약', dosage: '2정', scheduleTime: '12:00', days: 'MON,TUE,WED,THU,FRI', isActive: true },
    { id: 3, patientId: 1, name: '수면제', dosage: '1정', scheduleTime: '21:00', days: 'MON,TUE,WED,THU,FRI,SAT,SUN', isActive: true },
  ],
  medicationLogs: [
    { id: 1, medicationId: 1, patientId: 1, status: 'TAKEN', medication: { name: '혈압약' } },
    { id: 2, medicationId: 2, patientId: 1, status: 'MISSED', medication: { name: '당뇨약' } },
  ],
  detections: [
    { id: 1, type: 'FALL', confidence: 0.92, detectedAt: new Date(Date.now() - 3600000).toISOString(), patient: { name: '김순자' } },
    { id: 2, type: 'MEDICATION', confidence: 0.87, detectedAt: new Date(Date.now() - 7200000).toISOString(), patient: { name: '김순자' } },
    { id: 3, type: 'NORMAL', confidence: 0.99, detectedAt: new Date(Date.now() - 10800000).toISOString(), patient: { name: '김순자' } },
  ],
  notifications: [
    { id: 1, type: 'FALL', message: '김순자 님의 낙상이 감지되었습니다.', isRead: false, sentAt: new Date(Date.now() - 3600000).toISOString(), patient: { name: '김순자' } },
    { id: 2, type: 'MEDICATION', message: '이복순 님이 점심 복약을 하지 않았습니다.', isRead: false, sentAt: new Date(Date.now() - 7200000).toISOString(), patient: { name: '이복순' } },
    { id: 3, type: 'MEDICATION', message: '김순자 님이 아침 복약을 완료했습니다.', isRead: true, sentAt: new Date(Date.now() - 86400000).toISOString(), patient: { name: '김순자' } },
  ],
  // 라즈베리파이 AI 분석 결과 Mock 데이터 (추가됨)
  liveSummaries: {
    1: { currentAction: '거실 소파에서 휴식을 취하며 TV 시청 중입니다.', intensity: '낮음', lastActive: '방금 전', status: 'NORMAL' },
    2: { currentAction: '주방에서 식사 준비를 위해 움직이고 계십니다.', intensity: '보통', lastActive: '2분 전', status: 'NORMAL' },
    3: { currentAction: '거실 바닥에 쓰러진 상태로 감지되어 즉각적인 확인이 필요합니다.', intensity: '없음', lastActive: '10분 전', status: 'FALL' },
    4: { currentAction: '침실에서 장시간 움직임이 감지되지 않고 있습니다.', intensity: '없음', lastActive: '1시간 전', status: 'INACTIVITY' },
  },
};

const getToken = () => localStorage.getItem('token');

const request = async (method, path, body = null) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '요청 실패');
  return data;
};

const useMock = async (fn, fallback) => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

export const api = {
  // 인증
  register: (body) => request('POST', '/auth/register', body),
  login: (body) => useMock(
      () => request('POST', '/auth/login', body),
      { token: 'mock-token', user: { email: body.email, name: '테스트유저' } }
  ),

  // 환자
  getPatients: () => useMock(() => request('GET', '/patients'), MOCK.patients),
  getPatient: (id) =>
      useMock(() => request('GET', `/patients/${id}`), MOCK.patients.find(p => p.id === id)),
  createPatient: (body) =>
      useMock(() => request('POST', '/patients', body), { ...body, id: Date.now() }),
  updatePatient: (id, body) =>
      useMock(() => request('PUT', `/patients/${id}`, body), { message: '수정 완료' }),
  deletePatient: (id) =>
      useMock(() => request('DELETE', `/patients/${id}`), { message: '삭제 완료' }),

  // 복약
  getMedications: (patientId) =>
      useMock(() => request('GET', `/medications/${patientId}`),
          MOCK.medications.filter(m => m.patientId === Number(patientId))
      ),
  createMedication: (body) =>
      useMock(() => request('POST', '/medications', body), { ...body, id: Date.now() }),
  deleteMedication: (id) =>
      useMock(() => request('DELETE', `/medications/${id}`), { message: '삭제 완료' }),

  // 로그
  getMedicationLogs: (patientId, date) =>
      useMock(
          () => request('GET', `/medications/logs/${patientId}${date ? `?date=${date}` : ''}`),
          MOCK.medicationLogs.filter(l => l.patientId === Number(patientId))
      ),

  // 감지 & 실시간 요약 (추가됨)
  getDetections: (patientId) =>
      useMock(() => request('GET', `/detections?patientId=${patientId}`), MOCK.detections),

  // 라즈베리파이 연동을 위한 실시간 요약 API
  getLiveSummary: (patientId) =>
      useMock(
          () => request('GET', `/detections/summary/${patientId}`),
          MOCK.liveSummaries[patientId] || { currentAction: '현재 상태를 분석하고 있습니다...', intensity: '-', lastActive: '-', status: 'NORMAL' }
      ),

  // 알림
  getNotifications: () =>
      useMock(() => request('GET', '/notifications'), MOCK.notifications),
  getUnreadCount: () =>
      useMock(
          () => request('GET', '/notifications/unread-count'),
          { count: MOCK.notifications.filter(n => !n.isRead).length }
      ),
  markAsRead: (id) =>
      useMock(() => request('PATCH', `/notifications/${id}/read`), { message: '읽음 처리 완료' }),
  markAllAsRead: () =>
      useMock(() => request('PATCH', '/notifications/read-all'), { message: '전체 읽음 처리 완료' }),
};