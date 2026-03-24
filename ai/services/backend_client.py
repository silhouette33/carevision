"""
AI 서버 → 백엔드 연동 클라이언트
감지 결과를 백엔드 /api/detections 로 POST 전달
"""

import os
import httpx

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")


async def notify_detection(
    patient_id: int,
    detection_type: str,
    confidence: float,
    status: str,
    camera_id: str,
):
    """
    감지 결과를 백엔드에 전달
    - 위급 확정(emergency) 또는 복약 완료(completed)/누락(missed) 시 호출
    - 백엔드에서 FCM 알림 발송 처리
    """
    payload = {
        "patientId": patient_id,
        "type": detection_type,
        "confidence": confidence,
        "status": status,
        "cameraId": camera_id,
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/detections",
                json=payload,
                timeout=5.0,
            )
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError as e:
        print(f"[백엔드 연동 실패] {e}")
        return None


async def notify_medication_log(
    patient_id: int,
    schedule_id: int,
    status: str,
):
    """
    복약 기록을 백엔드에 전달
    - status: completed / missed
    """
    payload = {
        "patientId": patient_id,
        "scheduleId": schedule_id,
        "status": status,
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{BACKEND_URL}/api/medications/log",
                json=payload,
                timeout=5.0,
            )
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError as e:
        print(f"[복약 기록 전달 실패] {e}")
        return None
