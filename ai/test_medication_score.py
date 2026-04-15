"""
복약 스코어러 통합 테스트

실행:
  .\venv\Scripts\python.exe test_medication_score.py                      # 웹캠 (기본)
  .\venv\Scripts\python.exe test_medication_score.py path\to\video.mp4    # 비디오 파일
  .\venv\Scripts\python.exe test_medication_score.py video.mp4 --headless # GUI 없이 로그만
  .\venv\Scripts\python.exe test_medication_score.py video.mp4 --save out.mp4  # 결과 저장

키 (GUI 모드):
  q  종료
  r  스코어러 리셋 (새 복약 세션 시작)
"""

import sys
import base64
import time
import argparse

import cv2

sys.path.insert(0, ".")
from pipelines.medication_detector import medication_detector
from pipelines.hand_to_mouth_detector import hand_to_mouth_detector
from pipelines.medication_scorer import init_scorer


STATUS_COLOR = {
    "idle":            (180, 180, 180),
    "preparing":       (0, 200, 255),
    "eating_unknown":  (0, 165, 255),
    "taking":          (0, 200, 255),
    "taken":           (0, 255, 0),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", nargs="?", default="0", help="웹캠 index (0,1,...) 또는 비디오 경로")
    ap.add_argument("--headless", action="store_true", help="GUI 없이 로그만 출력")
    ap.add_argument("--save", help="결과 비디오 저장 경로 (mp4)")
    args = ap.parse_args()

    source = int(args.source) if args.source.isdigit() else args.source
    # 윈도우 웹캠은 MSMF에서 프레임 grab이 실패하는 경우가 많아 DSHOW를 강제한다.
    if isinstance(source, int):
        cap = cv2.VideoCapture(source, cv2.CAP_DSHOW)
    else:
        cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"소스를 열 수 없습니다: {source}")
        return

    writer = None
    if args.save:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps_in = cap.get(cv2.CAP_PROP_FPS) or 30
        writer = cv2.VideoWriter(args.save, fourcc, fps_in, (w, h))
        print(f"결과 저장: {args.save} ({w}x{h}@{fps_in:.1f}fps)")

    scorer = init_scorer(medication_detector, hand_to_mouth_detector)
    scorer.reset("test")
    print(f"Scorer ready. box_min={scorer.BOX_MIN_FRAMES} motion_min={scorer.MOTION_MIN_FRAMES} "
          f"window={scorer.WINDOW_SECONDS}s")

    fps = 0.0
    last = time.time()
    frame_idx = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frame_idx += 1

        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        b64 = base64.b64encode(buf.tobytes()).decode()

        r = scorer.update(b64, camera_id="test")

        # bbox 그리기 (약 객체)
        for d in r["medication_objects"]:
            x1, y1, x2, y2 = d["bbox"]["x1"], d["bbox"]["y1"], d["bbox"]["x2"], d["bbox"]["y2"]
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, f"{d['label']} {d['confidence']:.2f}",
                        (x1, max(y1 - 6, 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        # HUD
        color = STATUS_COLOR.get(r["status"], (255, 255, 255))
        hud = [
            f"status: {r['status']}",
            f"score:  {r['score']:.2f}",
            f"box:    {r['window']['box_frames']:>2d} / {r['window']['total_frames']:>2d}  (min {r['window']['box_min']})",
            f"motion: {r['window']['motion_frames']:>2d} / {r['window']['total_frames']:>2d}  (min {r['window']['motion_min']})",
            f"hand_p: {r['signals']['hand_to_mouth_prob']:.3f}  ({r['signals']['hand_status']})",
        ]
        for i, line in enumerate(hud):
            cv2.putText(frame, line, (10, 25 + i * 22),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

        if r["taken"]:
            cv2.putText(frame, "MEDICATION TAKEN",
                        (10, frame.shape[0] - 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

        now = time.time()
        fps = 0.9 * fps + 0.1 / max(now - last, 1e-6)
        last = now
        cv2.putText(frame, f"{fps:4.1f} fps",
                    (frame.shape[1] - 110, frame.shape[0] - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        if writer is not None:
            writer.write(frame)

        if args.headless:
            # 5 프레임마다 한 줄 로그
            if frame_idx % 5 == 0:
                print(f"[{frame_idx:4d}] status={r['status']:16s} score={r['score']:.2f} "
                      f"box={r['window']['box_frames']:>2d}/{r['window']['total_frames']:>2d} "
                      f"motion={r['window']['motion_frames']:>2d}/{r['window']['total_frames']:>2d} "
                      f"hand_p={r['signals']['hand_to_mouth_prob']:.3f}")
        else:
            cv2.imshow("CareVision - medication score", frame)
            k = cv2.waitKey(1) & 0xFF
            if k == ord("q"):
                break
            if k == ord("r"):
                scorer.reset("test")
                print("reset")

    cap.release()
    if writer is not None:
        writer.release()
        print(f"Saved: {args.save}")
    if not args.headless:
        cv2.destroyAllWindows()
    print(f"Processed {frame_idx} frames")


if __name__ == "__main__":
    main()
