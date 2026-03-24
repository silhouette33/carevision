import asyncio
import sys
import os
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

# 상위 디렉토리 import 경로 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from pipelines.fall_detector import fall_detector
from pipelines.medication_detector import medication_detector
from detector import detector
from services.backend_client import notify_detection, notify_medication_log

router = APIRouter()


# 요청 모델 정의
class FallDetectRequest(BaseModel):
    image: str  # base64 인코딩된 이미지
    cameraId: str = "default"
    patientId: Optional[int] = None  # 백엔드 연동용


class MedicationDetectRequest(BaseModel):
    image: str
    cameraId: str = "default"
    patientId: Optional[int] = None
    scheduleId: Optional[int] = None


class ImageRequest(BaseModel):
    image: str


# --- 낙상 감지 ---
@router.post("/detect/fall")
async def detect_fall(request: FallDetectRequest, background_tasks: BackgroundTasks):
    result = fall_detector.detect(request.image, request.cameraId)

    # 위급 확정 시 백엔드에 자동 알림
    if result["status"] == "emergency" and request.patientId:
        background_tasks.add_task(
            notify_detection,
            patient_id=request.patientId,
            detection_type="FALL",
            confidence=result["confidence"],
            status=result["status"],
            camera_id=request.cameraId,
        )

    return result


# --- 복약 감지 ---
@router.post("/detect/medication")
async def detect_medication(request: MedicationDetectRequest, background_tasks: BackgroundTasks):
    result = medication_detector.detect(request.image, request.cameraId)

    if request.scheduleId is not None:
        result["scheduleId"] = request.scheduleId

    # 복약 완료 또는 누락 시 백엔드에 자동 기록
    if result["status"] in ("completed", "missed") and request.patientId:
        background_tasks.add_task(
            notify_detection,
            patient_id=request.patientId,
            detection_type="MEDICATION",
            confidence=result["confidence"],
            status=result["status"],
            camera_id=request.cameraId,
        )

        # 스케줄 기반 복약 기록
        if request.scheduleId:
            background_tasks.add_task(
                notify_medication_log,
                patient_id=request.patientId,
                schedule_id=request.scheduleId,
                status=result["status"],
            )

    return result


# --- 일반 객체 감지 (기존 기능 유지) ---
@router.post("/detect")
def detect_objects(request: ImageRequest):
    detections = detector.detect_from_base64(request.image)
    return {
        "success": True,
        "detections": detections,
        "count": len(detections),
    }


# --- 헬스 체크 ---
@router.get("/health")
def health_check():
    return {"status": "ok", "message": "CareVision AI Server is running"}
