from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from detector import detector

app = FastAPI(title="CareVision AI Server")

# 프론트엔드(React)에서 요청 가능하도록 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 요청 형식 정의
class ImageRequest(BaseModel):
    image: str  # base64로 인코딩된 이미지

@app.get("/")
def health_check():
    return {"status": "ok", "message": "CareVision AI Server is running"}

@app.post("/detect")
def detect_objects(request: ImageRequest):
    """
    이미지를 받아서 물체 감지 결과 반환
    - 입력: base64 인코딩된 이미지
    - 출력: 감지된 물체 목록 (이름, 확신도, 위치)
    """
    detections = detector.detect_from_base64(request.image)
    return {
        "success": True,
        "detections": detections,
        "count": len(detections)
    }