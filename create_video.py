"""
SIGAM — Animated presentation video generator.
Renders frames with Pillow, assembles with moviepy + imageio-ffmpeg.
"""

import os, math, textwrap, numpy as np
from PIL import Image, ImageDraw, ImageFont

# ── Config ──────────────────────────────────────────────────────
W, H = 1920, 1080
FPS = 30
SLIDE_DURATION = 6          # seconds per slide (content visible)
TRANSITION_DURATION = 0.8   # seconds for fade transition
OUTPUT = r"C:\Users\Usuario\OneDrive\Escritorio\SIGAM\SIGAM_Presentacion.mp4"
FRAMES_DIR = r"C:\Users\Usuario\OneDrive\Escritorio\SIGAM\_video_frames"

# ── Colors ──────────────────────────────────────────────────────
PRIMARY     = (27, 94, 32)
DARK_GREEN  = (20, 77, 23)
ACCENT      = (46, 125, 50)
LIGHT_BG    = (232, 245, 233)
WHITE       = (255, 255, 255)
DARK        = (33, 33, 33)
GRAY        = (97, 97, 97)
LIGHT_GRAY  = (158, 158, 158)
BLUE        = (21, 101, 192)
ORANGE      = (230, 81, 0)
PURPLE      = (106, 27, 154)
SOFT_GREEN  = (165, 214, 167)
MID_GREEN   = (129, 199, 132)

# ── Fonts ───────────────────────────────────────────────────────
def font(size, bold=False, light=False):
    if light:
        return ImageFont.truetype("C:/Windows/Fonts/segoeuil.ttf", size)
    if bold:
        return ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", size)
    return ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", size)

# ── Drawing helpers ─────────────────────────────────────────────
def rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    r = radius
    draw.rounded_rectangle(xy, radius=r, fill=fill)

def draw_header(draw, title, subtitle=None):
    draw.rectangle([0, 0, W, 95], fill=PRIMARY)
    draw.text((65, 18), title, font=font(38, bold=True), fill=WHITE)
    if subtitle:
        draw.text((65, 62), subtitle, font=font(18), fill=SOFT_GREEN)

def wrap_text(text, f, max_width):
    """Word-wrap text to fit max_width pixels."""
    words = text.split()
    lines, current = [], ""
    for word in words:
        test = f"{current} {word}".strip()
        bbox = font(1).getbbox("x")  # dummy
        # Use a temp image for measurement
        tmp = Image.new("RGB", (1, 1))
        tmp_d = ImageDraw.Draw(tmp)
        tw = tmp_d.textlength(test, font=f)
        if tw <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines

def draw_text_wrapped(draw, xy, text, f, fill, max_width, line_spacing=4):
    x, y = xy
    lines = wrap_text(text, f, max_width)
    for line in lines:
        draw.text((x, y), line, font=f, fill=fill)
        bbox = f.getbbox(line)
        y += (bbox[3] - bbox[1]) + line_spacing
    return y

def draw_card(draw, x, y, w, h, title, items, title_color=ACCENT, icon=None):
    rounded_rect(draw, (x, y, x+w, y+h), 12, WHITE)
    # title
    prefix = f"{icon}  " if icon else ""
    draw.text((x+20, y+14), f"{prefix}{title}", font=font(20, bold=True), fill=title_color)
    # items
    iy = y + 52
    for item in items:
        iy = draw_text_wrapped(draw, (x+24, iy), f"•  {item}", font(15), GRAY, w-48, line_spacing=2)
        iy += 6

