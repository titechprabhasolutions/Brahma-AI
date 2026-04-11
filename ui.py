import json
import math
import os
import random
import threading
import time
import tkinter as tk
import tkinter.ttk as ttk
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageTk
import sys

from actions.gesture_control import GestureController


def get_base_dir():
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent


BASE_DIR = get_base_dir()
CONFIG_DIR = BASE_DIR / "config"
API_FILE = CONFIG_DIR / "api_keys.json"

SYSTEM_NAME = "Brahma AI"
MODEL_BADGE = "Brahma AI"

C_BG = "#050815"
C_BG_ALT = "#091120"
C_PANEL = "#0b1324"
C_PANEL_ALT = "#10203a"
C_GRID = "#112445"
C_PRI = "#67efff"
C_PRI_SOFT = "#1aa8c8"
C_ACC = "#ff9a3d"
C_ACC_SOFT = "#ffd3a1"
C_TEXT = "#e8fbff"
C_TEXT_DIM = "#84a8c0"
C_GOOD = "#68ffb4"
C_BAD = "#ff6c8b"

FONT_TITLE = ("Bahnschrift SemiBold", 28)
FONT_UI = ("Bahnschrift SemiBold", 10)
FONT_LABEL = ("Bahnschrift SemiBold", 11)
FONT_BODY = ("Bahnschrift", 10)
FONT_MONO = ("Cascadia Mono", 11)


