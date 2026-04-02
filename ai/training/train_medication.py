"""
복약 감지 YOLOv8 파인튜닝 스크립트

사용법:
1. Roboflow에서 데이터셋 다운로드
   - https://universe.roboflow.com 접속
   - "pill detection" 또는 "medicine detection" 검색
   - YOLOv8 포맷으로 export
   - 다운로드 후 ai/data/medication/ 에 압축 해제

2. 데이터 구조 확인:
   ai/data/medication/
   ├── data.yaml          # 클래스 정보
   ├── train/
   │   ├── images/
   │   └── labels/
   ├── valid/
   │   ├── images/
   │   └── labels/
   └── test/
       ├── images/
       └── labels/

3. 학습 실행:
   cd ai
   python training/train_medication.py

4. 완료 후:
   - 최적 모델이 ai/models/medication.pt 에 자동 복사됨
   - AI 서버 재시작하면 자동으로 파인튜닝 모델 로드
"""

import os
import shutil
from ultralytics import YOLO

# 경로 설정
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_YAML = os.path.join(BASE_DIR, "data", "medication", "data.yaml")
OUTPUT_MODEL = os.path.join(BASE_DIR, "models", "medication.pt")


def check_dataset():
    """데이터셋 존재 여부 확인"""
    if not os.path.exists(DATA_YAML):
        print("=" * 60)
        print("데이터셋을 찾을 수 없습니다!")
        print()
        print("1. https://universe.roboflow.com 에서 약 감지 데이터셋 다운로드")
        print("   검색어: 'pill detection', 'medicine detection'")
        print("   추천 데이터셋:")
        print("   - Pill Detection (1,000+ images)")
        print("   - Medicine Box Detection")
        print()
        print("2. YOLOv8 포맷으로 Export")
        print()
        print(f"3. 다운로드 후 아래 경로에 압축 해제:")
        print(f"   {os.path.join(BASE_DIR, 'data', 'medication')}/")
        print()
        print("4. data.yaml 파일 경로 확인:")
        print(f"   {DATA_YAML}")
        print("=" * 60)
        return False
    return True


def train():
    """YOLOv8 파인튜닝 실행"""
    if not check_dataset():
        return

    print("복약 감지 모델 학습 시작...")
    print()

    # YOLOv8n 기반으로 파인튜닝 (가장 가벼운 모델)
    model = YOLO("yolov8n.pt")

    results = model.train(
        data=DATA_YAML,
        epochs=50,           # 에포크 수
        imgsz=640,           # 이미지 크기
        batch=32,            # RTX 4070 Ti 12GB 기준 최적값
        patience=10,         # 조기 종료 patience
        save=True,
        project=os.path.join(BASE_DIR, "training", "runs"),
        name="medication",
        exist_ok=True,
        device=0,            # GPU 0번 사용 (RTX 4070 Ti)
        workers=4,           # 데이터 로딩 병렬 처리
        amp=False,           # AMP 비활성화 (RTX 40시리즈 호환 이슈)
    )

    # 최적 모델 복사
    best_model = os.path.join(
        BASE_DIR, "training", "runs", "medication", "weights", "best.pt"
    )

    if os.path.exists(best_model):
        os.makedirs(os.path.dirname(OUTPUT_MODEL), exist_ok=True)
        shutil.copy2(best_model, OUTPUT_MODEL)
        print()
        print("=" * 60)
        print(f"학습 완료! 모델 저장 위치: {OUTPUT_MODEL}")
        print("AI 서버를 재시작하면 자동으로 파인튜닝 모델을 로드합니다.")
        print("=" * 60)
    else:
        print("학습 결과 모델을 찾을 수 없습니다.")


if __name__ == "__main__":
    train()
