"""
Roboflow에서 복약 감지 데이터셋 자동 다운로드

사용법:
1. pip install roboflow
2. Roboflow API 키 발급: https://app.roboflow.com/settings/api
3. 실행:
   cd ai
   python training/download_dataset.py --api-key YOUR_API_KEY

API 키 없이 수동 다운로드:
1. https://universe.roboflow.com/search?q=pill+detection
2. 원하는 데이터셋 선택 → Download → YOLOv8 format
3. ai/data/medication/ 에 압축 해제
"""

import argparse
import os
import sys


def download_from_roboflow(api_key: str):
    try:
        from roboflow import Roboflow
    except ImportError:
        print("roboflow 패키지가 필요합니다.")
        print("설치: pip install roboflow")
        sys.exit(1)

    rf = Roboflow(api_key=api_key)

    # Roboflow Universe에서 공개 약 감지 데이터셋 다운로드
    # 아래 workspace/project/version은 예시 → 실제 데이터셋에 맞게 변경
    print("Roboflow에서 데이터셋 다운로드 중...")
    print()
    print("아래 단계를 따라주세요:")
    print("1. https://universe.roboflow.com 접속")
    print("2. 'pill detection' 검색")
    print("3. 원하는 데이터셋 → Use This Dataset → Download")
    print("4. Format: YOLOv8 선택")
    print("5. 'Show download code' 클릭")
    print("6. 표시된 코드의 workspace, project, version 값을 아래에 입력")
    print()

    workspace = input("Workspace 이름: ").strip()
    project = input("Project 이름: ").strip()
    version = int(input("Version 번호: ").strip())

    dataset_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "data", "medication"
    )

    project_obj = rf.workspace(workspace).project(project)
    dataset = project_obj.version(version).download(
        "yolov8", location=dataset_dir
    )

    print()
    print(f"다운로드 완료: {dataset_dir}")
    print("이제 python training/train_medication.py 를 실행하세요.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Roboflow 데이터셋 다운로드")
    parser.add_argument("--api-key", required=True, help="Roboflow API 키")
    args = parser.parse_args()

    download_from_roboflow(args.api_key)
