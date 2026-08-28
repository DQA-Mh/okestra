# STEP 3 — Web 3D Hall Conductor POV (Three.js)

## Đã làm (3D chân thật, to, từng người)

**Tạo `src/scene/ThreeHall.ts` mới 100% (548KB bundle):**
- Scene `THREE.Scene` fog `#050816`, `PerspectiveCamera 65°` ở bục `y 1.7, z 4.5` nhìn orchestra `z -6` — đúng góc nhìn nhạc trưởng
- Hall: floor 36x36, podium 1.6x0.25, back/side walls, ceiling, 3 balconies (Box 28→24) + railing vàng `#d4b36a`
- Audience 3D: `Sphere 0.18` head + `Cylinder 0.22-0.26` body, palette 6 màu, skin 4 màu, 27 người (10/9/8 per row), `castShadow`, `breathe` sin 0.9, balcony `y 2.9 + row*1.8`
- Orchestra fan: 6 sections (Violin I 6, II 5, Viola 4, Cello 4, Brass 3, Perc 2) fan radius 4.5, angleStep 0.38, mỗi nhạc công `Cylinder body + Sphere head + Box stand + Cylinder instrument`, `musPlay` 1.1, `scale` theo dist
- Lights: Ambient 0.45, Directional shadow 2048, Point chandelier `#d4b36a` 1.2, Spot podium 2.2
- `setHall()` đổi fog/background + wall/floor color theo 5 hall
- `setPan()` lerp 0.08, camera x 0.9, lookAt 0.5

**Tích hợp `main.ts`:**
- Thêm `#threeWrap` sau `#stage`, `ThreeHall` init trong try/catch fallback 2D, ẩn CSS `far/mid` opacity 0 khi có 3D, `parallax()` gọi `threeHall.setPan`, `setHall()` gọi cả 2D + 3D

**Build:** `dist/index 7.2KB, css 13.6KB, js 548KB gz 140KB` (+ vision 153KB), preview 200, `phase3-3d` ready.

## Test
- Mở https://okestra-mauve.vercel.app → 3D hall hiện sau rèm, A/D nhìn quanh camera pan, chọn hall đổi màu tường/ánh sáng 3D, audience/orchestra thở nhẹ

## Tiếp Phase 4
Nhạc + beatmap 5 tác phẩm với audio 3D
