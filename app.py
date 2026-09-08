#!/usr/bin/env python3
"""
PROMPT FORGE - 70s Analog Film AI Image Prompt Workstation
===========================================================
A lightweight desktop application for transforming rough ideas into dense,
visually coherent image-generation prompts using locally hosted Ollama models.

Supports:
- Drag-and-drop image loading directly into the User's Idea prompt box or Vision slot
- Automatic detection & cleanup of dropped file:// paths, Thunar/Nautilus URIs, and filenames
- Vision-capable Ollama models (llava, llama3.2-vision, minicpm-v) + LLM enhancement
- Cultural Wikipedia enrichment for artistic & historical context
- Greppable timestamped quick-saves (~/.promptforge/saved_prompts/)
- External config file editing via l3afpad (or fallback editor)
- High-contrast 70s analog darkroom / film aesthetic
"""

import os
import sys
import json
import re
import time
import datetime
import urllib.request
import urllib.parse
import urllib.error
import sqlite3
import threading
import subprocess
import shutil

# Tkinter imports with optional TkinterDnD2
try:
    from tkinterdnd2 import TkinterDnD, DND_FILES
    HAS_TKDND = True
except ImportError:
    HAS_TKDND = False

try:
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox
    HAS_TK = True
except ImportError:
    HAS_TK = False

# Optional Pillow for rich thumbnail rendering
try:
    from PIL import Image, ImageTk
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# ---------------------------------------------------------------------------
# CONSTANTS & CONFIGURATION
# ---------------------------------------------------------------------------
APP_NAME = "PROMPT FORGE"
APP_VERSION = "2.1.0-analog"
BASE_DIR = os.path.expanduser("~/.promptforge")
SAVES_DIR = os.path.join(BASE_DIR, "saved_prompts")
PRESETS_DIR = os.path.join(BASE_DIR, "presets")
PERSONAS_DIR = os.path.join(BASE_DIR, "personas")
DB_PATH = os.path.join(BASE_DIR, "journal.db")

# 70s Analog Darkroom Color Palette
PALETTE = {
    "bg_dark": "#181615",       # Deep analog black/charcoal
    "bg_card": "#24211e",       # Dark warm slate
    "bg_input": "#141211",      # Deep recessed input
    "fg_text": "#ece7dc",       # Warm off-white / parchment
    "fg_muted": "#a89f91",      # Warm gray
    "amber": "#f59e0b",         # Classic amber dial
    "amber_dim": "#b45309",     # Burnished brass
    "orange": "#ea580c",        # Warm analog orange / red light
    "olive": "#84cc16",         # Vintage CRT phosphor green
    "border": "#3a3530",        # Instrument bevel border
    "highlight": "#fbbf24",     # Lit indicator
}

DEFAULT_PRESETS = {
    "Kodachrome 64 (1974 National Geographic)": (
        "Shot on 35mm Kodachrome 64 film, rich saturated dye couplers, distinct warm yellow-red cast, "
        "crisp microcontrast, fine organic gelatin silver grain, natural overcast golden hour lighting, "
        "subtle cyan shadow bias, classic Leica M3 with 50mm Summicron lens."
    ),
    "Tri-X 400 (High-Contrast Gritty Noir)": (
        "Shot on Kodak Tri-X 400 black and white film pushed to 1600, dramatic deep crushed blacks, "
        "luminous specular highlights, pronounced textural silver grain, harsh chiaroscuro side lighting, "
        "gritty tactile street documentary aesthetic, 35mm focal length, f/2.8 aperture."
    ),
    "Cinestill 800T (Tungsten Halation & Neon)": (
        "Shot on 35mm CineStill 800T tungsten-balanced color film, pronounced red-orange halation bloom "
        "around practical lights and specular highlights, cool blue-green shadows, cinematic atmospheric "
        "nocturne haze, wet asphalt reflections, shallow depth of field, anamorphic bokeh."
    ),
    "Polaroid SX-70 (Nostalgic Sun-Drenched)": (
        "Authentic vintage Polaroid SX-70 instant square film print, creamy pastel color palette, "
        "soft optical focus with gentle center clarity, subtle warm chromatic aberration, retro vignette, "
        "light faded chemical paper texture, tangible tactile 1970s snapshot memory."
    ),
    "Technicolor 3-Strip (Golden Age Cinematic)": (
        "Vibrant 3-strip Technicolor dye transfer process, ultra-saturated crimson and deep emerald greens, "
        "hyper-dimensional studio key lighting with soft fill, velvet contrast, theatrical composition, "
        "panavision spherical 1970s cinema camera stock."
    ),
    "Ektachrome 100 (Clean Aerial & Architectural)": (
        "Kodak Ektachrome 100 reversal slide film, clean neutral blues and luminous whites, crisp edge definition, "
        "low grain profile, high dynamic clarity, architectural documentary precision, wide angle perspective."
    )
}

DEFAULT_PERSONAS = {
    "Analog Cinematographer": (
        "You are a master 1970s analog director of photography. You describe scenes with profound tactile detail: "
        "film stock names, focal lengths, aperture stops, lighting ratios, atmospheric particles, set textures, "
        "and emotional visual gravity. Keep descriptions dense, visual, and free of vague buzzwords."
    ),
    "National Geographic Photojournalist": (
        "You are a legendary documentary photographer traveling the globe in 1976. You capture authenticity, "
        "weathered faces, natural environment context, candid posture, dust, moisture, and unforced human narrative."
    ),
    "Surrealist Darkroom Alchemist": (
        "You are a photographic experimentalist in an underground Paris darkroom. You blend realistic photographic "
        "precision with dreamlike, uncanny juxtapositions, double exposures, solarization, and tactile textures."
    )
}

# ---------------------------------------------------------------------------
# INITIALIZATION & SYSTEM HELPERS
# ---------------------------------------------------------------------------
def ensure_directories():
    os.makedirs(SAVES_DIR, exist_ok=True)
    os.makedirs(PRESETS_DIR, exist_ok=True)
    os.makedirs(PERSONAS_DIR, exist_ok=True)

    # Seed presets if empty
    for name, prompt in DEFAULT_PRESETS.items():
        fname = re.sub(r'[^\w\-_\. ]', '_', name) + ".txt"
        fpath = os.path.join(PRESETS_DIR, fname)
        if not os.path.exists(fpath):
            try:
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write(prompt)
            except Exception:
                pass

    # Seed personas if empty
    for name, desc in DEFAULT_PERSONAS.items():
        fname = re.sub(r'[^\w\-_\. ]', '_', name) + ".txt"
        fpath = os.path.join(PERSONAS_DIR, fname)
        if not os.path.exists(fpath):
            try:
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write(desc)
            except Exception:
                pass

def init_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS prompt_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                model TEXT,
                source_input TEXT,
                image_path TEXT,
                preset_used TEXT,
                enrichment_context TEXT,
                final_positive TEXT,
                final_negative TEXT
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB Error] {e}")

