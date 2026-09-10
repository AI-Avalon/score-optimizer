import io
from collections import OrderedDict
import threading
import tkinter as tk
from dataclasses import dataclass, replace
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

import cv2
import fitz
import numpy as np
from PIL import Image, ImageTk
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


@dataclass
class ProcessSettings:
    page_processing_mode: str
    split_offset_percent: float
    page_order: str
    black_margin_threshold: int
    crop_padding_px: int
    use_adaptive_threshold: bool
    fixed_threshold: int
    output_color_mode: str
    render_dpi: int
    output_dpi: int
    body_start_page: int
    front_matter_mode: str
    auto_crop_enabled: bool
    manual_trim_left_percent: float
    manual_trim_right_percent: float
    manual_trim_top_percent: float
    manual_trim_bottom_percent: float


@dataclass
class PageOverride:
    page_processing_mode: str
    split_offset_percent: float
    page_order: str
    black_margin_threshold: int
    crop_padding_px: int
    use_adaptive_threshold: bool
    fixed_threshold: int
    output_color_mode: str
    auto_crop_enabled: bool
    manual_trim_left_percent: float
    manual_trim_right_percent: float
    manual_trim_top_percent: float
    manual_trim_bottom_percent: float


def render_pdf_page_to_rgb(pdf_path: Path, page_index: int, dpi: int) -> np.ndarray:
    doc = fitz.open(pdf_path)
    try:
        page = doc.load_page(page_index)
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        if pix.n == 1:
            return cv2.cvtColor(arr, cv2.COLOR_GRAY2RGB)
        if pix.n == 3:
            return arr
        return cv2.cvtColor(arr, cv2.COLOR_RGBA2RGB)
    finally:
        doc.close()


def render_pdf_page_to_gray(pdf_path: Path, page_index: int, dpi: int) -> np.ndarray:
    rgb = render_pdf_page_to_rgb(pdf_path, page_index, dpi)
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)


def detect_content_bbox(gray: np.ndarray, black_threshold: int, padding: int) -> tuple[int, int, int, int]:
    # 黒背景(低輝度)を除外し、ページ本体の外接矩形を取得する
    mask = (gray > black_threshold).astype(np.uint8)
    ys, xs = np.where(mask > 0)
    h, w = gray.shape
    if len(xs) == 0 or len(ys) == 0:
        return 0, 0, w, h

    x0 = max(int(xs.min()) - padding, 0)
    y0 = max(int(ys.min()) - padding, 0)
    x1 = min(int(xs.max()) + padding + 1, w)
    y1 = min(int(ys.max()) + padding + 1, h)

    if x1 <= x0 or y1 <= y0:
        return 0, 0, w, h
    return x0, y0, x1, y1


def binarize(gray: np.ndarray, use_adaptive: bool, threshold: int) -> np.ndarray:
    if use_adaptive:
        # 照明ムラがあるスキャン向け
        return cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            11,
        )

    _, bw = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
    return bw


def compute_crop_rect(gray: np.ndarray, settings: ProcessSettings) -> tuple[int, int, int, int]:
    h, w = gray.shape[:2]

    if settings.auto_crop_enabled:
        x0, y0, x1, y1 = detect_content_bbox(
            gray,
            black_threshold=settings.black_margin_threshold,
            padding=settings.crop_padding_px,
        )
    else:
        x0, y0, x1, y1 = 0, 0, w, h

    crop_w = max(1, x1 - x0)
    crop_h = max(1, y1 - y0)

    left_trim = int(crop_w * (settings.manual_trim_left_percent / 100.0))
    right_trim = int(crop_w * (settings.manual_trim_right_percent / 100.0))
    top_trim = int(crop_h * (settings.manual_trim_top_percent / 100.0))
    bottom_trim = int(crop_h * (settings.manual_trim_bottom_percent / 100.0))

    x0 = min(max(0, x0 + left_trim), w - 1)
    x1 = max(min(w, x1 - right_trim), x0 + 1)
    y0 = min(max(0, y0 + top_trim), h - 1)
    y1 = max(min(h, y1 - bottom_trim), y0 + 1)

    return x0, y0, x1, y1


