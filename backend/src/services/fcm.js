// Firebase Admin SDK 초기화
// firebase-admin 패키지와 서비스 계정 키 파일(firebase-service-account.json)이 필요합니다.
// Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 후 파일을 backend/ 에 저장하세요.

let admin;
try {
  admin = require('firebase-admin');
  const serviceAccount = require('../../firebase-service-account.json');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch {
  console.warn('Firebase 미설정 상태 — FCM 알림이 비활성화됩니다.');
  admin = null;
}

const sendAlert = async (fcmToken, { title, body }) => {
  if (!admin) return;
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
    });
  } catch (err) {
    console.error('FCM 전송 실패:', err.message);
  }
};

module.exports = { sendAlert };
