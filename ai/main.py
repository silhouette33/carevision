import sys
import os

# 현재 디렉토리를 경로에 추가 (모듈 import 해결)
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from streaming.mjpeg import stream_router

app = FastAPI(title="CareVision AI Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(router)
app.include_router(stream_router)

# 루트 경로 → 헬스 체크
@app.get("/")
def root():
    return {"status": "ok", "message": "CareVision AI Server is running"}
