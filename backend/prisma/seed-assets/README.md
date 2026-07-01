# Seed map images

The seed (`prisma/seed.js`) copies images from this folder into the uploads dir as
`area-<id><ext>` and sets each area's `image_path` — exactly mirroring the
`POST /areas/:id/image` upload flow. The dashboard map needs an image on the **SITE**
(campus map, buildings overlaid) and on each **FLOOR** (floor plan, rooms overlaid).

## File naming

The seed looks up images by basename, trying extensions in this order:
`.png, .jpg, .jpeg, .webp, .svg` (raster preferred — some SVGs lack an intrinsic size
that `<canvas>` needs).

| Area               | File it looks for | Fallback  |
|--------------------|-------------------|-----------|
| Site (campus map)  | `site.*`          | — (required) |
| Floor 1            | `1st_floor.*`     | `floor.*` |
| Floor 2 and above  | `floor_n.*`       | `floor.*` |

So the expected set is **three files**: `site.png`, `1st_floor.png`, and `floor_n.png`
(reused for the 2nd floor and any floor above it). `floor.*` is still honoured as a generic
fallback if the named floor plans are missing.

Only **Building 5** and **Building 8** have modelled floors/rooms/sensors in the seed; the
other buildings (1–4, 6, 7, Dorms) are placed as plain icons on the site map. Building codes
are `B01`–`B08` and `DORM`; floor codes are `F01`, `F02`.

## Using your own images

1. Drop your files here (e.g. replace `site.png` and `floor.png`).
2. Rebuild + re-seed so they get baked into the image and applied:
   ```
   docker compose up -d --build backend
   ```
   (The backend container re-runs the seed on start.)

Icons are placed at default coordinates that assume a map at least ~500px wide; you can
drag any icon on the dashboard to reposition it (positions persist).

## Placeholders

`site.png` / `floor.png` here are simple generated placeholders so the dashboard renders
out of the box. Regenerate them with `node generate-placeholders.js`. Replace them with
real maps anytime.
