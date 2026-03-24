from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from collections import defaultdict
import asyncio
import cv2
import base64
import numpy as np
from threading import Lock

stream_router = APIRouter()


class CameraStreamManager:
    """
    카메라별 MJPEG 스트리밍 관리
    - 라즈베리파이에서 프레임 수신 (POST /stream/:cameraId/frame)
    - 보호자 앱에서 스트림 요청 (GET /stream/:cameraId)
    """

    def __init__(self):
        # 카메라별 최신 프레임 저장
        self.frames = defaultdict(lambda: None)
        # 카메라별 스트림 활성 여부
        self.active_streams = defaultdict(lambda: False)
        self.lock = Lock()

    def update_frame(self, camera_id: str, frame_base64: str):
        """라즈베리파이에서 보낸 프레임 업데이트"""
        img_data = base64.b64decode(frame_base64)
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        with self.lock:
            self.frames[camera_id] = frame

    def get_frame_jpeg(self, camera_id: str) -> bytes | None:
        """최신 프레임을 JPEG 바이트로 반환"""
        with self.lock:
            frame = self.frames[camera_id]
        if frame is None:
            return None
        _, jpeg = cv2.imencode(".jpg", frame)
        return jpeg.tobytes()

    def activate(self, camera_id: str):
        self.active_streams[camera_id] = True

    def deactivate(self, camera_id: str):
        self.active_streams[camera_id] = False

    def is_active(self, camera_id: str) -> bool:
        return self.active_streams[camera_id]


stream_manager = CameraStreamManager()


from pydantic import BaseModel


class FrameRequest(BaseModel):
    image: str  # base64 프레임


@stream_router.post("/stream/{camera_id}/frame")
def receive_frame(camera_id: str, request: FrameRequest):
    """라즈베리파이에서 프레임 수신"""
    stream_manager.update_frame(camera_id, request.image)
    return {"success": True}


@stream_router.post("/stream/{camera_id}/activate")
def activate_stream(camera_id: str):
    """위급 상황 시 스트림 활성화"""
    stream_manager.activate(camera_id)
    return {"success": True, "message": f"Stream {camera_id} activated"}


@stream_router.post("/stream/{camera_id}/deactivate")
def deactivate_stream(camera_id: str):
    """스트림 비활성화"""
    stream_manager.deactivate(camera_id)
    return {"success": True, "message": f"Stream {camera_id} deactivated"}


async def generate_mjpeg(camera_id: str):
    """MJPEG 프레임 스트림 생성"""
    while stream_manager.is_active(camera_id):
        jpeg_bytes = stream_manager.get_frame_jpeg(camera_id)
        if jpeg_bytes:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg_bytes + b"\r\n"
            )
        await asyncio.sleep(0.066)  # ~15fps


@stream_router.get("/stream/{camera_id}")
async def stream_camera(camera_id: str):
    """보호자 앱에서 MJPEG 스트림 수신"""
    # 스트림 자동 활성화
    stream_manager.activate(camera_id)
    return StreamingResponse(
        generate_mjpeg(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )
