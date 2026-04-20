"""
SIGAM — Animated storytelling video V2 (improved graphics + music).
Better characters, gradient skies, shadows, particles, synthesized BGM.
"""

import math, random, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ── Config ──
W, H = 1920, 1080
FPS = 30
OUTPUT = r"C:\Users\Usuario\OneDrive\Escritorio\SIGAM\SIGAM_Animado_v2.mp4"
AUDIO_SR = 44100

# ── Colors ──
WHITE       = (255, 255, 255)
DARK        = (33, 33, 33)
GRAY        = (120, 120, 120)
LIGHT_GRAY  = (200, 200, 200)
BLACK       = (0, 0, 0)

PRIMARY     = (27, 94, 32)
ACCENT      = (46, 125, 50)
SOFT_GREEN  = (165, 214, 167)
DARK_GREEN  = (20, 77, 23)
MID_GREEN   = (129, 199, 132)
LIGHT_BG    = (232, 245, 233)

ORANGE      = (230, 81, 0)
BLUE        = (21, 101, 192)
PURPLE      = (106, 27, 154)

GRASS       = (76, 175, 80)
GRASS_DARK  = (56, 142, 60)
GRASS_LIGHT = (102, 187, 106)
ROAD        = (80, 80, 80)
ROAD_LINE   = (255, 235, 59)
SIDEWALK    = (210, 210, 210)

BUILDING_1  = (236, 239, 241)
BUILDING_2  = (207, 216, 220)
BUILDING_3  = (176, 190, 197)
ROOF_RED    = (198, 40, 40)
ROOF_BROWN  = (141, 110, 99)
DOOR_BROWN  = (93, 64, 55)
WINDOW_BLUE = (144, 202, 249)
WINDOW_GLOW = (255, 245, 200)

TRUCK_WHITE = (245, 245, 245)
TRUCK_GREEN = (46, 125, 50)
TRUCK_CAB   = (56, 142, 60)
WHEEL_BLACK = (50, 50, 50)
WHEEL_GRAY  = (130, 130, 130)
WHEEL_RIM   = (180, 180, 180)

BOX_BROWN   = (161, 136, 107)
BOX_LIGHT   = (188, 170, 146)
BOX_DARK    = (121, 85, 72)
BOX_GREEN   = (129, 170, 120)

SKIN_1      = (255, 213, 179)
SKIN_2      = (210, 180, 140)
SKIN_3      = (180, 140, 100)
SKIN_1_SHADE = (235, 193, 159)
SKIN_2_SHADE = (190, 160, 120)
SKIN_3_SHADE = (160, 120, 80)

HAIR_BLACK  = (40, 40, 40)
HAIR_BROWN  = (101, 67, 33)
HAIR_DARK   = (60, 40, 20)
HAIR_LIGHT  = (160, 120, 60)

SHIRT_BLUE   = (66, 165, 245)
SHIRT_RED    = (239, 83, 80)
SHIRT_GREEN  = (102, 187, 106)
SHIRT_ORANGE = (255, 167, 38)
SHIRT_PURPLE = (171, 71, 188)
SHIRT_WHITE  = (230, 230, 230)
PANTS_BLUE   = (48, 63, 159)
PANTS_DARK   = (55, 55, 55)
PANTS_KHAKI  = (160, 140, 100)

HEART_RED   = (229, 57, 53)
STAR_YELLOW = (255, 235, 59)
SUN_YELLOW  = (255, 235, 59)
SUN_ORANGE  = (255, 183, 77)

MUNICIPIO_WALL = (239, 235, 233)
SHADOW_COLOR   = (0, 0, 0, 60)

# ── Fonts ──
def font(size, bold=False, light=False):
    if light:
        return ImageFont.truetype("C:/Windows/Fonts/segoeuil.ttf", size)
    if bold:
        return ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", size)
    return ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", size)


# ════════════════════════════════════════════════════════════════
#  UTILITY
# ════════════════════════════════════════════════════════════════

def lerp(a, b, t):
    return a + (b - a) * t

def lerp_color(c1, c2, t):
    return tuple(int(a + (b-a)*t) for a,b in zip(c1,c2))

def ease_in_out(t):
    return t*t*(3-2*t)

def ease_out(t):
    return 1 - (1-t)**3

def clamp01(t):
    return max(0.0, min(1.0, t))


# ════════════════════════════════════════════════════════════════
#  GRADIENT SKY
# ════════════════════════════════════════════════════════════════

def draw_sky_gradient(draw, top_color, mid_color, bot_color, height):
    """Three-stop vertical gradient for sky."""
    half = height // 2
    for y in range(half):
        t = y / half
        c = lerp_color(top_color, mid_color, t)
        draw.line([(0, y), (W, y)], fill=c)
    for y in range(half, height):
        t = (y - half) / (height - half)
        c = lerp_color(mid_color, bot_color, t)
        draw.line([(0, y), (W, y)], fill=c)


def sky_day(draw, h=700):
    draw_sky_gradient(draw, (110, 180, 255), (160, 210, 255), (200, 230, 255), h)

def sky_sunset(draw, h=700):
    draw_sky_gradient(draw, (80, 130, 200), (255, 160, 100), (255, 200, 130), h)

def sky_office(draw):
    draw_sky_gradient(draw, (220, 230, 240), (235, 240, 248), (245, 248, 252), H)


# ════════════════════════════════════════════════════════════════
#  IMPROVED DRAWING PRIMITIVES
# ════════════════════════════════════════════════════════════════

def draw_shadow_ellipse(draw, cx, cy, rx, ry, color=(0,0,0)):
    """Soft shadow ellipse."""
    for i in range(4):
        alpha_c = lerp_color(color, (200,200,200), i/4)
        draw.ellipse([cx-rx-i*2, cy-ry-i, cx+rx+i*2, cy+ry+i], fill=alpha_c)


def draw_cloud(draw, cx, cy, scale=1.0):
    s = scale
    # Shadow first
    offsets = [(-30*s, 8*s, 35*s), (0, -7*s, 48*s), (35*s, 3*s, 40*s),
               (62*s, 13*s, 28*s), (-55*s, 13*s, 25*s)]
    for dx, dy, r in offsets:
        x, y = int(cx+dx), int(cy+dy+6)
        draw.ellipse([x-int(r), y-int(r), x+int(r), y+int(r)], fill=(220,230,240))
    for dx, dy, r in offsets:
        x, y = int(cx+dx), int(cy+dy)
        draw.ellipse([x-int(r), y-int(r), x+int(r), y+int(r)], fill=WHITE)
    # Highlight
    draw.ellipse([int(cx-20*s), int(cy-25*s), int(cx+15*s), int(cy-5*s)], fill=(255,255,255))


def draw_sun(draw, cx, cy, radius=60, t=0):
    # Outer glow rings
    for i in range(5, 0, -1):
        r = radius + i*18
        c = lerp_color(SUN_YELLOW, (255,240,200), i/5)
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=c)
    draw.ellipse([cx-radius, cy-radius, cx+radius, cy+radius], fill=SUN_YELLOW)
    # Inner bright spot
    ir = radius // 2
    draw.ellipse([cx-ir, cy-ir, cx+ir, cy+ir], fill=(255, 250, 230))
    # Rays
    for i in range(16):
        angle = math.radians(i * 22.5 + t * 15)
        r1 = radius + 12
        r2 = radius + 35 + math.sin(t*3 + i) * 8
        x1 = cx + int(r1 * math.cos(angle))
        y1 = cy + int(r1 * math.sin(angle))
        x2 = cx + int(r2 * math.cos(angle))
        y2 = cy + int(r2 * math.sin(angle))
        draw.line([x1, y1, x2, y2], fill=SUN_YELLOW, width=3)


