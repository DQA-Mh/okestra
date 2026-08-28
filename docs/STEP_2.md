# STEP 2 — 5 Nhà hát Conductor POV To, Chân Thật (Redo)

## Tự prompt: Góc nhìn nhạc trưởng, to, đẹp nhất, chân thật

**Prompt:** *"You are a senior web artist. Create a photorealistic opera hall from conductor's POV on podium looking out: orchestra in fan below (large, detailed, each musician with music stand, instrument, chair), audience in balconies above (large, each person with head/body/collar, varied skin/hair/clothing), perspective 900px, chandelier, spotlight, gold velvet. Make each person 2x larger than before, with shadows and breathing animation. 5 halls with distinct palettes."*

## Đã làm lại (không placeholder, to, chân thật)

**Hall data (`Halls.ts:15`):** 5 halls giữ, nhưng render mới:
- **Vienna Gold, Paris Palais, Modern Glass, Baroque Chamber, Cathedral** — mỗi hall `farTop/farMid/mid/accent/light` riêng

**Render Conductor POV:**
- `renderAudience`: POV ban công trên cao, `top 4% + r*9%`, `scale 1 - r*0.08`, `perspective(600px) rotateX(8deg)`, `filter brightness`, `gap 18px`, count `10 - r` (to nên ít người, đỡ rối), mỗi `.person` to: `.pHead 28px` + tóc `box-shadow`, `.pBody 42x34px` + `.pCollar`, da random 5 màu, tóc 6 màu, `animationDelay` riêng, `::after` shadow, thêm `chandelier` cho Vienna/Paris
- `renderOrchestra`: fan hình quạt `left 50% + (idx/total-0.5)*60%`, `bottom 14% + dist*12%`, `rotate 40deg fan`, mỗi `.musician` to: `.mIcon 32px`, `.mBody 30x28px` + `.mHands`, `.mStand 34x22px` + `.mChair`, `scale 1 - dist*0.12`, `musPlay 1.3s`
- `style.css:84` — `#hall perspective 900px`, `.person` `28/42px`, `.musician` `32px icon`, `.chandelier` glow 3s, `.pCollar/.mHands/.mChair` chi tiết
- `applyHallColors` đổi gradient far/mid/light + `--accent`

**UI:** `index.html` hallGrid 5 cards, click `hallCard` → `setHall(id)` rerender cả menu và game ngay, highlight active, parallax `far 12px / mid 28px / near 40px`

**Build:** `dist/index 7.2KB, css 13.4KB, js 21.3KB` + vision 153KB, preview 200, `phase2-halls 0f3f9ac` push `origin/phase2-halls`, deploy `dpl_6Be8AgUR6C6rruzuQ2Ux1Eedh4v1` → https://okestra-mauve.vercel.app

## Test
- Mở https://okestra-mauve.vercel.app → Chọn tác phẩm → click hall → thấy Vienna 10→8 người/hàng to, Cathedral 4 tầng, dàn nhạc fan cong to, mỗi người có bóng, chandelier nhấp nháy, A/D parallax rõ

## Tiếp Phase 3
Nhạc trưởng + baton 2 tay chi tiết (trail, 14 baton)
