# STEP 1 — Menu Okestra Đẹp (Phase 1)

## Đã làm (chi tiết, đẹp nhất)

**Branding Okestra mới 100%:** tên OKESTRA (Cinzel 900, gradient vàng #fff8e0→#d4b36a→#8a6f3a, drop-shadow), subtitle, đường line vàng. Không tái dùng code cũ.

**Menu full-screen:**
- Nền `#menuHall` 3 lớp: `#menuFar` gradient đêm + chữ "NHÀ HÁT OPERA QUỐC GIA", `#menuSpot` spotlight radial, `#menuVignette`
- Rèm nhung 2 bên `#menuCurtainL/R` (16% width, gradient #5a0a0a→#9a1a1a) mở sau 300ms `transform: translateX(-100%/100%)` 1.25s cubic-bezier, như rèm sân khấu thật
- ` #menuContent` fade-in 0.9s, logo + 5 nút dọc 340px: Bắt đầu (primary vàng), Chọn tác phẩm, Hướng dẫn, Bộ sưu tập baton, Cài đặt — hover `translateY(-2px) scale(1.015)` + glow vàng
- Footer version Phase 1

**Modals chi tiết:**
- Chọn tác phẩm: grid 2 cột 5 card (Beethoven 5, Mozart, Strauss, Wagner, Carmina) với tên, thời kỳ, nhịp, độ khó
- Hướng dẫn: 5 bước như Maestro VR (baton tempo, dynamics tay trái, cue scattered, nhìn quanh, fallback)
- Baton: grid 4 card 14 baton (gỗ sồi/mun/pha lê/vàng, khóa Lv)
- Cài đặt: volume range, difficulty (Easy/Normal/Hard ánh xạ perfectWindow 0.12→0.05), camToggle

**Game stage giữ nguyên** nhưng tách `#app` hidden ban đầu, chỉ hiện sau khi nhấn Bắt đầu / chọn tác phẩm. Parallax 3 lớp hall + canvas + podium giữ.

**Code:** `index.html:1` (menu + game), `src/style.css:1` (menuHall, curtain, modal), `src/main.ts:60` (showMenu/showGame, modal open/close, songCard click, diff handling). Build `dist/index.html 6.5KB, css 8.7KB, js 15KB`.

## Test
- Mở http://localhost:5175/ → rèm tự mở, logo hiện, hover nút glow, click Chọn tác phẩm → modal, click card → vào game (calib), A/D nhìn quanh parallax, Space test.
- Đã build `npm run build` success, preview 200.

## Tiếp theo Phase 2
Vẽ 5 nhà hát chi tiết từng người (không placeholder), mỗi hall khác ánh sáng/ghế, từng nhạc công/khán giả có pose riêng, Sprite Atlas, 2D Lights.