def draw_tree(draw, x, y, scale=1.0, variant=0):
    s = scale
    # Shadow on ground
    draw.ellipse([x-int(25*s), y-int(5*s), x+int(25*s), y+int(5*s)], fill=(50,130,50))
    # Trunk with gradient
    tw, th = int(16*s), int(55*s)
    draw.rectangle([x-tw//2, y-th, x+tw//2, y], fill=(101, 67, 33))
    draw.rectangle([x-tw//2, y-th, x-tw//2+int(4*s), y], fill=(121, 85, 55))  # highlight
    # Rich foliage
    layers = [
        (0, -th-int(25*s), int(40*s), ACCENT),
        (-int(22*s), -th-int(8*s), int(32*s), GRASS),
        (int(22*s), -th-int(8*s), int(32*s), (56, 150, 60)),
        (0, -th-int(42*s), int(28*s), (80, 180, 85)),
        (-int(12*s), -th-int(32*s), int(22*s), ACCENT),
        (int(12*s), -th-int(32*s), int(22*s), GRASS_LIGHT),
    ]
    for dx, dy, r, c in layers:
        draw.ellipse([x+dx-r, y+dy-r, x+dx+r, y+dy+r], fill=c)
    # Highlight spots
    for dx, dy, r in [(-int(8*s), -th-int(35*s), int(8*s)), (int(10*s), -th-int(18*s), int(10*s))]:
        draw.ellipse([x+dx-r, y+dy-r, x+dx+r, y+dy+r], fill=(120, 200, 120))


def draw_person_v2(draw, x, y, skin=SKIN_1, shirt=SHIRT_BLUE, pants=PANTS_BLUE,
                   scale=1.0, wave=False, t=0, facing_right=True,
                   hair_color=HAIR_BLACK, hair_style=0, has_hat=False):
    """Improved person with hair, shading, better proportions."""
    s = scale
    shade = {SKIN_1: SKIN_1_SHADE, SKIN_2: SKIN_2_SHADE, SKIN_3: SKIN_3_SHADE}.get(skin, skin)
    shirt_dark = tuple(max(0, c-30) for c in shirt)

    # Ground shadow
    draw.ellipse([x-int(18*s), y-int(4*s), x+int(18*s), y+int(4*s)], fill=(50, 130, 50))

    # Feet/shoes
    shoe_w, shoe_h = int(12*s), int(8*s)
    for sx_off in [-int(10*s), int(4*s)]:
        draw.rounded_rectangle([x+sx_off-shoe_w//2, y-shoe_h, x+sx_off+shoe_w//2, y],
                               radius=int(3*s), fill=(60,60,60))

    # Legs
    lw = int(10*s)
    lh = int(32*s)
    draw.rounded_rectangle([x-int(12*s), y-lh-shoe_h+int(4*s), x-int(12*s)+lw, y-shoe_h+int(2*s)],
                           radius=int(3*s), fill=pants)
    draw.rounded_rectangle([x+int(2*s), y-lh-shoe_h+int(4*s), x+int(2*s)+lw, y-shoe_h+int(2*s)],
                           radius=int(3*s), fill=pants)

    # Body / torso
    bw, bh = int(30*s), int(38*s)
    body_top = y - lh - bh - shoe_h + int(8*s)
    body_bot = y - lh - shoe_h + int(8*s)
    draw.rounded_rectangle([x-int(15*s), body_top, x+int(15*s), body_bot],
                           radius=int(6*s), fill=shirt)
    # Shading on body (right side)
    draw.rounded_rectangle([x+int(2*s), body_top+int(5*s), x+int(14*s), body_bot-int(3*s)],
                           radius=int(4*s), fill=shirt_dark)

    # Collar detail
    draw.arc([x-int(8*s), body_top-int(2*s), x+int(8*s), body_top+int(12*s)],
             0, 180, fill=shirt_dark, width=int(2*s))

    # Neck
    neck_h = int(8*s)
    neck_y = body_top - neck_h
    draw.rectangle([x-int(5*s), neck_y, x+int(5*s), body_top+int(3*s)], fill=skin)

    # Head
    hr = int(18*s)
    hx, hy = x, neck_y - hr + int(3*s)
    draw.ellipse([hx-hr, hy-hr, hx+hr, hy+hr], fill=skin)
    # Head shading
    draw.ellipse([hx+int(3*s), hy-hr+int(3*s), hx+hr-int(2*s), hy+hr-int(3*s)], fill=shade)

    # Hair
    hair_top = hy - hr
    if hair_style == 0:  # Short hair
        draw.ellipse([hx-hr-int(1*s), hair_top-int(2*s), hx+hr+int(1*s), hy-int(2*s)],
                     fill=hair_color)
        draw.ellipse([hx-hr+int(2*s), hair_top+int(5*s), hx+hr-int(2*s), hy+int(5*s)],
                     fill=skin)  # face cutout
    elif hair_style == 1:  # Long hair
        draw.ellipse([hx-hr-int(3*s), hair_top-int(4*s), hx+hr+int(3*s), hy+int(3*s)],
                     fill=hair_color)
        draw.ellipse([hx-hr+int(3*s), hair_top+int(8*s), hx+hr-int(3*s), hy+int(8*s)],
                     fill=skin)  # face
        # Hair sides going down
        draw.rectangle([hx-hr-int(2*s), hy, hx-hr+int(6*s), body_top+int(15*s)], fill=hair_color)
        draw.rectangle([hx+hr-int(6*s), hy, hx+hr+int(2*s), body_top+int(15*s)], fill=hair_color)
    elif hair_style == 2:  # Curly/afro
        r2 = hr + int(8*s)
        draw.ellipse([hx-r2, hy-r2-int(3*s), hx+r2, hy+int(5*s)], fill=hair_color)
        draw.ellipse([hx-hr+int(3*s), hair_top+int(10*s), hx+hr-int(3*s), hy+int(10*s)],
                     fill=skin)

    # Hat (for workers)
    if has_hat:
        draw.rounded_rectangle([hx-hr-int(5*s), hair_top-int(8*s), hx+hr+int(5*s), hair_top+int(4*s)],
                               radius=int(3*s), fill=ACCENT)
        draw.rounded_rectangle([hx-int(12*s), hair_top-int(15*s), hx+int(12*s), hair_top-int(2*s)],
                               radius=int(5*s), fill=ACCENT)

    # Eyes
    er = int(3*s)
    direction = int(5*s) if facing_right else int(-5*s)
    for eye_x_off in [-int(6*s), int(3*s)]:
        ex = hx + direction + eye_x_off
        ey = hy - int(2*s)
        # White
        draw.ellipse([ex-er-int(1*s), ey-er-int(1*s), ex+er+int(1*s), ey+er+int(1*s)], fill=WHITE)
        # Pupil
        draw.ellipse([ex-er+int(1*s), ey-er+int(1*s), ex+er-int(1*s), ey+er-int(1*s)], fill=DARK)
        # Highlight
        draw.ellipse([ex-int(1*s), ey-int(2*s), ex+int(1*s), ey], fill=WHITE)

    # Eyebrows
    for eb_off in [-int(6*s), int(3*s)]:
        ebx = hx + direction + eb_off
        draw.line([ebx-int(3*s), hy-int(7*s), ebx+int(3*s), hy-int(8*s)],
                  fill=hair_color, width=max(1, int(2*s)))

    # Nose (small)
    nx = hx + (int(3*s) if facing_right else int(-3*s))
    draw.line([nx, hy+int(1*s), nx+int(2*s), hy+int(5*s)], fill=shade, width=max(1, int(2*s)))

    # Mouth / smile
    mx = hx + (int(2*s) if facing_right else int(-2*s))
    draw.arc([mx-int(5*s), hy+int(5*s), mx+int(5*s), hy+int(13*s)],
             10, 170, fill=(200, 100, 100), width=max(1, int(2*s)))

    # Ears
    ear_r = int(4*s)
    for ear_side in [-1, 1]:
        ear_x = hx + ear_side * (hr - int(1*s))
        draw.ellipse([ear_x-ear_r, hy-ear_r, ear_x+ear_r, hy+ear_r], fill=skin)

    # Arms
    arm_y = body_top + int(12*s)
    arm_len = int(28*s)
    arm_w = max(2, int(7*s))
    if wave:
        angle = math.sin(t * 6) * 35 + 35
        ex_a = x + int(15*s) + int(arm_len * math.cos(math.radians(-angle)))
        ey_a = arm_y + int(arm_len * math.sin(math.radians(-angle)))
        draw.line([x+int(15*s), arm_y, int(ex_a), int(ey_a)], fill=skin, width=arm_w)
        # Hand
        draw.ellipse([int(ex_a)-int(4*s), int(ey_a)-int(4*s),
                      int(ex_a)+int(4*s), int(ey_a)+int(4*s)], fill=skin)
    else:
        draw.line([x+int(15*s), arm_y, x+int(24*s), arm_y+int(25*s)], fill=skin, width=arm_w)
        draw.ellipse([x+int(20*s), arm_y+int(22*s), x+int(28*s), arm_y+int(30*s)], fill=skin)

    draw.line([x-int(15*s), arm_y, x-int(24*s), arm_y+int(25*s)], fill=skin, width=arm_w)
    draw.ellipse([x-int(28*s), arm_y+int(22*s), x-int(20*s), arm_y+int(30*s)], fill=skin)


def draw_box_v2(draw, x, y, w=40, h=35, color=BOX_BROWN):
    shade = tuple(max(0, c-25) for c in color)
    highlight = tuple(min(255, c+30) for c in color)
    # Shadow
    draw.rectangle([x+3, y+3, x+w+3, y+h+3], fill=(100,90,80))
    # Main box
    draw.rectangle([x, y, x+w, y+h], fill=color)
    # Top face (lighter)
    draw.rectangle([x, y, x+w, y+int(h*0.2)], fill=highlight)
    # Side shade
    draw.rectangle([x+int(w*0.7), y, x+w, y+h], fill=shade)
    # Tape
    draw.line([x+w//2-1, y, x+w//2-1, y+h], fill=shade, width=3)
    draw.line([x+w//2, y, x+w//2, y+h], fill=(200, 180, 150), width=1)


def draw_truck_v2(draw, x, y, scale=1.0, loaded=True):
    s = scale
    # Ground shadow
    draw.ellipse([x-int(10*s), y-int(5*s), x+int(270*s), y+int(12*s)], fill=(50,130,50))

    # Cargo area
    cw, ch = int(190*s), int(110*s)
    # Shadow
    draw.rounded_rectangle([x+4, y-ch+4, x+cw+4, y+4], radius=int(6*s), fill=(150,150,150))
    # Main
    draw.rounded_rectangle([x, y-ch, x+cw, y], radius=int(6*s), fill=TRUCK_WHITE)
    # Top edge highlight
    draw.rounded_rectangle([x, y-ch, x+cw, y-ch+int(8*s)], radius=int(6*s), fill=(252,252,252))
    # Green stripe
    draw.rectangle([x+int(3*s), y-int(28*s), x+cw-int(3*s), y-int(14*s)], fill=TRUCK_GREEN)
    # SIGAM text
    draw.text((x+int(25*s), y-ch+int(18*s)), "SIGAM", font=font(int(30*s), bold=True), fill=TRUCK_GREEN)
    # Food icon text
    draw.text((x+int(135*s), y-ch+int(22*s)), "🍞", font=font(int(20*s)), fill=DARK)

    # Boxes
    if loaded:
        for i in range(5):
            bx = x + int(12*s) + i * int(34*s)
            draw_box_v2(draw, bx, y-int(72*s), int(28*s), int(26*s),
                        BOX_BROWN if i % 2 == 0 else BOX_LIGHT)
        for i in range(3):
            bx = x + int(28*s) + i * int(38*s)
            draw_box_v2(draw, bx, y-int(96*s), int(26*s), int(20*s), BOX_GREEN)

    # Cab
    cab_w = int(75*s)
    draw.rounded_rectangle([x+cw, y-int(80*s), x+cw+cab_w, y], radius=int(10*s), fill=TRUCK_CAB)
    # Cab shade
    draw.rounded_rectangle([x+cw+int(cab_w*0.6), y-int(78*s), x+cw+cab_w-int(2*s), y-int(2*s)],
                           radius=int(6*s), fill=(46,120,48))
    # Windshield with reflection
    ws_x1, ws_y1 = x+cw+int(15*s), y-int(73*s)
    ws_x2, ws_y2 = x+cw+cab_w-int(6*s), y-int(32*s)
    draw.rounded_rectangle([ws_x1, ws_y1, ws_x2, ws_y2], radius=int(5*s), fill=WINDOW_BLUE)
    # Reflection streak
    draw.line([ws_x1+int(5*s), ws_y1+int(5*s), ws_x1+int(15*s), ws_y2-int(5*s)],
              fill=(200, 230, 255), width=int(3*s))
    # Headlight
    draw.ellipse([x+cw+cab_w-int(12*s), y-int(25*s), x+cw+cab_w-int(2*s), y-int(15*s)],
                 fill=SUN_YELLOW)

    # Wheels with detail
    for wx in [x+int(32*s), x+int(148*s), x+cw+int(38*s)]:
        wr = int(20*s)
        # Wheel shadow
        draw.ellipse([wx-wr+2, y-wr+int(8*s), wx+wr+2, y+wr+int(8*s)], fill=(40,40,40))
        # Tire
        draw.ellipse([wx-wr, y-wr+int(5*s), wx+wr, y+wr+int(5*s)], fill=WHEEL_BLACK)
        # Rim
        rim_r = int(12*s)
        draw.ellipse([wx-rim_r, y-rim_r+int(5*s), wx+rim_r, y+rim_r+int(5*s)], fill=WHEEL_RIM)
        # Hub
        hub_r = int(5*s)
        draw.ellipse([wx-hub_r, y-hub_r+int(5*s), wx+hub_r, y+hub_r+int(5*s)], fill=WHEEL_GRAY)
        # Spokes
        for spoke in range(5):
            a = math.radians(spoke * 72)
            sx1 = wx + int(hub_r * math.cos(a))
            sy1 = y + int(5*s) + int(hub_r * math.sin(a))
            sx2 = wx + int(rim_r * math.cos(a))
            sy2 = y + int(5*s) + int(rim_r * math.sin(a))
            draw.line([sx1, sy1, sx2, sy2], fill=WHEEL_GRAY, width=max(1, int(2*s)))


def draw_warehouse_v2(draw, x, y, w=400, h=240, label="DEPÓSITO"):
    # Shadow
    draw.rectangle([x+6, y-h+6, x+w+6, y+6], fill=(100,100,100))
    # Main body
    draw.rectangle([x, y-h, x+w, y], fill=BUILDING_2)
    # Side shading
    draw.rectangle([x+int(w*0.75), y-h, x+w, y], fill=BUILDING_3)
    # Corrugated roof with depth
    pts = [(x-18, y-h), (x+w//2, y-h-55), (x+w+18, y-h)]
    draw.polygon(pts, fill=BUILDING_3)
    pts2 = [(x-12, y-h), (x+w//2, y-h-48), (x+w+12, y-h)]
    draw.polygon(pts2, fill=(190, 200, 210))
    # Roof lines
    for i in range(8):
        rx = x - 10 + i * (w+20) // 8
        ry = y - h - int(48 * (1 - abs(rx - x - w//2) / (w//2 + 10)))
        draw.line([rx, y-h, rx, ry], fill=BUILDING_3, width=2)

    # Big rolling door
    dw, dh = 130, 140
    dx = x + w//2 - dw//2
    draw.rectangle([dx, y-dh, dx+dw, y], fill=(170,170,170))
    for i in range(7):
        ly = y - dh + 8 + i * 20
        draw.line([dx+4, ly, dx+dw-4, ly], fill=GRAY, width=1)
    # Door frame
    draw.rectangle([dx-4, y-dh-4, dx+dw+4, y-dh], fill=(100,100,100))

    # Label
    f_l = font(20, bold=True)
    tw = draw.textlength(label, font=f_l)
    draw.rounded_rectangle([x+w//2-tw//2-15, y-h-50, x+w//2+tw//2+15, y-h-25],
                           radius=6, fill=PRIMARY)
    draw.text((x+w//2-tw//2, y-h-48), label, font=f_l, fill=WHITE)

    # Windows
    for i in range(3):
        wx = x + 25 + i * 55
        if wx + 28 < dx - 5:
            draw.rectangle([wx, y-h+30, wx+28, y-h+58], fill=WINDOW_BLUE, outline=WHITE, width=2)
    for i in range(3):
        wx = dx + dw + 15 + i * 55
        if wx + 28 < x + w - 10:
            draw.rectangle([wx, y-h+30, wx+28, y-h+58], fill=WINDOW_BLUE, outline=WHITE, width=2)


def draw_building_v2(draw, x, y, w, h, color=BUILDING_1, roof_color=None, label=""):
    # Shadow
    draw.rectangle([x+5, y-h+5, x+w+5, y+5], fill=(150,150,150))
    # Main
    draw.rectangle([x, y-h, x+w, y], fill=color)
    # Side shading
    draw.rectangle([x+int(w*0.75), y-h, x+w, y], fill=tuple(max(0,c-20) for c in color))
    # Roof
    if roof_color:
        draw.polygon([(x-12, y-h), (x+w//2, y-h-45), (x+w+12, y-h)], fill=roof_color)
        draw.polygon([(x-6, y-h), (x+w//2, y-h-38), (x+w+6, y-h)],
                     fill=tuple(min(255,c+15) for c in roof_color))
    # Windows with glow
    ww, wh = 30, 38
    cols = max(1, (w - 40) // 55)
    rows = max(1, (h - 80) // 52)
    for r in range(rows):
        for c in range(cols):
            wx = x + 28 + c * 55
            wy = y - h + 30 + r * 52
            draw.rectangle([wx-2, wy-2, wx+ww+2, wy+wh+2], fill=(100,100,100))
            draw.rectangle([wx, wy, wx+ww, wy+wh], fill=WINDOW_BLUE)
            # Cross frame
            draw.line([wx+ww//2, wy, wx+ww//2, wy+wh], fill=WHITE, width=2)
            draw.line([wx, wy+wh//2, wx+ww, wy+wh//2], fill=WHITE, width=2)
    # Door
    dw_d, dh_d = 38, 60
    dx = x + w//2 - dw_d//2
    draw.rounded_rectangle([dx, y-dh_d, dx+dw_d, y], radius=int(dw_d//2), fill=DOOR_BROWN)
    draw.rectangle([dx, y-dh_d//2, dx+dw_d, y], fill=DOOR_BROWN)
    draw.ellipse([dx+dw_d-14, y-dh_d//2-4, dx+dw_d-6, y-dh_d//2+4], fill=SUN_YELLOW)
    if label:
        f_l = font(16, bold=True)
        tw = draw.textlength(label, font=f_l)
        draw.text((x+w//2-tw//2, y-h+8), label, font=f_l, fill=DARK)


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


def draw_ground_v2(draw, y):
    """Textured grass ground."""
    draw.rectangle([0, y, W, H], fill=GRASS)
    # Lighter strip near top
    draw.rectangle([0, y, W, y+8], fill=GRASS_LIGHT)
    # Subtle horizontal variation
    for i in range(0, W, 40):
        rng = random.Random(i)
        c = lerp_color(GRASS, GRASS_DARK, rng.random() * 0.3)
        draw.rectangle([i, y+10, i+40, H], fill=c)


def draw_road_h(draw, y, h=80):
    # Asphalt with slight texture
    draw.rectangle([0, y, W, y+h], fill=ROAD)
    draw.rectangle([0, y, W, y+3], fill=(100,100,100))  # Edge
    draw.rectangle([0, y+h-3, W, y+h], fill=(60,60,60))  # Edge
    # Center dashed line
    for i in range(0, W, 55):
        draw.rounded_rectangle([i, y+h//2-2, i+28, y+h//2+2], radius=2, fill=ROAD_LINE)


def draw_particles(draw, t, ground_y, count=15):
    """Floating leaves / sparkle particles."""
    for i in range(count):
        rng = random.Random(i * 137)
        px = (rng.randint(0, W) + int(t * rng.randint(20, 80))) % W
        py_base = rng.randint(100, ground_y - 50)
        py = py_base + int(math.sin(t * 2 + i * 0.7) * 20)
        size = rng.randint(3, 7)
        kind = i % 3
        if kind == 0:  # Leaf
            draw.ellipse([px-size, py-size//2, px+size, py+size//2], fill=(100, 180, 100))
        elif kind == 1:  # Sparkle
            draw.ellipse([px-2, py-2, px+2, py+2], fill=(255, 255, 220))
        else:
            draw.ellipse([px-size//2, py-size//2, px+size//2, py+size//2], fill=SOFT_GREEN)


# ════════════════════════════════════════════════════════════════
#  SCENES (same structure, improved graphics)
# ════════════════════════════════════════════════════════════════

def scene_intro(nf):
    frames = []
    for f in range(nf):
        t = f / nf
        img = Image.new("RGB", (W, H), DARK_GREEN)
        draw = ImageDraw.Draw(img)

        # Animated subtle pattern
        for i in range(30):
            ly = int(i * 40 + (t * 60) % 40) - 20
            draw.line([0, ly, W, ly], fill=(22, 80, 25), width=1)
        for i in range(15):
            lx = int(i * 140 + (t * 40) % 140) - 70
            draw.line([lx, 0, lx, H], fill=(22, 80, 25), width=1)

        cx = W // 2

        # Animated decorative line
        line_w = int(180 * min(1.0, t * 4))
        draw.rounded_rectangle([cx-line_w, 290, cx+line_w, 296], radius=3, fill=WHITE)

        if t > 0.12:
            alpha = min(1, (t-0.12)*5)
            draw.text((cx - 155, 320), "SIGAM", font=font(95, bold=True), fill=WHITE)

        if t > 0.28:
            sub = "Sistema Integral de Gestión"
            f_s = font(32)
            tw = draw.textlength(sub, font=f_s)
            draw.text((cx - tw//2, 440), sub, font=f_s, fill=SOFT_GREEN)
            sub2 = "Alimentaria Municipal"
            tw2 = draw.textlength(sub2, font=f_s)
            draw.text((cx - tw2//2, 480), sub2, font=f_s, fill=SOFT_GREEN)

        if t > 0.42:
            draw.rounded_rectangle([cx-line_w, 540, cx+line_w, 546], radius=3, fill=WHITE)

        if t > 0.5:
            org = "Municipalidad de La Plata  —  Secretaría de Desarrollo Social"
            f_o = font(20)
            tw3 = draw.textlength(org, font=f_o)
            draw.text((cx - tw3//2, 565), org, font=f_o, fill=MID_GREEN)

        # Floating icons
        if t > 0.4:
            it = (t - 0.4) / 0.6
            positions = [(280, 720), (450, 760), (680, 740), (1240, 720),
                         (1440, 750), (1620, 710), (960, 770)]
            for i, (ix, iy) in enumerate(positions):
                bob = math.sin(t * 3.5 + i * 1.2) * 18
                rise = it * 60
                sz = int(16 * min(1, it*2.5))
                if i % 3 == 0:
                    draw_heart(draw, ix, int(iy + bob - rise), sz)
                elif i % 3 == 1:
                    draw_star(draw, ix, int(iy + bob - rise), sz)
                else:
                    draw_heart(draw, ix, int(iy + bob - rise), sz, MID_GREEN)

        if t > 0.65:
            btxt = "Acción Social  ·  Asistencia Alimentaria  ·  Gestión Municipal"
            f_b = font(19, light=True)
            tw4 = draw.textlength(btxt, font=f_b)
            draw.text((cx - tw4//2, H - 90), btxt, font=f_b, fill=MID_GREEN)

        frames.append(np.array(img))
    return frames


def scene_deposito(nf):
    frames = []
    ground_y = 740
    for f in range(nf):
        t = f / nf
        img = Image.new("RGB", (W, H), WHITE)
        draw = ImageDraw.Draw(img)
        sky_day(draw, ground_y)
        draw_sun(draw, 1700, 110, 50, t)
        draw_cloud(draw, 250 + t*90, 95, 1.3)
        draw_cloud(draw, 850 + t*65, 140, 0.9)
        draw_cloud(draw, 1350 + t*45, 75, 1.0)
        draw_ground_v2(draw, ground_y)
        draw_road_h(draw, ground_y - 12, 70)
        draw_tree(draw, 80, ground_y - 12, 1.3, 0)
        draw_tree(draw, 1780, ground_y - 12, 1.1, 1)
        draw_tree(draw, 1620, ground_y - 12, 0.85, 2)

        draw_warehouse_v2(draw, 200, ground_y - 12, 480, 270, "DEPÓSITO MUNICIPAL")

        # Boxes sliding in
        n_boxes = min(10, int(t * 14))
        positions = [
            (300, ground_y-50), (355, ground_y-50), (410, ground_y-50),
            (465, ground_y-50), (520, ground_y-50),
            (320, ground_y-88), (375, ground_y-88), (430, ground_y-88), (485, ground_y-88),
            (355, ground_y-126),
        ]
        for i in range(n_boxes):
            bx, by = positions[i]
            offset = max(0, (1 - min(1, (t*14 - i)*2.5))) * 180
            draw_box_v2(draw, int(bx + offset), by, 45, 34,
                        [BOX_BROWN, BOX_LIGHT, BOX_GREEN][i % 3])

        # Workers
        draw_person_v2(draw, 580, ground_y-12, SKIN_2, SHIRT_ORANGE, PANTS_DARK, 1.15,
                       t=t, hair_color=HAIR_BROWN, hair_style=0, has_hat=True)
        draw_person_v2(draw, 190, ground_y-12, SKIN_1, SHIRT_GREEN, PANTS_BLUE, 1.05,
                       t=t, hair_color=HAIR_BLACK, hair_style=0, has_hat=True)

        # Stock panel
        if t > 0.4:
            lx, ly = 830, 170
            # Shadow
            draw.rounded_rectangle([lx+5, ly+5, lx+435, ly+395], radius=14, fill=(180,180,180))
            draw.rounded_rectangle([lx, ly, lx+430, ly+390], radius=14, fill=WHITE)
            draw.rounded_rectangle([lx, ly, lx+430, ly+50], radius=14, fill=PRIMARY)
            draw.rectangle([lx, ly+36, lx+430, ly+50], fill=PRIMARY)
            draw.text((lx+20, ly+12), "📦  Control de Stock — SIGAM", font=font(20, bold=True), fill=WHITE)

            items = [
                ("Arroz x 1kg", "850 u", 0.85, ACCENT),
                ("Fideos x 500g", "1,200 u", 1.0, ACCENT),
                ("Aceite x 900ml", "420 u", 0.42, ORANGE),
                ("Harina x 1kg", "680 u", 0.68, ACCENT),
                ("Leche en polvo", "350 u", 0.35, ORANGE),
                ("Azúcar x 1kg", "920 u", 0.92, ACCENT),
                ("Conservas", "560 u", 0.56, BLUE),
            ]
            n_vis = min(len(items), int((t-0.4)*18))
            for i in range(n_vis):
                name, qty, pct, color = items[i]
                iy = ly + 62 + i * 46
                draw.text((lx+22, iy), name, font=font(16), fill=DARK)
                draw.text((lx+320, iy), qty, font=font(16, bold=True), fill=color)
                # Bar bg
                draw.rounded_rectangle([lx+22, iy+24, lx+408, iy+33], radius=4, fill=LIGHT_GRAY)
                bw = int(386 * pct)
                draw.rounded_rectangle([lx+22, iy+24, lx+22+bw, iy+33], radius=4, fill=color)

        draw_particles(draw, t, ground_y, 10)

        # Title
        txt = "Recepción y organización de mercadería"
        f_t = font(28, bold=True)
        tw = draw.textlength(txt, font=f_t)
        draw.rounded_rectangle([W//2-tw//2-22, 35, W//2+tw//2+22, 88], radius=12, fill=PRIMARY)
        draw.text((W//2-tw//2, 44), txt, font=f_t, fill=WHITE)

        frames.append(np.array(img))
    return frames


def scene_social_worker(nf):
    frames = []
    ground_y = 770
    for f in range(nf):
        t = f / nf
        img = Image.new("RGB", (W, H), WHITE)
        draw = ImageDraw.Draw(img)
        sky_day(draw, ground_y)
        draw_cloud(draw, 180+t*55, 85, 1.0)
        draw_cloud(draw, 750+t*35, 125, 0.75)
        draw_sun(draw, 1750, 95, 42, t)
        draw_ground_v2(draw, ground_y)
        draw.rectangle([0, ground_y-6, W, ground_y+6], fill=SIDEWALK)

        # House
        draw_building_v2(draw, 1050, ground_y-6, 300, 210, MUNICIPIO_WALL, ROOF_BROWN)
        draw_tree(draw, 1000, ground_y-6, 0.95)
        draw_tree(draw, 1410, ground_y-6, 0.75)

        # Family
        draw_person_v2(draw, 1180, ground_y-6, SKIN_2, SHIRT_RED, PANTS_DARK, 1.0,
                       t=t, hair_color=HAIR_BROWN, hair_style=1)
        draw_person_v2(draw, 1250, ground_y-6, SKIN_2, SHIRT_PURPLE, PANTS_BLUE, 0.6,
                       t=t, hair_color=HAIR_BLACK, hair_style=0)
        draw_person_v2(draw, 1290, ground_y-6, SKIN_2, SHIRT_ORANGE, PANTS_DARK, 0.5,
                       t=t, hair_color=HAIR_BROWN, hair_style=2)

        # Social worker walking in
        sw_x = int(lerp(150, 1050, ease_in_out(min(1, t*1.5))))
        draw_person_v2(draw, sw_x, ground_y-6, SKIN_1, SHIRT_GREEN, PANTS_BLUE, 1.15,
                       wave=(t > 0.5), t=t, hair_color=HAIR_DARK, hair_style=1, has_hat=False)

        # Clipboard
        if t > 0.45:
            draw.rounded_rectangle([sw_x-38, ground_y-125, sw_x-10, ground_y-78],
                                   radius=4, fill=WHITE, outline=GRAY, width=2)
            for j in range(4):
                draw.line([sw_x-34, ground_y-118+j*10, sw_x-16, ground_y-118+j*10],
                          fill=ACCENT, width=2)

        # Speech bubble
        if t > 0.55:
            bx, by = sw_x + 35, ground_y - 250
            draw.rounded_rectangle([bx, by, bx+340, by+75], radius=18, fill=WHITE, outline=ACCENT, width=2)
            draw.polygon([(bx+25, by+75), (bx+12, by+98), (bx+55, by+75)], fill=WHITE)
            draw.line([(bx+25, by+75), (bx+12, by+98)], fill=ACCENT, width=2)
            draw.text((bx+18, by+12), "¿Necesitan asistencia", font=font(18), fill=DARK)
            draw.text((bx+18, by+38), "alimentaria?", font=font(18), fill=DARK)

        # SIGAM form panel
        if t > 0.35:
            fx, fy = 80, 160
            draw.rounded_rectangle([fx+5, fy+5, fx+445, fy+430], radius=14, fill=(180,180,180))
            draw.rounded_rectangle([fx, fy, fx+440, fy+425], radius=14, fill=WHITE)
            draw.rounded_rectangle([fx, fy, fx+440, fy+52], radius=14, fill=PRIMARY)
            draw.rectangle([fx, fy+38, fx+440, fy+52], fill=PRIMARY)
            draw.text((fx+15, fy+12), "SIGAM — Nuevo Caso Particular", font=font(20, bold=True), fill=WHITE)

            fields = ["DNI:", "Nombre:", "Domicilio:", "Localidad:", "Grupo familiar:", "Prioridad:"]
            data = ["32.456.789", "María González", "Calle 45 N° 320", "La Plata", "4 personas", "URGENTE"]
            n_f = min(len(fields), int((t-0.35)*14))
            for i in range(n_f):
                iy = fy + 68 + i * 55
                draw.text((fx+18, iy), fields[i], font=font(16, bold=True), fill=GRAY)
                draw.rounded_rectangle([fx+155, iy-3, fx+420, iy+30], radius=6, fill=LIGHT_BG, outline=LIGHT_GRAY)
                c = ORANGE if i == 5 else DARK
                draw.text((fx+163, iy+2), data[i], font=font(15), fill=c)

        # Hearts
        if t > 0.7:
            ht = (t-0.7)/0.3
            for i, (hx, hy) in enumerate([(1200, 340), (1260, 370), (1150, 390)]):
                bob = math.sin(t*5+i)*12
                draw_heart(draw, hx, int(hy - ht*55 + bob), int(14*min(1,ht*3)))

        draw_particles(draw, t, ground_y, 8)

        txt = "Trabajadoras sociales relevan necesidades en el campo"
        f_t = font(26, bold=True)
        tw = draw.textlength(txt, font=f_t)
        draw.rounded_rectangle([W//2-tw//2-22, 28, W//2+tw//2+22, 78], radius=12, fill=PRIMARY)
        draw.text((W//2-tw//2, 36), txt, font=f_t, fill=WHITE)

        frames.append(np.array(img))
    return frames


def scene_remitos(nf):
    frames = []
    for f in range(nf):
        t = f / nf
        img = Image.new("RGB", (W, H), WHITE)
        draw = ImageDraw.Draw(img)
        sky_office(draw)

        # Desk
        draw.rectangle([0, 610, W, H], fill=(141, 110, 99))
        draw.rectangle([0, 610, W, 625], fill=(121, 85, 72))
        # Desk edge highlight
        draw.rectangle([0, 610, W, 613], fill=(161, 130, 109))

        # Monitor
        mx, my = 380, 230
        mw, mh = 530, 360
        # Shadow
        draw.rounded_rectangle([mx+6, my+6, mx+mw+6, my+mh+6], radius=12, fill=(120,120,120))
        draw.rounded_rectangle([mx, my, mx+mw, my+mh], radius=12, fill=(40,40,40))
        # Screen
        draw.rectangle([mx+18, my+18, mx+mw-18, my+mh-30], fill=WHITE)
        # Stand
        draw.rectangle([mx+mw//2-35, my+mh, mx+mw//2+35, my+mh+35], fill=GRAY)
        draw.rounded_rectangle([mx+mw//2-60, my+mh+35, mx+mw//2+60, my+mh+48], radius=5, fill=GRAY)

        # SIGAM on screen
        sx, sy = mx+18, my+18
        sw = mw - 36
        draw.rectangle([sx, sy, sx+sw, sy+42], fill=PRIMARY)
        draw.text((sx+12, sy+8), "SIGAM", font=font(20, bold=True), fill=WHITE)
        draw.text((sx+100, sy+12), "Remitos    Cronograma    Beneficiarios    Stock", font=font(13), fill=SOFT_GREEN)

        # Remito form on screen
        if t > 0.08:
            ry = sy + 52
            draw.text((sx+18, ry), "Nuevo Remito #2024-0847", font=font(17, bold=True), fill=PRIMARY)
            draw.line([sx+18, ry+28, sx+sw-18, ry+28], fill=LIGHT_GRAY)
            draw.text((sx+18, ry+32), "Beneficiario: Comedor Los Pibes", font=font(13), fill=GRAY)
            draw.text((sx+18, ry+52), "Programa: Política Alimentaria", font=font(13), fill=GRAY)

            tbl_y = ry + 78
            draw.rectangle([sx+18, tbl_y, sx+sw-18, tbl_y+1], fill=LIGHT_GRAY)
            items_d = [("Arroz x 1kg","x50"), ("Fideos x 500g","x80"),
                       ("Aceite x 900ml","x30"), ("Harina x 1kg","x40"), ("Leche en polvo","x25")]
            n_it = min(len(items_d), int((t-0.08)*10))
            for i in range(n_it):
                iy = tbl_y + 8 + i * 24
                draw.text((sx+28, iy), items_d[i][0], font=font(13), fill=DARK)
                draw.text((sx+sw-80, iy), items_d[i][1], font=font(13, bold=True), fill=ACCENT)

            if t > 0.55:
                pulse = 1 + math.sin(t*8)*0.02
                bw_b, bh_b = int(130*pulse), int(34*pulse)
                bx_b = sx + sw - bw_b - 25
                by_b = tbl_y + 140
                draw.rounded_rectangle([bx_b, by_b, bx_b+bw_b, by_b+bh_b], radius=8, fill=ACCENT)
                draw.text((bx_b+12, by_b+6), "Confirmar ✓", font=font(15, bold=True), fill=WHITE)

        # Keyboard
        draw.rounded_rectangle([460, 630, 700, 670], radius=6, fill=(50,50,50))
        # Keys
        for kr in range(3):
            for kc in range(12):
                kx = 468 + kc * 19
                ky = 636 + kr * 11
                draw.rounded_rectangle([kx, ky, kx+15, ky+8], radius=2, fill=(70,70,70))
        # Mouse
        draw.rounded_rectangle([730, 640, 770, 670], radius=8, fill=(50,50,50))

        # Person at desk
        draw_person_v2(draw, 280, 610, SKIN_1, SHIRT_BLUE, PANTS_DARK, 1.25,
                       t=t, hair_color=HAIR_BLACK, hair_style=0)

        # Coffee cup
        draw.rounded_rectangle([770, 590, 800, 615], radius=4, fill=WHITE, outline=GRAY, width=2)
        draw.arc([800, 595, 815, 610], -90, 90, fill=GRAY, width=2)

        # PDF preview (right side)
        if t > 0.35:
            px, py = 1050, 130
            # Shadow
            draw.rectangle([px+6, py+6, px+400, py+545], fill=(180,180,180))
            draw.rectangle([px, py, px+394, py+538], fill=WHITE, outline=GRAY, width=2)
            # Red fold corner
            draw.polygon([(px+350, py), (px+394, py), (px+394, py+44)], fill=(240,240,240))
            draw.polygon([(px+350, py), (px+394, py+44), (px+350, py+44)], fill=LIGHT_GRAY)

            draw.rectangle([px+22, py+22, px+372, py+68], fill=PRIMARY)
            draw.text((px+32, py+30), "REMITO DE ENTREGA", font=font(20, bold=True), fill=WHITE)
            draw.text((px+260, py+32), "#2024-0847", font=font(15), fill=SOFT_GREEN)

            details = [
                "Programa: Política Alimentaria",
                "Beneficiario: Comedor Los Pibes",
                "Dirección: Calle 72 N° 1450, La Plata",
                "Fecha de emisión: 15/03/2026",
            ]
            for i, d in enumerate(details):
                draw.text((px+32, py+82+i*26), d, font=font(14), fill=GRAY)

            draw.rectangle([px+22, py+200, px+372, py+202], fill=GRAY)
            draw.text((px+32, py+182), "Artículo", font=font(13, bold=True), fill=DARK)
            draw.text((px+280, py+182), "Cantidad", font=font(13, bold=True), fill=DARK)

            pdf_items = [("Arroz x 1kg","50"), ("Fideos x 500g","80"),
                         ("Aceite x 900ml","30"), ("Harina x 1kg","40"), ("Leche en polvo","25")]
            n_p = min(len(pdf_items), int((t-0.35)*12))
            for i in range(n_p):
                iy = py + 212 + i * 25
                draw.text((px+32, iy), pdf_items[i][0], font=font(13), fill=DARK)
                draw.text((px+310, iy), pdf_items[i][1], font=font(13, bold=True), fill=ACCENT)

            # Total
            if n_p == len(pdf_items):
                draw.rectangle([px+22, py+340, px+372, py+342], fill=GRAY)
                draw.text((px+220, py+348), "Total: 225 u.", font=font(14, bold=True), fill=PRIMARY)

            # Signature area
            draw.line([px+32, py+450, px+180, py+450], fill=GRAY)
            draw.text((px+70, py+455), "Firma", font=font(12), fill=LIGHT_GRAY)
            draw.line([px+210, py+450, px+358, py+450], fill=GRAY)
            draw.text((px+245, py+455), "Aclaración", font=font(12), fill=LIGHT_GRAY)

            # PDF badge
            draw.rounded_rectangle([px+310, py+495, px+375, py+522], radius=6, fill=(229,57,53))
            draw.text((px+323, py+498), "PDF", font=font(15, bold=True), fill=WHITE)

        txt = "Operadores generan remitos desde el sistema"
        f_t = font(26, bold=True)
        tw = draw.textlength(txt, font=f_t)
        draw.rounded_rectangle([W//2-tw//2-22, 18, W//2+tw//2+22, 68], radius=12, fill=PRIMARY)
        draw.text((W//2-tw//2, 26), txt, font=f_t, fill=WHITE)

        frames.append(np.array(img))
    return frames


def scene_loading(nf):
    frames = []
    ground_y = 770
    for f in range(nf):
        t = f / nf
        img = Image.new("RGB", (W, H), WHITE)
        draw = ImageDraw.Draw(img)
        sky_day(draw, ground_y)
        draw_sun(draw, 220, 100, 48, t)
        draw_cloud(draw, 550+t*65, 85, 1.15)
        draw_cloud(draw, 1150+t*42, 130, 0.85)
        draw_ground_v2(draw, ground_y)
        draw_road_h(draw, ground_y-12, 70)

        draw_warehouse_v2(draw, 80, ground_y-12, 520, 280, "DEPÓSITO LOGÍSTICA")
        draw_truck_v2(draw, 680, ground_y-18, 1.15, loaded=(t > 0.45))

        # Workers
        for w in range(2):
            phase = (t * 2.5 + w * 0.5) % 1.0
            wx = int(lerp(530, 730, ease_in_out(phase)))
            skins = [SKIN_1, SKIN_3]
            shirts = [SHIRT_ORANGE, SHIRT_BLUE]
            hairs = [HAIR_BLACK, HAIR_BROWN]
            draw_person_v2(draw, wx, ground_y-12, skins[w], shirts[w], PANTS_DARK, 1.05,
                           t=t, hair_color=hairs[w], hair_style=0, has_hat=True)
            if phase < 0.75:
                draw_box_v2(draw, wx-18, ground_y-145, 32, 26,
                            BOX_BROWN if w == 0 else BOX_LIGHT)

        # Supervisor
        draw_person_v2(draw, 960, ground_y-12, SKIN_1, SHIRT_GREEN, PANTS_BLUE, 1.12,
                       t=t, hair_color=HAIR_DARK, hair_style=0)
        draw.rounded_rectangle([928, ground_y-155, 958, ground_y-110], radius=4,
                               fill=WHITE, outline=GRAY, width=2)

        # Checklist
        if t > 0.25:
            cx_l, cy_l = 1200, 170
            draw.rounded_rectangle([cx_l+5, cy_l+5, cx_l+415, cy_l+415], radius=14, fill=(180,180,180))
            draw.rounded_rectangle([cx_l, cy_l, cx_l+410, cy_l+410], radius=14, fill=WHITE)
            draw.rounded_rectangle([cx_l, cy_l, cx_l+410, cy_l+48], radius=14, fill=PRIMARY)
            draw.rectangle([cx_l, cy_l+34, cx_l+410, cy_l+48], fill=PRIMARY)
            draw.text((cx_l+18, cy_l+10), "📋  Lista de Carga", font=font(20, bold=True), fill=WHITE)

            cargo = [
                ("Arroz x 1kg", "50 u"), ("Fideos x 500g", "80 u"),
                ("Aceite x 900ml", "30 u"), ("Harina x 1kg", "40 u"),
                ("Leche en polvo", "25 u"), ("Azúcar x 1kg", "60 u"),
                ("Conservas", "45 u"), ("Yerba x 500g", "35 u"),
            ]
            for i, (name, qty) in enumerate(cargo):
                checked = t > 0.25 + i * 0.08
                iy = cy_l + 60 + i * 42
                draw.rounded_rectangle([cx_l+22, iy, cx_l+44, iy+22], radius=4,
                                       fill=ACCENT if checked else WHITE, outline=ACCENT, width=2)
                if checked:
                    draw.text((cx_l+25, iy-2), "✓", font=font(16, bold=True), fill=WHITE)
                draw.text((cx_l+55, iy), name, font=font(16), fill=DARK)
                draw.text((cx_l+320, iy), qty, font=font(16, bold=True), fill=GRAY)

        draw_particles(draw, t, ground_y, 8)

        txt = "Carga de mercadería verificada en el camión"
        f_t = font(28, bold=True)
        tw = draw.textlength(txt, font=f_t)
        draw.rounded_rectangle([W//2-tw//2-22, 28, W//2+tw//2+22, 80], radius=12, fill=PRIMARY)
        draw.text((W//2-tw//2, 36), txt, font=f_t, fill=WHITE)

        frames.append(np.array(img))
    return frames


def scene_driving(nf):
    frames = []
    ground_y = 740
    for f in range(nf):
        t = f / nf
        img = Image.new("RGB", (W, H), WHITE)
        draw = ImageDraw.Draw(img)
        sky_day(draw, ground_y)
        draw_sun(draw, 1600, 95, 48, t)

        # Moving clouds
        for ci, (bx, by, cs) in enumerate([(500,75,1.0),(900,120,0.7),(1400,65,0.9)]):
            draw_cloud(draw, (bx - int(t*300))%(W+300)-150, by, cs)

        draw_ground_v2(draw, ground_y)
        # Scrolling road
        draw.rectangle([0, ground_y-15, W, ground_y+68], fill=ROAD)
        draw.rectangle([0, ground_y-15, W, ground_y-12], fill=(100,100,100))
        draw.rectangle([0, ground_y+65, W, ground_y+68], fill=(60,60,60))
        offset = int(t * 2200) % 55
        for i in range(-1, W//55+2):
            rx = i*55 - offset
            draw.rounded_rectangle([rx, ground_y+22, rx+28, ground_y+28], radius=2, fill=ROAD_LINE)

        # Scrolling buildings
        bg_off = int(t * 450)
        bldgs = [
            (0,200,160,BUILDING_1,ROOF_RED),(280,180,140,BUILDING_2,None),
            (500,225,185,BUILDING_3,ROOF_BROWN),(750,165,130,BUILDING_1,None),
            (950,205,170,BUILDING_2,ROOF_RED),(1200,245,195,BUILDING_1,None),
            (1450,175,145,BUILDING_3,ROOF_BROWN),(1700,215,165,BUILDING_2,None),
            (1950,195,155,BUILDING_1,ROOF_RED),
        ]
        for bx,bw,bh,bc,rc in bldgs:
            rx = (bx - bg_off)%(W+400)-200
            draw_building_v2(draw, rx, ground_y-15, bw, bh, bc, rc)

        # Trees scrolling faster
        tree_off = int(t * 650)
        for i in range(10):
            tx = (i*240 - tree_off)%(W+240)-120
            draw_tree(draw, tx, ground_y-15, 0.65 + (i%3)*0.2, i%3)

        # Truck centered
        truck_x = 680
        bounce = math.sin(t*22)*3
        draw_truck_v2(draw, truck_x, ground_y-18+int(bounce), 1.25, loaded=True)

        # Dust particles
        rng = random.Random(42)
        for i in range(8):
            dx = truck_x - 15 - i*28 - rng.randint(0,25)
            dy = ground_y - 2 + rng.randint(-12,12)
            r = rng.randint(4,10)
            draw.ellipse([dx-r, dy-r, dx+r, dy+r], fill=(190,200,190))

        # Map indicator
        mapx, mapy = 1430, 65
        draw.rounded_rectangle([mapx+4, mapy+4, mapx+425, mapy+218], radius=16, fill=(150,150,150))
        draw.rounded_rectangle([mapx, mapy, mapx+420, mapy+215], radius=16, fill=WHITE, outline=ACCENT, width=3)
        draw.text((mapx+15, mapy+10), "🗺  Ruta de entrega", font=font(18, bold=True), fill=PRIMARY)
        draw.rounded_rectangle([mapx+15, mapy+42, mapx+405, mapy+200], radius=10, fill=LIGHT_BG)

        route = [(mapx+30,mapy+180),(mapx+100,mapy+110),(mapx+180,mapy+140),
                 (mapx+250,mapy+85),(mapx+330,mapy+120),(mapx+385,mapy+70)]
        for i in range(len(route)-1):
            draw.line([route[i], route[i+1]], fill=(180,210,180), width=4)
        seg = min(len(route)-2, int(t*(len(route)-1)))
        # Draw completed route in green
        for i in range(seg):
            draw.line([route[i], route[i+1]], fill=ACCENT, width=4)
        seg_t = (t*(len(route)-1))%1.0
        if seg < len(route)-1:
            px_m = int(lerp(route[seg][0], route[min(seg+1,len(route)-1)][0], seg_t))
            py_m = int(lerp(route[seg][1], route[min(seg+1,len(route)-1)][1], seg_t))
            draw.ellipse([px_m-10, py_m-10, px_m+10, py_m+10], fill=ORANGE)
            draw.ellipse([px_m-5, py_m-5, px_m+5, py_m+5], fill=WHITE)
        for rx, ry in route:
            draw.ellipse([rx-6, ry-6, rx+6, ry+6], fill=ACCENT, outline=PRIMARY, width=2)

        txt = "Distribución a puntos de entrega en toda la ciudad"
        f_t = font(26, bold=True)
        tw = draw.textlength(txt, font=f_t)
        draw.rounded_rectangle([W//2-tw//2-22, 18, W//2+tw//2+22, 64], radius=12, fill=PRIMARY)
        draw.text((W//2-tw//2, 26), txt, font=f_t, fill=WHITE)

        frames.append(np.array(img))
    return frames


def scene_delivery(nf):
    frames = []
    ground_y = 770
    for f in range(nf):
        t = f / nf
        img = Image.new("RGB", (W, H), WHITE)
        draw = ImageDraw.Draw(img)
        sky_day(draw, ground_y)
        draw_sun(draw, 180, 105, 42, t)
        draw_cloud(draw, 550+t*42, 75, 0.95)
        draw_cloud(draw, 1050+t*32, 115, 1.15)
        draw_ground_v2(draw, ground_y)
        draw.rectangle([0, ground_y-6, W, ground_y+6], fill=SIDEWALK)

        # Comedor building
        draw_building_v2(draw, 880, ground_y-6, 380, 235, MUNICIPIO_WALL, ROOF_RED)
        # Sign
        draw.rounded_rectangle([920, ground_y-220, 1210, ground_y-180], radius=10, fill=ACCENT)
        draw.text((940, ground_y-215), "Comedor Los Pibes", font=font(20, bold=True), fill=WHITE)

        # Truck
        draw_truck_v2(draw, 360, ground_y-18, 0.95, loaded=(t < 0.4))

        # Delivery worker
        wk_x = int(lerp(620, 830, ease_in_out(min(1, t*1.8))))
        draw_person_v2(draw, wk_x, ground_y-6, SKIN_1, SHIRT_GREEN, PANTS_DARK, 1.15,
                       t=t, hair_color=HAIR_BLACK, has_hat=True)
        if t < 0.65:
            draw_box_v2(draw, wk_x-18, ground_y-155, 38, 30)

        # People receiving
        people = [
            (910, SKIN_2, SHIRT_RED, 1.0, True, HAIR_BROWN, 1),
            (975, SKIN_3, SHIRT_BLUE, 0.95, False, HAIR_BLACK, 0),
            (1040, SKIN_1, SHIRT_PURPLE, 0.65, False, HAIR_DARK, 2),
            (1085, SKIN_2, SHIRT_ORANGE, 0.55, False, HAIR_BROWN, 0),
        ]
        for px, sk, sh, sc, wave, hc, hs in people:
            draw_person_v2(draw, px, ground_y-6, sk, sh, PANTS_DARK, sc,
                           wave=wave, t=t, hair_color=hc, hair_style=hs)

        # Boxes unloaded
        n_b = min(7, int(t * 11))
        for i in range(n_b):
            bx = 840 + (i%4)*48
            by = ground_y - 48 - (i//4)*36
            draw_box_v2(draw, bx, by, 40, 30, [BOX_BROWN, BOX_LIGHT, BOX_GREEN][i%3])

        # Confirm delivery panel
        if t > 0.45:
            sx, sy = 1340, 350
            draw.rounded_rectangle([sx+5, sy+5, sx+450, sy+335], radius=14, fill=(180,180,180))
            draw.rounded_rectangle([sx, sy, sx+445, sy+330], radius=14, fill=WHITE)
            draw.rounded_rectangle([sx, sy, sx+445, sy+50], radius=14, fill=PRIMARY)
            draw.rectangle([sx, sy+36, sx+445, sy+50], fill=PRIMARY)
            draw.text((sx+15, sy+12), "✅  Confirmar Entrega", font=font(20, bold=True), fill=WHITE)

            draw.text((sx+20, sy+62), "Beneficiario: Comedor Los Pibes", font=font(15), fill=DARK)
            draw.text((sx+20, sy+88), "Remito: #2024-0847", font=font(15), fill=DARK)
            draw.text((sx+20, sy+114), "Artículos: 5 tipos  ·  Total: 225 unidades", font=font(15), fill=DARK)

            # Photo area
            draw.rounded_rectangle([sx+20, sy+150, sx+170, sy+245], radius=8,
                                   fill=LIGHT_BG, outline=LIGHT_GRAY, width=2)
            draw.text((sx+45, sy+185), "📷 Foto", font=font(20), fill=GRAY)
            if t > 0.6:
                draw.text((sx+20, sy+252), "✓ Foto de firma capturada", font=font(14), fill=ACCENT)

            if t > 0.7:
                draw.rounded_rectangle([sx+250, sy+270, sx+425, sy+312], radius=10, fill=ACCENT)
                draw.text((sx+270, sy+278), "Entregado ✓", font=font(19, bold=True), fill=WHITE)

        # Hearts & stars
        if t > 0.6:
            ht = (t-0.6)/0.4
            for i, (hx, hy) in enumerate([(920,340),(990,310),(1050,350),(960,280)]):
                bob = math.sin(t*5+i*1.2)*14
                if i%2==0:
                    draw_heart(draw, hx, int(hy-ht*45+bob), int(15*min(1,ht*3)))
                else:
                    draw_star(draw, hx, int(hy-ht*45+bob), int(12*min(1,ht*3)))

        draw_particles(draw, t, ground_y, 10)

        txt = "Entrega de alimentos a comedores y familias"
        f_t = font(26, bold=True)
        tw = draw.textlength(txt, font=f_t)
        draw.rounded_rectangle([W//2-tw//2-22, 22, W//2+tw//2+22, 72], radius=12, fill=PRIMARY)
        draw.text((W//2-tw//2, 30), txt, font=f_t, fill=WHITE)

        frames.append(np.array(img))
    return frames


def scene_dashboard(nf):
    frames = []
    for f in range(nf):
        t = f / nf
        img = Image.new("RGB", (W, H), (245, 248, 252))
        draw = ImageDraw.Draw(img)

        # Header
        draw.rectangle([0, 0, W, 72], fill=PRIMARY)
        draw.text((28, 18), "SIGAM", font=font(30, bold=True), fill=WHITE)
        draw.text((150, 24), "Dashboard  ·  Reportes  ·  Mapa  ·  Auditoría", font=font(16), fill=SOFT_GREEN)
        # User avatar
        draw.ellipse([W-60, 15, W-18, 57], fill=ACCENT)
        draw.text((W-48, 24), "A", font=font(20, bold=True), fill=WHITE)

        # KPI cards
        kpis = [
            ("1,247", "Familias asistidas", "👨‍👩‍👧‍👦", ACCENT),
            ("3,450", "Entregas realizadas", "📦", BLUE),
            ("18,500 kg", "Mercadería distribuida", "🏗", ORANGE),
            ("98.5%", "Tasa de entrega", "✅", ACCENT),
        ]
        for i, (val, label, icon, color) in enumerate(kpis):
            kx = 30 + i * 472
            ky = 92
            draw.rounded_rectangle([kx+4, ky+4, kx+450, ky+128], radius=14, fill=(210,210,210))
            draw.rounded_rectangle([kx, ky, kx+446, ky+124], radius=14, fill=WHITE)
            # Left color accent bar
            draw.rounded_rectangle([kx, ky, kx+6, ky+124], radius=3, fill=color)
            if t > 0.08:
                # Animated counter
                anim_val = val  # could animate but keep simple
                draw.text((kx+22, ky+12), anim_val, font=font(36, bold=True), fill=color)
                draw.text((kx+22, ky+68), label, font=font(17), fill=GRAY)
                draw.text((kx+380, ky+20), icon, font=font(30), fill=DARK)

        # Bar chart
        if t > 0.15:
            cx_c, cy_c = 30, 240
            cw_c, ch_c = 920, 380
            draw.rounded_rectangle([cx_c+4, cy_c+4, cx_c+cw_c+4, cy_c+ch_c+4], radius=14, fill=(210,210,210))
            draw.rounded_rectangle([cx_c, cy_c, cx_c+cw_c, cy_c+ch_c], radius=14, fill=WHITE)
            draw.text((cx_c+25, cy_c+15), "📊  Entregas mensuales 2026", font=font(20, bold=True), fill=DARK)

            months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
            values = [280,320,350,310,390,420,380,410,450,430,460,0]
            max_v = 500
            bar_w = 50
            bar_gap = 70
            chart_h = 260
            chart_y = cy_c + 85

            # Grid lines
            for gl in range(5):
                gy_l = chart_y + int(chart_h * gl / 4)
                draw.line([cx_c+50, gy_l, cx_c+cw_c-20, gy_l], fill=(240,240,240), width=1)
                draw.text((cx_c+20, gy_l-8), str(max_v - gl*max_v//4), font=font(10), fill=LIGHT_GRAY)

            for i, (m, v) in enumerate(zip(months, values)):
                bx = cx_c + 58 + i * bar_gap
                anim_h = int((v/max_v)*chart_h * min(1, (t-0.15)*2.5))
                c = ACCENT if v <= 400 else BLUE
                if v == 0: c = LIGHT_GRAY
                # Bar shadow
                draw.rounded_rectangle([bx+2, chart_y+chart_h-anim_h+2, bx+bar_w+2, chart_y+chart_h+2],
                                       radius=5, fill=(200,200,200))
                draw.rounded_rectangle([bx, chart_y+chart_h-anim_h, bx+bar_w, chart_y+chart_h],
                                       radius=5, fill=c)
                # Highlight on bar
                if anim_h > 10:
                    draw.rounded_rectangle([bx, chart_y+chart_h-anim_h, bx+int(bar_w*0.3), chart_y+chart_h],
                                           radius=5, fill=tuple(min(255,cc+20) for cc in c))
                tw_m = draw.textlength(m, font=font(12))
                draw.text((bx+bar_w//2-tw_m//2, chart_y+chart_h+10), m, font=font(12), fill=GRAY)
                if anim_h > 22:
                    draw.text((bx+6, chart_y+chart_h-anim_h+6), str(v), font=font(11, bold=True), fill=WHITE)

        # Pie chart
        if t > 0.25:
            px_p, py_p = 980, 240
            pw_p, ph_p = 920, 380
            draw.rounded_rectangle([px_p+4, py_p+4, px_p+pw_p+4, py_p+ph_p+4], radius=14, fill=(210,210,210))
            draw.rounded_rectangle([px_p, py_p, px_p+pw_p, py_p+ph_p], radius=14, fill=WHITE)
            draw.text((px_p+25, py_p+15), "📈  Distribución por programa", font=font(20, bold=True), fill=DARK)

            pie_cx, pie_cy = px_p + 250, py_p + 220
            pie_r = 125
            segments = [
                (0.45, ACCENT, "Política Alimentaria"),
                (0.25, BLUE, "Asistencia Crítica"),
                (0.15, ORANGE, "Casos Particulares"),
                (0.10, PURPLE, "Diario"),
                (0.05, MID_GREEN, "Otros"),
            ]
            # Shadow
            draw.ellipse([pie_cx-pie_r+4, pie_cy-pie_r+4, pie_cx+pie_r+4, pie_cy+pie_r+4],
                         fill=(210,210,210))
            start_a = -90
            anim_p = min(1, (t-0.25)*2.5)
            for pct, color, lbl in segments:
                sweep = pct * 360 * anim_p
                draw.pieslice([pie_cx-pie_r, pie_cy-pie_r, pie_cx+pie_r, pie_cy+pie_r],
                              start_a, start_a+sweep, fill=color)
                start_a += sweep
            # Center hole (donut)
            draw.ellipse([pie_cx-50, pie_cy-50, pie_cx+50, pie_cy+50], fill=WHITE)

            for i, (pct, color, lbl) in enumerate(segments):
                lx_l = px_p + 430
                ly_l = py_p + 80 + i * 40
                draw.rounded_rectangle([lx_l, ly_l, lx_l+22, ly_l+22], radius=4, fill=color)
                draw.text((lx_l+30, ly_l), f"{lbl} ({int(pct*100)}%)", font=font(15), fill=DARK)

        # Map preview
        if t > 0.4:
            mpx, mpy = 30, 645
            mpw, mph = 820, 360
            draw.rounded_rectangle([mpx+4, mpy+4, mpx+mpw+4, mpy+mph+4], radius=14, fill=(210,210,210))
            draw.rounded_rectangle([mpx, mpy, mpx+mpw, mpy+mph], radius=14, fill=WHITE)
            draw.text((mpx+25, mpy+15), "🗺  Mapa de cobertura — La Plata", font=font(20, bold=True), fill=DARK)
            draw.rounded_rectangle([mpx+20, mpy+50, mpx+mpw-20, mpy+mph-20], radius=10, fill=LIGHT_BG)
            pts = [(180,120,8),(250,180,12),(320,100,6),(400,200,10),
                   (150,250,7),(500,150,9),(350,280,11),(600,120,8),
                   (450,250,6),(280,160,10),(550,230,7),(200,200,9),
                   (380,140,8),(480,280,6),(160,310,7),(650,200,10)]
            n_d = min(len(pts), int((t-0.4)*28))
            for i in range(n_d):
                dx, dy, dr = pts[i]
                draw.ellipse([mpx+dx-dr-2, mpy+50+dy-dr-2, mpx+dx+dr+2, mpy+50+dy+dr+2],
                             fill=(180,220,180))
                draw.ellipse([mpx+dx-dr, mpy+50+dy-dr, mpx+dx+dr, mpy+50+dy+dr],
                             fill=ACCENT, outline=PRIMARY, width=2)

        # Activity feed
        if t > 0.45:
            ax, ay = 880, 645
            aw_a, ah_a = 1020, 360
            draw.rounded_rectangle([ax+4, ay+4, ax+aw_a+4, ay+ah_a+4], radius=14, fill=(210,210,210))
            draw.rounded_rectangle([ax, ay, ax+aw_a, ay+ah_a], radius=14, fill=WHITE)
            draw.text((ax+25, ay+15), "🔔  Actividad reciente", font=font(20, bold=True), fill=DARK)
            draw.line([ax+20, ay+50, ax+aw_a-20, ay+50], fill=LIGHT_GRAY)

            acts = [
                ("14:32","Remito #0847 entregado","Comedor Los Pibes",ACCENT),
                ("14:15","Stock actualizado","Ingreso arroz x 200u",BLUE),
                ("13:50","Caso aprobado","María González — URGENTE",ORANGE),
                ("13:30","Remito #0846 confirmado","Espacio Mi Barrio",ACCENT),
                ("13:10","Nuevo beneficiario","Centro Comunitario Sol",BLUE),
                ("12:45","Transferencia depósitos","LOG → CITA: fideos x100",PURPLE),
                ("12:20","ANEXO VI generado","Marzo 2026 — PA Regular",PRIMARY),
            ]
            n_a = min(len(acts), int((t-0.45)*12))
            for i in range(n_a):
                ts, action, detail, color = acts[i]
                iy = ay + 62 + i * 42
                draw.ellipse([ax+25, iy+4, ax+39, iy+18], fill=color)
                draw.text((ax+48, iy), ts, font=font(13, bold=True), fill=LIGHT_GRAY)
                draw.text((ax+118, iy), action, font=font(14, bold=True), fill=DARK)
                draw.text((ax+420, iy), detail, font=font(13), fill=GRAY)

        frames.append(np.array(img))
    return frames


def scene_impact(nf):
    frames = []
    ground_y = 770
    for f in range(nf):
        t = f / nf
        img = Image.new("RGB", (W, H), WHITE)
        draw = ImageDraw.Draw(img)
        sky_sunset(draw, ground_y)
        draw_sun(draw, W//2, 180, 75, t)
        draw_ground_v2(draw, ground_y)

        # Buildings
        draw_building_v2(draw, 80, ground_y-6, 210, 185, MUNICIPIO_WALL, ROOF_BROWN)
        draw_building_v2(draw, 380, ground_y-6, 260, 165, BUILDING_1, ROOF_RED)
        draw_building_v2(draw, 1280, ground_y-6, 230, 195, BUILDING_2, ROOF_BROWN)
        draw_building_v2(draw, 1560, ground_y-6, 210, 155, MUNICIPIO_WALL, ROOF_RED)

        # Banner
        bx_b, by_b = W//2-260, ground_y-365
        draw.rounded_rectangle([bx_b+4, by_b+4, bx_b+524, by_b+88], radius=16, fill=(15,60,18))
        draw.rounded_rectangle([bx_b, by_b, bx_b+520, by_b+84], radius=16, fill=PRIMARY)
        draw.text((bx_b+28, by_b+10), "Municipalidad de La Plata", font=font(28, bold=True), fill=WHITE)
        draw.text((bx_b+28, by_b+48), "Acción Social  ·  SIGAM", font=font(18), fill=SOFT_GREEN)

        # Community people
        community = [
            (260,SKIN_1,SHIRT_BLUE,1.0,True,HAIR_BLACK,0),
            (370,SKIN_2,SHIRT_RED,0.95,False,HAIR_BROWN,1),
            (480,SKIN_3,SHIRT_GREEN,1.1,True,HAIR_DARK,0),
            (580,SKIN_1,SHIRT_ORANGE,0.65,False,HAIR_LIGHT,2),
            (640,SKIN_2,SHIRT_PURPLE,0.6,False,HAIR_BLACK,0),
            (740,SKIN_3,SHIRT_BLUE,1.0,False,HAIR_BROWN,1),
            (840,SKIN_1,SHIRT_RED,0.85,True,HAIR_DARK,0),
            (920,SKIN_2,SHIRT_GREEN,0.55,False,HAIR_BLACK,2),
            (990,SKIN_3,SHIRT_ORANGE,1.0,False,HAIR_BROWN,0),
            (1090,SKIN_1,SHIRT_PURPLE,0.7,True,HAIR_LIGHT,1),
            (1180,SKIN_2,SHIRT_BLUE,0.9,False,HAIR_BLACK,0),
            (1320,SKIN_3,SHIRT_RED,0.6,False,HAIR_BROWN,2),
        ]
        for i,(px,sk,sh,sc,wave,hc,hs) in enumerate(community):
            if t > 0.08 + i*0.04:
                draw_person_v2(draw, px, ground_y-6, sk, sh,
                               PANTS_DARK if i%2==0 else PANTS_BLUE, sc,
                               wave=wave, t=t, hair_color=hc, hair_style=hs)

        draw_tree(draw, 40, ground_y-6, 1.1, 0)
        draw_tree(draw, 1740, ground_y-6, 1.25, 1)
        draw_tree(draw, 710, ground_y-6, 0.75, 2)

        # Hearts/stars
        if t > 0.25:
            ht = (t-0.25)/0.75
            for i in range(14):
                hx = 180 + i*130
                hy_base = 480 - i*12
                bob = math.sin(t*3.8 + i*0.7)*22
                rise = ht * 90
                sz = int(16*min(1, ht*2))
                if i%3==0:
                    draw_heart(draw, hx, int(hy_base-rise+bob), sz)
                elif i%3==1:
                    draw_star(draw, hx, int(hy_base-rise+bob), sz)
                else:
                    draw_heart(draw, hx, int(hy_base-rise+bob+25), int(sz*0.7), MID_GREEN)

        # Impact stats
        if t > 0.45:
            stats = [("1,247","familias"),("48","comedores"),("12","organizaciones"),("18,500 kg","de alimentos")]
            for i, (val, lbl) in enumerate(stats):
                sx_s = 210 + i*400
                sy_s = 85
                appear = min(1, (t-0.45-i*0.07)*4)
                if appear > 0:
                    draw.rounded_rectangle([sx_s-90+4, sy_s+4, sx_s+135+4, sy_s+92], radius=14, fill=(150,150,150))
                    draw.rounded_rectangle([sx_s-90, sy_s, sx_s+135, sy_s+88], radius=14, fill=WHITE)
                    draw.rounded_rectangle([sx_s-90, sy_s, sx_s-84, sy_s+88], radius=3, fill=ACCENT)
                    draw.text((sx_s-70, sy_s+8), val, font=font(32, bold=True), fill=PRIMARY)
                    draw.text((sx_s-70, sy_s+52), lbl, font=font(17), fill=GRAY)

        draw_particles(draw, t, ground_y, 15)
        frames.append(np.array(img))
    return frames


def scene_closing(nf):
    frames = []
    for f in range(nf):
        t = f / nf
        img = Image.new("RGB", (W, H), DARK_GREEN)
        draw = ImageDraw.Draw(img)

        for i in range(30):
            ly = int(i*40 + (t*70)%40) - 20
            draw.line([0, ly, W, ly], fill=(22, 80, 25), width=1)
        for i in range(15):
            lx = int(i*140 + (t*30)%140) - 70
            draw.line([lx, 0, lx, H], fill=(22, 80, 25), width=1)

        cx = W // 2
        lw = int(200*min(1, t*3))
        draw.rounded_rectangle([cx-lw, 275, cx+lw, 281], radius=3, fill=WHITE)

        if t > 0.08:
            txt = "SIGAM"
            f_t2 = font(85, bold=True)
            tw = draw.textlength(txt, font=f_t2)
            draw.text((cx-tw//2, 300), txt, font=f_t2, fill=WHITE)

        if t > 0.18:
            sub = "Gestión alimentaria transparente, eficiente y trazable"
            f_s = font(26)
            tw2 = draw.textlength(sub, font=f_s)
            draw.text((cx-tw2//2, 415), sub, font=f_s, fill=SOFT_GREEN)

        if t > 0.28:
            draw.rounded_rectangle([cx-lw, 465, cx+lw, 471], radius=3, fill=WHITE)

        if t > 0.33:
            org = "Municipalidad de La Plata  ·  Secretaría de Desarrollo Social"
            f_o = font(20)
            tw3 = draw.textlength(org, font=f_o)
            draw.text((cx-tw3//2, 490), org, font=f_o, fill=MID_GREEN)

        if t > 0.42:
            motto = "Porque cada entrega cuenta."
            f_m = font(30, light=True)
            tw4 = draw.textlength(motto, font=f_m)
            draw.text((cx-tw4//2, 580), motto, font=f_m, fill=SOFT_GREEN)

        if t > 0.5:
            ht = (t-0.5)/0.5
            for i in range(10):
                hx = 200 + i*170
                hy = 720 - ht*110
                bob = math.sin(t*3.5+i)*18
                if i%2==0:
                    draw_heart(draw, hx, int(hy+bob), int(16*min(1,ht*2.5)))
                else:
                    draw_star(draw, hx, int(hy+bob), int(13*min(1,ht*2.5)))

        # Fade to black
        if t > 0.82:
            fade = (t-0.82)/0.18
            overlay = Image.new("RGB", (W, H), BLACK)
            img = Image.blend(img, overlay, fade)

        frames.append(np.array(img))
    return frames


# ════════════════════════════════════════════════════════════════
#  MUSIC SYNTHESIS
# ════════════════════════════════════════════════════════════════

def generate_music(duration_sec):
    """Synthesize ambient background music."""
    sr = AUDIO_SR
    n_samples = int(duration_sec * sr)
    t = np.linspace(0, duration_sec, n_samples, dtype=np.float64)

    # Chord progression: Am - F - C - G (each 4 beats at ~70 BPM)
    bpm = 70
    beat_dur = 60.0 / bpm
    bar_dur = beat_dur * 4  # 4 beats per bar
    chord_dur = bar_dur  # 1 bar per chord

    # Frequencies for chords
    chords = [
        [220.0, 261.63, 329.63],   # Am: A3, C4, E4
        [174.61, 220.0, 261.63],   # F: F3, A3, C4
        [261.63, 329.63, 392.0],   # C: C4, E4, G4
        [196.0, 246.94, 293.66],   # G: G3, B3, D4
    ]

    # Bass notes
    bass_notes = [110.0, 87.31, 130.81, 98.0]  # A2, F2, C3, G2

    audio = np.zeros(n_samples, dtype=np.float64)

    # Pad (soft filtered chords)
    for i, chord in enumerate(chords):
        for cycle in range(int(duration_sec / (len(chords) * chord_dur)) + 1):
            start_time = cycle * len(chords) * chord_dur + i * chord_dur
            end_time = start_time + chord_dur
            mask = (t >= start_time) & (t < end_time)
            local_t = t[mask] - start_time

            # Soft attack/release envelope
            env = np.ones_like(local_t)
            attack = 0.3
            release = 0.5
            env = np.where(local_t < attack, local_t / attack, env)
            env = np.where(local_t > chord_dur - release,
                           (chord_dur - local_t) / release, env)
            env = np.clip(env, 0, 1)
            env = env ** 0.5  # Softer curve

            # Pad sound (sine + slight detuned sine for warmth)
            pad = np.zeros_like(local_t)
            for freq in chord:
                pad += np.sin(2 * np.pi * freq * local_t) * 0.15
                pad += np.sin(2 * np.pi * freq * 1.002 * local_t) * 0.08  # Slight detune
                pad += np.sin(2 * np.pi * freq * 0.5 * local_t) * 0.05  # Sub octave

            audio[mask] += pad * env * 0.35

    # Bass
    for i, bass_f in enumerate(bass_notes):
        for cycle in range(int(duration_sec / (len(bass_notes) * chord_dur)) + 1):
            start_time = cycle * len(bass_notes) * chord_dur + i * chord_dur
            end_time = start_time + chord_dur
            mask = (t >= start_time) & (t < end_time)
            local_t = t[mask] - start_time

            env = np.ones_like(local_t)
            env = np.where(local_t < 0.1, local_t / 0.1, env)
            env = np.where(local_t > chord_dur - 0.3,
                           (chord_dur - local_t) / 0.3, env)
            env = np.clip(env, 0, 1)

            bass = np.sin(2 * np.pi * bass_f * local_t) * 0.2
            bass += np.sin(2 * np.pi * bass_f * 2 * local_t) * 0.05
            audio[mask] += bass * env * 0.4

    # Gentle arpeggiated notes (high register, sparse)
    arp_notes = [523.25, 659.25, 783.99, 659.25, 523.25, 392.0]  # C5, E5, G5...
    arp_interval = beat_dur * 2  # Every 2 beats
    for i in range(int(duration_sec / arp_interval)):
        note_f = arp_notes[i % len(arp_notes)]
        start_time = i * arp_interval + beat_dur * 0.5  # Offset from beat
        note_dur = 1.2
        end_time = start_time + note_dur
        mask = (t >= start_time) & (t < end_time)
        local_t = t[mask] - start_time

        env = np.exp(-local_t * 2.5) * (1 - np.exp(-local_t * 30))  # Pluck-like
        note = np.sin(2 * np.pi * note_f * local_t) * 0.08
        note += np.sin(2 * np.pi * note_f * 2.0 * local_t) * 0.02  # Harmonic
        audio[mask] += note * env * 0.5

    # Gentle rhythmic element (very soft kick-like pulse)
    for beat in range(int(duration_sec / beat_dur)):
        start_time = beat * beat_dur
        pulse_dur = 0.15
        mask = (t >= start_time) & (t < start_time + pulse_dur)
        local_t = t[mask] - start_time
        freq_sweep = 80 * np.exp(-local_t * 30)  # Pitch drops
        kick = np.sin(2 * np.pi * freq_sweep * local_t) * np.exp(-local_t * 20) * 0.08
        audio[mask] += kick

    # Global envelope: fade in (3s) and fade out (4s)
    fade_in = np.clip(t / 3.0, 0, 1)
    fade_out = np.clip((duration_sec - t) / 4.0, 0, 1)
    audio *= fade_in * fade_out

    # Normalize
    peak = np.max(np.abs(audio))
    if peak > 0:
        audio = audio / peak * 0.7

    # Convert to int16
    audio_int16 = (audio * 32767).astype(np.int16)
    return audio_int16


# ════════════════════════════════════════════════════════════════
#  TRANSITIONS
# ════════════════════════════════════════════════════════════════

def crossfade(frames_a, frames_b, n):
    result = []
    for i in range(n):
        alpha = i / max(n-1, 1)
        a = frames_a[-(n-i)].astype(np.float32)
        b = frames_b[i].astype(np.float32)
        result.append(((1-alpha)*a + alpha*b).astype(np.uint8))
    return result


# ════════════════════════════════════════════════════════════════
#  MAIN
# ════════════════════════════════════════════════════════════════

def main():
    scenes_def = [
        ("Intro SIGAM", scene_intro, 5),
        ("Depósito Municipal", scene_deposito, 8),
        ("Trabajo Social", scene_social_worker, 8),
        ("Generación de Remitos", scene_remitos, 8),
        ("Carga del Camión", scene_loading, 7),
        ("Recorrido por la Ciudad", scene_driving, 7),
        ("Entrega de Alimentos", scene_delivery, 8),
        ("Dashboard SIGAM", scene_dashboard, 9),
        ("Impacto Comunitario", scene_impact, 7),
        ("Cierre", scene_closing, 6),
    ]

    print("=" * 60)
    print("SIGAM — Animated Video V2 (improved)")
    print("=" * 60)

    scenes = []
    for name, func, dur in scenes_def:
        n = dur * FPS
        print(f"  Rendering: {name} ({dur}s, {n} frames)...")
        frames = func(n)
        scenes.append(frames)

    # Assemble
    print("\nAssembling with crossfade transitions...")
    xf = int(0.8 * FPS)
    all_frames = list(scenes[0])
    for i in range(1, len(scenes)):
        cf = crossfade(all_frames, scenes[i], xf)
        all_frames = all_frames[:-xf]
        all_frames.extend(cf)
        all_frames.extend(scenes[i][xf:])

    total_secs = len(all_frames) / FPS
    print(f"  Total: {len(all_frames)} frames ({total_secs:.1f}s @ {FPS}fps)")

    # Generate music
    print("\nSynthesizing background music...")
    audio_data = generate_music(total_secs)
    print(f"  Audio: {len(audio_data)} samples ({total_secs:.1f}s @ {AUDIO_SR}Hz)")

    # Encode video + audio
    print("\nEncoding H.264 video with audio...")
    import av

    container = av.open(OUTPUT, mode='w')

    # Video stream
    video_stream = container.add_stream('libx264', rate=FPS)
    video_stream.width = W
    video_stream.height = H
    video_stream.pix_fmt = 'yuv420p'
    video_stream.options = {'crf': '20', 'preset': 'medium'}

    # Audio stream
    audio_stream = container.add_stream('aac', rate=AUDIO_SR)
    audio_stream.layout = 'mono'

    # Write video frames
    for i, frame_data in enumerate(all_frames):
        frame = av.VideoFrame.from_ndarray(frame_data, format='rgb24')
        frame.pts = i
        for packet in video_stream.encode(frame):
            container.mux(packet)
        if (i+1) % (FPS*10) == 0:
            pct = (i+1)/len(all_frames)*100
            print(f"  Video: {pct:.0f}% ({i+1}/{len(all_frames)})")

    # Flush video
    for packet in video_stream.encode():
        container.mux(packet)

    # Write audio
    print("  Encoding audio...")
    # PyAV expects audio in specific frame sizes
    audio_frame_size = 1024
    audio_samples = audio_data.reshape(-1, 1)  # mono

    for start in range(0, len(audio_samples), audio_frame_size):
        chunk = audio_samples[start:start+audio_frame_size]
        if len(chunk) < audio_frame_size:
            # Pad last chunk
            chunk = np.pad(chunk, ((0, audio_frame_size - len(chunk)), (0, 0)))

        aframe = av.AudioFrame.from_ndarray(
            chunk.T,  # Shape: (channels, samples)
            format='s16',
            layout='mono'
        )
        aframe.sample_rate = AUDIO_SR
        aframe.pts = start

        for packet in audio_stream.encode(aframe):
            container.mux(packet)

    # Flush audio
    for packet in audio_stream.encode():
        container.mux(packet)

    container.close()

    print(f"\n{'='*60}")
    print(f"Video saved: {OUTPUT}")
    print(f"Duration: {total_secs:.1f}s | {W}x{H} | {FPS}fps + Audio")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
