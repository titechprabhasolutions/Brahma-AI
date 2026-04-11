import math
import subprocess
import threading
import time
from pathlib import Path

import cv2

try:
    import mediapipe as mp
    from mediapipe.tasks.python import vision
    _MEDIAPIPE_OK = True
except Exception:
    mp = None
    vision = None
    _MEDIAPIPE_OK = False

try:
    import pyautogui
    pyautogui.FAILSAFE = False
    pyautogui.PAUSE = 0
    _PYAUTOGUI_OK = True
except Exception:
    pyautogui = None
    _PYAUTOGUI_OK = False


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "gesture_recognizer.task"


class GestureController:
    def __init__(self, player=None):
        self.player = player
        self.running = False
        self.thread = None
        self.cap = None
        self.last_left_click = 0.0
        self.last_right_click = 0.0
        self.screen_w = 0
        self.screen_h = 0
        self.cursor_x = 0
        self.cursor_y = 0
        self.smooth_x = 0.0
        self.smooth_y = 0.0
        self.latest_points = []
        self._last_preview_push = 0.0
        self._last_close_action = 0.0
        self._last_scroll_time = 0.0
        self._last_swipe_time = 0.0
        self._last_swipe_x = None
        self._last_swipe_ts = 0.0
        self._last_fist_click = 0.0
        self._fist_was_closed = False
        self._last_palm_y = None
        self._cross_hold_frames = 0

    def start(self):
        if self.running:
            return "Gesture control already enabled."
        if not _MEDIAPIPE_OK:
            return "Gesture control requires mediapipe. Install it first."
        if not _PYAUTOGUI_OK:
            return "Gesture control requires pyautogui. Install it first."

        self.screen_w, self.screen_h = pyautogui.size()
        self.cursor_x = self.screen_w // 2
        self.cursor_y = self.screen_h // 2
        self.smooth_x = float(self.cursor_x)
        self.smooth_y = float(self.cursor_y)
        self.running = True
        self.latest_points = []
        self._cross_hold_frames = 0
        self.thread = threading.Thread(target=self._run, daemon=True, name="GestureControlThread")
        self.thread.start()
        if self.player:
            try:
                self.player.show_gesture_cursor(self.cursor_x, self.cursor_y)
            except Exception:
                pass
        return "Gesture control enabled."

    def stop(self):
        self.running = False
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        if self.player:
            try:
                self.player.hide_gesture_cursor()
                self.player.update_gesture_hand([])
            except Exception:
                pass
        return "Gesture control disabled."

    @staticmethod
    def _distance(a, b):
        return math.hypot(a.x - b.x, a.y - b.y)

    def _move_cursor(self, palm_center_x, palm_center_y):
        margin = 0.03
        nx = min(1.0, max(0.0, (palm_center_x - margin) / (1 - 2 * margin)))
        ny = min(1.0, max(0.0, (palm_center_y - margin) / (1 - 2 * margin)))
        target_x = int((1.0 - nx) * self.screen_w)
        target_y = int(ny * self.screen_h)
        self.smooth_x += (target_x - self.smooth_x) * 0.72
        self.smooth_y += (target_y - self.smooth_y) * 0.72
        self.cursor_x = int(self.smooth_x)
        self.cursor_y = int(self.smooth_y)
        if abs(self.cursor_x - target_x) > 1 or abs(self.cursor_y - target_y) > 1:
            pyautogui.moveTo(self.cursor_x, self.cursor_y)
        if self.player:
            try:
                self.player.move_gesture_cursor(self.cursor_x, self.cursor_y)
            except Exception:
                pass

    @staticmethod
    def _is_closed_fist(lm):
        wrist = lm[0]
        tips = [lm[8], lm[12], lm[16], lm[20]]
        mean_dist = sum(math.hypot(t.x - wrist.x, t.y - wrist.y) for t in tips) / 4.0
        return mean_dist < 0.19

    @staticmethod
    def _is_open_hand(lm):
        wrist = lm[0]
        tips = [lm[8], lm[12], lm[16], lm[20]]
        mean_dist = sum(math.hypot(t.x - wrist.x, t.y - wrist.y) for t in tips) / 4.0
        return mean_dist > 0.27

    @staticmethod
    def _segment_intersection(a1, a2, b1, b2):
        def _ccw(p1, p2, p3):
            return (p3[1] - p1[1]) * (p2[0] - p1[0]) > (p2[1] - p1[1]) * (p3[0] - p1[0])
        return _ccw(a1, b1, b2) != _ccw(a2, b1, b2) and _ccw(a1, a2, b1) != _ccw(a1, a2, b2)

    def _maybe_close_active_window_with_cross(self, hand_landmarks):
        if len(hand_landmarks) < 2:
            self._cross_hold_frames = 0
            return
        now = time.time()
        if now - self._last_close_action < 1.4:
            return
        h1 = hand_landmarks[0]
        h2 = hand_landmarks[1]
        # Detect "X with both hands" by crossed index positions vs wrist positions.
        wrists_crossed_order = (h1[0].x - h2[0].x) * (h1[8].x - h2[8].x) < 0
        index_dist = math.hypot(h1[8].x - h2[8].x, h1[8].y - h2[8].y)
        wrists_dist = math.hypot(h1[0].x - h2[0].x, h1[0].y - h2[0].y)
        vertical_gap = abs(h1[8].y - h2[8].y)
        crossed = wrists_crossed_order and index_dist < 0.34 and wrists_dist > 0.10 and vertical_gap < 0.30
        if crossed:
            self._cross_hold_frames += 1
        else:
            self._cross_hold_frames = 0
        if self._cross_hold_frames < 3:
            return

        wrists_dist = math.hypot(h1[0].x - h2[0].x, h1[0].y - h2[0].y)
        if wrists_dist > 0.08:
            triggered = False
            if self.player and hasattr(self.player, "gesture_close_app"):
                try:
                    triggered = bool(self.player.gesture_close_app())
                except Exception:
                    triggered = False
            if not triggered:
                pyautogui.hotkey("alt", "f4")
                if not triggered:
                    try:
                        subprocess.Popen(["taskkill", "/F", "/IM", "electron.exe"], shell=False)
                    except Exception:
                        pass
            self._last_close_action = now
            self._cross_hold_frames = 0
            if self.player:
                try:
                    self.player.flash_gesture_cursor("right")
                except Exception:
                    pass

    def _handle_fist_click_and_scroll(self, lm):
        now = time.time()
        closed_fist = self._is_closed_fist(lm)
        palm_y = (lm[0].y + lm[5].y + lm[17].y) / 3.0

        if closed_fist and not self._fist_was_closed and (now - self._last_fist_click) > 0.24:
            pyautogui.click(button="left")
            self._last_fist_click = now
            if self.player:
                try:
                    self.player.flash_gesture_cursor("left")
                except Exception:
                    pass

        if closed_fist and self._last_palm_y is not None and (now - self._last_scroll_time) > 0.03:
            dy = palm_y - self._last_palm_y
            if abs(dy) > 0.006:
                scroll_amount = int(-dy * 5200)
                if scroll_amount != 0:
                    pyautogui.scroll(scroll_amount)
                    self._last_scroll_time = now
        self._last_palm_y = palm_y
        self._fist_was_closed = closed_fist
        return closed_fist

    def _handle_swipe(self, lm):
        if not self._is_open_hand(lm):
            self._last_swipe_x = None
            self._last_swipe_ts = 0.0
            return
        now = time.time()
        palm_x = (lm[0].x + lm[5].x + lm[17].x) / 3.0
        if self._last_swipe_x is None:
            self._last_swipe_x = palm_x
            self._last_swipe_ts = now
            return
        dt = max(0.001, now - self._last_swipe_ts)
        dx = palm_x - self._last_swipe_x
        speed = dx / dt
        if now - self._last_swipe_time > 0.22:
            if speed > 0.36 and dx > 0.055:
                pyautogui.press("left")
                self._last_swipe_time = now
            elif speed < -0.36 and dx < -0.055:
                pyautogui.press("right")
                self._last_swipe_time = now
        self._last_swipe_x = palm_x
        self._last_swipe_ts = now

    def _run(self):
        mp_hands = mp.solutions.hands
        hands = mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            model_complexity=0,
            min_detection_confidence=0.42,
            min_tracking_confidence=0.40,
        )
        self.cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        try:
            while self.running:
                ok, frame = self.cap.read()
                if not ok:
                    time.sleep(0.01)
                    continue
                frame = cv2.flip(frame, 1)
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                proc = cv2.resize(rgb, (256, 144), interpolation=cv2.INTER_LINEAR)
                result = hands.process(proc)
                hand_landmarks = result.multi_hand_landmarks or []

                if not hand_landmarks:
                    if self.player and (time.time() - self._last_preview_push) > 0.11:
                        try:
                            self.player.update_camera_preview_frame(rgb)
                        except Exception:
                            pass
                        self._last_preview_push = time.time()
                    time.sleep(0.01)
                    continue

                lm = hand_landmarks[0]
                h, w = rgb.shape[:2]
                connections = [
                    (0, 1), (1, 2), (2, 3), (3, 4),
                    (0, 5), (5, 6), (6, 7), (7, 8),
                    (5, 9), (9, 10), (10, 11), (11, 12),
                    (9, 13), (13, 14), (14, 15), (15, 16),
                    (13, 17), (17, 18), (18, 19), (19, 20),
                    (0, 17),
                ]
                for hand_idx, hand in enumerate(hand_landmarks[:2]):
                    color = (220, 220, 220) if hand_idx == 0 else (130, 130, 130)
                    for a, b in connections:
                        p1 = (int(hand[a].x * w), int(hand[a].y * h))
                        p2 = (int(hand[b].x * w), int(hand[b].y * h))
                        cv2.line(rgb, p1, p2, color, 1)
                    for idx, point in enumerate(hand):
                        cx, cy = int(point.x * w), int(point.y * h)
                        radius = 4 if idx in (4, 8) else 3
                        cv2.circle(rgb, (cx, cy), radius, color, -1)

                if self.player:
                    try:
                        self.player.update_gesture_hand([(p.x, p.y) for p in lm])
                    except Exception:
                        pass
                    if (time.time() - self._last_preview_push) > 0.11:
                        try:
                            self.player.update_camera_preview_frame(rgb)
                        except Exception:
                            pass
                        self._last_preview_push = time.time()
                palm_x = (lm[0].x + lm[5].x + lm[17].x) / 3.0
                palm_y = (lm[0].y + lm[5].y + lm[17].y) / 3.0

                pinch = self._distance(lm[4], lm[8]) < 0.055
                now = time.time()
                if pinch and (now - self.last_left_click) > 0.35:
                    pyautogui.click(button="left")
                    self.last_left_click = now
                    if self.player:
                        try:
                            self.player.flash_gesture_cursor("left")
                        except Exception:
                            pass

                self._maybe_close_active_window_with_cross(hand_landmarks)
                fist_mode = self._handle_fist_click_and_scroll(lm)
                self._handle_swipe(lm)

                if not fist_mode:
                    self._move_cursor(palm_x, palm_y)

                time.sleep(0.001)
        finally:
            hands.close()
            if self.cap is not None:
                try:
                    self.cap.release()
                except Exception:
                    pass
                self.cap = None
            if self.player:
                try:
                    self.player.hide_gesture_cursor()
                    self.player.update_gesture_hand([])
                except Exception:
                    pass
            self.running = False
