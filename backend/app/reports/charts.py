"""Server-side SVG chart generation for exported reports.

`xhtml2pdf` (the PDF renderer, see `pdf_renderer.py`) silently drops inline
`<svg>...</svg>` markup — verified directly against the installed version
before writing this module. What it *does* render correctly is an `<img>`
whose `src` is a `data:image/svg+xml;base64,...` URI, including path-based
shapes (arcs), so every chart function here returns exactly that: a
complete, self-contained SVG document as a data URI, ready to drop into an
`<img src="...">` in `report.html`. The same data URI works unmodified in
the HTML export too (every browser resolves `data:` URIs natively), so HTML
and PDF are guaranteed to show the identical chart image — no separate
rendering path for either format.

These functions only lay out and color numbers they're given — they never
compute the numbers themselves (no counting, no aggregation of raw analysis
data). That happens in `app/reports/derive.py`, which is the only caller.
"""

import base64
import math
from html import escape as _escape

_FONT = "Helvetica, Arial, sans-serif"

# Mirrors frontend/src/utils/chartColors.ts's CHART_PALETTE exactly, so the
# exported report's charts and the Executive Dashboard's charts (Ticket-017)
# use the same color language even though neither shares code with the
# other (one is Python/SVG, the other is TypeScript/Recharts).
CHART_PALETTE = [
    "#6366f1",  # primary-500
    "#0ea5e9",  # info-500
    "#f59e0b",  # warning-500
    "#ef4444",  # danger-500
    "#10b981",  # success-500
    "#94a3b8",  # neutral-400
    "#a5b4fc",  # primary-300
    "#7dd3fc",  # info-300
    "#fcd34d",  # warning-300
    "#fca5a5",  # danger-300
    "#6ee7b7",  # success-300
    "#cbd5e1",  # neutral-300
]

# Matches frontend's columnCategoryBadgeVariant mapping (numeric: info,
# categorical: neutral, date: primary).
DATASET_CATEGORY_COLORS = {
    "numeric": "#0ea5e9",
    "categorical": "#94a3b8",
    "date": "#6366f1",
}


def _data_uri(svg: str) -> str:
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def _empty_chart(width: int, height: int, message: str = "No data available") -> str:
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">'
        f'<rect x="0" y="0" width="{width}" height="{height}" fill="#f9fafb" rx="6"/>'
        f'<text x="{width / 2}" y="{height / 2}" font-family="{_FONT}" font-size="12" '
        f'fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">{_escape(message)}</text>'
        "</svg>"
    )
    return _data_uri(svg)


def horizontal_bar_chart(
    data: list[tuple[str, int]], *, width: int = 480, bar_color: str = CHART_PALETTE[0]
) -> str:
    """`data`: (label, value) pairs, already computed by the caller."""
    if not data:
        return _empty_chart(width, 120)

    row_height = 36
    padding_y = 12
    label_width = 140
    value_gutter = 40
    max_bar_width = width - label_width - value_gutter
    height = padding_y * 2 + row_height * len(data)
    max_value = max(value for _, value in data) or 1

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">',
        f'<rect x="0" y="0" width="{width}" height="{height}" fill="#ffffff"/>',
    ]
    for index, (label, value) in enumerate(data):
        y = padding_y + index * row_height
        bar_h = row_height - 14
        bar_w = (value / max_value) * max_bar_width if max_value else 0
        parts.append(
            f'<text x="0" y="{y + row_height / 2 + 4:.1f}" font-family="{_FONT}" '
            f'font-size="11.5" fill="#374151">{_escape(label)}</text>'
        )
        parts.append(
            f'<rect x="{label_width}" y="{y + 7:.1f}" width="{bar_w:.1f}" height="{bar_h}" '
            f'rx="3" fill="{bar_color}"/>'
        )
        parts.append(
            f'<text x="{label_width + bar_w + 8:.1f}" y="{y + row_height / 2 + 4:.1f}" '
            f'font-family="{_FONT}" font-size="11.5" fill="#1f2937">{value}</text>'
        )
    parts.append("</svg>")
    return _data_uri("".join(parts))


