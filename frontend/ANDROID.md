# Android APK 빌드 가이드

Capacitor로 React 웹앱을 Android APK로 패키징합니다. 레이아웃/기능은 웹과 100% 동일합니다.

## 사전 요구사항
- Node.js 20+
- Android Studio (SDK + Platform Tools)
- Java 17+ (23 확인됨)

## 첫 빌드 (최초 1회)

```bash
cd C:\carevision-main\frontend
npm install
```

## 매번 업데이트 후 APK 다시 만들기

### 1. 서버 IP 설정 (폰에서 PC 서버 접근할 때)
`.env` 편집:
```env
VITE_AI_BASE_URL=http://192.168.0.10:8000       # PC의 실제 IP
VITE_API_BASE_URL=http://192.168.0.10:3000/api
```
> `localhost`는 앱에서 폰 자신을 가리키므로 PC IP로 교체해야 함.
> PC IP 확인: `ipconfig` → "IPv4 주소"

### 2. 빌드 + sync + Android Studio 열기
```bash
npm run android
```
한 방에:
- `npm run build:app` (base './'로 Vite 빌드)
- `npx cap sync android` (dist → android/app/src/main/assets/public)
- `npx cap open android` (Android Studio 실행)

### 3. Android Studio에서 APK 뽑기
상단 메뉴 → **Build → Build Bundle(s)/APK(s) → Build APK(s)**

완료되면 하단 알림에 "locate" 버튼:
```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```
이걸 폰에 복사해서 설치하면 끝.

### 4. 실기기에서 바로 실행 (추천)
폰을 USB로 연결 + **USB 디버깅** 활성화 후:
- Android Studio 상단 재생 ▶ 버튼 클릭
- 또는 터미널: `cd android && gradlew installDebug`

## 권한
- 첫 실행 시 **카메라 권한** 팝업 → 허용
- HTTP 허용됨 (`network_security_config.xml`에서 개발용으로 cleartext 허용)

## 주의사항

### HTTPS 프로덕션 배포 시
`network_security_config.xml`에서 cleartext 제거하고 실제 도메인만 허용:
```xml
<domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">api.your-domain.com</domain>
</domain-config>
```

### 같은 Wi-Fi 확인
개발 중 폰에서 PC의 AI/백엔드 서버에 접근하려면:
1. 폰과 PC가 같은 Wi-Fi
2. Windows 방화벽에서 3000/8000 포트 인바운드 허용
3. `.env`의 IP가 PC의 현재 IP와 일치

### 서명된 릴리즈 APK (스토어 배포용)
```bash
cd android
./gradlew assembleRelease
```
키스토어 세팅은 Android Studio → **Build → Generate Signed Bundle / APK** 이용.

## 폴더 구조
```
frontend/
├── src/                    # React 소스 (웹=앱 동일)
├── dist/                   # 빌드 결과 (sync 대상)
├── capacitor.config.json   # appId, webDir 설정
└── android/                # 네이티브 Android 프로젝트 (Android Studio로 열기)
    └── app/
        ├── src/main/
        │   ├── AndroidManifest.xml
        │   ├── assets/public/           # ← sync된 웹 자산
        │   ├── java/com/carevision/app/ # MainActivity.java
        │   └── res/xml/network_security_config.xml
        └── build/outputs/apk/debug/     # ← APK 출력 위치
```
