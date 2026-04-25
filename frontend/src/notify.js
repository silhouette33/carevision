// 네이티브/브라우저 알림 통합 모듈
// - Capacitor 환경: @capacitor/local-notifications 사용
// - 웹 브라우저: Notification API 사용
// - 진동: navigator.vibrate (모바일 WebView에서 동작)

let LocalNotificationsModule = null;
let isCapacitor = false;

// Capacitor 환경 감지 (동적 import, 웹에서는 실패해도 무시)
(async () => {
    try {
        if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
            isCapacitor = true;
            const mod = await import('@capacitor/local-notifications');
            LocalNotificationsModule = mod.LocalNotifications;
            // 앱 첫 실행 시 권한 요청
            try {
                const perm = await LocalNotificationsModule.checkPermissions();
                if (perm.display !== 'granted') {
                    await LocalNotificationsModule.requestPermissions();
                }
            } catch {}
        }
    } catch {
        isCapacitor = false;
    }
})();

// 브라우저 Notification 권한 요청 (앱 시작 시 1회)
export async function requestNotificationPermission() {
    if (isCapacitor && LocalNotificationsModule) {
        try {
            await LocalNotificationsModule.requestPermissions();
        } catch {}
        return;
    }
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
        try { await Notification.requestPermission(); } catch {}
    }
}

// 알림 발송 (타입별 우선순위)
export function notify({ title, body, type = 'INFO' }) {
    // Capacitor LocalNotifications
    if (isCapacitor && LocalNotificationsModule) {
        try {
            LocalNotificationsModule.schedule({
                notifications: [
                    {
                        id: Math.floor(Math.random() * 1000000),
                        title,
                        body,
                        smallIcon: 'ic_launcher',
                        schedule: { at: new Date(Date.now() + 100) },
                        extra: { type },
                    },
                ],
            }).catch(() => {});
            return;
        } catch {}
    }

    // Web Notification API (HTTPS 또는 localhost에서만 동작)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
            const n = new Notification(title, {
                body,
                icon: '/carevision/vite.svg',
                tag: type, // 같은 type은 쌓이지 않고 덮어씀
                requireInteraction: type === 'FALL',
            });
            // 낙상은 사용자가 끌 때까지 유지
            if (type !== 'FALL') {
                setTimeout(() => n.close(), 6000);
            }
        } catch {}
    }
}

// 진동 패턴 재생
export function vibratePattern(pattern = [200]) {
    try {
        if (navigator.vibrate) navigator.vibrate(pattern);
    } catch {}
}

// 긴급 경고음 (간단한 WebAudio 비프) - 낙상 시에만 호출
export function emergencyBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.25, ctx.currentTime);
        o.start();
        setTimeout(() => {
            o.frequency.value = 660;
        }, 200);
        setTimeout(() => {
            o.stop();
            ctx.close();
        }, 500);
    } catch {}
}