def _arc_path(
    cx: float, cy: float, outer_r: float, inner_r: float, start_deg: float, end_deg: float
) -> str:
    start_rad = math.radians(start_deg)
    end_rad = math.radians(end_deg)
    x1, y1 = cx + outer_r * math.cos(start_rad), cy + outer_r * math.sin(start_rad)
    x2, y2 = cx + outer_r * math.cos(end_rad), cy + outer_r * math.sin(end_rad)
    large_arc = 1 if (end_deg - start_deg) > 180 else 0

    if inner_r > 0:
        ix1, iy1 = cx + inner_r * math.cos(end_rad), cy + inner_r * math.sin(end_rad)
        ix2, iy2 = cx + inner_r * math.cos(start_rad), cy + inner_r * math.sin(start_rad)
        return (
            f"M {x1:.2f} {y1:.2f} "
            f"A {outer_r:.2f} {outer_r:.2f} 0 {large_arc} 1 {x2:.2f} {y2:.2f} "
            f"L {ix1:.2f} {iy1:.2f} "
            f"A {inner_r:.2f} {inner_r:.2f} 0 {large_arc} 0 {ix2:.2f} {iy2:.2f} Z"
        )
    return (
        f"M {cx:.2f} {cy:.2f} L {x1:.2f} {y1:.2f} "
        f"A {outer_r:.2f} {outer_r:.2f} 0 {large_arc} 1 {x2:.2f} {y2:.2f} Z"
    )


def pie_chart(
    data: list[tuple[str, int]],
    *,
    colors: list[str] | None = None,
    size: int = 220,
    donut: bool = False,
) -> str:
    """`data`: (label, value) pairs, already computed by the caller. Renders
    a full pie (or, with `donut=True`, a ring) plus a side legend, as one
    SVG image."""
    total = sum(value for _, value in data)
    legend_width = 170
    canvas_width = size + legend_width
    if not data or total <= 0:
        return _empty_chart(canvas_width, size)

    palette = colors or CHART_PALETTE
    cx = cy = size / 2
    outer_r = size / 2 - 12
    inner_r = outer_r * 0.55 if donut else 0

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{canvas_width}" height="{size}" '
        f'viewBox="0 0 {canvas_width} {size}">',
        f'<rect x="0" y="0" width="{canvas_width}" height="{size}" fill="#ffffff"/>',
    ]

    angle = -90.0
    for index, (_label, value) in enumerate(data):
        color = palette[index % len(palette)]
        sweep = (value / total) * 360
        if sweep >= 359.99:
            # A single 360-degree slice can't be drawn as one arc (its start
            # and end points coincide) -- draw it as a plain ring/circle.
            if inner_r > 0:
                ring_r = (outer_r + inner_r) / 2
                ring_width = outer_r - inner_r
                parts.append(
                    f'<circle cx="{cx}" cy="{cy}" r="{ring_r:.2f}" fill="none" '
                    f'stroke="{color}" stroke-width="{ring_width:.2f}"/>'
                )
            else:
                parts.append(f'<circle cx="{cx}" cy="{cy}" r="{outer_r:.2f}" fill="{color}"/>')
        else:
            arc = _arc_path(cx, cy, outer_r, inner_r, angle, angle + sweep)
            parts.append(f'<path d="{arc}" fill="{color}" stroke="#ffffff" stroke-width="1.5"/>')
        angle += sweep

    legend_x = size + 14
    for index, (label, value) in enumerate(data):
        color = palette[index % len(palette)]
        ly = 14 + index * 22
        if ly > size - 8:
            break
        parts.append(
            f'<rect x="{legend_x}" y="{ly}" width="11" height="11" rx="2" fill="{color}"/>'
        )
        parts.append(
            f'<text x="{legend_x + 17}" y="{ly + 9.5:.1f}" font-family="{_FONT}" font-size="11" '
            f'fill="#374151">{_escape(label)} ({value})</text>'
        )
    parts.append("</svg>")
    return _data_uri("".join(parts))