def lerp_color(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


# ══════════════════════════════════════════════════════════════════
#  SLIDE RENDERERS — each returns a PIL Image
# ══════════════════════════════════════════════════════════════════

def slide_title():
    img = Image.new("RGB", (W, H), DARK_GREEN)
    draw = ImageDraw.Draw(img)
    # Accent lines
    draw.rectangle([120, 245, 220, 249], fill=WHITE)
    draw.text((120, 270), "SIGAM", font=font(82, bold=True), fill=WHITE)
    draw.text((120, 375), "Sistema Integral de Gestión", font=font(34), fill=SOFT_GREEN)
    draw.text((120, 418), "Alimentaria Municipal", font=font(34), fill=SOFT_GREEN)
    draw.text((120, 480), "Municipalidad de La Plata  —  Secretaría de Desarrollo Social",
              font=font(20), fill=MID_GREEN)
    draw.rectangle([120, 545, 220, 549], fill=WHITE)
    draw.text((120, 565), "Presentación de Proyecto  ·  2026", font=font(18), fill=MID_GREEN)
    return img

def slide_problema():
    img = Image.new("RGB", (W, H), LIGHT_BG)
    draw = ImageDraw.Draw(img)
    draw_header(draw, "El Problema", "¿Por qué se necesita SIGAM?")

    problems = [
        ("Planillas Excel manuales", "Errores de carga, datos duplicados,\nsin control de versiones"),
        ("Sin trazabilidad", "No se puede verificar quién recibió\nqué, cuándo ni dónde"),
        ("Stock sin control", "Mercadería vencida, faltantes\nno detectados"),
        ("Casos urgentes sin proceso", "Pedidos por WhatsApp sin\nregistro ni seguimiento"),
        ("Reportes manuales", "ANEXO VI provincial armado\na mano, propenso a errores"),
        ("Sin visibilidad en tiempo real", "Sin dashboards ni alertas\nautomáticas"),
    ]
    for i, (title, desc) in enumerate(problems):
        col, row = i % 3, i // 3
        x = 50 + col * 620
        y = 135 + row * 240
        rounded_rect(draw, (x, y, x+580, y+215), 12, WHITE)
        draw.text((x+22, y+18), f"✗  {title}", font=font(20, bold=True), fill=ORANGE)
        draw.text((x+22, y+58), desc, font=font(16), fill=GRAY)
    return img

def slide_solucion():
    img = Image.new("RGB", (W, H), LIGHT_BG)
    draw = ImageDraw.Draw(img)
    draw_header(draw, "La Solución: SIGAM", "Plataforma web integral de gestión alimentaria")

    solutions = [
        ("Gestión Centralizada", [
            "Base de datos única en la nube",
            "Acceso multi-usuario simultáneo",
            "Datos consistentes y sin duplicados",
            "Búsqueda global por DNI",
        ]),
        ("Trazabilidad Completa", [
            "Cada entrega con foto de firma",
            "Historial completo de movimientos",
            "Auditoría automática de acciones",
            "PDF de remitos descargables",
        ]),
        ("Automatización", [
            "Cronograma mensual autogenerado",
            "Alertas de vencimiento de stock",
            "Notificaciones en tiempo real",
            "Generación masiva de remitos",
        ]),
    ]
    for i, (title, items) in enumerate(solutions):
        x = 50 + i * 630
        draw_card(draw, x, 135, 590, 480, title, items, title_color=ACCENT, icon="✓")
    return img

def slide_modulos():
    img = Image.new("RGB", (W, H), LIGHT_BG)
    draw = ImageDraw.Draw(img)
    draw_header(draw, "Módulos del Sistema")

    modules = [
        ("Beneficiarios", ["Alta/baja/modificación", "Documentación adjunta", "Detección duplicados DNI", "Historial de entregas"]),
        ("Remitos", ["Ciclo completo de entrega", "Generación de PDF", "Envío email/WhatsApp", "Firma fotográfica"]),
        ("Stock & Depósitos", ["2 depósitos independientes", "Control lotes y vencimiento", "Transferencias trazables", "Alertas automáticas"]),
        ("Cronograma", ["Generación mensual auto", "Vista semanal", "Ajuste de fechas", "Remitos masivos"]),
        ("Casos Particulares", ["Workflow de aprobación", "Prioridad Normal/Alta/Urgente", "Cruce automático DNI", "Documentación campo"]),
        ("Reportes & ANEXO VI", ["Dashboard tiempo real", "Gráficos distribución", "Ranking artículos", "Export provincial"]),
        ("Mapa Interactivo", ["Geolocalización", "Filtros por localidad", "Popups informativos", "Exportación por zona"]),
        ("Auditoría", ["Log automático acciones", "Filtros período/usuario", "Exportación Excel", "Trazabilidad completa"]),
    ]
    for i, (title, items) in enumerate(modules):
        col, row = i % 4, i // 4
        x = 35 + col * 475
        y = 125 + row * 260
        draw_card(draw, x, y, 450, 238, title, items, title_color=ACCENT)
    return img

def slide_flujo():
    img = Image.new("RGB", (W, H), LIGHT_BG)
    draw = ImageDraw.Draw(img)
    draw_header(draw, "Flujo de Entrega", "Ciclo de vida completo de un remito")

    steps = [
        ("1", "Programar", "Cronograma mensual\nautogenerado"),
        ("2", "Crear Remito", "Manual o masivo\ndesde cronograma"),
        ("3", "Confirmar", "Stock descontado\nautomáticamente"),
        ("4", "Notificar", "Email y WhatsApp\nal beneficiario"),
        ("5", "Entregar", "Depósito registra\ncon foto de firma"),
        ("6", "Completar", "Registro en auditoría\ny reportes"),
    ]

    start_y = 320
    for i, (num, title, desc) in enumerate(steps):
        cx = 160 + i * 290
        # Circle
        r = 40
        draw.ellipse([cx-r, start_y-r, cx+r, start_y+r], fill=ACCENT)
        tw = draw.textlength(num, font=font(30, bold=True))
        draw.text((cx - tw/2, start_y - 22), num, font=font(30, bold=True), fill=WHITE)
        # Arrow
        if i < len(steps) - 1:
            ax = cx + r + 15
            draw.text((ax, start_y - 18), "→", font=font(32, bold=True), fill=ACCENT)
        # Title
        tw2 = draw.textlength(title, font=font(20, bold=True))
        draw.text((cx - tw2/2, start_y + 55), title, font=font(20, bold=True), fill=DARK)
        # Desc
        for j, line in enumerate(desc.split("\n")):
            tw3 = draw.textlength(line, font=font(15))
            draw.text((cx - tw3/2, start_y + 90 + j*22), line, font=font(15), fill=GRAY)
    return img

def slide_roles():
    img = Image.new("RGB", (W, H), LIGHT_BG)
    draw = ImageDraw.Draw(img)
    draw_header(draw, "Roles y Permisos", "Control de acceso granular por rol y secretaría")

    roles = [
        ("ADMIN", "Acceso completo al sistema.\nGestión de usuarios, programas\ny configuración global."),
        ("OPERADOR DE PROGRAMA", "Gestión de beneficiarios, remitos,\ncronograma y casos.\nSecretaría de Política Alimentaria."),
        ("LOGÍSTICA / DEPÓSITO", "Control de stock, recepción de\nmercadería, confirmación de\nentregas en depósito."),
        ("ASISTENCIA CRÍTICA", "Mismas funciones que Operador\npero aislado en datos de\nAsistencia Crítica (CITA)."),
        ("TRABAJADORA SOCIAL", "Creación de casos particulares\ndesde el campo. Seguimiento\nde sus propios casos."),
        ("VISOR", "Acceso de solo lectura a\ndashboard, beneficiarios\ny reportes."),
    ]
    for i, (role, desc) in enumerate(roles):
        col, row = i % 3, i // 3
        x = 50 + col * 620
        y = 135 + row * 240
        rounded_rect(draw, (x, y, x+580, y+215), 12, WHITE)
        draw.text((x+22, y+18), role, font=font(20, bold=True), fill=PRIMARY)
        draw.text((x+22, y+60), desc, font=font(16), fill=GRAY)
    return img

def slide_arquitectura():
    img = Image.new("RGB", (W, H), LIGHT_BG)
    draw = ImageDraw.Draw(img)
    draw_header(draw, "Arquitectura Técnica", "Stack moderno, escalable y seguro")

    stacks = [
        ("Frontend", BLUE, [
            "React 18 + TypeScript",
            "Material UI (MUI v5)",
            "Zustand (estado global)",
            "React Router v6",
            "Recharts (gráficos)",
            "Leaflet (mapas)",
            "PWA — instalable como app",
            "Vite (build ultrarrápido)",
        ]),
        ("Backend", ACCENT, [
            "NestJS 10 + TypeScript",
            "Prisma ORM",
            "JWT + Passport.js",
            "16 módulos independientes",
            "Swagger / OpenAPI docs",
            "SSE (real-time)",
            "PDFKit (remitos PDF)",
            "Rate limiting (60 req/min)",
        ]),
        ("Infraestructura", PRIMARY, [
            "PostgreSQL 14+ (Supabase)",
            "~20 tablas relacionales",
            "Supabase Storage (archivos)",
            "Gmail SMTP (emails)",
            "Backups automáticos",
            "HTTPS + CORS",
            "Health checks (/health)",
            "Auditoría global automática",
        ]),
    ]
    for i, (title, color, items) in enumerate(stacks):
        x = 50 + i * 630
        # Header bar
        rounded_rect(draw, (x, 130, x+590, 178), 8, color)
        draw.text((x+20, 138), title, font=font(22, bold=True), fill=WHITE)
        # Card body
        rounded_rect(draw, (x, 185, x+590, 640), 8, WHITE)
        iy = 200
        for item in items:
            draw.text((x+28, iy), f"•  {item}", font=font(17), fill=GRAY)
            iy += 42
    return img

def slide_seguridad():
    img = Image.new("RGB", (W, H), LIGHT_BG)
    draw = ImageDraw.Draw(img)
    draw_header(draw, "Seguridad y Cumplimiento")

    items = [
        ("Autenticación JWT", "Tokens seguros con expiración.\nContraseñas hasheadas con bcrypt.\nSesiones stateless."),
        ("Control de Acceso (RBAC)", "Cada endpoint protegido por rol.\nDatos aislados por secretaría.\nGuards en todas las rutas."),
        ("Auditoría Completa", "Interceptor global registra toda\nacción: usuario, fecha y datos\nmodificados automáticamente."),
        ("Rate Limiting", "Protección contra abuso:\n60 peticiones/min por IP.\nPrevención fuerza bruta."),
        ("Datos en la Nube", "PostgreSQL en Supabase con\nbackups automáticos. Storage\nseguro con políticas de acceso."),
        ("Validación Estricta", "Todos los datos validados en\nbackend con class-validator.\nSanitización de inputs."),
    ]
    for i, (title, desc) in enumerate(items):
        col, row = i % 3, i // 3
        x = 50 + col * 620
        y = 135 + row * 240
        rounded_rect(draw, (x, y, x+580, y+215), 12, WHITE)
        draw.text((x+22, y+18), title, font=font(20, bold=True), fill=PRIMARY)
        draw.text((x+22, y+60), desc, font=font(16), fill=GRAY)
    return img

def slide_beneficios():
    img = Image.new("RGB", (W, H), LIGHT_BG)
    draw = ImageDraw.Draw(img)
    draw_header(draw, "Beneficios Clave")

    benefits = [
        ("Eficiencia Operativa", "Automatización de cronogramas,\nremitos masivos y alertas. Menos\ntrabajo manual, menos errores."),
        ("Transparencia Total", "Cada entrega documentada.\nAuditoría completa. Reportes\nexportables para rendición."),
        ("Acceso Desde Cualquier Lugar", "App web + PWA. Trabajadoras\nsociales cargan casos desde\nel campo con el celular."),
        ("Toma de Decisiones", "Dashboard en tiempo real.\nGráficos de distribución.\nMapa interactivo de cobertura."),
        ("Cumplimiento Provincial", "ANEXO VI generado auto.\nDatos listos para auditoría\nexterna provincial."),
        ("Escalabilidad", "Arquitectura modular preparada\npara incorporar nuevas\nsecretarías y programas."),
    ]
    for i, (title, desc) in enumerate(benefits):
        col, row = i % 3, i // 3
        x = 50 + col * 620
        y = 135 + row * 240
        rounded_rect(draw, (x, y, x+580, y+215), 12, WHITE)
        draw.text((x+22, y+18), f"✦  {title}", font=font(20, bold=True), fill=ACCENT)
        draw.text((x+22, y+60), desc, font=font(16), fill=GRAY)
    return img

def slide_roadmap():
    img = Image.new("RGB", (W, H), LIGHT_BG)
    draw = ImageDraw.Draw(img)
    draw_header(draw, "Próximos Pasos", "Evolución planificada del sistema")

    phases = [
        ("Fase 1 — Consolidación", ACCENT, [
            "Optimización de rendimiento",
            "Mejoras de UX según feedback",
            "Estabilización de reportes",
        ]),
        ("Fase 2 — Integraciones", BLUE, [
            "WhatsApp Business API",
            "Notificaciones auto de retiro",
            "Informes email programados",
        ]),
        ("Fase 3 — Expansión", ORANGE, [
            "Nuevas secretarías (CITA, Niñez)",
            "Datos cruzados por beneficiario",
            "Portal de autogestión",
        ]),
        ("Fase 4 — Inteligencia", PURPLE, [
            "Predicción de demanda",
            "Optimización rutas de entrega",
            "Análisis de impacto social",
        ]),
    ]
    for i, (title, color, items) in enumerate(phases):
        x = 40 + i * 475
        # Phase header
        rounded_rect(draw, (x, 140, x+445, 188), 8, color)
        draw.text((x+16, 148), title, font=font(19, bold=True), fill=WHITE)
        # Card
        rounded_rect(draw, (x, 198, x+445, 520), 8, WHITE)
        iy = 220
        for item in items:
            draw.text((x+24, iy), f"•  {item}", font=font(18), fill=GRAY)
            iy += 50

    # Timeline bar at bottom
    draw.rectangle([80, 580, W-80, 586], fill=LIGHT_GRAY)
    labels = ["Hoy", "3 meses", "6 meses", "12 meses"]
    colors = [ACCENT, BLUE, ORANGE, PURPLE]
    for i, (label, c) in enumerate(zip(labels, colors)):
        cx = 230 + i * 475
        draw.ellipse([cx-10, 575, cx+10, 595], fill=c)
        tw = draw.textlength(label, font=font(15))
        draw.text((cx - tw/2, 602), label, font=font(15), fill=GRAY)
    return img

def slide_cierre():
    img = Image.new("RGB", (W, H), DARK_GREEN)
    draw = ImageDraw.Draw(img)
    # Accent lines
    cx = W // 2
    draw.rectangle([cx-200, 260, cx+200, 264], fill=WHITE)
    t = "SIGAM"
    tw = draw.textlength(t, font=font(72, bold=True))
    draw.text((cx - tw/2, 280), t, font=font(72, bold=True), fill=WHITE)
    sub = "Gestión alimentaria transparente, eficiente y trazable"
    tw2 = draw.textlength(sub, font=font(24))
    draw.text((cx - tw2/2, 380), sub, font=font(24), fill=SOFT_GREEN)
    draw.rectangle([cx-200, 430, cx+200, 434], fill=WHITE)
    org = "Municipalidad de La Plata  ·  Secretaría de Desarrollo Social"
    tw3 = draw.textlength(org, font=font(18))
    draw.text((cx - tw3/2, 460), org, font=font(18), fill=MID_GREEN)

    q = "¿Preguntas?"
    tw4 = draw.textlength(q, font=font(36, bold=True))
    draw.text((cx - tw4/2, 560), q, font=font(36, bold=True), fill=WHITE)
    return img


# ══════════════════════════════════════════════════════════════════
#  ANIMATION — Element reveal per slide (fade-in segments)
# ══════════════════════════════════════════════════════════════════

def create_animated_frames(slide_img, duration_sec, fps, idx, total):
    """
    Create frames for one slide with:
    - Fade-in from black (0.6s)
    - Hold (main duration)
    - Fade-out to black (0.6s) on last slide only; else fade to next color
    """
    frames = []
    total_frames = int(duration_sec * fps)
    fade_in_frames = int(0.6 * fps)
    fade_out_frames = int(0.6 * fps) if idx == total - 1 else 0
    hold_frames = total_frames - fade_in_frames - fade_out_frames

    slide_arr = np.array(slide_img)

    # Fade in
    for f in range(fade_in_frames):
        alpha = f / fade_in_frames
        frame = (slide_arr * alpha).astype(np.uint8)
        frames.append(frame)

    # Hold
    for _ in range(hold_frames):
        frames.append(slide_arr)

    # Fade out (only last slide)
    for f in range(fade_out_frames):
        alpha = 1.0 - (f / fade_out_frames)
        frame = (slide_arr * alpha).astype(np.uint8)
        frames.append(frame)

    return frames


def create_crossfade_frames(img_a, img_b, duration_sec, fps):
    """Cross-fade transition between two slides."""
    frames = []
    n = int(duration_sec * fps)
    arr_a = np.array(img_a).astype(np.float32)
    arr_b = np.array(img_b).astype(np.float32)
    for f in range(n):
        t = f / max(n - 1, 1)
        blended = ((1 - t) * arr_a + t * arr_b).astype(np.uint8)
        frames.append(blended)
    return frames


# ══════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════

def main():
    print("Rendering slides...")
    slides = [
        slide_title(),
        slide_problema(),
        slide_solucion(),
        slide_modulos(),
        slide_flujo(),
        slide_roles(),
        slide_arquitectura(),
        slide_seguridad(),
        slide_beneficios(),
        slide_roadmap(),
        slide_cierre(),
    ]
    print(f"  {len(slides)} slides rendered")

    print("Generating frames with transitions...")
    all_frames = []

    for i, slide_img in enumerate(slides):
        # Slide hold frames
        hold_sec = SLIDE_DURATION
        # Title and closing hold a bit longer
        if i == 0 or i == len(slides) - 1:
            hold_sec = 4

        slide_frames = create_animated_frames(slide_img, hold_sec, FPS, i, len(slides))
        all_frames.extend(slide_frames)

        # Cross-fade to next slide
        if i < len(slides) - 1:
            xfade = create_crossfade_frames(slides[i], slides[i + 1], TRANSITION_DURATION, FPS)
            all_frames.extend(xfade)

    total_secs = len(all_frames) / FPS
    print(f"  {len(all_frames)} frames total ({total_secs:.1f}s @ {FPS}fps)")

    # ── Write video with imageio ──
    print("Encoding video (H.264)...")
    import imageio.v3 as iio

    # Use imageio-ffmpeg plugin
    with iio.imopen(OUTPUT, "w", plugin="pyav") as writer:
        writer.init_video_stream("libx264", fps=FPS)
        for i, frame in enumerate(all_frames):
            if isinstance(frame, Image.Image):
                frame = np.array(frame)
            writer.write_frame(frame)
            if (i + 1) % (FPS * 5) == 0:
                print(f"  encoded {i+1}/{len(all_frames)} frames...")

    print(f"\nVideo saved: {OUTPUT}")
    print(f"Duration: {total_secs:.1f}s | Resolution: {W}x{H} | FPS: {FPS}")


if __name__ == "__main__":
    main()
