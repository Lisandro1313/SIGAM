"""
SIGAM — Animated storytelling video.
Flat-design animation: warehouses, trucks, food delivery, social workers.
Each scene rendered frame-by-frame with Pillow, assembled with pyav/imageio.
"""

import math, random, numpy as np
from PIL import Image, ImageDraw, ImageFont

# ── Config ──
W, H = 1920, 1080
FPS = 30
OUTPUT = r"C:\Users\Usuario\OneDrive\Escritorio\SIGAM\SIGAM_Animado.mp4"

# ── Colors ──
SKY            = (173, 216, 255)
SKY_SUNSET     = (255, 183, 120)
NIGHT          = (25, 35, 60)
GRASS          = (76, 175, 80)
GRASS_DARK     = (56, 142, 60)
ROAD           = (97, 97, 97)
ROAD_LINE      = (255, 235, 59)
SIDEWALK       = (210, 210, 210)

WHITE          = (255, 255, 255)
DARK           = (33, 33, 33)
GRAY           = (120, 120, 120)
LIGHT_GRAY     = (200, 200, 200)

PRIMARY        = (27, 94, 32)
ACCENT         = (46, 125, 50)
SOFT_GREEN     = (165, 214, 167)
DARK_GREEN     = (20, 77, 23)
MID_GREEN      = (129, 199, 132)

BUILDING_1     = (236, 239, 241)
BUILDING_2     = (207, 216, 220)
BUILDING_3     = (176, 190, 197)
ROOF_RED       = (198, 40, 40)
ROOF_BROWN     = (141, 110, 99)
DOOR_BROWN     = (93, 64, 55)
WINDOW_BLUE    = (144, 202, 249)
WINDOW_DARK    = (66, 66, 66)

TRUCK_WHITE    = (245, 245, 245)
TRUCK_GREEN    = (46, 125, 50)
TRUCK_CAB      = (56, 142, 60)
WHEEL_BLACK    = (50, 50, 50)
WHEEL_GRAY     = (130, 130, 130)

BOX_BROWN      = (161, 136, 107)
BOX_LIGHT      = (188, 170, 146)
BOX_DARK       = (121, 85, 72)

SKIN_1         = (255, 213, 179)
SKIN_2         = (210, 180, 140)
SKIN_3         = (180, 140, 100)
SHIRT_BLUE     = (66, 165, 245)
SHIRT_RED      = (239, 83, 80)
SHIRT_GREEN    = (102, 187, 106)
SHIRT_ORANGE   = (255, 167, 38)
SHIRT_PURPLE   = (171, 71, 188)
PANTS_BLUE     = (48, 63, 159)
PANTS_DARK     = (55, 55, 55)

ORANGE         = (230, 81, 0)
BLUE           = (21, 101, 192)
PURPLE         = (106, 27, 154)
LIGHT_BG       = (232, 245, 233)

HEART_RED      = (229, 57, 53)
STAR_YELLOW    = (255, 235, 59)

CLOUD_WHITE    = (255, 255, 255)
SUN_YELLOW     = (255, 235, 59)
SUN_ORANGE     = (255, 183, 77)

MUNICIPIO_BEIGE = (255, 248, 225)
MUNICIPIO_WALL  = (239, 235, 233)

# ── Fonts ──
def font(size, bold=False, light=False):
    if light:
        return ImageFont.truetype("C:/Windows/Fonts/segoeuil.ttf", size)
    if bold:
        return ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", size)
    return ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", size)


# ════════════════════════════════════════════════════════════════
#  DRAWING PRIMITIVES
# ════════════════════════════════════════════════════════════════

def draw_cloud(draw, cx, cy, scale=1.0, color=CLOUD_WHITE):
    s = scale
    r = int(35 * s)
    offsets = [(-30*s, 5*s, r), (0, -10*s, int(45*s)), (35*s, 0, int(38*s)), (60*s, 10*s, int(28*s)), (-55*s, 10*s, int(25*s))]
    for dx, dy, radius in offsets:
        x, y = int(cx + dx), int(cy + dy)
        draw.ellipse([x-radius, y-radius, x+radius, y+radius], fill=color)


def draw_sun(draw, cx, cy, radius=60, t=0):
    # Glow
    for i in range(3):
        r = radius + 20 - i*6
        alpha_color = tuple(int(c * (0.3 + i*0.2)) + int(255 * (0.7 - i*0.2)) for c in SUN_ORANGE[:3])
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=SUN_ORANGE)
    draw.ellipse([cx-radius, cy-radius, cx+radius, cy+radius], fill=SUN_YELLOW)
    # Rays
    for i in range(12):
        angle = math.radians(i * 30 + t * 20)
        x1 = cx + int((radius+15) * math.cos(angle))
        y1 = cy + int((radius+15) * math.sin(angle))
        x2 = cx + int((radius+35) * math.cos(angle))
        y2 = cy + int((radius+35) * math.sin(angle))
        draw.line([x1, y1, x2, y2], fill=SUN_YELLOW, width=4)