def split_spread_page(gray: np.ndarray, settings: ProcessSettings) -> list[np.ndarray]:
    x0, y0, x1, y1 = compute_crop_rect(gray, settings)
    cropped = gray[y0:y1, x0:x1]
    _h, w = cropped.shape

    offset_px = int((settings.split_offset_percent / 100.0) * w)
    split_x = max(1, min(w - 1, (w // 2) + offset_px))

    left = cropped[:, :split_x]
    right = cropped[:, split_x:]

    if settings.page_order == "left_to_right":
        pages = [left, right]
    else:
        pages = [right, left]

    out = [binarize(p, settings.use_adaptive_threshold, settings.fixed_threshold) for p in pages]
    return out


def process_single_page(gray: np.ndarray, settings: ProcessSettings) -> np.ndarray:
    x0, y0, x1, y1 = compute_crop_rect(gray, settings)
    cropped = gray[y0:y1, x0:x1]
    return binarize(cropped, settings.use_adaptive_threshold, settings.fixed_threshold)


def process_page_image(rgb: np.ndarray, settings: ProcessSettings) -> list[np.ndarray]:
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    x0, y0, x1, y1 = compute_crop_rect(gray, settings)

    cropped_rgb = rgb[y0:y1, x0:x1]
    cropped_gray = gray[y0:y1, x0:x1]

    if settings.page_processing_mode == "single_fit":
        if settings.output_color_mode == "original":
            return [cropped_rgb]
        return [binarize(cropped_gray, settings.use_adaptive_threshold, settings.fixed_threshold)]

    cropped_h, cropped_w = cropped_gray.shape
    offset_px = int((settings.split_offset_percent / 100.0) * cropped_w)
    split_x = max(1, min(cropped_w - 1, (cropped_w // 2) + offset_px))

    if settings.page_order == "left_to_right":
        rgb_pages = [cropped_rgb[:, :split_x], cropped_rgb[:, split_x:]]
        gray_pages = [cropped_gray[:, :split_x], cropped_gray[:, split_x:]]
    else:
        rgb_pages = [cropped_rgb[:, split_x:], cropped_rgb[:, :split_x]]
        gray_pages = [cropped_gray[:, split_x:], cropped_gray[:, :split_x]]

    if settings.output_color_mode == "original":
        return rgb_pages
    return [binarize(page, settings.use_adaptive_threshold, settings.fixed_threshold) for page in gray_pages]


def process_page_image_with_settings(rgb: np.ndarray, settings: ProcessSettings) -> list[np.ndarray]:
    return process_page_image(rgb, settings)


def fit_image_to_a4(image: np.ndarray, c: canvas.Canvas, output_dpi: int) -> None:
    page_w_pt, page_h_pt = A4
    page_w_in = page_w_pt / 72.0
    page_h_in = page_h_pt / 72.0

    # 高画質維持のため、A4を出力DPIで一度ラスタ化してから埋め込む
    target_w = max(1000, int(page_w_in * output_dpi))
    target_h = max(1000, int(page_h_in * output_dpi))
    margin_px = max(24, int(0.12 * output_dpi))

    is_color = image.ndim == 3 and image.shape[2] == 3
    channels = 3 if is_color else 1
    canvas_img = np.full((target_h, target_w, channels), 255, dtype=np.uint8) if channels == 3 else np.full((target_h, target_w), 255, dtype=np.uint8)

    img_h, img_w = image.shape[:2]
    max_w = target_w - margin_px * 2
    max_h = target_h - margin_px * 2

    scale = min(max_w / img_w, max_h / img_h)
    draw_w = max(1, int(img_w * scale))
    draw_h = max(1, int(img_h * scale))

    interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_CUBIC
    resized = cv2.resize(image, (draw_w, draw_h), interpolation=interp)

    x0 = (target_w - draw_w) // 2
    y0 = (target_h - draw_h) // 2
    canvas_img[y0:y0 + draw_h, x0:x0 + draw_w] = resized

    pil = Image.fromarray(canvas_img)

    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    buf.seek(0)
    c.drawImage(
        ImageReader(buf),
        0,
        0,
        width=page_w_pt,
        height=page_h_pt,
        preserveAspectRatio=False,
        mask="auto",
    )


class ScoreSplitterApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("楽譜分割ツール (A3/見開き -> A4白黒)")
        self.root.update_idletasks()
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        window_w = min(1500, max(1200, int(screen_w * 0.94)))
        window_h = min(1000, max(780, int(screen_h * 0.92)))
        self.root.geometry(f"{window_w}x{window_h}+{max(0, (screen_w - window_w) // 2)}+{max(0, (screen_h - window_h) // 2)}")
        self.root.minsize(1200, 780)

        self.pdf_files: list[Path] = []
        self.preview_pdf_index = 0
        self.preview_page_index = 0
        self.preview_image_tk = None
        self.preview_processed_left_tk = None
        self.preview_processed_right_tk = None
        self.preview_next_left_tk = None
        self.preview_next_right_tk = None
        self._preview_source_image = None
        self._preview_canvas_binding = False
        self._active_scroll_canvas = None
        self.left_scroll_canvas = None
        self.right_scroll_canvas = None
        self._generation_thread = None
        self._generation_running = False
        self._preview_after_id = None
        self._page_render_cache: OrderedDict[tuple[str, int, int, int], np.ndarray] = OrderedDict()
        self._page_render_cache_limit = 24
        self._page_count_cache: dict[tuple[str, int], int] = {}
        self.page_overrides: dict[tuple[str, int], PageOverride] = {}

        self._build_ui()
        self._load_example_pdfs_if_exist()
        self.root.after(0, self._fit_layout_to_window)

    def _make_scrollable_panel(self, parent: ttk.Frame) -> tuple[tk.Canvas, ttk.Frame]:
        panel = ttk.Frame(parent)
        panel.pack(fill=tk.BOTH, expand=True)

        canvas = tk.Canvas(panel, highlightthickness=0, borderwidth=0, bg=self.root.cget("bg"))
        scrollbar = ttk.Scrollbar(panel, orient=tk.VERTICAL, command=canvas.yview)
        canvas.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        content = ttk.Frame(canvas, padding=(0, 0, 10, 0))
        window = canvas.create_window((0, 0), window=content, anchor="nw")

        def _sync_region(_event=None):
            canvas.configure(scrollregion=canvas.bbox("all"))

        def _sync_width(event):
            canvas.itemconfigure(window, width=event.width)

        def _set_active(_event=None):
            self._active_scroll_canvas = canvas

        def _clear_active(_event=None):
            if self._active_scroll_canvas is canvas:
                self._active_scroll_canvas = None

        content.bind("<Configure>", _sync_region)
        canvas.bind("<Configure>", _sync_width)
        canvas.bind("<Enter>", _set_active)
        canvas.bind("<Leave>", _clear_active)

        return canvas, content

    def _bind_mousewheel(self) -> None:
        def _scroll_target(event, step: int) -> None:
            target = self._active_scroll_canvas
            if target is None:
                widget = event.widget
                while widget is not None:
                    if isinstance(widget, tk.Canvas):
                        target = widget
                        break
                    widget = getattr(widget, "master", None)
            if target is not None:
                target.yview_scroll(step, "units")

        def _on_mousewheel(event):
            if event.delta == 0:
                return
            step = -1 if event.delta > 0 else 1
            _scroll_target(event, step)

        def _on_button_4(event):
            _scroll_target(event, -1)

        def _on_button_5(event):
            _scroll_target(event, 1)

        self.root.bind_all("<MouseWheel>", _on_mousewheel)
        self.root.bind_all("<Button-4>", _on_button_4)
        self.root.bind_all("<Button-5>", _on_button_5)

    def _fit_layout_to_window(self) -> None:
        try:
            total_w = self.root.winfo_width()
            total_h = self.root.winfo_height()
            if total_w > 1 and total_h > 1:
                left_w = max(360, min(520, int(total_w * 0.33)))
                self._paned.sashpos(0, left_w)
        except Exception:
            pass

    def _display_preview_image(self, source_image: Image.Image) -> None:
        if self.canvas.winfo_width() <= 1 or self.canvas.winfo_height() <= 1:
            self.root.after(50, lambda: self._display_preview_image(source_image))
            return

        canvas_w = max(1, self.canvas.winfo_width() - 24)
        canvas_h = max(1, self.canvas.winfo_height() - 24)
        preview = source_image.copy()
        preview.thumbnail((canvas_w, canvas_h), Image.Resampling.LANCZOS)
        self.preview_image_tk = ImageTk.PhotoImage(preview)

        self.canvas.delete("all")
        x = max(0, (self.canvas.winfo_width() - preview.width) // 2)
        y = max(0, (self.canvas.winfo_height() - preview.height) // 2)
        self.canvas.create_image(x, y, anchor=tk.NW, image=self.preview_image_tk)

    def _bind_preview_resize(self) -> None:
        if self._preview_canvas_binding:
            return

        def _on_canvas_resize(_event=None):
            if self._preview_source_image is not None:
                self._display_preview_image(self._preview_source_image)

        self.canvas.bind("<Configure>", _on_canvas_resize)
        self._preview_canvas_binding = True

    def _set_generation_running(self, running: bool, message: str | None = None) -> None:
        self._generation_running = running
        if running:
            self.generate_button.configure(state=tk.DISABLED)
            self.progress_bar.start(10)
        else:
            self.generate_button.configure(state=tk.NORMAL)
            self.progress_bar.stop()
        if message is not None:
            self.progress_var.set(message)

    def _set_selected_files_label(self) -> None:
        sels = [i for i in self.listbox.curselection() if 0 <= i < len(self.pdf_files)]
        if not sels:
            self.selected_files_var.set("選択中のPDF: なし")
            return
        names = [self.pdf_files[i].name for i in sels]
        if len(names) == 1:
            self.selected_files_var.set(f"選択中のPDF: {names[0]}")
        else:
            self.selected_files_var.set(f"選択中のPDF: {len(names)}件")

    def _refresh_override_list(self) -> None:
        if not hasattr(self, "override_listbox"):
            return
        self.override_listbox.delete(0, tk.END)
        items = []
        for (pdf_key, page_index), override in self.page_overrides.items():
            items.append((pdf_key, page_index, override))
        items.sort(key=lambda item: (item[0], item[1]))
        for pdf_key, page_index, override in items:
            self.override_listbox.insert(tk.END, f"{pdf_key} / page {page_index + 1}")

    def save_page_override(self) -> None:
        target = self._get_preview_target()
        if target is None:
            return
        pdf_path, page_index = target
        settings = self.current_settings()
        key = (self._cache_key_for_pdf(pdf_path)[0], page_index)
        self.page_overrides[key] = PageOverride(
            page_processing_mode=settings.page_processing_mode,
            split_offset_percent=settings.split_offset_percent,
            page_order=settings.page_order,
            black_margin_threshold=settings.black_margin_threshold,
            crop_padding_px=settings.crop_padding_px,
            use_adaptive_threshold=settings.use_adaptive_threshold,
            fixed_threshold=settings.fixed_threshold,
            output_color_mode=settings.output_color_mode,
            auto_crop_enabled=settings.auto_crop_enabled,
            manual_trim_left_percent=settings.manual_trim_left_percent,
            manual_trim_right_percent=settings.manual_trim_right_percent,
            manual_trim_top_percent=settings.manual_trim_top_percent,
            manual_trim_bottom_percent=settings.manual_trim_bottom_percent,
        )
        self._refresh_override_list()
        self._set_selected_files_label()
        self.update_preview()

    def remove_page_override(self) -> None:
        target = self._get_preview_target()
        if target is None:
            return
        pdf_path, page_index = target
        key = (self._cache_key_for_pdf(pdf_path)[0], page_index)
        if key in self.page_overrides:
            del self.page_overrides[key]
        self._refresh_override_list()
        self._set_selected_files_label()
        self.update_preview()

    def on_override_select(self, _event=None) -> None:
        sels = self.override_listbox.curselection()
        if not sels:
            return
        idx = sels[0]
        item = self.override_listbox.get(idx)
        pdf_name, page_part = item.rsplit(" / page ", 1)
        page_no = int(page_part)
        for i, pdf_path in enumerate(self.pdf_files):
            if str(pdf_path) == pdf_name:
                self.preview_pdf_index = i
                self.preview_page_index = max(0, page_no - 1)
                self.listbox.selection_clear(0, tk.END)
                self.listbox.selection_set(i)
                self.listbox.see(i)
                self.page_input_var.set(page_no)
                self._set_selected_files_label()
                self.update_preview()
                break

    def _selected_pdf_indices_for_processing(self) -> list[int]:
        if not self.pdf_files:
            return []
        sels = [i for i in self.listbox.curselection() if 0 <= i < len(self.pdf_files)]
        if self.selected_only_var.get() and sels:
            return sels
        return [self.preview_pdf_index]

    def _update_generation_progress(self, text: str) -> None:
        self.progress_var.set(text)

    def _cache_key_for_pdf(self, pdf_path: Path) -> tuple[str, int]:
        stat = pdf_path.stat()
        return str(pdf_path), stat.st_mtime_ns

    def _invalidate_preview_cache(self) -> None:
        self._page_render_cache.clear()
        self._page_count_cache.clear()

    def _page_override_key(self) -> tuple[str, int] | None:
        target = self._get_preview_target()
        if target is None:
            return None
        pdf_path, page_index = target
        return self._cache_key_for_pdf(pdf_path)[0], page_index

    def _get_page_override(self, pdf_path: Path, page_index: int) -> PageOverride | None:
        return self.page_overrides.get((self._cache_key_for_pdf(pdf_path)[0], page_index))

    def _effective_settings_for_page(self, pdf_path: Path, page_index: int, base: ProcessSettings) -> ProcessSettings:
        override = self._get_page_override(pdf_path, page_index)
        if override is None:
            return base
        return ProcessSettings(
            page_processing_mode=override.page_processing_mode,
            split_offset_percent=override.split_offset_percent,
            page_order=override.page_order,
            black_margin_threshold=override.black_margin_threshold,
            crop_padding_px=override.crop_padding_px,
            use_adaptive_threshold=override.use_adaptive_threshold,
            fixed_threshold=override.fixed_threshold,
            output_color_mode=override.output_color_mode,
            render_dpi=base.render_dpi,
            output_dpi=base.output_dpi,
            body_start_page=base.body_start_page,
            front_matter_mode=base.front_matter_mode,
            auto_crop_enabled=override.auto_crop_enabled,
            manual_trim_left_percent=override.manual_trim_left_percent,
            manual_trim_right_percent=override.manual_trim_right_percent,
            manual_trim_top_percent=override.manual_trim_top_percent,
            manual_trim_bottom_percent=override.manual_trim_bottom_percent,
        )

    def _override_summary(self, pdf_path: Path, page_index: int) -> str:
        override = self._get_page_override(pdf_path, page_index)
        if override is None:
            return "個別設定なし"
        return (
            f"個別設定あり: mode={self._mode_label(override.page_processing_mode)}, color={self._mode_label(override.output_color_mode)}, split={override.split_offset_percent:.1f}%, "
            f"trim L{override.manual_trim_left_percent:.1f}/R{override.manual_trim_right_percent:.1f}/"
            f"T{override.manual_trim_top_percent:.1f}/B{override.manual_trim_bottom_percent:.1f}"
        )

    def _mode_label(self, mode: str) -> str:
        return {
            "spread_split": "見開き分割",
            "single_fit": "単ページ幅統一",
            "monochrome": "白黒",
            "original": "元ファイルのまま",
            "skip": "スキップ",
        }.get(mode, mode)

    def _settings_for_mode(self, settings: ProcessSettings, page_processing_mode: str | None = None) -> ProcessSettings:
        if page_processing_mode is None:
            return settings
        return replace(settings, page_processing_mode=page_processing_mode)

    def _get_page_count(self, pdf_path: Path) -> int:
        key = self._cache_key_for_pdf(pdf_path)
        cached = self._page_count_cache.get(key)
        if cached is not None:
            return cached
        doc = fitz.open(pdf_path)
        try:
            count = doc.page_count
        finally:
            doc.close()
        self._page_count_cache[key] = count
        return count

    def _render_page_cached(self, pdf_path: Path, page_index: int, dpi: int) -> np.ndarray:
        key, mtime_ns = self._cache_key_for_pdf(pdf_path)
        cache_key = (key, mtime_ns, page_index, dpi)
        cached = self._page_render_cache.get(cache_key)
        if cached is not None:
            self._page_render_cache.move_to_end(cache_key)
            return cached

        rgb = render_pdf_page_to_rgb(pdf_path, page_index, dpi)
        self._page_render_cache[cache_key] = rgb
        self._page_render_cache.move_to_end(cache_key)
        while len(self._page_render_cache) > self._page_render_cache_limit:
            self._page_render_cache.popitem(last=False)
        return rgb

    def _schedule_preview_update(self) -> None:
        if self._preview_after_id is not None:
            self.root.after_cancel(self._preview_after_id)
        self._preview_after_id = self.root.after(180, self.update_preview)

    def _finish_generation(self, message: str | None = None, error: Exception | None = None) -> None:
        self._set_generation_running(False, "待機中")
        if error is not None:
            messagebox.showerror("エラー", f"PDF生成に失敗しました: {error}")
            return
        if message:
            self.progress_var.set(message)
            messagebox.showinfo("完了", message)

    def _build_ui(self) -> None:
        wrapper = ttk.Frame(self.root, padding=10)
        wrapper.pack(fill=tk.BOTH, expand=True)

        self._paned = ttk.Panedwindow(wrapper, orient=tk.HORIZONTAL)
        self._paned.pack(fill=tk.BOTH, expand=True)

        left_root = ttk.Frame(self._paned, borderwidth=1, relief="solid")
        right_root = ttk.Frame(self._paned, borderwidth=1, relief="solid")
        self._paned.add(left_root, weight=0)
        self._paned.add(right_root, weight=1)

        left_canvas, left = self._make_scrollable_panel(left_root)
        right_canvas, right = self._make_scrollable_panel(right_root)
        self.left_scroll_canvas = left_canvas
        self.right_scroll_canvas = right_canvas
        self._bind_mousewheel()

        ttk.Label(left, text="入力PDF").pack(anchor="w")

        self.listbox = tk.Listbox(left, width=58, height=12)
        self.listbox.configure(selectmode=tk.EXTENDED)
        self.listbox.pack(fill=tk.X, pady=(4, 8))
        self.listbox.bind("<<ListboxSelect>>", self.on_listbox_select)

        row_btn = ttk.Frame(left)
        row_btn.pack(fill=tk.X)
        ttk.Button(row_btn, text="PDFを追加", command=self.add_pdfs).pack(side=tk.LEFT, padx=(0, 4))
        ttk.Button(row_btn, text="選択を削除", command=self.remove_selected_pdf).pack(side=tk.LEFT, padx=(0, 4))
        ttk.Button(row_btn, text="全消去", command=self.clear_pdfs).pack(side=tk.LEFT)

        file_nav_row = ttk.Frame(left)
        file_nav_row.pack(fill=tk.X, pady=(6, 0))
        ttk.Button(file_nav_row, text="前のPDF", command=self.prev_pdf).pack(side=tk.LEFT)
        ttk.Button(file_nav_row, text="次のPDF", command=self.next_pdf).pack(side=tk.LEFT, padx=(6, 0))

        out_frame = ttk.LabelFrame(left, text="出力")
        out_frame.pack(fill=tk.X, pady=(10, 8))

        self.output_var = tk.StringVar(value=str(Path.cwd() / "output_a4_bw.pdf"))
        ttk.Entry(out_frame, textvariable=self.output_var, width=52).pack(side=tk.LEFT, padx=6, pady=6)
        ttk.Button(out_frame, text="参照", command=self.select_output_path).pack(side=tk.LEFT, padx=(0, 6))

        self.selected_files_var = tk.StringVar(value="選択中のPDF: なし")
        ttk.Label(left, textvariable=self.selected_files_var, wraplength=360, justify=tk.LEFT).pack(anchor="w", pady=(0, 6))

        self.selected_only_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(left, text="選択したPDFのみ処理する", variable=self.selected_only_var).pack(anchor="w")

        mode_frame = ttk.LabelFrame(left, text="処理モード")
        mode_frame.pack(fill=tk.X, pady=(8, 8))

        self.page_processing_mode_var = tk.StringVar(value="spread_split")
        self.output_color_mode_var = tk.StringVar(value="monochrome")

        ttk.Label(mode_frame, text="ページ処理").pack(anchor="w", padx=8, pady=(6, 0))
        ttk.Radiobutton(mode_frame, text="見開き分割", variable=self.page_processing_mode_var, value="spread_split", command=self._sync_mode_widgets).pack(anchor="w", padx=18)
        ttk.Radiobutton(mode_frame, text="単ページ幅統一", variable=self.page_processing_mode_var, value="single_fit", command=self._sync_mode_widgets).pack(anchor="w", padx=18)

        ttk.Label(mode_frame, text="出力色").pack(anchor="w", padx=8, pady=(6, 0))
        ttk.Radiobutton(mode_frame, text="白黒", variable=self.output_color_mode_var, value="monochrome", command=self._sync_mode_widgets).pack(anchor="w", padx=18)
        ttk.Radiobutton(mode_frame, text="元あるファイルのまま", variable=self.output_color_mode_var, value="original", command=self._sync_mode_widgets).pack(anchor="w", padx=18)

        ttk.Label(mode_frame, text="見開き分割時のみ分割位置補正とページ順が有効", wraplength=360, justify=tk.LEFT).pack(anchor="w", padx=8, pady=(4, 6))

        override_frame = ttk.LabelFrame(left, text="ページごとの個別調整")
        override_frame.pack(fill=tk.X, pady=(8, 8))
        ttk.Label(
            override_frame,
            text="現在表示中のページだけを個別設定として保存できます。基準設定の後で、ページ単位の微調整に使います。",
            wraplength=360,
            justify=tk.LEFT,
        ).pack(anchor="w", padx=8, pady=(6, 4))
        override_btn_row = ttk.Frame(override_frame)
        override_btn_row.pack(fill=tk.X, padx=8, pady=(0, 6))
        ttk.Button(override_btn_row, text="このページを保存", command=self.save_page_override).pack(side=tk.LEFT)
        ttk.Button(override_btn_row, text="個別設定を解除", command=self.remove_page_override).pack(side=tk.LEFT, padx=(6, 0))
        self.override_status_var = tk.StringVar(value="個別設定なし")
        ttk.Label(override_frame, textvariable=self.override_status_var, wraplength=360, justify=tk.LEFT).pack(anchor="w", padx=8, pady=(0, 6))

        self.override_listbox = tk.Listbox(left, width=58, height=4)
        self.override_listbox.pack(fill=tk.X, pady=(0, 8))
        self.override_listbox.bind("<<ListboxSelect>>", self.on_override_select)

        setting_frame = ttk.LabelFrame(left, text="処理設定")
        setting_frame.pack(fill=tk.X)

        self.split_offset_var = tk.DoubleVar(value=0.0)
        self.order_var = tk.StringVar(value="left_to_right")
        self.black_threshold_var = tk.IntVar(value=20)
        self.padding_var = tk.IntVar(value=8)
        self.adaptive_var = tk.BooleanVar(value=False)
        self.fixed_threshold_var = tk.IntVar(value=170)
        self.preview_dpi_var = tk.IntVar(value=170)
        self.render_dpi_var = tk.IntVar(value=320)
        self.output_dpi_var = tk.IntVar(value=400)
        self.body_start_page_var = tk.IntVar(value=2)
        self.front_matter_mode_var = tk.StringVar(value="single")
        self.auto_crop_var = tk.BooleanVar(value=True)
        self.manual_trim_left_var = tk.DoubleVar(value=0.0)
        self.manual_trim_right_var = tk.DoubleVar(value=0.0)
        self.manual_trim_top_var = tk.DoubleVar(value=0.0)
        self.manual_trim_bottom_var = tk.DoubleVar(value=0.0)

        self.split_offset_scale = self._add_labeled_scale(setting_frame, "分割位置補正（%）", self.split_offset_var, -20, 20)

        order_row = ttk.Frame(setting_frame)
        order_row.pack(fill=tk.X, padx=8, pady=4)
        ttk.Label(order_row, text="ページ順").pack(side=tk.LEFT)
        self.page_order_widgets = []
        self.page_order_widgets.append(ttk.Radiobutton(order_row, text="左→右", variable=self.order_var, value="left_to_right"))
        self.page_order_widgets.append(ttk.Radiobutton(order_row, text="右→左", variable=self.order_var, value="right_to_left"))
        self.page_order_widgets[0].pack(side=tk.LEFT, padx=(10, 0))
        self.page_order_widgets[1].pack(side=tk.LEFT, padx=(10, 0))

        self._add_labeled_scale(setting_frame, "黒余白しきい値", self.black_threshold_var, 0, 80)
        self._add_labeled_scale(setting_frame, "クロップ余白(px)", self.padding_var, 0, 40)

        crop_mode_row = ttk.Frame(setting_frame)
        crop_mode_row.pack(fill=tk.X, padx=8, pady=4)
        ttk.Checkbutton(crop_mode_row, text="自動トリミングを使う", variable=self.auto_crop_var).pack(side=tk.LEFT)

        self._add_labeled_scale(setting_frame, "手動トリム 左(%)", self.manual_trim_left_var, 0, 20)
        self._add_labeled_scale(setting_frame, "手動トリム 右(%)", self.manual_trim_right_var, 0, 20)
        self._add_labeled_scale(setting_frame, "手動トリム 上(%)", self.manual_trim_top_var, 0, 20)
        self._add_labeled_scale(setting_frame, "手動トリム 下(%)", self.manual_trim_bottom_var, 0, 20)

        adapt_row = ttk.Frame(setting_frame)
        adapt_row.pack(fill=tk.X, padx=8, pady=4)
        ttk.Checkbutton(adapt_row, text="適応的二値化（照明ムラ向け）", variable=self.adaptive_var).pack(side=tk.LEFT)

        self._add_labeled_scale(setting_frame, "固定二値化しきい値", self.fixed_threshold_var, 80, 230)
        self._add_labeled_scale(setting_frame, "プレビューDPI", self.preview_dpi_var, 100, 260)
        self._add_labeled_scale(setting_frame, "レンダリングDPI", self.render_dpi_var, 160, 600)
        self._add_labeled_scale(setting_frame, "出力DPI（高画質）", self.output_dpi_var, 200, 600)

        body_row = ttk.Frame(setting_frame)
        body_row.pack(fill=tk.X, padx=8, pady=4)
        ttk.Label(body_row, text="本文開始ページ（1始まり）").pack(side=tk.LEFT)
        ttk.Spinbox(body_row, from_=1, to=500, textvariable=self.body_start_page_var, width=6).pack(side=tk.LEFT, padx=(8, 0))

        front_row = ttk.Frame(setting_frame)
        front_row.pack(fill=tk.X, padx=8, pady=4)
        ttk.Label(front_row, text="本文前ページの扱い").pack(side=tk.LEFT)
        ttk.Radiobutton(front_row, text="分割しない", variable=self.front_matter_mode_var, value="single").pack(side=tk.LEFT, padx=(10, 0))
        ttk.Radiobutton(front_row, text="見開き分割", variable=self.front_matter_mode_var, value="split").pack(side=tk.LEFT, padx=(10, 0))
        ttk.Radiobutton(front_row, text="スキップ", variable=self.front_matter_mode_var, value="skip").pack(side=tk.LEFT, padx=(10, 0))

        action_row = ttk.Frame(left)
        action_row.pack(fill=tk.X, pady=(10, 4))
        self.preview_button = ttk.Button(action_row, text="プレビュー更新", command=self.update_preview)
        self.preview_button.pack(side=tk.LEFT)
        self.generate_button = ttk.Button(action_row, text="A4白黒PDFを生成", command=self.generate_output)
        self.generate_button.pack(side=tk.RIGHT)

        self.progress_bar = ttk.Progressbar(left, mode="indeterminate")
        self.progress_bar.pack(fill=tk.X, pady=(4, 0))
        self.progress_var = tk.StringVar(value="待機中")
        ttk.Label(left, textvariable=self.progress_var).pack(anchor="w", pady=(2, 0))

        nav_row = ttk.LabelFrame(left, text="プレビュー移動")
        nav_row.pack(fill=tk.X, pady=(8, 0))

        page_btn_row = ttk.Frame(nav_row)
        page_btn_row.pack(fill=tk.X, padx=8, pady=(6, 4))
        ttk.Button(page_btn_row, text="前ページ", command=self.prev_preview_page).pack(side=tk.LEFT)
        ttk.Button(page_btn_row, text="次ページ", command=self.next_preview_page).pack(side=tk.LEFT, padx=(6, 0))

        self.page_input_var = tk.IntVar(value=1)
        self.total_pages_var = tk.StringVar(value="/ 0")
        self.auto_preview_var = tk.BooleanVar(value=True)

        page_jump_row = ttk.Frame(nav_row)
        page_jump_row.pack(fill=tk.X, padx=8, pady=(0, 6))
        ttk.Label(page_jump_row, text="ページ").pack(side=tk.LEFT)
        ttk.Spinbox(page_jump_row, from_=1, to=9999, textvariable=self.page_input_var, width=7).pack(side=tk.LEFT, padx=(6, 4))
        ttk.Label(page_jump_row, textvariable=self.total_pages_var).pack(side=tk.LEFT)
        ttk.Button(page_jump_row, text="移動", command=self.go_to_preview_page).pack(side=tk.LEFT, padx=(8, 0))
        ttk.Checkbutton(page_jump_row, text="設定変更で自動更新", variable=self.auto_preview_var).pack(side=tk.LEFT, padx=(10, 0))

        self.preview_info_var = tk.StringVar(value="プレビュー未更新")
        ttk.Label(left, textvariable=self.preview_info_var).pack(anchor="w", pady=(6, 0))

        preview_wrap = ttk.LabelFrame(right, text="元画像 / クロップ境界 / 分割線")
        preview_wrap.pack(fill=tk.BOTH, expand=True)

        self.canvas = tk.Canvas(preview_wrap, bg="#1e1e1e", height=520)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        self._bind_preview_resize()

        processed_frame = ttk.LabelFrame(right, text="処理後プレビュー")
        processed_frame.pack(fill=tk.X, pady=(8, 0))

        self.processed_left_label = ttk.Label(processed_frame)
        self.processed_left_label.pack(side=tk.LEFT, padx=6, pady=6)
        self.processed_right_label = ttk.Label(processed_frame)
        self.processed_right_label.pack(side=tk.LEFT, padx=6, pady=6)

        next_frame = ttk.LabelFrame(right, text="次ページの処理後プレビュー")
        next_frame.pack(fill=tk.X, pady=(8, 0))

        self.next_left_label = ttk.Label(next_frame)
        self.next_left_label.pack(side=tk.LEFT, padx=6, pady=6)
        self.next_right_label = ttk.Label(next_frame)
        self.next_right_label.pack(side=tk.LEFT, padx=6, pady=6)

        hint_frame = ttk.LabelFrame(right, text="操作ヒント")
        hint_frame.pack(fill=tk.X, pady=(8, 0))
        ttk.Label(
            hint_frame,
            text="左側は設定、右側はプレビューです。各エリアはスクロール可能で、プレビューは現在ページと次ページの両方を確認できます。",
            wraplength=520,
            justify=tk.LEFT,
        ).pack(anchor="w", padx=8, pady=8)

        self._sync_mode_widgets()
        self._bind_auto_preview_inputs()

    def _bind_auto_preview_inputs(self) -> None:
        watched_vars = [
            self.split_offset_var,
            self.order_var,
            self.black_threshold_var,
            self.padding_var,
            self.adaptive_var,
            self.fixed_threshold_var,
            self.preview_dpi_var,
            self.render_dpi_var,
            self.output_dpi_var,
            self.body_start_page_var,
            self.front_matter_mode_var,
            self.auto_crop_var,
            self.manual_trim_left_var,
            self.manual_trim_right_var,
            self.manual_trim_top_var,
            self.manual_trim_bottom_var,
        ]
        for v in watched_vars:
            v.trace_add("write", self._on_setting_changed)

    def _on_setting_changed(self, *_args) -> None:
        if self.auto_preview_var.get() and self.pdf_files:
            self._schedule_preview_update()

    def _sync_mode_widgets(self) -> None:
        mode = self.page_processing_mode_var.get()
        state = tk.NORMAL if mode == "spread_split" else tk.DISABLED
        if hasattr(self, "split_offset_scale"):
            self.split_offset_scale.configure(state=state)
        for widget in getattr(self, "page_order_widgets", []):
            widget.configure(state=state)
        if self.auto_preview_var.get() and self.pdf_files:
            self._schedule_preview_update()

    def _add_labeled_scale(self, parent, label: str, var, min_v: int, max_v: int):
        row = ttk.Frame(parent)
        row.pack(fill=tk.X, padx=8, pady=4)
        ttk.Label(row, text=label).pack(anchor="w")
        scale = ttk.Scale(row, from_=min_v, to=max_v, variable=var, orient=tk.HORIZONTAL)
        scale.pack(fill=tk.X)
        return scale

    def _load_example_pdfs_if_exist(self) -> None:
        candidates = [
            Path.cwd() / "20260725195319245.pdf",
            Path.cwd() / "20260725195910884.pdf",
        ]
        for c in candidates:
            if c.exists():
                self.pdf_files.append(c)
                self.listbox.insert(tk.END, str(c))
        self._refresh_override_list()

    def add_pdfs(self) -> None:
        files = filedialog.askopenfilenames(filetypes=[("PDF", "*.pdf")])
        for fp in files:
            p = Path(fp)
            if p not in self.pdf_files:
                self.pdf_files.append(p)
                self.listbox.insert(tk.END, str(p))
        self._invalidate_preview_cache()
        self._refresh_override_list()
        if self.pdf_files and not self.listbox.curselection():
            self.listbox.selection_clear(0, tk.END)
            self.listbox.selection_set(0)
            self.preview_pdf_index = 0
            self.preview_page_index = 0
            self._set_selected_files_label()
            self._refresh_override_list()
            self.update_preview()

    def remove_selected_pdf(self) -> None:
        sels = list(self.listbox.curselection())
        for idx in reversed(sels):
            removed_path = self.pdf_files[idx]
            del self.pdf_files[idx]
            self.listbox.delete(idx)
            pdf_key = self._cache_key_for_pdf(removed_path)[0]
            self.page_overrides = {k: v for k, v in self.page_overrides.items() if k[0] != pdf_key}
        self._invalidate_preview_cache()
        self._set_selected_files_label()
        self._refresh_override_list()
        if self.pdf_files:
            self.preview_pdf_index = min(self.preview_pdf_index, len(self.pdf_files) - 1)
            self.preview_page_index = 0
            if not self.listbox.curselection():
                self.listbox.selection_set(self.preview_pdf_index)
        self.update_preview()

    def clear_pdfs(self) -> None:
        self.pdf_files.clear()
        self.listbox.delete(0, tk.END)
        self.page_overrides.clear()
        self._invalidate_preview_cache()
        self.canvas.delete("all")
        self.processed_left_label.configure(image="")
        self.processed_right_label.configure(image="")
        self.next_left_label.configure(image="")
        self.next_right_label.configure(image="")
        self.preview_info_var.set("プレビュー未更新")
        self.total_pages_var.set("/ 0")
        self.selected_files_var.set("選択中のPDF: なし")
        self.progress_var.set("待機中")
        self.override_status_var.set("個別設定なし")
        self._refresh_override_list()

    def select_output_path(self) -> None:
        out = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF", "*.pdf")])
        if out:
            self.output_var.set(out)

    def current_settings(self) -> ProcessSettings:
        return ProcessSettings(
            page_processing_mode=self.page_processing_mode_var.get(),
            split_offset_percent=float(self.split_offset_var.get()),
            page_order=self.order_var.get(),
            black_margin_threshold=int(self.black_threshold_var.get()),
            crop_padding_px=int(self.padding_var.get()),
            use_adaptive_threshold=bool(self.adaptive_var.get()),
            fixed_threshold=int(self.fixed_threshold_var.get()),
            output_color_mode=self.output_color_mode_var.get(),
            render_dpi=int(self.render_dpi_var.get()),
            output_dpi=int(self.output_dpi_var.get()),
            body_start_page=max(1, int(self.body_start_page_var.get())),
            front_matter_mode=self.front_matter_mode_var.get(),
            auto_crop_enabled=bool(self.auto_crop_var.get()),
            manual_trim_left_percent=float(self.manual_trim_left_var.get()),
            manual_trim_right_percent=float(self.manual_trim_right_var.get()),
            manual_trim_top_percent=float(self.manual_trim_top_var.get()),
            manual_trim_bottom_percent=float(self.manual_trim_bottom_var.get()),
        )

    def on_listbox_select(self, _event=None) -> None:
        sels = self.listbox.curselection()
        if not sels:
            self._set_selected_files_label()
            return
        self.preview_pdf_index = sels[0]
        self.preview_page_index = 0
        self.page_input_var.set(1)
        self._set_selected_files_label()
        self._refresh_override_list()
        self.update_preview()

    def prev_pdf(self) -> None:
        if not self.pdf_files:
            return
        self.preview_pdf_index = (self.preview_pdf_index - 1) % len(self.pdf_files)
        self.listbox.selection_clear(0, tk.END)
        self.listbox.selection_set(self.preview_pdf_index)
        self.listbox.see(self.preview_pdf_index)
        self.preview_page_index = 0
        self.page_input_var.set(1)
        self._set_selected_files_label()
        self._refresh_override_list()
        self.update_preview()

    def next_pdf(self) -> None:
        if not self.pdf_files:
            return
        self.preview_pdf_index = (self.preview_pdf_index + 1) % len(self.pdf_files)
        self.listbox.selection_clear(0, tk.END)
        self.listbox.selection_set(self.preview_pdf_index)
        self.listbox.see(self.preview_pdf_index)
        self.preview_page_index = 0
        self.page_input_var.set(1)
        self._set_selected_files_label()
        self._refresh_override_list()
        self.update_preview()

    def go_to_preview_page(self) -> None:
        target = self._get_preview_target()
        if target is None:
            return
        pdf_path, _ = target
        doc = fitz.open(pdf_path)
        try:
            max_page = max(1, doc.page_count)
        finally:
            doc.close()
        self.preview_page_index = max(0, min(max_page - 1, int(self.page_input_var.get()) - 1))
        self.page_input_var.set(self.preview_page_index + 1)
        self.update_preview()

    def _get_preview_target(self) -> tuple[Path, int] | None:
        if not self.pdf_files:
            return None

        pdf_path = self.pdf_files[self.preview_pdf_index % len(self.pdf_files)]
        doc = fitz.open(pdf_path)
        try:
            page_count = doc.page_count
        finally:
            doc.close()

        if page_count == 0:
            return None

        self.preview_page_index = self.preview_page_index % page_count
        return pdf_path, self.preview_page_index

    def update_preview(self) -> None:
        target = self._get_preview_target()
        if target is None:
            messagebox.showwarning("警告", "入力PDFがありません")
            return

        pdf_path, page_idx = target
        settings = self._effective_settings_for_page(pdf_path, page_idx, self.current_settings())
        self._set_selected_files_label()

        page_count = self._get_page_count(pdf_path)
        self.total_pages_var.set(f"/ {page_count}")
        self.page_input_var.set(page_idx + 1)
        self.override_status_var.set(self._override_summary(pdf_path, page_idx))

        try:
            rgb = self._render_page_cached(pdf_path, page_idx, int(self.preview_dpi_var.get()))
            gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
            x0, y0, x1, y1 = compute_crop_rect(gray, settings)

            vis = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
            cv2.rectangle(vis, (x0, y0), (x1 - 1, y1 - 1), (0, 255, 0), 3)

            page_no = page_idx + 1
            is_front = page_no < settings.body_start_page
            if is_front and settings.front_matter_mode == "skip":
                mode_text = "front: スキップ"
                processed_images = []
            else:
                effective_mode = "single_fit" if (is_front and settings.front_matter_mode == "single") else settings.page_processing_mode
                page_settings = self._settings_for_mode(settings, effective_mode)
                mode_text = f"{('front: ' if is_front else '')}{self._mode_label(effective_mode)}"

                if effective_mode == "spread_split":
                    w = x1 - x0
                    split_x = x0 + max(1, min(w - 1, (w // 2) + int((page_settings.split_offset_percent / 100.0) * w)))
                    cv2.line(vis, (split_x, y0), (split_x, y1), (0, 120, 255), 4)

                processed_images = process_page_image(rgb, page_settings)

            preview = Image.fromarray(cv2.cvtColor(vis, cv2.COLOR_BGR2RGB))
            self._preview_source_image = preview
            self._display_preview_image(preview)

            if len(processed_images) >= 1:
                left_img = Image.fromarray(processed_images[0])
                left_img.thumbnail((280, 360), Image.Resampling.LANCZOS)
                self.preview_processed_left_tk = ImageTk.PhotoImage(left_img)
                self.processed_left_label.configure(image=self.preview_processed_left_tk)
            else:
                self.processed_left_label.configure(image="")
                self.preview_processed_left_tk = None

            if len(processed_images) >= 2:
                right_img = Image.fromarray(processed_images[1])
                right_img.thumbnail((280, 360), Image.Resampling.LANCZOS)
                self.preview_processed_right_tk = ImageTk.PhotoImage(right_img)
                self.processed_right_label.configure(image=self.preview_processed_right_tk)
            else:
                self.processed_right_label.configure(image="")
                self.preview_processed_right_tk = None

            next_idx = min(page_count - 1, page_idx + 1)
            rgb_next = self._render_page_cached(pdf_path, next_idx, int(self.preview_dpi_var.get()))
            gray_next = cv2.cvtColor(rgb_next, cv2.COLOR_RGB2GRAY)
            next_page_no = next_idx + 1
            next_is_front = next_page_no < settings.body_start_page
            next_settings = self._effective_settings_for_page(pdf_path, next_idx, self.current_settings())
            if next_is_front and next_settings.front_matter_mode == "skip":
                next_processed = []
            else:
                next_effective_mode = "single_fit" if (next_is_front and next_settings.front_matter_mode == "single") else next_settings.page_processing_mode
                next_page_settings = self._settings_for_mode(next_settings, next_effective_mode)
                next_processed = process_page_image(rgb_next, next_page_settings)

            if len(next_processed) >= 1:
                n1 = Image.fromarray(next_processed[0])
                n1.thumbnail((280, 360), Image.Resampling.LANCZOS)
                self.preview_next_left_tk = ImageTk.PhotoImage(n1)
                self.next_left_label.configure(image=self.preview_next_left_tk)
            else:
                self.next_left_label.configure(image="")
                self.preview_next_left_tk = None

            if len(next_processed) >= 2:
                n2 = Image.fromarray(next_processed[1])
                n2.thumbnail((280, 360), Image.Resampling.LANCZOS)
                self.preview_next_right_tk = ImageTk.PhotoImage(n2)
                self.next_right_label.configure(image=self.preview_next_right_tk)
            else:
                self.next_right_label.configure(image="")
                self.preview_next_right_tk = None

            self.preview_info_var.set(
                f"{pdf_path.name} / page {page_no} | mode={mode_text} | crop=({x0},{y0})-({x1},{y1})"
            )
        except Exception as e:
            messagebox.showerror("エラー", f"プレビュー更新失敗: {e}")

    def prev_preview_page(self) -> None:
        self.preview_page_index -= 1
        self.update_preview()

    def next_preview_page(self) -> None:
        self.preview_page_index += 1
        self.update_preview()

    def generate_output(self) -> None:
        if self._generation_running:
            return

        if not self.pdf_files:
            messagebox.showwarning("警告", "入力PDFがありません")
            return

        out_path = Path(self.output_var.get()).expanduser()
        if out_path.suffix.lower() != ".pdf":
            out_path = out_path.with_suffix(".pdf")

        settings = self.current_settings()
        pdf_indices = self._selected_pdf_indices_for_processing()
        if not pdf_indices:
            messagebox.showwarning("警告", "処理対象のPDFが選択されていません")
            return

        target_pdfs = [self.pdf_files[i] for i in pdf_indices]

        total_input_pages = 0
        for pdf_path in target_pdfs:
            doc = fitz.open(pdf_path)
            try:
                total_input_pages += doc.page_count
            finally:
                doc.close()

        self._set_generation_running(True, "PDF生成を開始しました...")

        def worker() -> None:
            try:
                out_path.parent.mkdir(parents=True, exist_ok=True)

                c = canvas.Canvas(str(out_path), pagesize=A4)
                total_generated = 0
                processed_pages = 0

                for pdf_path in target_pdfs:
                    doc = fitz.open(pdf_path)
                    try:
                        for page_idx in range(doc.page_count):
                            page_no = page_idx + 1
                            effective = self._effective_settings_for_page(pdf_path, page_idx, settings)
                            rgb = self._render_page_cached(pdf_path, page_idx, effective.render_dpi)
                            is_front = page_no < effective.body_start_page

                            if is_front and effective.front_matter_mode == "skip":
                                processed_pages += 1
                                self.root.after(0, self._update_generation_progress, f"処理中: {pdf_path.name} / page {page_no}  {processed_pages}/{total_input_pages} (skip)")
                                continue

                            effective_mode = "single_fit" if (is_front and effective.front_matter_mode == "single") else effective.page_processing_mode
                            effective_processing = self._settings_for_mode(effective, effective_mode)
                            pages = process_page_image(rgb, effective_processing)
                            for p in pages:
                                fit_image_to_a4(p, c, effective.output_dpi)
                                c.showPage()
                                total_generated += 1

                            processed_pages += 1
                            self.root.after(0, self._update_generation_progress, f"処理中: {pdf_path.name} / page {page_no}  {processed_pages}/{total_input_pages}")
                    finally:
                        doc.close()

                c.save()
                self.root.after(
                    0,
                    lambda: self._finish_generation(f"出力完了: {out_path}\n生成ページ数: {total_generated}"),
                )
            except Exception as e:
                self.root.after(0, lambda err=e: self._finish_generation(error=err))

        self._generation_thread = threading.Thread(target=worker, daemon=True)
        self._generation_thread.start()


def main() -> None:
    root = tk.Tk()
    app = ScoreSplitterApp(root)
    app.update_preview()
    root.mainloop()


if __name__ == "__main__":
    main()
