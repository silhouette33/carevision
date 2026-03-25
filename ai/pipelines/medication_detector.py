"""
복약 감지 파이프라인 (MVP)
- 1단계: 사진 입력 → 약 관련 객체 감지
- 2단계: 감지 결과 + 바운딩박스 이미지 반환
- 3단계(추후): 연속 프레임 기반 복약 동작 분석

모델 우선순위:
1. medication.pt (직접 파인튜닝 모델)
2. pills_detection.onnx (사전학습 ONNX 모델 - capsules/tablets)
3. yolov8n.pt (기본 COCO 모델 - bottle/cup만 감지)
"""

import cv2
import base64
import numpy as np
from collections import defaultdict
import os

# 모델 경로
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "medication.pt")
ONNX_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "pills_detection.onnx")
FALLBACK_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "yolov8n.pt")


class OnnxPillsDetector:
    """ONNX Runtime으로 직접 추론하는 약 감지기 (배치 사이즈 8 고정 모델 대응)"""

    def __init__(self, model_path: str):
        import onnxruntime as ort
        self.session = ort.InferenceSession(model_path)
        self.input_name = self.session.get_inputs()[0].name
        input_shape = self.session.get_inputs()[0].shape
        self.batch_size = input_shape[0]  # 8
        self.img_size = input_shape[2]     # 640
        self.names = {0: "capsules", 1: "tablets"}
        print(f"[OnnxPillsDetector] 로드 완료 (batch={self.batch_size}, size={self.img_size})")

    def _preprocess(self, image: np.ndarray) -> tuple:
        """이미지 전처리: letterbox 리사이즈 + 정규화"""
        h, w = image.shape[:2]
        scale = min(self.img_size / h, self.img_size / w)
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(image, (new_w, new_h))

        # letterbox 패딩 (회색)
        canvas = np.full((self.img_size, self.img_size, 3), 114, dtype=np.uint8)
        pad_x, pad_y = (self.img_size - new_w) // 2, (self.img_size - new_h) // 2
        canvas[pad_y:pad_y + new_h, pad_x:pad_x + new_w] = resized

        # BGR → RGB, HWC → CHW, 정규화 0~1
        blob = canvas[:, :, ::-1].transpose(2, 0, 1).astype(np.float32) / 255.0
        return blob, scale, pad_x, pad_y

    def _nms(self, boxes, scores, iou_threshold=0.5):
        """Non-Maximum Suppression"""
        if len(boxes) == 0:
            return []

        x1 = boxes[:, 0]
        y1 = boxes[:, 1]
        x2 = boxes[:, 2]
        y2 = boxes[:, 3]
        areas = (x2 - x1) * (y2 - y1)
        order = scores.argsort()[::-1]
        keep = []

        while order.size > 0:
            i = order[0]
            keep.append(i)
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])
            inter = np.maximum(0, xx2 - xx1) * np.maximum(0, yy2 - yy1)
            iou = inter / (areas[i] + areas[order[1:]] - inter)
            inds = np.where(iou <= iou_threshold)[0]
            order = order[inds + 1]

        return keep

    def predict(self, image: np.ndarray, conf_threshold=0.4):
        """단일 이미지 추론 → 감지 결과 리스트"""
        blob, scale, pad_x, pad_y = self._preprocess(image)

        # 배치 채우기 (첫 번째만 실제 이미지, 나머지 0)
        batch = np.zeros((self.batch_size, 3, self.img_size, self.img_size), dtype=np.float32)
        batch[0] = blob

        # 추론
        outputs = self.session.run(None, {self.input_name: batch})
        # output shape: [8, 6, 8400] → 첫 번째 이미지만 사용
        output = outputs[0][0]  # [6, 8400]

        # [6, 8400] → 6 = cx, cy, w, h, conf_cls0, conf_cls1
        # transpose → [8400, 6]
        predictions = output.T

        detections = []
        h_orig, w_orig = image.shape[:2]

        for pred in predictions:
            cx, cy, w, h = pred[0], pred[1], pred[2], pred[3]
            class_scores = pred[4:]
            max_cls = np.argmax(class_scores)
            conf = class_scores[max_cls]

            if conf < conf_threshold:
                continue

            # 모델 좌표 → 원본 이미지 좌표
            x1 = (cx - w / 2 - pad_x) / scale
            y1 = (cy - h / 2 - pad_y) / scale
            x2 = (cx + w / 2 - pad_x) / scale
            y2 = (cy + h / 2 - pad_y) / scale

            # 클리핑
            x1 = max(0, min(x1, w_orig))
            y1 = max(0, min(y1, h_orig))
            x2 = max(0, min(x2, w_orig))
            y2 = max(0, min(y2, h_orig))

            detections.append({
                "label": self.names[int(max_cls)],
                "confidence": round(float(conf), 2),
                "bbox": {"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2)},
            })

        # NMS 적용
        if detections:
            boxes = np.array([[d["bbox"]["x1"], d["bbox"]["y1"], d["bbox"]["x2"], d["bbox"]["y2"]] for d in detections])
            scores = np.array([d["confidence"] for d in detections])
            keep = self._nms(boxes, scores)
            detections = [detections[i] for i in keep]

        return detections


class MedicationDetector:
    """
    복약 감지 파이프라인

    MVP 모드: 사진 1장 → 약 관련 객체 감지
    영상 모드(추후): 연속 프레임 기반 복약 동작 분석
    """

    COCO_MEDICATION_LABELS = {"bottle", "cup"}
    CUSTOM_MEDICATION_LABELS = {"pill", "pill_bottle", "medicine", "tablet", "drug"}
    CONSECUTIVE_THRESHOLD = 3
    CONFIDENCE_THRESHOLD = 0.4

    def __init__(self):
        self.is_custom_model = False
        self.model_type = "coco_base"
        self.onnx_detector = None
        self.yolo_model = None

        if os.path.exists(MODEL_PATH):
            from ultralytics import YOLO
            self.yolo_model = YOLO(MODEL_PATH)
            self.is_custom_model = True
            self.model_type = "custom_pt"
            self.medication_labels = self.CUSTOM_MEDICATION_LABELS | self.COCO_MEDICATION_LABELS
            print(f"[MedicationDetector] 파인튜닝 모델 로드: {MODEL_PATH}")
        elif os.path.exists(ONNX_MODEL_PATH):
            self.onnx_detector = OnnxPillsDetector(ONNX_MODEL_PATH)
            self.is_custom_model = True
            self.model_type = "pretrained_onnx"
            self.medication_labels = set(self.onnx_detector.names.values())
            print(f"[MedicationDetector] 사전학습 ONNX 모델 로드 완료")
            print(f"[MedicationDetector] 감지 가능 라벨: {self.medication_labels}")
        else:
            from ultralytics import YOLO
            self.yolo_model = YOLO(FALLBACK_MODEL_PATH)
            self.medication_labels = self.COCO_MEDICATION_LABELS
            print(f"[MedicationDetector] 기본 COCO 모델 사용: {FALLBACK_MODEL_PATH}")

        # 연속 프레임 카운터 (영상 모드용)
        self.medication_counters = defaultdict(int)
        self.hand_mouth_counters = defaultdict(int)

    def _decode_image(self, image_base64: str) -> np.ndarray:
        """base64 → OpenCV 이미지"""
        img_data = base64.b64decode(image_base64)
        np_arr = np.frombuffer(img_data, np.uint8)
        return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    def _encode_image(self, image: np.ndarray) -> str:
        """OpenCV 이미지 → base64 JPEG"""
        _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 90])
        return base64.b64encode(buffer).decode('utf-8')

    def _detect_objects(self, image: np.ndarray) -> tuple:
        """객체 감지 (ONNX 또는 YOLO 모델 사용)"""
        if self.onnx_detector:
            # ONNX 모델: 모든 감지 결과가 약 관련
            all_detections = self.onnx_detector.predict(image, self.CONFIDENCE_THRESHOLD)
            medication_detections = all_detections[:]  # ONNX 모델은 capsules/tablets만 감지
            return medication_detections, all_detections

        # YOLO 모델 (.pt)
        results = self.yolo_model(image, verbose=False)
        medication_detections = []
        all_detections = []

        for result in results:
            for box in result.boxes:
                label = self.yolo_model.names[int(box.cls)]
                conf = float(box.conf)
                bbox = {
                    "x1": int(box.xyxy[0][0]),
                    "y1": int(box.xyxy[0][1]),
                    "x2": int(box.xyxy[0][2]),
                    "y2": int(box.xyxy[0][3]),
                }
                detection = {
                    "label": label,
                    "confidence": round(conf, 2),
                    "bbox": bbox,
                }
                all_detections.append(detection)
                if conf >= self.CONFIDENCE_THRESHOLD and label in self.medication_labels:
                    medication_detections.append(detection)

        return medication_detections, all_detections

    def _draw_detections(self, image: np.ndarray, med_detections: list, all_detections: list) -> np.ndarray:
        """감지 결과를 이미지에 바운딩박스로 그리기"""
        annotated = image.copy()
        med_bboxes = {(d["bbox"]["x1"], d["bbox"]["y1"]) for d in med_detections}

        for det in all_detections:
            bbox = det["bbox"]
            label = det["label"]
            conf = det["confidence"]
            is_med = (bbox["x1"], bbox["y1"]) in med_bboxes

            if is_med:
                color = (0, 255, 0)
                thickness = 3
                text = f"[MEDICATION] {label} {conf:.0%}"
            else:
                color = (150, 150, 150)
                thickness = 1
                text = f"{label} {conf:.0%}"

            cv2.rectangle(annotated, (bbox["x1"], bbox["y1"]), (bbox["x2"], bbox["y2"]), color, thickness)
            (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
            cv2.rectangle(annotated, (bbox["x1"], bbox["y1"] - th - 10), (bbox["x1"] + tw, bbox["y1"]), color, -1)
            cv2.putText(annotated, text, (bbox["x1"], bbox["y1"] - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

        return annotated

    # ===== MVP: 사진 1장 감지 =====
    def detect_from_image(self, image: np.ndarray) -> dict:
        """[MVP] 사진 1장에서 약 관련 객체 감지"""
        med_detections, all_detections = self._detect_objects(image)
        annotated = self._draw_detections(image, med_detections, all_detections)
        detected = len(med_detections) > 0

        if detected:
            labels = [d["label"] for d in med_detections]
            message = f"약 관련 객체 {len(med_detections)}개 감지: {', '.join(labels)}"
        else:
            message = "약 관련 객체가 감지되지 않았습니다"
            if not self.is_custom_model:
                message += " (기본 모델 사용 중 - bottle/cup만 감지 가능)"

        return {
            "detected": detected,
            "medication_objects": med_detections,
            "all_objects": all_detections,
            "annotated_image": self._encode_image(annotated),
            "model_type": self.model_type,
            "message": message,
        }

    def detect_from_base64(self, image_base64: str) -> dict:
        """[MVP] base64 이미지에서 약 감지"""
        image = self._decode_image(image_base64)
        return self.detect_from_image(image)

    def detect_from_file(self, file_bytes: bytes) -> dict:
        """[MVP] 파일 바이트에서 약 감지"""
        np_arr = np.frombuffer(file_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if image is None:
            return {
                "detected": False,
                "medication_objects": [],
                "all_objects": [],
                "annotated_image": None,
                "model_type": self.model_type,
                "message": "이미지를 읽을 수 없습니다. 지원 형식: JPG, PNG",
            }
        return self.detect_from_image(image)

    # ===== 영상 모드: 연속 프레임 분석 (추후 확장) =====
    def detect_stream(self, image_base64: str, camera_id: str = "default") -> dict:
        """[영상 모드] 연속 프레임 기반 복약 감지"""
        image = self._decode_image(image_base64)
        med_detections, all_detections = self._detect_objects(image)
        has_medication = len(med_detections) > 0

        if has_medication:
            self.medication_counters[camera_id] += 1
        else:
            self.medication_counters[camera_id] = 0

        med_count = self.medication_counters[camera_id]

        if med_count >= self.CONSECUTIVE_THRESHOLD:
            status = "suspected"
            confidence = 0.5
        else:
            status = "pending"
            confidence = 0.0

        return {
            "detected": False,
            "confidence": round(confidence, 2),
            "type": "MEDICATION",
            "status": status,
            "medication_objects": med_detections,
            "frame_count": med_count,
        }

    def reset(self, camera_id: str = "default"):
        """카메라별 상태 초기화"""
        self.medication_counters[camera_id] = 0
        self.hand_mouth_counters[camera_id] = 0


medication_detector = MedicationDetector()