def draw_tree(draw, x, y, scale=1.0):
    s = scale
    # Trunk
    tw, th = int(14*s), int(50*s)
    draw.rectangle([x-tw//2, y-th, x+tw//2, y], fill=(121, 85, 72))
    # Foliage layers
    for i, (dx, dy, r) in enumerate([
        (0, -th-int(20*s), int(35*s)),
        (-int(18*s), -th-int(5*s), int(28*s)),
        (int(18*s), -th-int(5*s), int(28*s)),
        (0, -th-int(38*s), int(25*s)),
    ]):
        c = ACCENT if i % 2 == 0 else GRASS
        draw.ellipse([x+dx-r, y+dy-r, x+dx+r, y+dy+r], fill=c)


def draw_person(draw, x, y, skin=SKIN_1, shirt=SHIRT_BLUE, pants=PANTS_BLUE,
                scale=1.0, wave=False, t=0, facing_right=True):
    s = scale
    # Legs
    lw = int(8*s)
    lh = int(30*s)
    draw.rectangle([x-int(10*s), y-lh, x-int(10*s)+lw, y], fill=pants)
    draw.rectangle([x+int(2*s), y-lh, x+int(2*s)+lw, y], fill=pants)
    # Body
    bw, bh = int(28*s), int(35*s)
    draw.rounded_rectangle([x-int(14*s), y-lh-bh, x+int(14*s), y-lh], radius=int(5*s), fill=shirt)
    # Head
    hr = int(16*s)
    hx, hy = x, y - lh - bh - hr
    draw.ellipse([hx-hr, hy-hr, hx+hr, hy+hr], fill=skin)
    # Eyes
    er = int(2*s)
    ex_off = int(5*s) if facing_right else int(-5*s)
    draw.ellipse([hx+ex_off-int(6*s)-er, hy-int(3*s)-er, hx+ex_off-int(6*s)+er, hy-int(3*s)+er], fill=DARK)
    draw.ellipse([hx+ex_off+int(2*s)-er, hy-int(3*s)-er, hx+ex_off+int(2*s)+er, hy-int(3*s)+er], fill=DARK)
    # Smile
    sx = hx + (int(3*s) if facing_right else int(-3*s))
    draw.arc([sx-int(5*s), hy, sx+int(5*s), hy+int(8*s)], 0, 180, fill=DARK, width=max(1, int(2*s)))
    # Arms
    arm_y = y - lh - bh + int(10*s)
    if wave:
        angle = math.sin(t * 6) * 30 + 30
        ax = x + int(14*s)
        ay = arm_y
        ex = ax + int(25*s * math.cos(math.radians(-angle)))
        ey = ay + int(25*s * math.sin(math.radians(-angle)))
        draw.line([ax, ay, int(ex), int(ey)], fill=skin, width=int(6*s))
    else:
        draw.line([x+int(14*s), arm_y, x+int(22*s), arm_y+int(22*s)], fill=skin, width=int(6*s))
    draw.line([x-int(14*s), arm_y, x-int(22*s), arm_y+int(22*s)], fill=skin, width=int(6*s))


def draw_box(draw, x, y, w=40, h=35, color=BOX_BROWN):
    draw.rectangle([x, y, x+w, y+h], fill=color, outline=BOX_DARK, width=2)
    # Cross tape
    draw.line([x+w//2, y, x+w//2, y+h], fill=BOX_DARK, width=2)
    draw.line([x, y+h//3, x+w, y+h//3], fill=BOX_DARK, width=1)


def draw_truck(draw, x, y, scale=1.0, loaded=True):
    s = scale
    # Cargo area
    cw, ch = int(180*s), int(100*s)
    draw.rounded_rectangle([x, y-ch, x+cw, y], radius=int(5*s), fill=TRUCK_WHITE, outline=LIGHT_GRAY, width=2)
    # Green stripe
    draw.rectangle([x, y-int(25*s), x+cw, y-int(15*s)], fill=TRUCK_GREEN)
    # SIGAM text on truck
    try:
        draw.text((x+int(40*s), y-ch+int(15*s)), "SIGAM", font=font(int(28*s), bold=True), fill=TRUCK_GREEN)
    except:
        pass
    # Boxes inside if loaded
    if loaded:
        for i in range(4):
            bx = x + int(15*s) + i * int(38*s)
            draw_box(draw, bx, y-int(70*s), int(30*s), int(28*s))
        for i in range(3):
            bx = x + int(30*s) + i * int(38*s)
            draw_box(draw, bx, y-int(95*s), int(28*s), int(22*s), BOX_LIGHT)
    # Cab
    cab_w = int(70*s)
    draw.rounded_rectangle([x+cw, y-int(75*s), x+cw+cab_w, y], radius=int(8*s), fill=TRUCK_CAB)
    # Windshield
    draw.rounded_rectangle([x+cw+int(15*s), y-int(68*s), x+cw+cab_w-int(5*s), y-int(30*s)],
                           radius=int(4*s), fill=WINDOW_BLUE)
    # Wheels
    for wx in [x+int(30*s), x+int(140*s), x+cw+int(35*s)]:
        wr = int(18*s)
        draw.ellipse([wx-wr, y-wr+int(5*s), wx+wr, y+wr+int(5*s)], fill=WHEEL_BLACK)
        draw.ellipse([wx-wr+int(5*s), y-wr+int(10*s), wx+wr-int(5*s), y+wr], fill=WHEEL_GRAY)


def draw_building(draw, x, y, w, h, color=BUILDING_1, roof_color=None,
                  windows=True, door=True, label=None):
    # Main structure
    draw.rectangle([x, y-h, x+w, y], fill=color, outline=GRAY, width=2)
    # Roof
    if roof_color:
        draw.polygon([(x-10, y-h), (x+w//2, y-h-40), (x+w+10, y-h)], fill=roof_color)
    # Windows
    if windows:
        ww, wh = 30, 35
        cols = max(1, (w - 40) // 60)
        rows = max(1, (h - 80) // 55)
        for r in range(rows):
            for c in range(cols):
                wx = x + 30 + c * 60
                wy = y - h + 30 + r * 55
                draw.rectangle([wx, wy, wx+ww, wy+wh], fill=WINDOW_BLUE, outline=WHITE, width=2)
    # Door
    if door:
        dw, dh = 35, 55
        dx = x + w//2 - dw//2
        draw.rectangle([dx, y-dh, dx+dw, y], fill=DOOR_BROWN)
        draw.ellipse([dx+dw-12, y-dh//2-3, dx+dw-6, y-dh//2+3], fill=SUN_YELLOW)
    # Label
    if label:
        try:
            f = font(18, bold=True)
            tw = draw.textlength(label, font=f)
            draw.text((x + w//2 - tw//2, y-h+5), label, font=f, fill=DARK)
        except:
            pass


def draw_warehouse(draw, x, y, w=350, h=200, label="DEPÓSITO"):
    # Main body
    draw.rectangle([x, y-h, x+w, y], fill=BUILDING_2, outline=GRAY, width=2)
    # Corrugated roof
    draw.polygon([(x-15, y-h), (x+w//2, y-h-50), (x+w+15, y-h)], fill=BUILDING_3)
    # Big rolling door
    dw, dh = 120, 130
    dx = x + w//2 - dw//2
    draw.rectangle([dx, y-dh, dx+dw, y], fill=(180, 180, 180))
    # Horizontal lines on door
    for i in range(6):
        ly = y - dh + 10 + i * 22
        draw.line([dx+5, ly, dx+dw-5, ly], fill=GRAY, width=1)
    # Label
    try:
        f = font(22, bold=True)
        tw = draw.textlength(label, font=f)
        draw.text((x + w//2 - tw//2, y-h-45), label, font=f, fill=WHITE)
    except:
        pass
    # Small windows
    for i in range(3):
        wx = x + 30 + i * 90
        if wx + 25 < dx:
            draw.rectangle([wx, y-h+25, wx+25, wy:=y-h+50], fill=WINDOW_BLUE, outline=WHITE, width=1)
    for i in range(3):
        wx = dx + dw + 20 + i * 50
        if wx + 25 < x + w - 10:
            draw.rectangle([wx, y-h+25, wx+25, y-h+50], fill=WINDOW_BLUE, outline=WHITE, width=1)


def draw_heart(draw, cx, cy, size=20, color=HEART_RED):
    s = size / 20
    pts = []
    for t in range(100):
        angle = 2 * math.pi * t / 100
        hx = 16 * math.sin(angle)**3
        hy = -(13*math.cos(angle) - 5*math.cos(2*angle) - 2*math.cos(3*angle) - math.cos(4*angle))
        pts.append((int(cx + hx*s), int(cy + hy*s)))
    if len(pts) > 2:
        draw.polygon(pts, fill=color)


def draw_star(draw, cx, cy, size=15, color=STAR_YELLOW):
    pts = []
    for i in range(10):
        angle = math.radians(i * 36 - 90)
        r = size if i % 2 == 0 else size * 0.4
        pts.append((int(cx + r * math.cos(angle)), int(cy + r * math.sin(angle))))
    draw.polygon(pts, fill=color)


def draw_ground(draw, y, grass_color=GRASS):
    draw.rectangle([0, y, W, H], fill=grass_color)


def draw_road_h(draw, y, h=80):
    draw.rectangle([0, y, W, y+h], fill=ROAD)
    # Dashed center line
    for i in range(0, W, 60):
        draw.rectangle([i, y+h//2-2, i+30, y+h//2+2], fill=ROAD_LINE)


def ease_in_out(t):
    if t < 0.5:
        return 2 * t * t
    return 1 - (-2 * t + 2)**2 / 2


def lerp(a, b, t):
    return a + (b - a) * t


# ════════════════════════════════════════════════════════════════
#  SCENES
# ════════════════════════════════════════════════════════════════

def scene_intro(num_frames):
    """Scene 1: SIGAM title with animated elements."""
    frames = []
    for f in range(num_frames):
        t = f / num_frames
        img = Image.new("RGB", (W, H), DARK_GREEN)
        draw = ImageDraw.Draw(img)

        # Animated subtle pattern lines
        for i in range(20):
            ly = int(i * 60 + (t * 100) % 60) - 30
            draw.line([0, ly, W, ly], fill=(22, 80, 25), width=1)

        # Fade in title
        alpha = min(1.0, t * 3)

        # Decorative line
        line_w = int(150 * min(1.0, t * 4))
        draw.rectangle([W//2 - line_w, 300, W//2 + line_w, 304], fill=WHITE)

        if t > 0.15:
            txt = "SIGAM"
            f_title = font(90, bold=True)
            tw = draw.textlength(txt, font=f_title)
            draw.text((W//2 - tw//2, 330), txt, font=f_title, fill=WHITE)

        if t > 0.3:
            sub = "Sistema Integral de Gestión Alimentaria Municipal"
            f_sub = font(30)
            tw2 = draw.textlength(sub, font=f_sub)
            draw.text((W//2 - tw2//2, 445), sub, font=f_sub, fill=SOFT_GREEN)

        if t > 0.45:
            draw.rectangle([W//2 - line_w, 500, W//2 + line_w, 504], fill=WHITE)

        if t > 0.55:
            org = "Municipalidad de La Plata"
            f_org = font(22)
            tw3 = draw.textlength(org, font=f_org)
            draw.text((W//2 - tw3//2, 520), org, font=f_org, fill=MID_GREEN)

        # Animated icons floating
        if t > 0.4:
            icon_t = (t - 0.4) / 0.6
            for i, (ix, iy) in enumerate([(300, 700), (500, 750), (1400, 680), (1600, 740)]):
                bob = math.sin(t * 4 + i * 1.5) * 15
                if i % 2 == 0:
                    draw_heart(draw, ix, int(iy + bob - icon_t * 50), size=int(18 * min(1, icon_t*3)))
                else:
                    draw_star(draw, ix, int(iy + bob - icon_t * 50), size=int(15 * min(1, icon_t*3)))

        # Bottom text
        if t > 0.7:
            btxt = "Acción Social  ·  Asistencia Alimentaria  ·  Gestión Municipal"
            f_b = font(18, light=True)
            tw4 = draw.textlength(btxt, font=f_b)
            draw.text((W//2 - tw4//2, H - 80), btxt, font=f_b, fill=MID_GREEN)

        frames.append(np.array(img))
    return frames


def scene_deposito(num_frames):
    """Scene 2: Warehouse with boxes being organized."""
    frames = []
    ground_y = 750
    for f in range(num_frames):
        t = f / num_frames
        img = Image.new("RGB", (W, H), SKY)
        draw = ImageDraw.Draw(img)

        # Sky elements
        draw_sun(draw, 1700, 120, 55, t)
        draw_cloud(draw, 300 + t*80, 100, 1.2)
        draw_cloud(draw, 900 + t*60, 150, 0.8)
        draw_cloud(draw, 1400 + t*40, 80, 1.0)

        # Ground
        draw_ground(draw, ground_y)
        draw_road_h(draw, ground_y - 10, 70)

        # Trees
        draw_tree(draw, 100, ground_y - 10, 1.2)
        draw_tree(draw, 1800, ground_y - 10, 1.0)
        draw_tree(draw, 1650, ground_y - 10, 0.8)

        # Warehouse
        draw_warehouse(draw, 250, ground_y - 10, 450, 250, "DEPÓSITO MUNICIPAL")

        # Animated boxes sliding in
        n_boxes = min(8, int(t * 12))
        box_positions = [
            (320, ground_y - 50), (375, ground_y - 50), (430, ground_y - 50), (485, ground_y - 50),
            (340, ground_y - 90), (395, ground_y - 90), (450, ground_y - 90),
            (370, ground_y - 130),
        ]
        for i in range(n_boxes):
            bx, by = box_positions[i]
            slide_offset = max(0, (1 - min(1, (t * 12 - i) * 2))) * 200
            draw_box(draw, int(bx + slide_offset), by, 45, 35,
                     BOX_BROWN if i % 2 == 0 else BOX_LIGHT)

        # Worker organizing
        worker_x = 550 + int(math.sin(t * 5) * 30)
        draw_person(draw, worker_x, ground_y - 10, SKIN_2, SHIRT_ORANGE, PANTS_DARK, 1.1, t=t)

        # Forklift-like worker on the other side
        draw_person(draw, 220, ground_y - 10, SKIN_1, SHIRT_GREEN, PANTS_BLUE, 1.0, t=t)

        # Text overlay
        if t > 0.3:
            txt = "Recepción y organización de mercadería"
            f_txt = font(28, bold=True)
            tw = draw.textlength(txt, font=f_txt)
            # Text bg
            draw.rounded_rectangle([W//2-tw//2-20, 40, W//2+tw//2+20, 90], radius=10, fill=PRIMARY)
            draw.text((W//2 - tw//2, 48), txt, font=f_txt, fill=WHITE)

        # Right side: stock list appearing
        if t > 0.5:
            list_alpha = min(1.0, (t - 0.5) * 4)
            lx, ly = 850, 200
            draw.rounded_rectangle([lx, ly, lx+400, ly+350], radius=12, fill=WHITE, outline=ACCENT, width=3)
            draw.text((lx+20, ly+15), "Control de Stock", font=font(22, bold=True), fill=PRIMARY)
            draw.line([lx+20, ly+50, lx+380, ly+50], fill=LIGHT_GRAY, width=2)

            stock_items = [
                ("Arroz x 1kg", "850 u", ACCENT),
                ("Fideos x 500g", "1200 u", ACCENT),
                ("Aceite x 900ml", "420 u", ORANGE),
                ("Harina x 1kg", "680 u", ACCENT),
                ("Leche en polvo", "350 u", ORANGE),
                ("Azúcar x 1kg", "920 u", ACCENT),
            ]
            n_visible = min(len(stock_items), int((t - 0.5) * 20))
            for i in range(n_visible):
                name, qty, color = stock_items[i]
                iy = ly + 65 + i * 45
                draw.text((lx+30, iy), name, font=font(17), fill=DARK)
                draw.text((lx+300, iy), qty, font=font(17, bold=True), fill=color)
                # Progress bar
                draw.rounded_rectangle([lx+30, iy+25, lx+370, iy+32], radius=3, fill=LIGHT_GRAY)
                bar_w = int(340 * (0.3 + random.Random(i).random() * 0.7))
                draw.rounded_rectangle([lx+30, iy+25, lx+30+bar_w, iy+32], radius=3, fill=color)

        frames.append(np.array(img))
    return frames


def scene_social_worker(num_frames):
    """Scene 3: Social worker visiting a family."""
    frames = []
    ground_y = 780
    for f in range(num_frames):
        t = f / num_frames
        img = Image.new("RGB", (W, H), SKY)
        draw = ImageDraw.Draw(img)

        draw_cloud(draw, 200 + t*50, 90, 1.0)
        draw_cloud(draw, 800 + t*30, 130, 0.7)
        draw_sun(draw, 1750, 100, 45, t)

        # Ground & sidewalk
        draw_ground(draw, ground_y)
        draw.rectangle([0, ground_y-5, W, ground_y+5], fill=SIDEWALK)

        # Simple house
        draw_building(draw, 1100, ground_y - 5, 280, 200, MUNICIPIO_WALL, ROOF_BROWN, label="")
        draw_tree(draw, 1050, ground_y - 5, 0.9)
        draw_tree(draw, 1430, ground_y - 5, 0.7)

        # Family (mother + children) at door
        draw_person(draw, 1220, ground_y - 5, SKIN_2, SHIRT_RED, PANTS_DARK, 1.0, t=t)
        draw_person(draw, 1280, ground_y - 5, SKIN_2, SHIRT_PURPLE, PANTS_BLUE, 0.65, t=t)  # child
        draw_person(draw, 1310, ground_y - 5, SKIN_2, SHIRT_ORANGE, PANTS_DARK, 0.55, t=t)  # child

        # Social worker walking in
        sw_start_x = 200
        sw_end_x = 1100
        sw_x = int(lerp(sw_start_x, sw_end_x, ease_in_out(min(1, t * 1.5))))
        draw_person(draw, sw_x, ground_y - 5, SKIN_1, SHIRT_GREEN, PANTS_BLUE, 1.1,
                    wave=(t > 0.5), t=t, facing_right=True)

        # Clipboard in hand (when arrived)
        if t > 0.5:
            draw.rounded_rectangle([sw_x-35, ground_y-110, sw_x-10, ground_y-70],
                                   radius=3, fill=WHITE, outline=GRAY, width=2)
            draw.line([sw_x-30, ground_y-100, sw_x-15, ground_y-100], fill=ACCENT, width=2)
            draw.line([sw_x-30, ground_y-93, sw_x-15, ground_y-93], fill=ACCENT, width=2)
            draw.line([sw_x-30, ground_y-86, sw_x-20, ground_y-86], fill=ACCENT, width=2)

        # Speech bubble
        if t > 0.6:
            bx, by = sw_x + 30, ground_y - 220
            draw.rounded_rectangle([bx, by, bx+320, by+70], radius=15, fill=WHITE, outline=ACCENT, width=2)
            draw.polygon([(bx+30, by+70), (bx+20, by+90), (bx+60, by+70)], fill=WHITE)
            draw.text((bx+15, by+10), "¿Necesitan asistencia", font=font(17), fill=DARK)
            draw.text((bx+15, by+35), "alimentaria?", font=font(17), fill=DARK)

        # Left side: SIGAM case form
        if t > 0.4:
            fx, fy = 100, 180
            draw.rounded_rectangle([fx, fy, fx+420, fy+400], radius=12, fill=WHITE, outline=ACCENT, width=3)
            draw.rounded_rectangle([fx, fy, fx+420, fy+50], radius=12, fill=PRIMARY)
            draw.rectangle([fx, fy+35, fx+420, fy+50], fill=PRIMARY)
            draw.text((fx+15, fy+10), "SIGAM — Nuevo Caso Particular", font=font(19, bold=True), fill=WHITE)

            fields = ["DNI:", "Nombre:", "Domicilio:", "Localidad:", "Grupo familiar:", "Prioridad:"]
            n_fields = min(len(fields), int((t - 0.4) * 16))
            for i in range(n_fields):
                iy = fy + 65 + i * 52
                draw.text((fx+20, iy), fields[i], font=font(16, bold=True), fill=GRAY)
                draw.rounded_rectangle([fx+150, iy-2, fx+400, iy+28], radius=5, fill=LIGHT_BG, outline=LIGHT_GRAY)
                # Simulated filled data
                data = ["32.456.789", "María González", "Calle 45 N° 320", "La Plata", "4 personas", "URGENTE"]
                if i < n_fields:
                    c = ORANGE if i == 5 else DARK
                    draw.text((fx+158, iy+2), data[i], font=font(15), fill=c)

        # Hearts floating
        if t > 0.7:
            ht = (t - 0.7) / 0.3
            for i, (hx, hy_base) in enumerate([(1200, 350), (1260, 380), (1150, 400)]):
                bob = math.sin(t * 5 + i) * 10
                draw_heart(draw, hx, int(hy_base - ht * 60 + bob), int(12 * min(1, ht*3)))

        # Text
        txt = "Trabajadoras sociales relevan necesidades en el campo"
        f_txt = font(26, bold=True)
        tw = draw.textlength(txt, font=f_txt)
        draw.rounded_rectangle([W//2-tw//2-20, 30, W//2+tw//2+20, 78], radius=10, fill=PRIMARY)
        draw.text((W//2 - tw//2, 38), txt, font=f_txt, fill=WHITE)

        frames.append(np.array(img))
    return frames


def scene_remitos(num_frames):
    """Scene 4: Operator creating remitos on computer."""
    frames = []
    for f in range(num_frames):
        t = f / num_frames
        img = Image.new("RGB", (W, H), (240, 245, 250))
        draw = ImageDraw.Draw(img)

        # Office background
        draw.rectangle([0, 0, W, 200], fill=(220, 230, 240))
        # Desk
        draw.rectangle([0, 600, W, H], fill=(141, 110, 99))
        draw.rectangle([0, 600, W, 620], fill=(121, 85, 72))

        # Monitor
        mon_x, mon_y = 400, 250
        draw.rounded_rectangle([mon_x, mon_y, mon_x+500, mon_y+340], radius=10,
                               fill=DARK, outline=GRAY, width=4)
        # Screen
        draw.rectangle([mon_x+15, mon_y+15, mon_x+485, mon_y+310], fill=WHITE)
        # Monitor stand
        draw.rectangle([mon_x+220, mon_y+340, mon_x+280, mon_y+380], fill=GRAY)
        draw.rectangle([mon_x+180, mon_y+380, mon_x+320, mon_y+395], fill=GRAY)

        # SIGAM on screen
        draw.rectangle([mon_x+15, mon_y+15, mon_x+485, mon_y+55], fill=PRIMARY)
        draw.text((mon_x+25, mon_y+22), "SIGAM", font=font(18, bold=True), fill=WHITE)
        draw.text((mon_x+120, mon_y+25), "Remitos    Cronograma    Beneficiarios", font=font(13), fill=SOFT_GREEN)

        # Remito content appearing
        if t > 0.1:
            ry = mon_y + 65
            draw.text((mon_x+25, ry), "Nuevo Remito #2024-0847", font=font(16, bold=True), fill=PRIMARY)
            draw.line([mon_x+25, ry+25, mon_x+460, ry+25], fill=LIGHT_GRAY)

            items_data = [
                ("Arroz x 1kg", "x50"),
                ("Fideos x 500g", "x80"),
                ("Aceite x 900ml", "x30"),
                ("Harina x 1kg", "x40"),
                ("Leche en polvo", "x25"),
            ]
            n_items = min(len(items_data), int((t - 0.1) * 10))
            for i in range(n_items):
                iy = ry + 35 + i * 28
                draw.text((mon_x+35, iy), items_data[i][0], font=font(13), fill=DARK)
                draw.text((mon_x+350, iy), items_data[i][1], font=font(13, bold=True), fill=ACCENT)

            # Confirm button appearing
            if t > 0.6:
                btn_pulse = 1 + math.sin(t * 8) * 0.03
                bw, bh = int(140*btn_pulse), int(35*btn_pulse)
                bx = mon_x + 340
                by = ry + 200
                draw.rounded_rectangle([bx, by, bx+bw, by+bh], radius=8, fill=ACCENT)
                draw.text((bx+15, by+6), "Confirmar ✓", font=font(15, bold=True), fill=WHITE)

        # Person at desk
        draw_person(draw, 300, 600, SKIN_1, SHIRT_BLUE, PANTS_DARK, 1.2, t=t)

        # Keyboard
        draw.rounded_rectangle([480, 620, 680, 660], radius=5, fill=DARK)

        # Right side: PDF preview
        if t > 0.4:
            px, py = 1050, 150
            # Paper shadow
            draw.rectangle([px+5, py+5, px+380, py+520], fill=LIGHT_GRAY)
            # Paper
            draw.rectangle([px, py, px+375, py+515], fill=WHITE, outline=GRAY, width=2)
            # Header
            draw.rectangle([px+20, py+20, px+355, py+65], fill=PRIMARY)
            draw.text((px+30, py+28), "REMITO DE ENTREGA", font=font(20, bold=True), fill=WHITE)
            draw.text((px+250, py+30), "#2024-0847", font=font(16), fill=SOFT_GREEN)

            # Remito details
            details = [
                "Programa: Política Alimentaria",
                "Beneficiario: Comedor Los Pibes",
                "Dirección: Calle 72 N° 1450",
                "Fecha: 15/03/2026",
            ]
            for i, d in enumerate(details):
                draw.text((px+30, py+80+i*28), d, font=font(14), fill=GRAY)

            # Table
            draw.line([px+20, py+200, px+355, py+200], fill=GRAY, width=2)
            draw.text((px+30, py+185), "Artículo", font=font(13, bold=True), fill=DARK)
            draw.text((px+280, py+185), "Cant.", font=font(13, bold=True), fill=DARK)

            pdf_items = [("Arroz x 1kg", "50"), ("Fideos x 500g", "80"),
                         ("Aceite x 900ml", "30"), ("Harina x 1kg", "40")]
            n_pdf = min(len(pdf_items), int((t-0.4)*12))
            for i in range(n_pdf):
                iy = py + 210 + i * 25
                draw.text((px+30, iy), pdf_items[i][0], font=font(13), fill=DARK)
                draw.text((px+295, iy), pdf_items[i][1], font=font(13), fill=ACCENT)

            # Signature area
            draw.line([px+30, py+440, px+170, py+440], fill=GRAY, width=1)
            draw.text((px+50, py+445), "Firma", font=font(12), fill=LIGHT_GRAY)
            draw.line([px+200, py+440, px+340, py+440], fill=GRAY, width=1)
            draw.text((px+230, py+445), "Aclaración", font=font(12), fill=LIGHT_GRAY)

            # PDF badge
            draw.rounded_rectangle([px+300, py+480, px+360, py+505], radius=5, fill=(229, 57, 53))
            draw.text((px+312, py+483), "PDF", font=font(14, bold=True), fill=WHITE)

        # Title
        txt = "Operadores generan remitos desde el sistema"
        f_txt = font(26, bold=True)
        tw = draw.textlength(txt, font=f_txt)
        draw.rounded_rectangle([W//2-tw//2-20, 20, W//2+tw//2+20, 68], radius=10, fill=PRIMARY)
        draw.text((W//2 - tw//2, 28), txt, font=f_txt, fill=WHITE)

        frames.append(np.array(img))
    return frames


def scene_loading_truck(num_frames):
    """Scene 5: Loading the truck at the warehouse."""
    frames = []
    ground_y = 780
    for f in range(num_frames):
        t = f / num_frames
        img = Image.new("RGB", (W, H), SKY)
        draw = ImageDraw.Draw(img)

        draw_sun(draw, 250, 100, 50, t)
        draw_cloud(draw, 600+t*60, 90, 1.1)
        draw_cloud(draw, 1200+t*40, 140, 0.8)

        draw_ground(draw, ground_y)
        draw_road_h(draw, ground_y-10, 70)

        # Warehouse
        draw_warehouse(draw, 100, ground_y - 10, 500, 260, "DEPÓSITO LOGÍSTICA")

        # Truck (parked)
        draw_truck(draw, 700, ground_y - 15, 1.1, loaded=(t > 0.5))

        # Workers carrying boxes
        n_workers = 2
        for w in range(n_workers):
            # Worker walks from warehouse to truck
            phase = (t * 3 + w * 0.5) % 1.0
            wx = int(lerp(550, 750, ease_in_out(phase)))
            skin = SKIN_1 if w == 0 else SKIN_3
            shirt = SHIRT_ORANGE if w == 0 else SHIRT_BLUE
            draw_person(draw, wx, ground_y - 10, skin, shirt, PANTS_DARK, 1.0, t=t)
            # Box being carried
            if phase < 0.8:
                draw_box(draw, wx-20, ground_y-130, 35, 28,
                         BOX_BROWN if w == 0 else BOX_LIGHT)

        # Supervisor with clipboard
        draw_person(draw, 950, ground_y - 10, SKIN_1, SHIRT_GREEN, PANTS_BLUE, 1.1, t=t)
        draw.rounded_rectangle([920, ground_y-140, 950, ground_y-100], radius=3,
                               fill=WHITE, outline=GRAY, width=2)

        # Checklist appearing
        if t > 0.3:
            cx, cy = 1200, 200
            draw.rounded_rectangle([cx, cy, cx+380, cy+380], radius=12, fill=WHITE, outline=ACCENT, width=3)
            draw.text((cx+20, cy+15), "Lista de Carga", font=font(22, bold=True), fill=PRIMARY)
            draw.line([cx+20, cy+50, cx+360, cy+50], fill=LIGHT_GRAY, width=2)

            cargo = [
                ("Arroz x 1kg", "50 u", True),
                ("Fideos x 500g", "80 u", True),
                ("Aceite x 900ml", "30 u", t > 0.5),
                ("Harina x 1kg", "40 u", t > 0.6),
                ("Leche en polvo", "25 u", t > 0.7),
                ("Azúcar x 1kg", "60 u", t > 0.8),
                ("Conservas", "45 u", t > 0.9),
            ]
            for i, (name, qty, checked) in enumerate(cargo):
                iy = cy + 65 + i * 42
                # Checkbox
                draw.rounded_rectangle([cx+25, iy, cx+45, iy+20], radius=3,
                                       fill=ACCENT if checked else WHITE, outline=ACCENT, width=2)
                if checked:
                    draw.text((cx+28, iy-2), "✓", font=font(16, bold=True), fill=WHITE)
                draw.text((cx+55, iy), name, font=font(16), fill=DARK)
                draw.text((cx+300, iy), qty, font=font(16), fill=GRAY)

        # Title
        txt = "Carga de mercadería en el camión"
        f_txt = font(28, bold=True)
        tw = draw.textlength(txt, font=f_txt)
        draw.rounded_rectangle([W//2-tw//2-20, 30, W//2+tw//2+20, 80], radius=10, fill=PRIMARY)
        draw.text((W//2 - tw//2, 38), txt, font=f_txt, fill=WHITE)

        frames.append(np.array(img))
    return frames


def scene_truck_driving(num_frames):
    """Scene 6: Truck driving through the city."""
    frames = []
    ground_y = 750
    for f in range(num_frames):
        t = f / num_frames
        img = Image.new("RGB", (W, H), SKY)
        draw = ImageDraw.Draw(img)

        draw_sun(draw, 1600, 100, 50, t)
        # Moving clouds
        draw_cloud(draw, (500 - t*300) % (W+200) - 100, 80, 1.0)
        draw_cloud(draw, (900 - t*200) % (W+200) - 100, 130, 0.7)
        draw_cloud(draw, (1400 - t*250) % (W+200) - 100, 70, 0.9)

        draw_ground(draw, ground_y)

        # Scrolling road
        draw.rectangle([0, ground_y-15, W, ground_y+65], fill=ROAD)
        offset = int(t * 2000) % 60
        for i in range(-1, W//60 + 2):
            x = i * 60 - offset
            draw.rectangle([x, ground_y+20, x+30, ground_y+28], fill=ROAD_LINE)

        # Scrolling buildings in background
        bg_offset = int(t * 400)
        buildings = [
            (0, 200, 160, BUILDING_1, ROOF_RED),
            (250, 180, 140, BUILDING_2, None),
            (450, 220, 180, BUILDING_3, ROOF_BROWN),
            (700, 160, 130, BUILDING_1, None),
            (900, 200, 170, BUILDING_2, ROOF_RED),
            (1150, 240, 190, BUILDING_1, None),
            (1400, 170, 140, BUILDING_3, ROOF_BROWN),
            (1650, 210, 160, BUILDING_2, None),
            (1900, 190, 150, BUILDING_1, ROOF_RED),
        ]
        for bx, bw, bh, bc, rc in buildings:
            rx = (bx - bg_offset) % (W + 400) - 200
            draw_building(draw, rx, ground_y - 15, bw, bh, bc, rc, door=False, label="")

        # Scrolling trees
        tree_offset = int(t * 600)
        for i in range(8):
            tx = (i * 280 - tree_offset) % (W + 200) - 100
            draw_tree(draw, tx, ground_y - 15, 0.7 + (i % 3) * 0.2)

        # Truck (centered, bouncing slightly)
        truck_x = 700
        bounce = math.sin(t * 20) * 3
        draw_truck(draw, truck_x, ground_y - 15 + int(bounce), 1.2, loaded=True)

        # Wheel rotation effect (dust particles)
        for i in range(5):
            dx = truck_x - 10 - i * 30 - random.Random(f*10+i).randint(0, 20)
            dy = ground_y - 5 + random.Random(f*10+i+5).randint(-10, 10)
            r = random.Random(f*10+i+10).randint(3, 8)
            draw.ellipse([dx-r, dy-r, dx+r, dy+r], fill=LIGHT_GRAY)

        # Speed lines
        for i in range(6):
            ly = ground_y - 50 - i * 25
            lx = truck_x - 50 - random.Random(f+i*7).randint(50, 200)
            ll = random.Random(f+i*7+3).randint(30, 80)
            draw.line([lx, ly, lx-ll, ly], fill=(*LIGHT_GRAY, ), width=2)

        # Map indicator (top right)
        mx, my = 1450, 80
        draw.rounded_rectangle([mx, my, mx+400, my+200], radius=15, fill=WHITE, outline=ACCENT, width=3)
        draw.text((mx+15, my+10), "Ruta de entrega", font=font(18, bold=True), fill=PRIMARY)
        # Mini map with route
        draw.rounded_rectangle([mx+15, my+45, mx+385, my+185], radius=8, fill=LIGHT_BG)
        # Route line
        route_pts = [(mx+30, my+150), (mx+100, my+100), (mx+180, my+130),
                     (mx+250, my+80), (mx+330, my+110), (mx+370, my+70)]
        for i in range(len(route_pts)-1):
            draw.line([route_pts[i], route_pts[i+1]], fill=ACCENT, width=3)
        # Animated dot along route
        seg = min(len(route_pts)-2, int(t * (len(route_pts)-1)))
        seg_t = (t * (len(route_pts)-1)) % 1.0
        if seg < len(route_pts)-1:
            px = int(lerp(route_pts[seg][0], route_pts[min(seg+1, len(route_pts)-1)][0], seg_t))
            py = int(lerp(route_pts[seg][1], route_pts[min(seg+1, len(route_pts)-1)][1], seg_t))
            draw.ellipse([px-8, py-8, px+8, py+8], fill=ORANGE)

        # Destination markers
        for i, (rx, ry) in enumerate(route_pts[1:]):
            draw.ellipse([rx-5, ry-5, rx+5, ry+5], fill=ACCENT)

        # Title
        txt = "Distribución a puntos de entrega en toda la ciudad"
        f_txt = font(26, bold=True)
        tw = draw.textlength(txt, font=f_txt)
        draw.rounded_rectangle([W//2-tw//2-20, 20, W//2+tw//2+20, 65], radius=10, fill=PRIMARY)
        draw.text((W//2 - tw//2, 28), txt, font=f_txt, fill=WHITE)

        frames.append(np.array(img))
    return frames


def scene_delivery(num_frames):
    """Scene 7: Delivering food to families / comedores."""
    frames = []
    ground_y = 780
    for f in range(num_frames):
        t = f / num_frames
        img = Image.new("RGB", (W, H), SKY)
        draw = ImageDraw.Draw(img)

        draw_sun(draw, 200, 110, 45, t)
        draw_cloud(draw, 600+t*40, 80, 0.9)
        draw_cloud(draw, 1100+t*30, 120, 1.1)

        draw_ground(draw, ground_y)
        draw.rectangle([0, ground_y-5, W, ground_y+5], fill=SIDEWALK)

        # Comedor building
        draw_building(draw, 900, ground_y-5, 350, 220, MUNICIPIO_WALL, ROOF_RED, label="")
        # Sign
        draw.rounded_rectangle([950, ground_y-200, 1200, ground_y-165], radius=8, fill=ACCENT)
        draw.text((970, ground_y-195), "Comedor Los Pibes", font=font(18, bold=True), fill=WHITE)

        # Truck parked
        draw_truck(draw, 400, ground_y-15, 0.9, loaded=(t < 0.5))

        # Delivery worker handing box
        worker_x = int(lerp(650, 850, ease_in_out(min(1, t*2))))
        draw_person(draw, worker_x, ground_y-5, SKIN_1, SHIRT_GREEN, PANTS_DARK, 1.1, t=t)
        if t < 0.7:
            draw_box(draw, worker_x-20, ground_y-140, 40, 32)

        # People receiving (comedor workers + families)
        people_data = [
            (920, SKIN_2, SHIRT_RED, 1.0, True),
            (980, SKIN_3, SHIRT_BLUE, 0.9, False),
            (1040, SKIN_1, SHIRT_PURPLE, 0.7, False),  # child
            (1080, SKIN_2, SHIRT_ORANGE, 0.6, False),  # child
        ]
        for px, sk, sh, sc, wave in people_data:
            draw_person(draw, px, ground_y-5, sk, sh, PANTS_DARK, sc, wave=wave, t=t)

        # Boxes being unloaded (accumulated)
        n_boxes = min(6, int(t * 10))
        for i in range(n_boxes):
            bx = 850 + (i % 3) * 50
            by = ground_y - 45 - (i // 3) * 38
            draw_box(draw, bx, by, 42, 32, BOX_BROWN if i % 2 == 0 else BOX_LIGHT)

        # Signature scene (bottom right)
        if t > 0.5:
            sx, sy = 1350, 400
            draw.rounded_rectangle([sx, sy, sx+420, sy+300], radius=12, fill=WHITE, outline=ACCENT, width=3)
            draw.rounded_rectangle([sx, sy, sx+420, sy+48], radius=12, fill=PRIMARY)
            draw.rectangle([sx, sy+35, sx+420, sy+48], fill=PRIMARY)
            draw.text((sx+15, sy+10), "Confirmar Entrega", font=font(20, bold=True), fill=WHITE)

            draw.text((sx+20, sy+60), "Beneficiario: Comedor Los Pibes", font=font(15), fill=DARK)
            draw.text((sx+20, sy+85), "Remito: #2024-0847", font=font(15), fill=DARK)
            draw.text((sx+20, sy+110), "Artículos: 5 tipos  ·  Total: 225 u.", font=font(15), fill=DARK)

            # Photo icon
            draw.rounded_rectangle([sx+20, sy+145, sx+160, sy+235], radius=8, fill=LIGHT_BG, outline=LIGHT_GRAY, width=2)
            draw.text((sx+40, sy+175), "📷 Foto", font=font(18), fill=GRAY)
            draw.text((sx+20, sy+240), "Foto de firma capturada ✓", font=font(14), fill=ACCENT)

            # Confirm button
            if t > 0.7:
                draw.rounded_rectangle([sx+220, sy+245, sx+400, sy+285], radius=10, fill=ACCENT)
                draw.text((sx+240, sy+252), "Entregado ✓", font=font(18, bold=True), fill=WHITE)

        # Hearts & stars
        if t > 0.6:
            ht = (t - 0.6) / 0.4
            positions = [(930, 350), (1000, 320), (1060, 360), (950, 290)]
            for i, (hx, hy) in enumerate(positions):
                bob = math.sin(t * 5 + i * 1.2) * 12
                if i % 2 == 0:
                    draw_heart(draw, hx, int(hy - ht*40 + bob), int(14 * min(1, ht*3)))
                else:
                    draw_star(draw, hx, int(hy - ht*40 + bob), int(12 * min(1, ht*3)))

        # Title
        txt = "Entrega de alimentos a comedores y familias"
        f_txt = font(26, bold=True)
        tw = draw.textlength(txt, font=f_txt)
        draw.rounded_rectangle([W//2-tw//2-20, 25, W//2+tw//2+20, 72], radius=10, fill=PRIMARY)
        draw.text((W//2 - tw//2, 33), txt, font=f_txt, fill=WHITE)

        frames.append(np.array(img))
    return frames


def scene_dashboard(num_frames):
    """Scene 8: SIGAM dashboard showing impact."""
    frames = []
    for f in range(num_frames):
        t = f / num_frames
        img = Image.new("RGB", (W, H), (240, 245, 250))
        draw = ImageDraw.Draw(img)

        # Header bar
        draw.rectangle([0, 0, W, 70], fill=PRIMARY)
        draw.text((30, 18), "SIGAM", font=font(28, bold=True), fill=WHITE)
        draw.text((160, 25), "Dashboard  ·  Reportes  ·  Mapa  ·  Auditoría", font=font(16), fill=SOFT_GREEN)

        # KPI cards
        kpis = [
            ("1,247", "Familias asistidas", ACCENT),
            ("3,450", "Entregas realizadas", BLUE),
            ("18,500 kg", "Mercadería distribuida", ORANGE),
            ("98.5%", "Tasa de entrega", ACCENT),
        ]
        for i, (value, label, color) in enumerate(kpis):
            kx = 40 + i * 470
            ky = 95
            draw.rounded_rectangle([kx, ky, kx+440, ky+120], radius=12, fill=WHITE, outline=LIGHT_GRAY, width=1)
            # Animated counter
            if t > 0.1:
                draw.text((kx+25, ky+15), value, font=font(38, bold=True), fill=color)
                draw.text((kx+25, ky+70), label, font=font(17), fill=GRAY)

        # Bar chart
        if t > 0.2:
            cx, cy = 40, 245
            cw, ch = 900, 370
            draw.rounded_rectangle([cx, cy, cx+cw, cy+ch], radius=12, fill=WHITE, outline=LIGHT_GRAY)
            draw.text((cx+25, cy+15), "Entregas mensuales 2026", font=font(20, bold=True), fill=DARK)

            months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
            values = [280, 320, 350, 310, 390, 420, 380, 410, 450, 430, 460, 0]
            max_v = 500
            bar_w = 52
            bar_gap = 68
            chart_h = 260
            chart_y = cy + 80

            for i, (m, v) in enumerate(zip(months, values)):
                bx = cx + 50 + i * bar_gap
                bar_h = int((v / max_v) * chart_h * min(1, (t - 0.2) * 3))
                c = ACCENT if v > 0 else LIGHT_GRAY
                if v > 400:
                    c = BLUE
                draw.rounded_rectangle([bx, chart_y+chart_h-bar_h, bx+bar_w, chart_y+chart_h],
                                       radius=5, fill=c)
                tw = draw.textlength(m, font=font(12))
                draw.text((bx+bar_w//2-tw//2, chart_y+chart_h+8), m, font=font(12), fill=GRAY)
                if bar_h > 20:
                    draw.text((bx+8, chart_y+chart_h-bar_h+5), str(v), font=font(11), fill=WHITE)

        # Pie chart area
        if t > 0.3:
            px, py = 980, 245
            pw, ph = 900, 370
            draw.rounded_rectangle([px, py, px+pw, py+ph], radius=12, fill=WHITE, outline=LIGHT_GRAY)
            draw.text((px+25, py+15), "Distribución por programa", font=font(20, bold=True), fill=DARK)

            # Simple pie chart
            pie_cx, pie_cy = px + 250, py + 210
            pie_r = 120
            segments = [
                (0.45, ACCENT, "Política Alimentaria"),
                (0.25, BLUE, "Asistencia Crítica"),
                (0.15, ORANGE, "Casos Particulares"),
                (0.10, PURPLE, "Diario"),
                (0.05, MID_GREEN, "Otros"),
            ]
            start_angle = -90
            anim_pct = min(1, (t-0.3)*3)
            for pct, color, label in segments:
                sweep = pct * 360 * anim_pct
                draw.pieslice([pie_cx-pie_r, pie_cy-pie_r, pie_cx+pie_r, pie_cy+pie_r],
                              start_angle, start_angle+sweep, fill=color)
                start_angle += sweep

            # Legend
            for i, (pct, color, label) in enumerate(segments):
                lx = px + 430
                ly = py + 80 + i * 35
                draw.rectangle([lx, ly, lx+20, ly+20], fill=color)
                draw.text((lx+30, ly), f"{label} ({int(pct*100)}%)", font=font(15), fill=DARK)

        # Map preview
        if t > 0.5:
            mapx, mapy = 40, 640
            mapw, maph = 800, 350
            draw.rounded_rectangle([mapx, mapy, mapx+mapw, mapy+maph], radius=12,
                                   fill=WHITE, outline=LIGHT_GRAY)
            draw.text((mapx+25, mapy+15), "Mapa de cobertura", font=font(20, bold=True), fill=DARK)
            # Map background
            draw.rounded_rectangle([mapx+20, mapy+50, mapx+mapw-20, mapy+maph-20],
                                   radius=8, fill=LIGHT_BG)
            # Simulated map dots
            map_pts = [
                (180, 120, 8), (250, 180, 12), (320, 100, 6), (400, 200, 10),
                (150, 250, 7), (500, 150, 9), (350, 280, 11), (600, 120, 8),
                (450, 250, 6), (280, 160, 10), (550, 230, 7), (200, 200, 9),
                (380, 140, 8), (480, 280, 6), (160, 310, 7), (650, 200, 10),
            ]
            n_dots = min(len(map_pts), int((t-0.5)*30))
            for i in range(n_dots):
                dx, dy, dr = map_pts[i]
                draw.ellipse([mapx+dx-dr, mapy+50+dy-dr, mapx+dx+dr, mapy+50+dy+dr],
                             fill=(*ACCENT, ), outline=PRIMARY, width=2)

        # Recent activity
        if t > 0.5:
            ax, ay = 880, 640
            aw, ah = 1000, 350
            draw.rounded_rectangle([ax, ay, ax+aw, ay+ah], radius=12, fill=WHITE, outline=LIGHT_GRAY)
            draw.text((ax+25, ay+15), "Actividad reciente", font=font(20, bold=True), fill=DARK)
            draw.line([ax+20, ay+50, ax+aw-20, ay+50], fill=LIGHT_GRAY, width=1)

            activities = [
                ("14:32", "Remito #0847 entregado", "Comedor Los Pibes", ACCENT),
                ("14:15", "Stock actualizado", "Ingreso arroz x 200u", BLUE),
                ("13:50", "Caso aprobado", "María González — URGENTE", ORANGE),
                ("13:30", "Remito #0846 confirmado", "Espacio Mi Barrio", ACCENT),
                ("13:10", "Nuevo beneficiario", "Centro Comunitario Sol", BLUE),
                ("12:45", "Transferencia depósitos", "LOG → CITA: fideos x100", PURPLE),
                ("12:20", "ANEXO VI generado", "Marzo 2026 — PA Regular", PRIMARY),
            ]
            n_act = min(len(activities), int((t-0.5)*14))
            for i in range(n_act):
                time_str, action, detail, color = activities[i]
                iy = ay + 62 + i * 40
                draw.ellipse([ax+25, iy+5, ax+37, iy+17], fill=color)
                draw.text((ax+45, iy), time_str, font=font(13), fill=LIGHT_GRAY)
                draw.text((ax+110, iy), action, font=font(14, bold=True), fill=DARK)
                draw.text((ax+400, iy), detail, font=font(13), fill=GRAY)

        frames.append(np.array(img))
    return frames


def scene_impact(num_frames):
    """Scene 9: Impact / community happy scene."""
    frames = []
    ground_y = 780
    for f in range(num_frames):
        t = f / num_frames
        img = Image.new("RGB", (W, H), SKY_SUNSET)
        draw = ImageDraw.Draw(img)

        # Sunset sky gradient
        for i in range(400):
            ratio = i / 400
            r = int(lerp(255, 173, ratio))
            g = int(lerp(183, 216, ratio))
            b = int(lerp(120, 255, ratio))
            draw.line([0, i, W, i], fill=(r, g, b))

        draw_sun(draw, W//2, 200, 70, t)

        # Ground
        draw_ground(draw, ground_y, GRASS)

        # Community buildings
        draw_building(draw, 100, ground_y-5, 200, 180, MUNICIPIO_WALL, ROOF_BROWN, label="")
        draw_building(draw, 400, ground_y-5, 250, 160, BUILDING_1, ROOF_RED, label="")
        draw_building(draw, 1300, ground_y-5, 220, 190, BUILDING_2, ROOF_BROWN, label="")
        draw_building(draw, 1550, ground_y-5, 200, 150, MUNICIPIO_WALL, ROOF_RED, label="")

        # Municipal banner
        bx, by = W//2-250, ground_y-350
        draw.rounded_rectangle([bx, by, bx+500, by+80], radius=15, fill=PRIMARY)
        draw.text((bx+30, by+10), "Municipalidad de La Plata", font=font(28, bold=True), fill=WHITE)
        draw.text((bx+30, by+45), "Acción Social  ·  SIGAM", font=font(18), fill=SOFT_GREEN)

        # Lots of people (community scene)
        community = [
            (300, SKIN_1, SHIRT_BLUE, 1.0, True),
            (400, SKIN_2, SHIRT_RED, 0.9, False),
            (500, SKIN_3, SHIRT_GREEN, 1.1, True),
            (600, SKIN_1, SHIRT_ORANGE, 0.7, False),
            (680, SKIN_2, SHIRT_PURPLE, 0.65, False),
            (770, SKIN_3, SHIRT_BLUE, 1.0, False),
            (870, SKIN_1, SHIRT_RED, 0.8, True),
            (950, SKIN_2, SHIRT_GREEN, 0.6, False),
            (1030, SKIN_3, SHIRT_ORANGE, 1.0, False),
            (1130, SKIN_1, SHIRT_PURPLE, 0.75, True),
            (1220, SKIN_2, SHIRT_BLUE, 0.9, False),
            (1350, SKIN_3, SHIRT_RED, 0.65, False),
        ]
        for i, (px, sk, sh, sc, wave) in enumerate(community):
            appear_t = 0.1 + i * 0.05
            if t > appear_t:
                draw_person(draw, px, ground_y-5, sk, sh, PANTS_DARK if i % 2 == 0 else PANTS_BLUE,
                            sc, wave=wave, t=t)

        # Trees
        draw_tree(draw, 50, ground_y-5, 1.0)
        draw_tree(draw, 1750, ground_y-5, 1.2)
        draw_tree(draw, 730, ground_y-5, 0.8)

        # Floating hearts and stars
        if t > 0.3:
            ht = (t - 0.3) / 0.7
            for i in range(12):
                hx = 200 + i * 140
                hy_base = 500 - i * 15
                bob = math.sin(t * 4 + i * 0.8) * 20
                rise = ht * 80
                if i % 3 == 0:
                    draw_heart(draw, hx, int(hy_base - rise + bob), int(16 * min(1, ht*2)))
                elif i % 3 == 1:
                    draw_star(draw, hx, int(hy_base - rise + bob), int(13 * min(1, ht*2)))
                else:
                    draw_heart(draw, hx, int(hy_base - rise + bob + 30), int(10 * min(1, ht*2)), MID_GREEN)

        # Impact numbers
        if t > 0.5:
            stats = [
                ("1,247", "familias"),
                ("48", "comedores"),
                ("12", "organizaciones"),
                ("18,500 kg", "de alimentos"),
            ]
            for i, (val, label) in enumerate(stats):
                sx = 250 + i * 380
                sy = 100
                appear = min(1, (t - 0.5 - i*0.08) * 5)
                if appear > 0:
                    draw.rounded_rectangle([sx-80, sy, sx+120, sy+85], radius=12,
                                           fill=(*WHITE, ), outline=SOFT_GREEN, width=2)
                    draw.text((sx-60, sy+8), val, font=font(30, bold=True), fill=PRIMARY)
                    draw.text((sx-60, sy+50), label, font=font(16), fill=GRAY)

        frames.append(np.array(img))
    return frames


def scene_closing(num_frames):
    """Scene 10: Closing with SIGAM branding."""
    frames = []
    for f in range(num_frames):
        t = f / num_frames
        img = Image.new("RGB", (W, H), DARK_GREEN)
        draw = ImageDraw.Draw(img)

        # Subtle animated lines
        for i in range(25):
            ly = int(i * 50 + (t * 80) % 50) - 25
            draw.line([0, ly, W, ly], fill=(22, 80, 25), width=1)

        # Animated elements
        line_w = int(200 * min(1, t*3))
        cx = W // 2

        draw.rectangle([cx-line_w, 280, cx+line_w, 284], fill=WHITE)

        if t > 0.1:
            txt = "SIGAM"
            f_t = font(80, bold=True)
            tw = draw.textlength(txt, font=f_t)
            draw.text((cx-tw//2, 310), txt, font=f_t, fill=WHITE)

        if t > 0.2:
            sub = "Gestión alimentaria transparente, eficiente y trazable"
            f_s = font(26)
            tw2 = draw.textlength(sub, font=f_s)
            draw.text((cx-tw2//2, 415), sub, font=f_s, fill=SOFT_GREEN)

        if t > 0.3:
            draw.rectangle([cx-line_w, 465, cx+line_w, 469], fill=WHITE)

        if t > 0.35:
            org = "Municipalidad de La Plata  ·  Secretaría de Desarrollo Social"
            f_o = font(20)
            tw3 = draw.textlength(org, font=f_o)
            draw.text((cx-tw3//2, 490), org, font=f_o, fill=MID_GREEN)

        if t > 0.45:
            motto = "Porque cada entrega cuenta."
            f_m = font(28, light=True)
            tw4 = draw.textlength(motto, font=f_m)
            draw.text((cx-tw4//2, 580), motto, font=f_m, fill=SOFT_GREEN)

        # Floating hearts
        if t > 0.5:
            ht = (t - 0.5) / 0.5
            for i in range(8):
                hx = 250 + i * 200
                hy = 700 - ht * 100
                bob = math.sin(t * 4 + i) * 15
                if i % 2 == 0:
                    draw_heart(draw, hx, int(hy + bob), int(14 * min(1, ht*3)))
                else:
                    draw_star(draw, hx, int(hy + bob), int(11 * min(1, ht*3)))

        # Fade to black at very end
        if t > 0.85:
            fade = (t - 0.85) / 0.15
            overlay = Image.new("RGB", (W, H), (0, 0, 0))
            img = Image.blend(img, overlay, fade)

        frames.append(np.array(img))
    return frames


# ════════════════════════════════════════════════════════════════
#  TRANSITIONS
# ════════════════════════════════════════════════════════════════

def crossfade(frames_a, frames_b, n_frames):
    """Cross-fade last n_frames of A with first n_frames of B."""
    result = []
    for i in range(n_frames):
        alpha = i / max(n_frames - 1, 1)
        a = frames_a[-(n_frames - i)].astype(np.float32)
        b = frames_b[i].astype(np.float32)
        blended = ((1 - alpha) * a + alpha * b).astype(np.uint8)
        result.append(blended)
    return result


# ════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════

def main():
    scene_defs = [
        ("Intro SIGAM", scene_intro, 5),
        ("Depósito Municipal", scene_deposito, 8),
        ("Trabajo Social", scene_social_worker, 8),
        ("Generación de Remitos", scene_remitos, 8),
        ("Carga del Camión", scene_loading_truck, 7),
        ("Recorrido por la Ciudad", scene_truck_driving, 7),
        ("Entrega de Alimentos", scene_delivery, 8),
        ("Dashboard SIGAM", scene_dashboard, 9),
        ("Impacto Comunitario", scene_impact, 7),
        ("Cierre", scene_closing, 6),
    ]

    print("=" * 60)
    print("SIGAM — Generating Animated Video")
    print("=" * 60)

    scenes = []
    for name, func, duration in scene_defs:
        n_frames = duration * FPS
        print(f"  Rendering: {name} ({duration}s, {n_frames} frames)...")
        frames = func(n_frames)
        scenes.append(frames)

    # Assemble with crossfades
    print("\nAssembling with crossfade transitions...")
    xfade_frames = int(0.8 * FPS)  # 0.8s crossfade
    all_frames = list(scenes[0])

    for i in range(1, len(scenes)):
        # Crossfade
        xf = crossfade(all_frames, scenes[i], xfade_frames)
        # Remove overlapping frames from end of all_frames
        all_frames = all_frames[:-xfade_frames]
        all_frames.extend(xf)
        # Add remaining frames from next scene
        all_frames.extend(scenes[i][xfade_frames:])

    total_secs = len(all_frames) / FPS
    print(f"  Total: {len(all_frames)} frames ({total_secs:.1f}s @ {FPS}fps)")

    # Encode
    print("\nEncoding H.264 video...")
    import imageio.v3 as iio

    with iio.imopen(OUTPUT, "w", plugin="pyav") as writer:
        writer.init_video_stream("libx264", fps=FPS)
        for i, frame in enumerate(all_frames):
            writer.write_frame(frame)
            if (i + 1) % (FPS * 10) == 0:
                pct = (i + 1) / len(all_frames) * 100
                print(f"  {pct:.0f}% encoded ({i+1}/{len(all_frames)} frames)...")

    print(f"\n{'=' * 60}")
    print(f"Video saved: {OUTPUT}")
    print(f"Duration: {total_secs:.1f}s | {W}x{H} | {FPS}fps")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
