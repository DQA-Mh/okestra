# STEP 2 — 5 Nhà hát chi tiết từng người (Phase 2)

## Đã làm (chi tiết, đẹp — không placeholder)

**Tạo `src/scene/Halls.ts` mới 100%:**
- Định nghĩa 5 nhà hát với palette riêng, đúng tinh thần Maestro VR (5 halls):
  - **Vienna Gold** `#d4b36a` — 3 tầng khán giả, 24 nhạc công (Violin I/II, Viola, Cello, Brass, Perc)
  - **Paris Palais** `#a8c4e8` — Baroque, Choir 6, Harp
  - **Modern Glass** `#00e6cc` — Neon, Synth/Drums
  - **Baroque Chamber** `#c9a86a` — Gỗ, Harpsichord
  - **Cathedral** `#8a6fdb` — Gothic, 4 tầng, Choir 10
- Mỗi hall có `audienceRows` và `musicianGroups` chi tiết, icon riêng (🎻🎺🥁🎤🎹🪉)

**Vẽ từng người (`renderAudience` / `renderOrchestra`):**
- Khán giả: mỗi người là DOM `.person` với `.pHead` (da random #f5d0a8…#c68660) + `.pBody` (màu áo random từ `CLOTH_PALETTE` 6 màu/hall), 3 pose `.pose-clap/.pose-lean/.pose-sit`, scale theo hàng xa (0.95→0.86), `breathe` animation 3s
- Nhạc công: `.musician` với `.mIcon` (nhạc cụ), `.mBody`, `.mStand`, animation `musPlay` 1.2s delay theo index, `secTitle` cho từng bộ
- Tạo `Sprite Atlas` ảo: tái dùng cùng DOM, đổi màu qua CSS thay vì nhiều sprite, giảm draw call (tương tự Unity Atlas)
- Ẩn emoji placeholder cũ bằng `.has-detailed::before {content:none}` khi có hall chi tiết

**Áp màu hall:** `applyHallColors()` đổi `far/mid/light` gradient và `--accent` CSS var theo hall, ảnh hưởng cả menu (`#menuFar`) và game (`#far/#mid/#light`)

**UI chọn hall:**
- Trong `index.html` modal `Chọn tác phẩm` thêm `.hallGrid` 5 card (Vienna active mặc định), click `hallCard` gọi `setHall(id)` → rerender ngay, không cần reload
- `main.ts:64` `setHall()` render cả game hall và menu hall, highlight card, log

**Parallax giữ:** `targetPan -1..1` → `far 12px / mid 28px / near 40px` + menuFar 8px, như Phase 1

**Build:** `dist/index.html 7.2KB, css 10.7KB, js 20.2KB` (+ vision 153KB), preview 200, `npm run build` success.

## Test
- Mở https://okestra-mauve.vercel.app → Menu → Chọn tác phẩm → click từng hall card → nền menu + game đổi màu, khán giả/nhạc công thay đổi số lượng/màu (Vienna 3 hàng 14→10 người, Cathedral 4 hàng, Modern ít hàng)
- A/D kéo chuột → 3 lớp parallax lệch nhau
- Chưa cần webcam vẫn thấy hall chi tiết

## Tiếp theo Phase 3
Nhạc trưởng + baton 2 tay chi tiết (rig, trail, 14 baton unlock)