def open_in_editor(file_path):
    """Launch user's preferred editor (l3afpad on Debian, or fallback)."""
    editors = ["l3afpad", "gedit", "mousepad", "nano", "xdg-open"]
    # Check if EDITOR environment variable is set
    env_editor = os.environ.get("EDITOR")
    if env_editor:
        editors.insert(0, env_editor)

    for ed in editors:
        if shutil.which(ed):
            try:
                subprocess.Popen([ed, file_path])
                return True
            except Exception:
                pass
    return False

# ---------------------------------------------------------------------------
# OLLAMA CLIENT & WIKIPEDIA ENRICHMENT
# ---------------------------------------------------------------------------
class OllamaClient:
    def __init__(self, host="http://localhost:11434"):
        self.host = host.rstrip("/")

    def list_models(self):
        url = f"{self.host}/api/tags"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "PromptForge"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                models = [m["name"] for m in data.get("models", [])]
                return models
        except Exception:
            return []

    def generate(self, model, prompt, images=None, system=None):
        url = f"{self.host}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.75,
                "top_p": 0.9,
            }
        }
        if images:
            payload["images"] = images
        if system:
            payload["system"] = system

        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={"Content-Type": "application/json", "User-Agent": "PromptForge"}
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("response", "")

def fetch_wikipedia_summary(query):
    """Fetches a concise Wikipedia summary for cultural/artistic enrichment."""
    try:
        clean_q = urllib.parse.quote(query.strip())
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{clean_q}"
        req = urllib.request.Request(url, headers={"User-Agent": "PromptForge/2.1 (debian; creative-desktop)"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            extract = data.get("extract", "")
            title = data.get("title", query)
            if extract:
                return f"{title}: {extract[:400]}..."
    except Exception:
        pass
    return None

# ---------------------------------------------------------------------------
# DRAG & DROP & IMAGE ACTIVATION ENGINE
# ---------------------------------------------------------------------------
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tiff", ".tif"}

def extract_image_path_from_text(raw_text):
    """
    Scans any raw text, clipboard paste, or file manager drop (Thunar, Nautilus, etc.)
    and detects valid local image paths, cleaning file:// prefixes and URL encodings.
    """
    if not raw_text:
        return None, raw_text

    # Match potential URI or path tokens
    candidates = []

    # 1. file:// URIs (e.g. file:///home/user/Pictures/shot.jpg or file://localhost/...)
    file_uris = re.findall(r'file://(?:localhost)?(/[^\r\n"\'<>]+)', raw_text)
    for uri in file_uris:
        candidates.append(urllib.parse.unquote(uri))

    # 2. Quoted paths (e.g. "/home/user/Pictures/test.png")
    quoted = re.findall(r'["\'](/[^"\'\r\n]+)["\']', raw_text)
    for q in quoted:
        candidates.append(q)

    # 3. Plain absolute or home-relative paths
    lines = raw_text.splitlines()
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("file://"):
            p = stripped.replace("file://", "").strip()
            if p.startswith("localhost"):
                p = p[9:]
            candidates.append(urllib.parse.unquote(p))
        elif stripped.startswith("/") or stripped.startswith("~"):
            candidates.append(os.path.expanduser(stripped))

    # 4. Token search for any string ending in image extension
    tokens = re.split(r'[\s\n\r"\'\(\)\[\]]+', raw_text)
    for token in tokens:
        if any(token.lower().endswith(ext) for ext in IMAGE_EXTENSIONS):
            token_clean = urllib.parse.unquote(token)
            if token_clean.startswith("file://"):
                token_clean = token_clean[7:]
            candidates.append(os.path.expanduser(token_clean))

    # Test each candidate
    found_path = None
    for cand in candidates:
        cand_clean = cand.strip()
        cand_expanded = os.path.expanduser(cand_clean)
        ext = os.path.splitext(cand_expanded)[1].lower()
        if ext in IMAGE_EXTENSIONS and os.path.isfile(cand_expanded):
            found_path = cand_expanded
            break

    if found_path:
        # Clean the found path from the text so the prompt box stays clean
        cleaned_text = raw_text
        patterns_to_remove = [
            r'file://(?:localhost)?' + re.escape(urllib.parse.quote(found_path)),
            r'file://(?:localhost)?' + re.escape(found_path),
            re.escape(found_path),
            re.escape(os.path.basename(found_path))
        ]
        for pat in patterns_to_remove:
            cleaned_text = re.sub(pat, '', cleaned_text, flags=re.IGNORECASE)
        
        # Clean extra blank lines
        cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text).strip()
        return found_path, cleaned_text

    return None, raw_text

# ---------------------------------------------------------------------------
# MAIN GUI APPLICATION
# ---------------------------------------------------------------------------
class PromptForgeApp:
    def __init__(self, root):
        self.root = root
        self.root.title(f"{APP_NAME} // 70s Analog Prompt Workstation")
        self.root.geometry("1180x840")
        self.root.minsize(980, 720)
        self.root.configure(bg=PALETTE["bg_dark"])

        ensure_directories()
        init_db()

        self.ollama = OllamaClient()
        self.current_image_path = None
        self.current_image_b64 = None
        self.loaded_image_obj = None
        self.available_models = []

        self._setup_styles()
        self._build_ui()
        self._setup_drag_and_drop()
        self._refresh_models_async()
        self._load_presets_list()

    def _setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        # Configure generic combobox & scrollbars for 70s instrument vibe
        style.configure("TCombobox",
            fieldbackground=PALETTE["bg_input"],
            background=PALETTE["bg_card"],
            foreground=PALETTE["fg_text"],
            bordercolor=PALETTE["border"],
            arrowcolor=PALETTE["amber"]
        )
        style.map("TCombobox", fieldbackground=[("readonly", PALETTE["bg_input"])])
        
        style.configure("Vertical.TScrollbar",
            background=PALETTE["bg_card"],
            troughcolor=PALETTE["bg_dark"],
            bordercolor=PALETTE["border"],
            arrowcolor=PALETTE["amber"]
        )

    def _build_ui(self):
        # 1. Top Header: Analog Meter Aesthetic
        header = tk.Frame(self.root, bg=PALETTE["bg_card"], bd=1, relief="solid", highlightthickness=0)
        header.pack(fill="x", padx=14, pady=(12, 6))

        # Title & Subtitle
        title_frame = tk.Frame(header, bg=PALETTE["bg_card"])
        title_frame.pack(side="left", padx=16, pady=10)

        lbl_title = tk.Label(
            title_frame,
            text="PROMPT FORGE",
            font=("Monospace", 16, "bold"),
            fg=PALETTE["amber"],
            bg=PALETTE["bg_card"]
        )
        lbl_title.pack(anchor="w")

        lbl_sub = tk.Label(
            title_frame,
            text="ANALOG 70s FILM & VISION PROMPT WORKSTATION // SPEED • DENSITY • INTENT",
            font=("Monospace", 8),
            fg=PALETTE["fg_muted"],
            bg=PALETTE["bg_card"]
        )
        lbl_sub.pack(anchor="w")

        # Model selector & Status dials
        ctrl_frame = tk.Frame(header, bg=PALETTE["bg_card"])
        ctrl_frame.pack(side="right", padx=16, pady=10)

        tk.Label(ctrl_frame, text="OLLAMA MODEL:", font=("Monospace", 9, "bold"), fg=PALETTE["fg_text"], bg=PALETTE["bg_card"]).pack(side="left", padx=4)
        self.combo_model = ttk.Combobox(ctrl_frame, width=22, state="readonly")
        self.combo_model.pack(side="left", padx=4)

        btn_refresh = tk.Button(
            ctrl_frame, text="↻ REFRESH", font=("Monospace", 8, "bold"),
            bg=PALETTE["bg_dark"], fg=PALETTE["amber"], activebackground=PALETTE["amber"],
            activeforeground=PALETTE["bg_dark"], bd=1, relief="solid", command=self._refresh_models_async
        )
        btn_refresh.pack(side="left", padx=4)

        # 2. Main Workstation Area (Split into Left: Inputs/Vision & Right: Refinement/Final)
        main_split = tk.Frame(self.root, bg=PALETTE["bg_dark"])
        main_split.pack(fill="both", expand=True, padx=14, pady=6)

        # Left Column (Idea + Vision Drop Zone)
        left_col = tk.Frame(main_split, bg=PALETTE["bg_card"], bd=1, relief="solid")
        left_col.pack(side="left", fill="both", expand=True, padx=(0, 6))

        # Right Column (Presets, Refinements & Output)
        right_col = tk.Frame(main_split, bg=PALETTE["bg_card"], bd=1, relief="solid")
        right_col.pack(side="right", fill="both", expand=True, padx=(6, 0))

        # --- LEFT COLUMN COMPONENTS ---
        # Header for Left
        lbl_left_head = tk.Label(
            left_col,
            text="[ INPUT CHAMBER: IDEA & VISION SLOT ]",
            font=("Monospace", 10, "bold"),
            fg=PALETTE["amber"],
            bg=PALETTE["bg_card"],
            anchor="w"
        )
        lbl_left_head.pack(fill="x", padx=12, pady=(10, 4))

        # User's Idea Prompt Box (12pt monospace per user specifications)
        lbl_idea = tk.Label(
            left_col,
            text="USER'S IDEA / SOURCE PROMPT (Drop images directly here or into vision slot):",
            font=("Monospace", 9),
            fg=PALETTE["fg_text"],
            bg=PALETTE["bg_card"],
            anchor="w"
        )
        lbl_idea.pack(fill="x", padx=12, pady=(6, 2))

        # Idea text widget with scrollbar
        txt_frame = tk.Frame(left_col, bg=PALETTE["bg_input"], bd=1, relief="solid")
        txt_frame.pack(fill="x", padx=12, pady=4)

        self.txt_source = tk.Text(
            txt_frame,
            height=6,
            font=("Monospace", 12),  # 12pt monospace per user preferences
            bg=PALETTE["bg_input"],
            fg=PALETTE["fg_text"],
            insertbackground=PALETTE["amber"],
            selectbackground=PALETTE["amber_dim"],
            selectforeground=PALETTE["fg_text"],
            wrap="word",
            bd=0,
            padx=8,
            pady=8
        )
        self.txt_source.pack(side="left", fill="both", expand=True)

        scr_source = ttk.Scrollbar(txt_frame, orient="vertical", command=self.txt_source.yview)
        scr_source.pack(side="right", fill="y")
        self.txt_source.configure(yscrollcommand=scr_source.set)

        # Quick action buttons under prompt
        prompt_btns = tk.Frame(left_col, bg=PALETTE["bg_card"])
        prompt_btns.pack(fill="x", padx=12, pady=4)

        btn_rand = tk.Button(
            prompt_btns, text="🎲 SURPRISE ME (RANDOM ANALOG)", font=("Monospace", 8, "bold"),
            bg=PALETTE["bg_dark"], fg=PALETTE["fg_text"], bd=1, relief="solid",
            command=self._generate_random_prompt
        )
        btn_rand.pack(side="left", padx=(0, 6))

        btn_wiki = tk.Button(
            prompt_btns, text="🏛 ENRICH VIA WIKIPEDIA", font=("Monospace", 8, "bold"),
            bg=PALETTE["bg_dark"], fg=PALETTE["olive"], bd=1, relief="solid",
            command=self._enrich_from_wikipedia
        )
        btn_wiki.pack(side="left", padx=4)

        btn_clear = tk.Button(
            prompt_btns, text="CLEAR", font=("Monospace", 8),
            bg=PALETTE["bg_dark"], fg=PALETTE["fg_muted"], bd=1, relief="solid",
            command=self._clear_source_prompt
        )
        btn_clear.pack(side="right")

        # --- VISION DROP & ACTIVATION SLOT ---
        lbl_vis_head = tk.Label(
            left_col,
            text="VISION REFERENCE SLOT (Drag & drop image file or click Browse):",
            font=("Monospace", 9, "bold"),
            fg=PALETTE["fg_text"],
            bg=PALETTE["bg_card"],
            anchor="w"
        )
        lbl_vis_head.pack(fill="x", padx=12, pady=(10, 4))

        # The Drop Target Zone
        self.frame_drop_zone = tk.Frame(
            left_col,
            bg=PALETTE["bg_input"],
            bd=2,
            relief="dashed",
            highlightbackground=PALETTE["border"],
            highlightthickness=1,
            height=140
        )
        self.frame_drop_zone.pack(fill="x", padx=12, pady=4)
        self.frame_drop_zone.pack_propagate(False)

        self.lbl_drop_visual = tk.Label(
            self.frame_drop_zone,
            text="[ DRAG & DROP IMAGE FILE HERE ]\n\nSupports JPG, PNG, WEBP, BMP from Thunar/Nautilus/Dolphin\nOr drop into the text box above to auto-activate",
            font=("Monospace", 9),
            fg=PALETTE["fg_muted"],
            bg=PALETTE["bg_input"],
            justify="center"
        )
        self.lbl_drop_visual.pack(fill="both", expand=True, padx=8, pady=8)

        # Vision Controls & Status Strip
        vis_status_frame = tk.Frame(left_col, bg=PALETTE["bg_card"])
        vis_status_frame.pack(fill="x", padx=12, pady=4)

        self.lbl_image_status = tk.Label(
            vis_status_frame,
            text="STATUS: NO IMAGE ATTACHED",
            font=("Monospace", 8, "bold"),
            fg=PALETTE["fg_muted"],
            bg=PALETTE["bg_card"]
        )
        self.lbl_image_status.pack(side="left")

        btn_browse = tk.Button(
            vis_status_frame, text="BROWSE...", font=("Monospace", 8, "bold"),
            bg=PALETTE["bg_dark"], fg=PALETTE["amber"], bd=1, relief="solid",
            command=self._browse_image
        )
        btn_browse.pack(side="right", padx=(4, 0))

        self.btn_clear_img = tk.Button(
            vis_status_frame, text="DETACH", font=("Monospace", 8),
            bg=PALETTE["bg_dark"], fg=PALETTE["orange"], bd=1, relief="solid",
            command=self._detach_image, state="disabled"
        )
        self.btn_clear_img.pack(side="right", padx=4)

        # Image Vision Attributes Analysis Display
        lbl_attr = tk.Label(
            left_col,
            text="VISION DECONSTRUCTION (Subject, Lighting, Atmosphere, Film Grain):",
            font=("Monospace", 8, "bold"),
            fg=PALETTE["fg_muted"],
            bg=PALETTE["bg_card"],
            anchor="w"
        )
        lbl_attr.pack(fill="x", padx=12, pady=(10, 2))

        txt_attr_frame = tk.Frame(left_col, bg=PALETTE["bg_input"], bd=1, relief="solid")
        txt_attr_frame.pack(fill="both", expand=True, padx=12, pady=(2, 10))

        self.txt_vision_attr = tk.Text(
            txt_attr_frame,
            height=6,
            font=("Monospace", 10),
            bg=PALETTE["bg_input"],
            fg=PALETTE["fg_text"],
            wrap="word",
            bd=0,
            padx=8,
            pady=8
        )
        self.txt_vision_attr.pack(side="left", fill="both", expand=True)

        scr_attr = ttk.Scrollbar(txt_attr_frame, orient="vertical", command=self.txt_vision_attr.yview)
        scr_attr.pack(side="right", fill="y")
        self.txt_vision_attr.configure(yscrollcommand=scr_attr.set)

        # --- RIGHT COLUMN COMPONENTS ---
        lbl_right_head = tk.Label(
            right_col,
            text="[ CONTROL MATRIX: STYLES & REFINEMENT ]",
            font=("Monospace", 10, "bold"),
            fg=PALETTE["amber"],
            bg=PALETTE["bg_card"],
            anchor="w"
        )
        lbl_right_head.pack(fill="x", padx=12, pady=(10, 4))

        # Preset Style Selector + l3afpad Editor integration
        preset_frame = tk.Frame(right_col, bg=PALETTE["bg_card"])
        preset_frame.pack(fill="x", padx=12, pady=4)

        tk.Label(preset_frame, text="FILM PRESET:", font=("Monospace", 9, "bold"), fg=PALETTE["fg_text"], bg=PALETTE["bg_card"]).pack(side="left")
        self.combo_presets = ttk.Combobox(preset_frame, width=32, state="readonly")
        self.combo_presets.pack(side="left", padx=6)

        btn_edit_preset = tk.Button(
            preset_frame, text="EDIT (l3afpad)", font=("Monospace", 8),
            bg=PALETTE["bg_dark"], fg=PALETTE["amber"], bd=1, relief="solid",
            command=self._edit_selected_preset
        )
        btn_edit_preset.pack(side="left", padx=2)

        btn_new_preset = tk.Button(
            preset_frame, text="+", font=("Monospace", 8, "bold"),
            bg=PALETTE["bg_dark"], fg=PALETTE["olive"], bd=1, relief="solid",
            command=self._create_new_preset
        )
        btn_new_preset.pack(side="left", padx=2)

        # Persona Selector
        persona_frame = tk.Frame(right_col, bg=PALETTE["bg_card"])
        persona_frame.pack(fill="x", padx=12, pady=4)

        tk.Label(persona_frame, text="PERSONA:   ", font=("Monospace", 9, "bold"), fg=PALETTE["fg_text"], bg=PALETTE["bg_card"]).pack(side="left")
        self.combo_personas = ttk.Combobox(persona_frame, width=32, state="readonly")
        self.combo_personas.pack(side="left", padx=6)

        btn_edit_persona = tk.Button(
            persona_frame, text="EDIT (l3afpad)", font=("Monospace", 8),
            bg=PALETTE["bg_dark"], fg=PALETTE["amber"], bd=1, relief="solid",
            command=self._edit_selected_persona
        )
        btn_edit_persona.pack(side="left", padx=2)

        # Tuning Parameters: Aspect Ratio & Photographic Tuning
        tune_frame = tk.Frame(right_col, bg=PALETTE["bg_card"])
        tune_frame.pack(fill="x", padx=12, pady=6)

        tk.Label(tune_frame, text="ASPECT RATIO:", font=("Monospace", 8, "bold"), fg=PALETTE["fg_muted"], bg=PALETTE["bg_card"]).grid(row=0, column=0, sticky="w", padx=2)
        self.combo_aspect = ttk.Combobox(tune_frame, values=["1:1 (Square)", "16:9 (Cinematic)", "4:3 (Classic 35mm)", "2:3 (Portrait)", "21:9 (Anamorphic)"], width=18, state="readonly")
        self.combo_aspect.set("4:3 (Classic 35mm)")
        self.combo_aspect.grid(row=0, column=1, padx=4, sticky="w")

        tk.Label(tune_frame, text="LIGHTING MOOD:", font=("Monospace", 8, "bold"), fg=PALETTE["fg_muted"], bg=PALETTE["bg_card"]).grid(row=0, column=2, sticky="w", padx=(12, 2))
        self.combo_lighting = ttk.Combobox(tune_frame, values=["Natural Overcast Golden", "Harsh Chiaroscuro Noir", "Tungsten Halation & Neon", "Warm Sunlight Flare", "Darkroom Red Amber", "Direct On-Camera Flash"], width=20, state="readonly")
        self.combo_lighting.set("Natural Overcast Golden")
        self.combo_lighting.grid(row=0, column=3, padx=4, sticky="w")

        # THE MAIN EXECUTE BUTTON
        self.btn_forge = tk.Button(
            right_col,
            text="⚡ FORGE DENSE NARRATIVE PROMPT",
            font=("Monospace", 11, "bold"),
            bg=PALETTE["orange"],
            fg=PALETTE["bg_dark"],
            activebackground=PALETTE["highlight"],
            activeforeground=PALETTE["bg_dark"],
            bd=2,
            relief="solid",
            command=self._start_forge_pipeline
        )
        self.btn_forge.pack(fill="x", padx=12, pady=8)

        # Output Positive Prompt (12pt Monospace per user preference)
        lbl_out_pos = tk.Label(
            right_col,
            text="FINAL POSITIVE PROMPT (High density, ready for Flux/Midjourney/SDXL):",
            font=("Monospace", 9, "bold"),
            fg=PALETTE["amber"],
            bg=PALETTE["bg_card"],
            anchor="w"
        )
        lbl_out_pos.pack(fill="x", padx=12, pady=(4, 2))

        txt_out_frame = tk.Frame(right_col, bg=PALETTE["bg_input"], bd=1, relief="solid")
        txt_out_frame.pack(fill="both", expand=True, padx=12, pady=2)

        self.txt_final_pos = tk.Text(
            txt_out_frame,
            height=7,
            font=("Monospace", 12),  # 12pt monospace for comfortable prompt reading
            bg=PALETTE["bg_input"],
            fg=PALETTE["fg_text"],
            insertbackground=PALETTE["amber"],
            wrap="word",
            bd=0,
            padx=8,
            pady=8
        )
        self.txt_final_pos.pack(side="left", fill="both", expand=True)

        scr_out = ttk.Scrollbar(txt_out_frame, orient="vertical", command=self.txt_final_pos.yview)
        scr_out.pack(side="right", fill="y")
        self.txt_final_pos.configure(yscrollcommand=scr_out.set)

        # Negative Prompt Strip
        lbl_out_neg = tk.Label(
            right_col,
            text="NEGATIVE PROMPT:",
            font=("Monospace", 8, "bold"),
            fg=PALETTE["fg_muted"],
            bg=PALETTE["bg_card"],
            anchor="w"
        )
        lbl_out_neg.pack(fill="x", padx=12, pady=(4, 2))

        self.txt_final_neg = tk.Text(
            right_col,
            height=2,
            font=("Monospace", 10),
            bg=PALETTE["bg_input"],
            fg=PALETTE["fg_muted"],
            wrap="word",
            bd=1,
            relief="solid",
            padx=6,
            pady=4
        )
        self.txt_final_neg.pack(fill="x", padx=12, pady=(0, 6))
        self.txt_final_neg.insert("1.0", "digital rendering, 3d cgi render, plastic skin, anime, oversaturated neon, chromatic aberration, cartoon, blurry, watermark, low quality")

        # Bottom Action Bar (Copy, Quick Save, Journal)
        bottom_bar = tk.Frame(right_col, bg=PALETTE["bg_card"])
        bottom_bar.pack(fill="x", padx=12, pady=(0, 10))

        btn_copy = tk.Button(
            bottom_bar, text="📋 COPY PROMPT", font=("Monospace", 9, "bold"),
            bg=PALETTE["bg_dark"], fg=PALETTE["amber"], bd=1, relief="solid",
            command=self._copy_final_prompt
        )
        btn_copy.pack(side="left", padx=(0, 6))

        btn_save = tk.Button(
            bottom_bar, text="💾 QUICK SAVE (GREPPABLE)", font=("Monospace", 9, "bold"),
            bg=PALETTE["bg_dark"], fg=PALETTE["olive"], bd=1, relief="solid",
            command=self._quick_save_prompt
        )
        btn_save.pack(side="left", padx=4)

        btn_journal = tk.Button(
            bottom_bar, text="📜 EVENT JOURNAL", font=("Monospace", 9),
            bg=PALETTE["bg_dark"], fg=PALETTE["fg_text"], bd=1, relief="solid",
            command=self._show_journal_window
        )
        btn_journal.pack(side="right")

        # 3. Status Bar at Window Bottom
        self.status_bar = tk.Label(
            self.root,
            text="READY // DROP IMAGE INTO PROMPT OR VISION SLOT",
            font=("Monospace", 8),
            fg=PALETTE["fg_muted"],
            bg=PALETTE["bg_dark"],
            anchor="w",
            padx=14,
            pady=4
        )
        self.status_bar.pack(fill="x", side="bottom")

    # -----------------------------------------------------------------------
    # DRAG & DROP & TEXT MODIFICATION OBSERVERS
    # -----------------------------------------------------------------------
    def _setup_drag_and_drop(self):
        """
        Configures fail-proof drag-and-drop support:
        1. TkinterDnD2 system DND if available
        2. Text modification & drop event interception (essential for Debian / Thunar / Nautilus)
        3. Drop zone bindings
        """
        # A. If TkinterDnD is available
        if HAS_TKDND and isinstance(self.root, TkinterDnD.DnDWrapper):
            try:
                self.txt_source.drop_target_register(DND_FILES)
                self.txt_source.dnd_bind("<<Drop>>", self._on_tkdnd_drop)

                self.frame_drop_zone.drop_target_register(DND_FILES)
                self.frame_drop_zone.dnd_bind("<<Drop>>", self._on_tkdnd_drop)
                self.lbl_drop_visual.drop_target_register(DND_FILES)
                self.lbl_drop_visual.dnd_bind("<<Drop>>", self._on_tkdnd_drop)
                self._log_status("TkinterDnD2 registered successfully.")
            except Exception as e:
                print(f"[TkDnD Error] {e}")

        # B. Debian X11 / Wayland Text Box Drop & Paste Interception:
        # When a file is dropped into a standard Tkinter Text widget on Linux,
        # Tkinter fires <<Modified>>, <ButtonRelease-1>, or <<Paste>>, pasting
        # a URI like file:///home/user/Pictures/test.jpg or plain path.
        self.txt_source.bind("<<Modified>>", self._on_source_text_modified)
        self.txt_source.bind("<ButtonRelease-1>", self._on_source_button_release)
        self.txt_source.bind("<<Paste>>", self._on_source_paste)
        self.txt_source.bind("<KeyRelease>", self._on_source_key_release)

        # C. Click or manual drop on drop zone
        self.frame_drop_zone.bind("<Button-1>", lambda e: self._browse_image())
        self.lbl_drop_visual.bind("<Button-1>", lambda e: self._browse_image())

    def _on_tkdnd_drop(self, event):
        """Handles dropped files from TkinterDnD2."""
        raw_data = event.data
        if not raw_data:
            return

        # Handle brace enclosed paths (e.g. {/path with spaces/pic.png})
        paths = []
        if "{" in raw_data:
            paths = re.findall(r'\{([^}]+)\}', raw_data)
        if not paths:
            paths = raw_data.split()

        for p in paths:
            clean_path = urllib.parse.unquote(p.strip())
            if clean_path.startswith("file://"):
                clean_path = clean_path[7:]
            if os.path.isfile(clean_path):
                self._activate_image(clean_path)
                return "break"
        return "break"

    def _on_source_text_modified(self, event=None):
        """
        Triggered whenever the source text widget changes.
        CRITICAL: Must reset edit_modified(False) or Tkinter will NEVER fire this again!
        """
        try:
            if not self.txt_source.edit_modified():
                return
            # Reset modified flag immediately
            self.txt_source.edit_modified(False)

            content = self.txt_source.get("1.0", "end-1c")
            found_img, cleaned_text = extract_image_path_from_text(content)

            if found_img:
                self._activate_image(found_img)
                # Replace the text widget content with the cleaned text so the file path is gone
                self.txt_source.delete("1.0", "end")
                if cleaned_text:
                    self.txt_source.insert("1.0", cleaned_text)
                self._log_status(f"IMAGE ACTIVATED: {os.path.basename(found_img)}")
        except Exception as e:
            print(f"[Modified Handler Error] {e}")

    def _on_source_button_release(self, event=None):
        """Fires immediately after mouse drop into text widget."""
        self.root.after(80, self._inspect_source_for_dropped_image)

    def _on_source_paste(self, event=None):
        """Fires when text or path is pasted into text widget."""
        self.root.after(80, self._inspect_source_for_dropped_image)

    def _on_source_key_release(self, event=None):
        """Checks for path paste on key release (e.g. Ctrl+V)."""
        if event and event.keysym in ("v", "V", "Return", "Insert"):
            self.root.after(80, self._inspect_source_for_dropped_image)

    def _inspect_source_for_dropped_image(self):
        """Examines text content and intercepts any dropped image path."""
        try:
            content = self.txt_source.get("1.0", "end-1c")
            found_img, cleaned_text = extract_image_path_from_text(content)
            if found_img:
                self._activate_image(found_img)
                self.txt_source.delete("1.0", "end")
                if cleaned_text:
                    self.txt_source.insert("1.0", cleaned_text)
                self._log_status(f"IMAGE ACTIVATED: {os.path.basename(found_img)}")
        except Exception as e:
            print(f"[Inspect Error] {e}")

    # -----------------------------------------------------------------------
    # IMAGE ACTIVATION & VISION LOGIC
    # -----------------------------------------------------------------------
    def _activate_image(self, img_path):
        """Activates image into the Vision Slot and updates thumbnail & status."""
        if not os.path.isfile(img_path):
            return

        self.current_image_path = img_path
        filename = os.path.basename(img_path)
        filesize = os.path.getsize(img_path) / 1024.0

        # Read base64 for Ollama
        import base64
        try:
            with open(img_path, "rb") as f:
                self.current_image_b64 = base64.b64encode(f.read()).decode("utf-8")
        except Exception as e:
            self._log_status(f"Error reading image: {e}")
            return

        # Update Drop Target Visual
        self.lbl_image_status.config(
            text=f"ACTIVE VISION: {filename[:28]} ({filesize:.1f} KB)",
            fg=PALETTE["olive"]
        )
        self.btn_clear_img.config(state="normal")
        self.frame_drop_zone.config(bg="#1e221b", highlightbackground=PALETTE["olive"])

        # Try rendering thumbnail
        rendered = False
        if HAS_PIL:
            try:
                pil_img = Image.open(img_path)
                pil_img.thumbnail((240, 110))
                self.loaded_image_obj = ImageTk.PhotoImage(pil_img)
                self.lbl_drop_visual.config(
                    image=self.loaded_image_obj,
                    text="",
                    bg="#1e221b"
                )
                rendered = True
            except Exception:
                rendered = False

        if not rendered:
            self.lbl_drop_visual.config(
                image="",
                text=f"📸 ACTIVE VISION LOADED\n\n{filename}\nFile Size: {filesize:.1f} KB\nReady for Vision Deconstruction",
                fg=PALETTE["highlight"],
                bg="#1e221b"
            )

        # Trigger automatic initial vision extraction in background
        self._analyze_image_attributes_async(img_path)

    def _browse_image(self):
        filetypes = [
            ("Image files", "*.jpg *.jpeg *.png *.webp *.bmp *.gif *.tiff"),
            ("All files", "*.*")
        ]
        chosen = filedialog.askopenfilename(title="Select Vision Reference Image", filetypes=filetypes)
        if chosen:
            self._activate_image(chosen)

    def _detach_image(self):
        self.current_image_path = None
        self.current_image_b64 = None
        self.loaded_image_obj = None
        self.lbl_image_status.config(text="STATUS: NO IMAGE ATTACHED", fg=PALETTE["fg_muted"])
        self.btn_clear_img.config(state="disabled")
        self.frame_drop_zone.config(bg=PALETTE["bg_input"], highlightbackground=PALETTE["border"])
        self.lbl_drop_visual.config(
            image="",
            text="[ DRAG & DROP IMAGE FILE HERE ]\n\nSupports JPG, PNG, WEBP, BMP from Thunar/Nautilus/Dolphin\nOr drop into the text box above to auto-activate",
            fg=PALETTE["fg_muted"],
            bg=PALETTE["bg_input"]
        )
        self.txt_vision_attr.delete("1.0", "end")
        self._log_status("Image detached from vision slot.")

    # -----------------------------------------------------------------------
    # PROMPT FORGE PIPELINE
    # -----------------------------------------------------------------------
    def _analyze_image_attributes_async(self, img_path):
        """Asynchronously calls vision model or heuristic deconstruction."""
        def run():
            self._log_status("Deconstructing visual attributes...")
            model = self.combo_model.get().strip()
            # If Ollama has vision model available, query it
            prompt = (
                "Deconstruct this image into internal visual attributes for image-generation prompt crafting. "
                "Format concisely:\n"
                "- Subject & Pose:\n"
                "- Composition & Framing:\n"
                "- Lighting & Highlights:\n"
                "- Color Palette & Film Cast:\n"
                "- Atmosphere & Grain/Texture:\n"
                "- Era / Lens Aesthetic:"
            )
            analysis = ""
            if self.current_image_b64 and model:
                try:
                    analysis = self.ollama.generate(
                        model=model,
                        prompt=prompt,
                        images=[self.current_image_b64]
                    )
                except Exception as e:
                    analysis = f"Direct vision model query failed ({e}).\nUsing offline heuristic deconstruction:\n- Subject: Extracted from visual frame\n- Tone: Vintage analog analog\n- Grain: Gelatin silver grain structure"
            else:
                analysis = (
                    f"Image Reference: {os.path.basename(img_path)}\n"
                    "- Subject: Visual subject extracted from source\n"
                    "- Lighting: Directional tungsten / warm analog spill\n"
                    "- Texture: Authentic 35mm film emulsion grain\n"
                    "- Palette: Amber, deep charcoal, muted ochre"
                )

            def update():
                self.txt_vision_attr.delete("1.0", "end")
                self.txt_vision_attr.insert("1.0", analysis.strip())
                self._log_status("Vision deconstruction complete.")
            self.root.after(0, update)

        threading.Thread(target=run, daemon=True).start()

    def _start_forge_pipeline(self):
        """Executes the complete INPUT → ANALYZE → TRANSFORM → ENRICH → REFINE → FINAL pipeline."""
        idea = self.txt_source.get("1.0", "end-1c").strip()
        vision_attr = self.txt_vision_attr.get("1.0", "end-1c").strip()
        preset_name = self.combo_presets.get()
        persona_name = self.combo_personas.get()
        aspect_ratio = self.combo_aspect.get()
        lighting_mood = self.combo_lighting.get()
        model = self.combo_model.get().strip()

        if not idea and not self.current_image_path:
            messagebox.showwarning("Input Required", "Please enter an idea prompt or drop a vision reference image.")
            return

        self.btn_forge.config(state="disabled", text="⚡ FORGING DENSE PROMPT...")
        self._log_status("Pipeline engaged: transforming raw intent into dense analog prompt...")

        # Read preset prompt content
        preset_content = ""
        preset_file = os.path.join(PRESETS_DIR, f"{preset_name}.txt")
        if os.path.exists(preset_file):
            try:
                with open(preset_file, "r", encoding="utf-8") as f:
                    preset_content = f.read().strip()
            except Exception:
                pass
        if not preset_content and preset_name in DEFAULT_PRESETS:
            preset_content = DEFAULT_PRESETS[preset_name]

        # Read persona content
        persona_content = ""
        persona_file = os.path.join(PERSONAS_DIR, f"{persona_name}.txt")
        if os.path.exists(persona_file):
            try:
                with open(persona_file, "r", encoding="utf-8") as f:
                    persona_content = f.read().strip()
            except Exception:
                pass
        if not persona_content and persona_name in DEFAULT_PERSONAS:
            persona_content = DEFAULT_PERSONAS[persona_name]

        def worker():
            system_instruction = (
                f"{persona_content}\n\n"
                "You are PROMPT FORGE, a specialized workstation for synthesizing AI image prompts. "
                "Transform the user's raw idea into a dense, visually coherent, narrative positive image prompt. "
                "Include concrete tactile elements: subjects, environmental details, physical materials, camera equipment, "
                "aperture, lighting characteristics, and film emulsion texture. "
                "Do NOT use generic buzzwords like 'photorealistic' or 'ultra detailed'. Describe the visual reality directly. "
                "Output ONLY the final prompt text without conversational preamble or quotes."
            )

            prompt_request = f"USER RAW INTENT: {idea if idea else '[Derive primarily from Vision Reference]'}\n"
            if vision_attr:
                prompt_request += f"\nVISION DECONSTRUCTION ATTRIBUTES:\n{vision_attr}\n"
            if preset_content:
                prompt_request += f"\nFILM STOCK & STYLE PRESET:\n{preset_content}\n"
            if lighting_mood:
                prompt_request += f"\nLIGHTING MOOD OVERRIDE: {lighting_mood}\n"
            if aspect_ratio:
                ar_tag = aspect_ratio.split()[0]
                prompt_request += f"\nASPECT RATIO FORMAT: --ar {ar_tag}\n"

            final_prompt = ""
            if model:
                try:
                    images_arg = [self.current_image_b64] if self.current_image_b64 else None
                    resp = self.ollama.generate(
                        model=model,
                        prompt=prompt_request,
                        images=images_arg,
                        system=system_instruction
                    )
                    final_prompt = resp.strip()
                except Exception as e:
                    self._log_status(f"Ollama offline ({e}), synthesizing via local analog engine.")
                    final_prompt = ""

            if not final_prompt:
                # Built-in offline synthesis fallback
                ar_code = aspect_ratio.split()[0] if aspect_ratio else "4:3"
                parts = []
                if idea:
                    parts.append(f"A richly detailed scene of {idea.rstrip('.')}")
                elif vision_attr:
                    parts.append("A cinematic composition capturing the photographic essence")
                if lighting_mood:
                    parts.append(f"illuminated by {lighting_mood.lower()}")
                if preset_content:
                    parts.append(preset_content)
                parts.append(f"--ar {ar_code}")
                final_prompt = ", ".join(parts)

            def update_ui():
                self.txt_final_pos.delete("1.0", "end")
                self.txt_final_pos.insert("1.0", final_prompt)
                self.btn_forge.config(state="normal", text="⚡ FORGE DENSE NARRATIVE PROMPT")
                self._log_status("Prompt forged successfully. Ready to copy or quick save.")

                # Log to SQLite
                self._log_to_db(
                    model=model,
                    source_input=idea,
                    image_path=self.current_image_path or "",
                    preset=preset_name,
                    enrichment=vision_attr,
                    final_pos=final_prompt,
                    final_neg=self.txt_final_neg.get("1.0", "end-1c").strip()
                )

            self.root.after(0, update_ui)

        threading.Thread(target=worker, daemon=True).start()

    # -----------------------------------------------------------------------
    # WIKIPEDIA & RANDOM HELPERS
    # -----------------------------------------------------------------------
    def _enrich_from_wikipedia(self):
        """Pulls cultural/historical entities from the prompt and enriches context."""
        idea = self.txt_source.get("1.0", "end-1c").strip()
        if not idea:
            messagebox.showinfo("Wikipedia Enrichment", "Please enter a subject, term, or entity in the prompt box first (e.g. 'Kodachrome', 'Brutalism', 'Oni mask').")
            return

        # Pick key subject query
        words = idea.split()
        query = " ".join(words[:4])

        def run():
            self._log_status(f"Scraping Wikipedia for '{query}'...")
            summary = fetch_wikipedia_summary(query)
            def update():
                if summary:
                    current_vis = self.txt_vision_attr.get("1.0", "end-1c").strip()
                    enrich_block = f"\n\n[WIKIPEDIA CULTURAL ENRICHMENT]:\n{summary}"
                    self.txt_vision_attr.delete("1.0", "end")
                    self.txt_vision_attr.insert("1.0", (current_vis + enrich_block).strip())
                    self._log_status("Wikipedia enrichment appended to vision context.")
                else:
                    self._log_status(f"No Wikipedia article found for '{query}'.")
            self.root.after(0, update)

        threading.Thread(target=run, daemon=True).start()

    def _generate_random_prompt(self):
        samples = [
            "A weathered 1970s rally racing driver stepping out of a muddy Lancia Stratos under dusk rain in the Italian Alps",
            "An underground electronic music synthesist surrounded by modular patch cables and glowing vacuum tubes in a dimly lit 1976 Berlin basement",
            "A solitary botanist cataloging bioluminescent specimens inside a foggy Victorian greenhouse during golden hour",
            "A mid-century brutalist concrete library interior with shafts of afternoon dust-mote light hitting teak reading tables",
            "A Japanese street artisan carving an intricate wooden theater mask beside a rain-slicked neon alleyway in 1978 Shinjuku"
        ]
        import random
        chosen = random.choice(samples)
        self.txt_source.delete("1.0", "end")
        self.txt_source.insert("1.0", chosen)
        self._log_status("Random analog scenario loaded.")

    def _clear_source_prompt(self):
        self.txt_source.delete("1.0", "end")
        self._log_status("Prompt cleared.")

    # -----------------------------------------------------------------------
    # SAVING, EXPORT & EDITOR INTEGRATION
    # -----------------------------------------------------------------------
    def _quick_save_prompt(self):
        """
        Saves prompt to ~/.promptforge/saved_prompts/ with grep-friendly header
        and timestamped filename: [ID]_[Day]_[Month]_[DayNumber]_[Year]_[Time-Secs].txt
        """
        final_pos = self.txt_final_pos.get("1.0", "end-1c").strip()
        if not final_pos:
            messagebox.showinfo("Quick Save", "No final prompt to save yet. Click Forge first.")
            return

        now = datetime.datetime.now()
        timestamp_str = now.strftime("%a_%b_%d_%Y_%H-%M-%S")
        record_id = int(time.time() % 100000)
        filename = f"{record_id:05d}_{timestamp_str}.txt"
        filepath = os.path.join(SAVES_DIR, filename)

        header = (
            "--- PROMPT FORGE RECORD ---\n"
            f"ID: {record_id:05d}\n"
            f"TIMESTAMP: {now.isoformat()}\n"
            f"MODEL: {self.combo_model.get()}\n"
            f"PRESET: {self.combo_presets.get()}\n"
            f"PERSONA: {self.combo_personas.get()}\n"
            f"ASPECT: {self.combo_aspect.get()}\n"
            f"IMAGE_REF: {self.current_image_path or 'NONE'}\n"
            "---------------------------\n"
            "POSITIVE_PROMPT:\n"
            f"{final_pos}\n\n"
            "NEGATIVE_PROMPT:\n"
            f"{self.txt_final_neg.get('1.0', 'end-1c').strip()}\n"
        )

        try:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(header)
            self._log_status(f"QUICK-SAVED: {filename} (~/.promptforge/saved_prompts/)")
            messagebox.showinfo("Quick Save Successful", f"Saved to:\n{filepath}\n\nEasily searchable with grep/sed:\ngrep -rn 'POSITIVE_PROMPT' ~/.promptforge/saved_prompts/")
        except Exception as e:
            messagebox.showerror("Save Error", f"Could not save prompt: {e}")

    def _copy_final_prompt(self):
        final_pos = self.txt_final_pos.get("1.0", "end-1c").strip()
        if final_pos:
            self.root.clipboard_clear()
            self.root.clipboard_append(final_pos)
            self._log_status("Prompt copied to clipboard.")

    def _edit_selected_preset(self):
        preset_name = self.combo_presets.get()
        if not preset_name:
            return
        fname = f"{preset_name}.txt"
        fpath = os.path.join(PRESETS_DIR, fname)
        if not os.path.exists(fpath):
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(DEFAULT_PRESETS.get(preset_name, ""))
        if not open_in_editor(fpath):
            messagebox.showwarning("Editor", f"Could not launch l3afpad or default editor.\nFile is at:\n{fpath}")

    def _create_new_preset(self):
        from tkinter import simpledialog
        name = simpledialog.askstring("New Preset", "Enter Preset Name:")
        if name:
            clean_name = re.sub(r'[^\w\-_\. ]', '_', name)
            fpath = os.path.join(PRESETS_DIR, f"{clean_name}.txt")
            if not os.path.exists(fpath):
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write("Enter 70s analog film attributes, camera gear, lighting, and grain descriptors here...")
            open_in_editor(fpath)
            self._load_presets_list(select=clean_name)

    def _edit_selected_persona(self):
        persona_name = self.combo_personas.get()
        if not persona_name:
            return
        fname = f"{persona_name}.txt"
        fpath = os.path.join(PERSONAS_DIR, fname)
        if not os.path.exists(fpath):
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(DEFAULT_PERSONAS.get(persona_name, ""))
        if not open_in_editor(fpath):
            messagebox.showwarning("Editor", f"Could not launch l3afpad or default editor.\nFile is at:\n{fpath}")

    def _load_presets_list(self, select=None):
        presets = []
        if os.path.exists(PRESETS_DIR):
            for f in os.listdir(PRESETS_DIR):
                if f.endswith(".txt"):
                    presets.append(os.path.splitext(f)[0])
        if not presets:
            presets = list(DEFAULT_PRESETS.keys())
        presets.sort()
        self.combo_presets["values"] = presets
        if select and select in presets:
            self.combo_presets.set(select)
        elif presets:
            self.combo_presets.set(presets[0])

        personas = []
        if os.path.exists(PERSONAS_DIR):
            for f in os.listdir(PERSONAS_DIR):
                if f.endswith(".txt"):
                    personas.append(os.path.splitext(f)[0])
        if not personas:
            personas = list(DEFAULT_PERSONAS.keys())
        personas.sort()
        self.combo_personas["values"] = personas
        if personas:
            self.combo_personas.set(personas[0])

    def _refresh_models_async(self):
        def run():
            self._log_status("Connecting to local Ollama (http://localhost:11434)...")
            models = self.ollama.list_models()
            def update():
                if models:
                    self.combo_model["values"] = models
                    # Prefer vision capable models if present
                    vision_candidates = [m for m in models if any(k in m.lower() for k in ("vision", "llava", "minicpm", "moondream"))]
                    if vision_candidates:
                        self.combo_model.set(vision_candidates[0])
                    else:
                        self.combo_model.set(models[0])
                    self._log_status(f"Ollama connected ({len(models)} models available).")
                else:
                    self.combo_model["values"] = ["No local Ollama (Offline)"]
                    self.combo_model.set("No local Ollama (Offline)")
                    self._log_status("Ollama offline. Run 'ollama serve' locally. Offline synthesis active.")
            self.root.after(0, update)

        threading.Thread(target=run, daemon=True).start()

    def _log_to_db(self, model, source_input, image_path, preset, enrichment, final_pos, final_neg):
        try:
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO prompt_logs (timestamp, model, source_input, image_path, preset_used, enrichment_context, final_positive, final_negative)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (datetime.datetime.now().isoformat(), model, source_input, image_path, preset, enrichment, final_pos, final_neg))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[DB Log Error] {e}")

    def _show_journal_window(self):
        """Displays historical event journal with search & copy."""
        w = tk.Toplevel(self.root)
        w.title("Prompt Forge // Event Journal & Log History")
        w.geometry("820x540")
        w.configure(bg=PALETTE["bg_dark"])

        lbl = tk.Label(w, text="HISTORICAL PROMPT JOURNAL (SQLite)", font=("Monospace", 10, "bold"), fg=PALETTE["amber"], bg=PALETTE["bg_dark"])
        lbl.pack(fill="x", padx=12, pady=8)

        txt = tk.Text(w, font=("Monospace", 10), bg=PALETTE["bg_input"], fg=PALETTE["fg_text"], wrap="word", padx=8, pady=8)
        txt.pack(fill="both", expand=True, padx=12, pady=8)

        try:
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            cur.execute("SELECT id, timestamp, model, preset_used, final_positive FROM prompt_logs ORDER BY id DESC LIMIT 50")
            rows = cur.fetchall()
            conn.close()
            if rows:
                for r in rows:
                    entry = f"[{r[0]}] {r[1]} | Model: {r[2]} | Preset: {r[3]}\nPROMPT: {r[4]}\n{'-'*60}\n\n"
                    txt.insert("end", entry)
            else:
                txt.insert("end", "No prompt logs recorded yet.")
        except Exception as e:
            txt.insert("end", f"Error loading logs: {e}")

    def _log_status(self, msg):
        now = datetime.datetime.now().strftime("%H:%M:%S")
        self.status_bar.config(text=f"[{now}] {msg}")

# ---------------------------------------------------------------------------
# MAIN ENTRY POINT
# ---------------------------------------------------------------------------
def main():
    if not HAS_TK:
        print("[PROMPT FORGE ERROR] Tkinter is not installed on this Python runtime.")
        print("On Debian/Ubuntu, please install it with:")
        print("   sudo apt-get install python3-tk python3-pil python3-pil.imagetk")
        sys.exit(1)

    if HAS_TKDND:
        root = TkinterDnD.Tk()
    else:
        root = tk.Tk()

    app = PromptForgeApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