class JarvisUI:
    def show_boot_sequence(self):
        boot_msgs = [
            "Spinning up cognition mesh",
            "Routing voice and automation links",
            "Syncing live tools",
            "Priming memory channels",
            "Booting Brahma console",
            "Brahma AI online",
        ]
        self.bg.delete("all")
        self.bg.create_rectangle(0, 0, self.W, self.H, fill=C_BG, outline="")
        for idx in range(18):
            color = self._mix_hex(C_BG, C_PANEL_ALT, idx / 17)
            self.bg.create_rectangle(0, idx * 42, self.W, (idx + 1) * 42, fill=color, outline="")
        self.bg.create_text(self.W // 2, 86, text="BRAHMA AI", fill=C_TEXT, font=("Bahnschrift SemiBold", 34))
        self.bg.create_text(self.W // 2, 122, text="Brahma AI startup sequence", fill=C_TEXT_DIM, font=("Bahnschrift", 12))
        core_r = 70
        center_y = self.H // 2 - 26
        ring = self.bg.create_oval(self.W // 2 - core_r, center_y - core_r, self.W // 2 + core_r, center_y + core_r, outline=C_PRI, width=3)
        pulse = self.bg.create_oval(self.W // 2 - 28, center_y - 28, self.W // 2 + 28, center_y + 28, fill=C_PRI_SOFT, outline="")
        self.bg.create_rectangle(self.W // 2 - 160, self.H - 122, self.W // 2 + 160, self.H - 112, fill=C_PANEL_ALT, outline="")
        progress_fg = self.bg.create_rectangle(self.W // 2 - 160, self.H - 122, self.W // 2 - 160, self.H - 112, fill=C_ACC, outline="")
        log_y = self.H - 252
        for i, msg in enumerate(boot_msgs):
            self.bg.itemconfigure(ring, width=3 + (i % 3))
            self.bg.itemconfigure(pulse, fill=self._mix_hex(C_PRI_SOFT, C_ACC, i / max(1, len(boot_msgs) - 1)))
            self.bg.create_text(self.W // 2, log_y + i * 26, text=msg, fill=C_GOOD if i == len(boot_msgs) - 1 else C_TEXT, font=("Cascadia Mono", 11))
            right = self.W // 2 - 160 + int(((i + 1) / len(boot_msgs)) * 320)
            self.bg.coords(progress_fg, self.W // 2 - 160, self.H - 122, right, self.H - 112)
            self.root.update()
            time.sleep(0.22)
        self.root.update()
        time.sleep(0.16)
        self.bg.delete("all")

    def __init__(self, face_path, size=None):
        self.ai_state = "idle"
        self.state_colors = {
            "idle": (103, 239, 255),
            "listening": (89, 224, 255),
            "thinking": (255, 154, 61),
            "speaking": (104, 255, 180),
            "executing": (255, 208, 115),
            "processing": (255, 154, 61),
            "error": (255, 108, 139),
        }
        self.system_stats = {"cpu": 12, "mem": 35, "disk": 68}
        self.send_callback = None
        self.code_assistant_mode = False
        self.chat_visible = True
        self.camera_enabled = False
        self.camera_preview_running = False
        self.gesture_enabled = False
        self.gesture_hand_points = []
        self.screen_analysis_active = False
        self.analysis_overlay = None
        self.analysis_overlay_canvas = None
        self.gesture_overlay = None
        self.gesture_overlay_canvas = None
        self.gesture_cursor_id = None
        self.minibar = None
        self.minibar_visible = False
        self._restoring_from_minibar = False
        self.root = tk.Tk()
        self.root.title("Brahma AI")
        self.root.resizable(False, False)
        self.root.configure(bg=C_BG)
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        self.W = min(sw, 1080)
        self.H = min(sh, 860)
        self.root.geometry(f"{self.W}x{self.H}+{(sw-self.W)//2}+{(sh-self.H)//2}")
        self.FACE_SZ = min(int(self.H * 0.42), 360)
        self.FCX = self.W // 2
        self.FCY = 290
        self.bg = tk.Canvas(self.root, width=self.W, height=self.H, bg=C_BG, highlightthickness=0)
        self.bg.place(x=0, y=0)
        self.show_boot_sequence()
        self.speaking = False
        self.scale = 1.0
        self.target_scale = 1.0
        self.halo_a = 60.0
        self.target_halo = 60.0
        self.last_t = time.time()
        self.tick = 0
        self.status_text = "ONLINE"
        self.status_blink = True
        self.typing_queue = deque()
        self.is_typing = False
        self._face_pil = None
        self._face_tk = None
        self._has_face = False
        self._face_scale_cache = None
        self._load_face(face_path)
        self.gesture_controller = GestureController(player=self)
        self._configure_styles()
        self._build_console_card()
        self._build_status_badges()
        self._api_key_ready = self._api_keys_exist()
        if not self._api_key_ready:
            self._show_setup_ui()
        self._notifications_enabled = True
        self._start_notification_checks()
        self._add_code_assistant_icon()
        self._add_camera_toggle_icon()
        self._add_gesture_toggle_icon()
        self._setup_minibar()
        self._setup_analysis_overlay()
        self._setup_gesture_overlay()
        self._draw()
        self._animate()
        self.root.protocol("WM_DELETE_WINDOW", self._close_app)
        self.root.bind("<Unmap>", self._handle_root_unmap)
        self.root.bind("<Map>", self._handle_root_map)

    def _close_app(self):
        try:
            self.gesture_controller.stop()
        except Exception:
            pass
        os._exit(0)

    def _configure_styles(self):
        try:
            style = ttk.Style(self.root)
            style.theme_use("clam")
            style.configure("Aurora.TEntry", fieldbackground=C_PANEL_ALT, foreground=C_TEXT, bordercolor=C_PRI_SOFT, lightcolor=C_PRI_SOFT, darkcolor=C_PRI_SOFT, insertcolor=C_TEXT, padding=8)
            style.configure("Aurora.TButton", background=C_ACC, foreground=C_BG, borderwidth=0, focusthickness=0, focuscolor=C_ACC, font=FONT_UI, padding=6)
            style.map("Aurora.TButton", background=[("active", "#ffb868")])
        except Exception:
            pass

    def _build_console_card(self):
        card_w = 620
        card_h = 186
        card_x = (self.W - card_w) // 2
        card_y = self.H - card_h - 26
        self.card_frame = tk.Frame(self.root, bg=C_PANEL, highlightbackground=C_PRI_SOFT, highlightthickness=1)
        self.card_frame.place(x=card_x, y=card_y, width=card_w, height=card_h)
        header = tk.Frame(self.card_frame, bg=C_PANEL_ALT)
        header.place(x=0, y=0, width=card_w, height=36)
        tk.Label(header, text="Command Stream", fg=C_TEXT, bg=C_PANEL_ALT, font=FONT_LABEL).place(x=14, y=8)
        tk.Label(header, text="Voice and typed control", fg=C_TEXT_DIM, bg=C_PANEL_ALT, font=FONT_BODY).place(x=154, y=9)
        self.log_frame = tk.Frame(self.card_frame, bg=C_PANEL_ALT, highlightbackground=C_GRID, highlightthickness=1)
        self.log_frame.place(x=12, y=44, width=card_w - 24, height=86)
        self.log_text = tk.Text(self.log_frame, fg=C_TEXT, bg=C_PANEL_ALT, insertbackground=C_TEXT, borderwidth=0, wrap="word", font=FONT_MONO, padx=12, pady=10)
        self.log_scroll = tk.Scrollbar(self.log_frame, command=self.log_text.yview, troughcolor=C_PANEL, bg=C_PANEL_ALT, activebackground=C_PRI_SOFT)
        self.log_text.configure(yscrollcommand=self.log_scroll.set)
        self.log_scroll.pack(side="right", fill="y")
        self.log_text.pack(fill="both", expand=True)
        self.log_text.configure(state="disabled")
        self.log_text.tag_config("you", foreground="#ffffff")
        self.log_text.tag_config("ai", foreground=C_PRI)
        self.log_text.tag_config("sys", foreground=C_ACC_SOFT)
        self.log_text.tag_config("error", foreground=C_BAD)
        self.input_frame = tk.Frame(self.card_frame, bg=C_PANEL_ALT, highlightbackground=C_PRI_SOFT, highlightthickness=1)
        self.input_frame.place(x=12, y=140, width=card_w - 24, height=34)
        try:
            self.input_entry = ttk.Entry(self.input_frame, style="Aurora.TEntry", font=FONT_UI)
        except Exception:
            self.input_entry = tk.Entry(self.input_frame, fg=C_TEXT, bg=C_PANEL_ALT, insertbackground=C_TEXT, borderwidth=0, font=FONT_UI)
        self.input_entry.place(x=10, y=3, width=card_w - 170, height=26)
        self.input_entry.bind("<Return>", lambda e: self._on_send_click())
        self._placeholder = "Speak or type command"
        self.input_entry.insert(0, self._placeholder)
        self.input_entry.bind("<FocusIn>", self._clear_placeholder)
        try:
            self.send_button = ttk.Button(self.input_frame, text="Transmit", style="Aurora.TButton", command=self._on_send_click)
        except Exception:
            self.send_button = tk.Button(self.input_frame, text="Transmit", command=self._on_send_click, bg=C_ACC, fg=C_BG, activebackground="#ffb868", borderwidth=0, font=FONT_UI)
        self.send_button.place(x=card_w - 158, y=3, width=110, height=26)

    def _build_status_badges(self):
        self.chat_chip = tk.Label(self.root, text="CHAT  ON", fg=C_TEXT, bg=C_PANEL_ALT, font=("Bahnschrift SemiBold", 9), padx=12, pady=6, cursor="hand2")
        self.chat_chip.place(x=32, y=76)
        self.chat_chip.bind("<Button-1>", lambda e: self.toggle_chat())

    def toggle_chat(self):
        self.chat_visible = not self.chat_visible
        if self.chat_visible:
            self.card_frame.place(x=(self.W - 620) // 2, y=self.H - 186 - 26, width=620, height=186)
        else:
            self.card_frame.place_forget()
        self._update_chat_chip()

    def _update_chat_chip(self):
        if hasattr(self, "chat_chip"):
            self.chat_chip.configure(
                text=f"CHAT  {'ON' if self.chat_visible else 'OFF'}",
                fg=C_GOOD if self.chat_visible else C_TEXT_DIM
            )

    def _setup_analysis_overlay(self):
        self.analysis_overlay = tk.Toplevel(self.root)
        self.analysis_overlay.withdraw()
        self.analysis_overlay.overrideredirect(True)
        self.analysis_overlay.attributes("-topmost", True)
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        self.analysis_overlay.geometry(f"{screen_w}x{screen_h}+0+0")
        self.analysis_overlay.configure(bg="#02040a")
        try:
            self.analysis_overlay.attributes("-alpha", 0.22)
        except Exception:
            pass
        self.analysis_overlay_canvas = tk.Canvas(
            self.analysis_overlay,
            width=screen_w,
            height=screen_h,
            bg="#02040a",
            highlightthickness=0,
        )
        self.analysis_overlay_canvas.pack(fill="both", expand=True)

    def _setup_gesture_overlay(self):
        self.gesture_overlay = tk.Toplevel(self.root)
        self.gesture_overlay.withdraw()
        self.gesture_overlay.overrideredirect(True)
        self.gesture_overlay.attributes("-topmost", True)
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        self.gesture_overlay.geometry(f"{screen_w}x{screen_h}+0+0")
        self.gesture_overlay.configure(bg="#010203")
        try:
            self.gesture_overlay.attributes("-transparentcolor", "#010203")
        except Exception:
            try:
                self.gesture_overlay.attributes("-alpha", 0.01)
            except Exception:
                pass
        self.gesture_overlay_canvas = tk.Canvas(
            self.gesture_overlay,
            width=screen_w,
            height=screen_h,
            bg="#010203",
            highlightthickness=0,
        )
        self.gesture_overlay_canvas.pack(fill="both", expand=True)

    def show_gesture_cursor(self, x, y):
        if threading.current_thread() is not threading.main_thread():
            self.root.after(0, self.show_gesture_cursor, x, y)
            return
        if not self.gesture_overlay or not self.gesture_overlay_canvas:
            return
        self.gesture_overlay.deiconify()
        self.gesture_overlay.lift()
        self.move_gesture_cursor(x, y)

    def move_gesture_cursor(self, x, y):
        if threading.current_thread() is not threading.main_thread():
            self.root.after(0, self.move_gesture_cursor, x, y)
            return
        if not self.gesture_overlay_canvas:
            return
        canvas = self.gesture_overlay_canvas
        canvas.delete("all")
        outer_r = 22
        mid_r = 12
        inner_r = 4
        canvas.create_oval(x - 34, y - 34, x + 34, y + 34, outline="#1fcfff", width=2)
        canvas.create_oval(x - outer_r, y - outer_r, x + outer_r, y + outer_r, outline="#7df9ff", width=3)
        canvas.create_oval(x - mid_r, y - mid_r, x + mid_r, y + mid_r, outline="#a8ffff", width=2)
        canvas.create_oval(x - inner_r, y - inner_r, x + inner_r, y + inner_r, fill="#00d9ff", outline="")
        canvas.create_line(x - 30, y, x - 10, y, fill="#7df9ff", width=2)
        canvas.create_line(x + 10, y, x + 30, y, fill="#7df9ff", width=2)
        canvas.create_line(x, y - 30, x, y - 10, fill="#7df9ff", width=2)
        canvas.create_line(x, y + 10, x, y + 30, fill="#7df9ff", width=2)
        canvas.create_text(x, y + 46, text="HAND CURSOR", fill="#7df9ff", font=("Cascadia Mono", 8))

    def flash_gesture_cursor(self, click_type):
        if threading.current_thread() is not threading.main_thread():
            self.root.after(0, self.flash_gesture_cursor, click_type)
            return
        if not self.gesture_overlay_canvas:
            return
        x = self.gesture_overlay.winfo_pointerx()
        y = self.gesture_overlay.winfo_pointery()
        color = "#7df9ff" if click_type == "left" else "#ff9a3d"
        self.move_gesture_cursor(x, y)
        self.gesture_overlay_canvas.create_oval(x - 42, y - 42, x + 42, y + 42, outline=color, width=5)
        self.gesture_overlay_canvas.create_text(x, y - 46, text="LEFT CLICK" if click_type == "left" else "RIGHT CLICK", fill=color, font=("Cascadia Mono", 8))

    def hide_gesture_cursor(self):
        if threading.current_thread() is not threading.main_thread():
            self.root.after(0, self.hide_gesture_cursor)
            return
        if self.gesture_overlay_canvas:
            self.gesture_overlay_canvas.delete("all")
        if self.gesture_overlay:
            self.gesture_overlay.withdraw()

    def update_gesture_hand(self, points):
        if threading.current_thread() is not threading.main_thread():
            self.root.after(0, self.update_gesture_hand, points)
            return
        self.gesture_hand_points = points or []

    def _setup_minibar(self):
        self.minibar = tk.Toplevel(self.root)
        self.minibar.withdraw()
        self.minibar.overrideredirect(True)
        self.minibar.attributes("-topmost", True)
        self.minibar.configure(bg=C_BG)

        bar_w = 320
        bar_h = 86
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        x = screen_w - bar_w - 18
        y = screen_h - bar_h - 56
        self.minibar.geometry(f"{bar_w}x{bar_h}+{x}+{y}")

        frame = tk.Frame(self.minibar, bg=C_PANEL, highlightbackground=C_PRI_SOFT, highlightthickness=1)
        frame.place(x=0, y=0, width=bar_w, height=bar_h)

        reactor = tk.Canvas(frame, width=54, height=54, bg=C_PANEL, highlightthickness=0)
        reactor.place(x=12, y=16)
        reactor.create_oval(4, 4, 50, 50, outline=C_PRI, width=2)
        reactor.create_oval(12, 12, 42, 42, outline=C_PRI_SOFT, width=2)
        reactor.create_oval(20, 20, 34, 34, fill=C_PRI, outline="")
        reactor.bind("<Button-1>", lambda e: self._restore_from_minibar())
        self.minibar_reactor = reactor

        self.minibar_title = tk.Label(frame, text="Brahma AI", fg=C_TEXT, bg=C_PANEL, font=("Bahnschrift SemiBold", 11))
        self.minibar_title.place(x=76, y=16)
        self.minibar_status = tk.Label(frame, text="Listening in background", fg=C_TEXT_DIM, bg=C_PANEL, font=("Bahnschrift", 9))
        self.minibar_status.place(x=76, y=38)

        self.minibar_entry = tk.Entry(frame, fg=C_TEXT, bg=C_PANEL_ALT, insertbackground=C_TEXT, borderwidth=0, font=("Bahnschrift", 9))
        self.minibar_entry.place(x=76, y=56, width=170, height=22)
        self.minibar_entry.bind("<Return>", lambda e: self._submit_from_minibar())

        restore_btn = tk.Button(frame, text="Open", command=self._restore_from_minibar, bg=C_ACC, fg=C_BG, activebackground="#ffb868", borderwidth=0, font=("Bahnschrift SemiBold", 9))
        restore_btn.place(x=254, y=14, width=54, height=24)

        send_btn = tk.Button(frame, text="Send", command=self._submit_from_minibar, bg=C_PANEL_ALT, fg=C_TEXT, activebackground=C_GRID, borderwidth=0, font=("Bahnschrift SemiBold", 9))
        send_btn.place(x=254, y=54, width=54, height=24)

        frame.bind("<Button-1>", lambda e: self._restore_from_minibar())
        self.minibar.bind("<Double-Button-1>", lambda e: self._restore_from_minibar())

    def _show_minibar(self):
        if not self.minibar:
            return
        self.minibar_visible = True
        self._update_minibar()
        self.minibar.deiconify()
        self.minibar.lift()

    def _hide_minibar(self):
        if self.minibar:
            self.minibar.withdraw()
        self.minibar_visible = False

    def _restore_from_minibar(self):
        self._restoring_from_minibar = True
        self._hide_minibar()
        self.root.deiconify()
        self.root.state("normal")
        self.root.lift()
        self.root.focus_force()
        self.root.after(150, self._clear_restore_flag)

    def _clear_restore_flag(self):
        self._restoring_from_minibar = False

    def _handle_root_unmap(self, event=None):
        if self._restoring_from_minibar:
            return
        try:
            if self.root.state() == "iconic":
                self.root.withdraw()
                self._show_minibar()
        except Exception:
            pass

    def _handle_root_map(self, event=None):
        if self.root.state() == "normal":
            self._hide_minibar()

    def _submit_from_minibar(self):
        txt = self.minibar_entry.get().strip()
        if not txt:
            return
        self.minibar_entry.delete(0, tk.END)
        self.write_log(f"You: {txt}")
        if self.code_assistant_mode:
            self._handle_code_assistant(txt)
            return
        if self.send_callback:
            try:
                self.send_callback(txt)
            except Exception:
                self.write_log("SYS: Failed to send typed message to agent")

    def _update_minibar(self):
        if not self.minibar:
            return
        status = "Listening in background"
        if self.screen_analysis_active:
            status = "Analyzing screen"
        if self.status_text and self.status_text.upper() != "ONLINE":
            status = self.status_text.title()
        if self.camera_enabled:
            status += " | Camera on"
        self.minibar_status.configure(text=status)

    def start_screen_analysis(self):
        self.screen_analysis_active = True
        self.status_text = "ANALYZING"
        self.ai_state = "thinking"
        self._show_analysis_overlay()
        self._update_minibar()

    def stop_screen_analysis(self):
        self.screen_analysis_active = False
        self._hide_analysis_overlay()
        if not self.speaking and self.ai_state != "error":
            self.status_text = "ONLINE"
            self.ai_state = "idle"
        self._update_minibar()

    def _clear_placeholder(self, event=None):
        if self.input_entry.get() == self._placeholder:
            self.input_entry.delete(0, tk.END)

    def _refresh_metrics(self):
        if self.tick % 36 == 0:
            self.system_stats["cpu"] = min(95, max(8, self.system_stats["cpu"] + random.randint(-4, 5)))
            self.system_stats["mem"] = min(92, max(18, self.system_stats["mem"] + random.randint(-3, 3)))
            self.system_stats["disk"] = min(91, max(40, self.system_stats["disk"] + random.randint(-1, 1)))

    def _status_color(self):
        state = self.status_text.lower()
        if state in {"online", "speaking"}:
            return C_GOOD
        if state in {"processing", "responding", "executing"}:
            return C_ACC
        if state == "error":
            return C_BAD
        return C_PRI

    def _set_mode_chip(self):
        return

    def _set_status_chip(self):
        return

    def _draw_panel(self, x1, y1, x2, y2, title, subtitle=None):
        self.bg.create_rectangle(x1, y1, x2, y2, fill=C_PANEL, outline=C_GRID, width=1)
        self.bg.create_rectangle(x1, y1, x2, y1 + 6, fill=C_PRI_SOFT, outline="")
        self.bg.create_text(x1 + 18, y1 + 24, text=title, fill=C_TEXT, font=FONT_LABEL, anchor="w")
        if subtitle:
            self.bg.create_text(x1 + 18, y1 + 46, text=subtitle, fill=C_TEXT_DIM, font=FONT_BODY, anchor="w")

    def _draw_metric_row(self, x, y, label, value, width=146):
        self.bg.create_text(x, y, text=label, fill=C_TEXT_DIM, font=FONT_BODY, anchor="w")
        self.bg.create_text(x + width, y, text=value, fill=C_TEXT, font=FONT_MONO, anchor="e")

    def _draw_waveform(self, center_x, y, core_color):
        bars = 20
        bar_w = 10
        gap = 5
        for i in range(bars):
            phase = self.tick * 0.16 + i * 0.55
            amp = 10 + 18 * abs(math.sin(phase))
            if self.ai_state not in {"listening", "speaking"}:
                amp = 8 + (i % 3)
            x = center_x - (bars * (bar_w + gap)) // 2 + i * (bar_w + gap)
            color = self._ac(*core_color, 215 - (i % 4) * 18)
            self.bg.create_rectangle(x, y - amp, x + bar_w, y + amp, fill=color, outline="")

    def _draw_face(self, center_x, center_y, radius):
        if not self._has_face or not self._face_pil:
            return
        size = int(radius * 1.7 * self.scale)
        size = max(110, min(size, self.FACE_SZ))
        if self._face_scale_cache != size:
            scaled = self._face_pil.resize((size, size), Image.LANCZOS)
            self._face_tk = ImageTk.PhotoImage(scaled)
            self._face_scale_cache = size
        self.bg.create_image(center_x, center_y, image=self._face_tk)

    def _draw_reactor(self):
        core_color = self.state_colors.get(self.ai_state, self.state_colors["idle"])
        center_x = self.FCX
        center_y = self.H // 2 - self.FACE_SZ // 2 + 40
        radius = self.FACE_SZ
        for glow_r, alpha in [(radius // 2 + 100, 30), (radius // 2 + 60, 22), (radius // 2 + 30, 14)]:
            self.bg.create_oval(
                center_x - glow_r,
                center_y - glow_r,
                center_x + glow_r,
                center_y + glow_r,
                outline=self._ac(*core_color, alpha),
                width=2,
            )
        ring_radii = [radius * 0.32, radius * 0.38, radius * 0.44, radius * 0.50]
        ring_speeds = {
            "idle": [0.8, -0.5, 1.2, -0.3],
            "listening": [1.2, -0.8, 1.9, -0.6],
            "thinking": [1.6, -1.2, 2.2, -0.9],
            "speaking": [1.4, -1.0, 2.0, -0.7],
            "executing": [2.0, -1.5, 2.8, -1.2],
        }
        speeds = ring_speeds.get(self.ai_state, ring_speeds["idle"])
        ring_angles = [self.tick * speeds[0], self.tick * speeds[1], self.tick * speeds[2], self.tick * speeds[3]]
        for idx, base_r in enumerate(ring_radii):
            arc_start = ring_angles[idx] % 360
            self.bg.create_arc(
                center_x - base_r,
                center_y - base_r,
                center_x + base_r,
                center_y + base_r,
                start=arc_start,
                extent=270,
                outline=self._ac(*core_color, 80),
                width=3,
                style="arc",
            )
        pulse_r = int(radius * (0.22 + 0.04 * math.sin(self.tick * 0.12)))
        pulse_alpha = int(120 + 80 * abs(math.sin(self.tick * 0.12)))
        if self.ai_state in ["listening", "speaking"]:
            pulse_alpha = 180 + int(60 * abs(math.sin(self.tick * 0.18)))
        self.bg.create_oval(
            center_x - pulse_r,
            center_y - pulse_r,
            center_x + pulse_r,
            center_y + pulse_r,
            fill=self._ac(*core_color, pulse_alpha),
            outline="",
        )
        self.bg.create_oval(
            center_x - radius * 0.18,
            center_y - radius * 0.18,
            center_x + radius * 0.18,
            center_y + radius * 0.18,
            fill=C_BG,
            outline="",
        )
        self.bg.create_text(center_x, center_y, text=SYSTEM_NAME, fill=C_TEXT, font=("Courier", 22, "bold"))
        return center_y, radius

    def _draw(self):
        self._refresh_metrics()
        self._set_status_chip()
        self._set_mode_chip()
        self._update_chat_chip()
        self._update_minibar()
        self.bg.delete("all")
        for idx in range(18):
            color = self._mix_hex(C_BG, C_BG_ALT, idx / 17)
            self.bg.create_rectangle(0, idx * 48, self.W, (idx + 1) * 48, fill=color, outline="")
        for x in range(0, self.W, 72):
            self.bg.create_line(x, 0, x, self.H, fill=C_GRID, width=1)
        for y in range(0, self.H, 72):
            self.bg.create_line(0, y, self.W, y, fill=C_GRID, width=1)
        self.bg.create_rectangle(0, 0, self.W, 64, fill="#04070f", outline="")
        self.bg.create_text(26, 24, text="BRAHMA AI", fill=C_TEXT, font=("Bahnschrift SemiBold", 24), anchor="w")
        self.bg.create_text(self.W - 28, 24, text=time.strftime("%I:%M %p"), fill=C_PRI, font=("Cascadia Mono", 18), anchor="e")
        self.bg.create_text(self.W - 28, 48, text=time.strftime("%A  %d %b %Y"), fill=C_TEXT_DIM, font=("Bahnschrift", 10), anchor="e")
        reactor_y, reactor_radius = self._draw_reactor()
        status_y = reactor_y + reactor_radius // 2 + 60
        self.bg.create_text(self.FCX, status_y - 25, text="SYSTEM STATUS", fill=C_PRI_SOFT, font=("Courier", 14, "bold"))
        self.bg.create_text(self.FCX, status_y, text=f"● {self.status_text.upper()}", fill=self._status_color(), font=("Courier", 16, "bold"))
        wave_y = status_y + 36
        self._draw_waveform(self.FCX, wave_y, self.state_colors.get(self.ai_state, self.state_colors["idle"]))
        info_y = wave_y + 44
        self.bg.create_text(self.FCX - 120, info_y, text=f"CPU {self.system_stats['cpu']}%", fill=C_TEXT_DIM, font=("Cascadia Mono", 10))
        self.bg.create_text(self.FCX, info_y, text=f"MEM {self.system_stats['mem']}%", fill=C_TEXT_DIM, font=("Cascadia Mono", 10))
        self.bg.create_text(self.FCX + 120, info_y, text="CAM ON" if self.camera_enabled else "CAM OFF", fill=C_TEXT_DIM, font=("Cascadia Mono", 10))
    def _show_analysis_overlay(self):
        if not self.analysis_overlay:
            return
        self.analysis_overlay.deiconify()
        self.analysis_overlay.lift()

    def _hide_analysis_overlay(self):
        if self.analysis_overlay:
            self.analysis_overlay.withdraw()

    def _draw_analysis_border(self):
        if not self.analysis_overlay_canvas:
            return
        canvas = self.analysis_overlay_canvas
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        canvas.delete("all")

        base = self._mix_hex(C_PRI, C_ACC, 0.5 + 0.5 * math.sin(self.tick * 0.14))
        outer = self._mix_hex(base, "#ffffff", 0.28)
        inset_1 = 10
        inset_2 = 26
        canvas.create_rectangle(0, 0, screen_w, screen_h, fill="#02040a", outline="")
        canvas.create_rectangle(inset_1, inset_1, screen_w - inset_1, screen_h - inset_1, outline=outer, width=8)
        canvas.create_rectangle(inset_2, inset_2, screen_w - inset_2, screen_h - inset_2, outline=base, width=12)

        perimeter = 2 * ((screen_w - 52) + (screen_h - 52))
        segment = 260
        pos = (self.tick * 18) % perimeter

        def border_point(distance):
            top = screen_w - 52
            right = screen_h - 52
            bottom = screen_w - 52
            if distance < top:
                return 26 + distance, 26
            distance -= top
            if distance < right:
                return screen_w - 26, 26 + distance
            distance -= right
            if distance < bottom:
                return screen_w - 26 - distance, screen_h - 26
            distance -= bottom
            return 26, screen_h - 26 - distance

        x1, y1 = border_point(pos)
        x2, y2 = border_point((pos + segment) % perimeter)
        canvas.create_line(x1, y1, x2, y2, fill=base, width=14)
        canvas.create_line(x1, y1, x2, y2, fill=outer, width=5)
        canvas.create_text(screen_w // 2, 54, text="SCREEN ANALYSIS ACTIVE", fill=outer, font=("Bahnschrift SemiBold", 18))

    def _add_camera_toggle_icon(self):
        icon_size = 48
        x = self.W - icon_size - 24
        y = 122
        self.camera_icon_canvas = tk.Canvas(self.root, width=icon_size, height=icon_size, bg=C_BG, highlightthickness=0)
        self.camera_icon_canvas.place(x=x, y=y)
        self.camera_icon_canvas.create_oval(2, 2, icon_size - 2, icon_size - 2, fill=C_PANEL_ALT, outline=C_ACC, width=2)
        self.camera_icon_canvas.create_rectangle(15, 17, 33, 31, fill=C_ACC, outline="")
        self.camera_icon_canvas.create_oval(21, 20, 27, 26, fill=C_PANEL_ALT, outline="")
        self.camera_icon_canvas.create_rectangle(19, 13, 29, 18, fill=C_ACC, outline="")

        def toggle_camera(event=None):
            if self.gesture_enabled and self.camera_enabled:
                self.write_log("[sys] Camera stays on while gesture control is active.")
                return
            self.camera_enabled = not self.camera_enabled
            self.camera_icon_canvas.itemconfig(1, outline=C_GOOD if self.camera_enabled else C_ACC)
            if self.camera_enabled:
                self.write_log("[sys] Camera enabled. Preview shown bottom left.")
                self._show_camera_preview()
            else:
                self.write_log("[sys] Camera disabled. Agent cannot access camera.")
                self._hide_camera_preview()

        self.camera_icon_canvas.bind("<Button-1>", toggle_camera)

    def _add_gesture_toggle_icon(self):
        icon_size = 48
        x = self.W - icon_size - 24
        y = 178
        self.gesture_icon_canvas = tk.Canvas(self.root, width=icon_size, height=icon_size, bg=C_BG, highlightthickness=0)
        self.gesture_icon_canvas.place(x=x, y=y)
        self.gesture_icon_canvas.create_oval(2, 2, icon_size - 2, icon_size - 2, fill=C_PANEL_ALT, outline="#48cfff", width=2)
        self.gesture_icon_canvas.create_text(icon_size // 2, icon_size // 2, text="✋", fill="#7df9ff", font=("Segoe UI Emoji", 16))

        def toggle_gesture(event=None):
            self.gesture_enabled = not self.gesture_enabled
            self.gesture_icon_canvas.itemconfig(1, outline=C_GOOD if self.gesture_enabled else "#48cfff")
            if self.gesture_enabled:
                self.camera_preview_running = False
                if not self.camera_enabled:
                    self.camera_enabled = True
                    self.camera_icon_canvas.itemconfig(1, outline=C_GOOD)
                    self.write_log("[sys] Camera enabled for gesture control.")
                    self._show_camera_preview()
                result = self.gesture_controller.start()
                if "requires" in result.lower():
                    self.gesture_enabled = False
                    self.gesture_icon_canvas.itemconfig(1, outline="#48cfff")
                self.write_log(f"[sys] {result}")
            else:
                result = self.gesture_controller.stop()
                if self.camera_enabled:
                    self._show_camera_preview()
                self.write_log(f"[sys] {result}")

        self.gesture_icon_canvas.bind("<Button-1>", toggle_gesture)

    def _show_camera_preview(self):
        import cv2

        preview_w, preview_h = 190, 128
        x, y = 28, self.H - preview_h - 38
        if not hasattr(self, "camera_preview_label"):
            self.camera_preview_label = tk.Label(self.root, bg=C_PANEL_ALT, highlightbackground=C_ACC, highlightthickness=1)
        self.camera_preview_label.place(x=x, y=y, width=preview_w, height=preview_h)

        if self.gesture_enabled:
            self.camera_preview_running = False
            return
        if self.camera_preview_running:
            return
        self.camera_preview_running = True

        def camera_loop():
            cap = cv2.VideoCapture(0)
            try:
                while self.camera_enabled and self.camera_preview_running:
                    ok, frame = cap.read()
                    if not ok:
                        time.sleep(0.05)
                        continue
                    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    image = Image.fromarray(frame).resize((preview_w, preview_h), Image.LANCZOS)
                    imgtk = ImageTk.PhotoImage(image=image)

                    def update_label():
                        if self.camera_enabled and self.camera_preview_running:
                            self.camera_preview_label.imgtk = imgtk
                            self.camera_preview_label.configure(image=imgtk)

                    self.root.after(0, update_label)
                    time.sleep(1 / 20)
            finally:
                cap.release()

                def clear_label():
                    if hasattr(self, "camera_preview_label"):
                        self.camera_preview_label.configure(image="")

                self.root.after(0, clear_label)

        threading.Thread(target=camera_loop, daemon=True).start()

    def _hide_camera_preview(self):
        self.camera_preview_running = False
        if hasattr(self, "camera_preview_label"):
            self.camera_preview_label.place_forget()
            self.camera_preview_label.configure(image="")

    def update_camera_preview_frame(self, frame_rgb):
        if threading.current_thread() is not threading.main_thread():
            self.root.after(0, self.update_camera_preview_frame, frame_rgb)
            return
        if not self.camera_enabled:
            return
        self._show_camera_preview()
        preview_w, preview_h = 190, 128
        image = Image.fromarray(frame_rgb).resize((preview_w, preview_h), Image.LANCZOS)
        imgtk = ImageTk.PhotoImage(image=image)
        self.camera_preview_label.imgtk = imgtk
        self.camera_preview_label.configure(image=imgtk)

    def _add_code_assistant_icon(self):
        icon_size = 48
        x = self.W - icon_size - 24
        y = 66
        self.code_icon_canvas = tk.Canvas(self.root, width=icon_size, height=icon_size, bg=C_BG, highlightthickness=0)
        self.code_icon_canvas.place(x=x, y=y)
        self.code_icon_canvas.create_oval(2, 2, icon_size - 2, icon_size - 2, fill=C_PANEL_ALT, outline=C_PRI, width=2)
        self.code_icon_canvas.create_text(icon_size // 2, icon_size // 2, text="</>", fill=C_PRI, font=("Bahnschrift SemiBold", 13))

        def toggle_code_mode(event=None):
            self.code_assistant_mode = not self.code_assistant_mode
            self.code_icon_canvas.itemconfig(1, outline=C_GOOD if self.code_assistant_mode else C_PRI)
            if self.code_assistant_mode:
                self.write_log("[sys] Code Assistant Mode enabled. Type or paste code for explanation or generation.")
            else:
                self.write_log("[sys] Code Assistant Mode disabled.")

        self.code_icon_canvas.bind("<Button-1>", toggle_code_mode)

    def _handle_code_assistant(self, text):
        import ast

        try:
            ast.parse(text)
            self.write_log("[ai] Code explanation: parsing detected Python-like code.")
        except Exception:
            self.write_log("[ai] Code generation: describe the tool or script you want built.")

    def _start_notification_checks(self):
        def notification_loop():
            try:
                import psutil
            except Exception:
                psutil = None
            try:
                from plyer import notification
            except Exception:
                notification = None

            while self._notifications_enabled:
                try:
                    if psutil:
                        battery = psutil.sensors_battery()
                        if battery and battery.percent <= 20 and not battery.power_plugged:
                            if notification:
                                notification.notify(title="Battery Low", message=f"Battery at {battery.percent}%", timeout=5)
                            self.write_log("[sys] Battery low notification sent.")
                except Exception:
                    pass
                time.sleep(60)

        threading.Thread(target=notification_loop, daemon=True).start()

    def _load_face(self, path):
        try:
            img = Image.open(path).convert("RGBA").resize((self.FACE_SZ, self.FACE_SZ), Image.LANCZOS)
            mask = Image.new("L", (self.FACE_SZ, self.FACE_SZ), 0)
            ImageDraw.Draw(mask).ellipse((2, 2, self.FACE_SZ - 2, self.FACE_SZ - 2), fill=255)
            img.putalpha(mask)
            self._face_pil = img
            self._has_face = True
        except Exception:
            self._has_face = False

    @staticmethod
    def _ac(r, g, b, a):
        f = a / 255.0
        return f"#{int(r * f):02x}{int(g * f):02x}{int(b * f):02x}"

    @staticmethod
    def _mix_hex(c1, c2, ratio):
        ratio = max(0.0, min(1.0, ratio))
        c1 = c1.lstrip("#")
        c2 = c2.lstrip("#")
        r1, g1, b1 = int(c1[0:2], 16), int(c1[2:4], 16), int(c1[4:6], 16)
        r2, g2, b2 = int(c2[0:2], 16), int(c2[2:4], 16), int(c2[4:6], 16)
        r = int(r1 + (r2 - r1) * ratio)
        g = int(g1 + (g2 - g1) * ratio)
        b = int(b1 + (b2 - b1) * ratio)
        return f"#{r:02x}{g:02x}{b:02x}"

    def _animate(self):
        self.tick += 1
        now = time.time()
        if now - self.last_t > (0.14 if self.speaking else 0.55):
            if self.speaking:
                self.target_scale = random.uniform(1.04, 1.09)
                self.target_halo = random.uniform(138, 190)
            else:
                self.target_scale = random.uniform(0.998, 1.01)
                self.target_halo = random.uniform(54, 84)
            self.last_t = now
        speed = 0.28 if self.speaking else 0.12
        self.scale += (self.target_scale - self.scale) * speed
        self.halo_a += (self.target_halo - self.halo_a) * speed
        if self.tick % 40 == 0:
            self.status_blink = not self.status_blink
        if self.screen_analysis_active:
            self._draw_analysis_border()
        self._draw()
        self.root.after(16, self._animate)

    def _classify_log(self, text):
        lower = text.lower()
        if lower.startswith("you:"):
            self.ai_state = "listening"
            self.status_text = "PROCESSING"
            return "you"
        if lower.startswith("brahma ai:") or lower.startswith("[ai]"):
            self.ai_state = "speaking" if self.speaking else "thinking"
            self.status_text = "RESPONDING"
            return "ai"
        if lower.startswith("[error]"):
            self.ai_state = "error"
            self.status_text = "ERROR"
            return "error"
        if lower.startswith("[sys]") or lower.startswith("sys:"):
            self.ai_state = "idle"
            if "disabled" in lower:
                self.status_text = "ONLINE"
            return "sys"
        return "sys"

    def write_log(self, text: str):
        tag = self._classify_log(text)
        self.typing_queue.append((text, tag))
        if not self.is_typing:
            self._start_typing()

    def set_send_callback(self, cb):
        self.send_callback = cb

    def _on_send_click(self):
        txt = self.input_entry.get().strip()
        if not txt or txt == self._placeholder:
            return
        self.input_entry.delete(0, tk.END)
        self.write_log(f"You: {txt}")
        if self.code_assistant_mode:
            self._handle_code_assistant(txt)
            return
        if self.send_callback:
            try:
                self.send_callback(txt)
            except Exception:
                self.write_log("SYS: Failed to send typed message to agent")

    def _start_typing(self):
        if not self.typing_queue:
            self.is_typing = False
            if not self.speaking and self.ai_state != "error":
                self.ai_state = "idle"
                self.status_text = "ONLINE"
            return
        self.is_typing = True
        text, tag = self.typing_queue.popleft()
        self.log_text.configure(state="normal")
        self._type_char(text, 0, tag)

    def _type_char(self, text, i, tag):
        if i < len(text):
            self.log_text.insert(tk.END, text[i], tag)
            self.log_text.see(tk.END)
            self.root.after(7, self._type_char, text, i + 1, tag)
        else:
            self.log_text.insert(tk.END, "\n", tag)
            self.log_text.configure(state="disabled")
            self.root.after(22, self._start_typing)

    def start_speaking(self):
        self.speaking = True
        self.ai_state = "speaking"
        self.status_text = "SPEAKING"

    def stop_speaking(self):
        self.speaking = False
        self.ai_state = "idle"
        self.status_text = "ONLINE"

    def _api_keys_exist(self):
        return API_FILE.exists()

    def wait_for_api_key(self):
        while not self._api_key_ready:
            time.sleep(0.1)

    def _show_setup_ui(self):
        self.setup_frame = tk.Frame(self.root, bg=C_PANEL_ALT, highlightbackground=C_PRI, highlightthickness=1)
        self.setup_frame.place(relx=0.5, rely=0.52, anchor="center")
        tk.Label(self.setup_frame, text="INITIALIZATION REQUIRED", fg=C_TEXT, bg=C_PANEL_ALT, font=("Bahnschrift SemiBold", 14)).pack(pady=(18, 4))
        tk.Label(self.setup_frame, text="Enter your Gemini API key to unlock the live console.", fg=C_TEXT_DIM, bg=C_PANEL_ALT, font=FONT_BODY).pack(pady=(0, 12))
        tk.Label(self.setup_frame, text="GEMINI API KEY", fg=C_ACC_SOFT, bg=C_PANEL_ALT, font=("Bahnschrift SemiBold", 9)).pack(pady=(8, 4))
        self.gemini_entry = tk.Entry(self.setup_frame, width=48, fg=C_TEXT, bg=C_BG_ALT, insertbackground=C_TEXT, borderwidth=0, font=("Cascadia Mono", 10), show="*")
        self.gemini_entry.pack(pady=(0, 8), padx=20, ipady=6)
        tk.Button(self.setup_frame, text="Initialize Systems", command=self._save_api_keys, bg=C_ACC, fg=C_BG, activebackground="#ffb868", borderwidth=0, font=FONT_UI, padx=18, pady=8).pack(pady=(8, 18))

    def _save_api_keys(self):
        gemini = self.gemini_entry.get().strip()
        if not gemini:
            return
        os.makedirs(CONFIG_DIR, exist_ok=True)
        with open(API_FILE, "w", encoding="utf-8") as f:
            json.dump({"gemini_api_key": gemini}, f, indent=4)
        self.setup_frame.destroy()
        self._api_key_ready = True
        self.status_text = "ONLINE"
        self.write_log("SYS: Systems initialized. Brahma AI online.")
