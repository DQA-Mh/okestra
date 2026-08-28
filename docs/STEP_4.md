# STEP 4 — Cơ chế y như Maestro VR (Pattern, Tempo, Dynamics, Cue)

## Đã đổi (xóa scattered cũ)

**Tạo `src/conduct/PatternEngine.ts` mới 100%:**
- `PatternBeat {time, beatInMeasure, dir, downbeat, dynamics, cue, measure}`
- `load(beats, timeSig, bpm)`: 4/4 pattern `down(0), left(2), right(3), up(1)`; 3/4 `down, left, up`; gán `downbeat` khi `beatInMeasure===0`, `dynamics` random `p/mp/mf/f`, `cue` Strings/Brass/Winds/Perc ở phách 1
- `onDownbeat(handDir, time, pos)`: so `diff = |time - beat.time|`, `perfect 0.09 / good 0.19`, `dirOk`, nếu sai hướng mà timing perfect → Good (như Maestro casual), tiến `idx`
- `checkMiss(time)`: quá 0.30s không vung → Miss và tiến
- `drawGuide(ctx,W,H,time)`: quỹ đạo 6 beats tới, positions pattern 4/4 (down center, left -70, right +70, up -70), vòng ngoài + nốt + arrow + cue + beat number + time left, cross center

**Đổi `src/main.ts` sang Maestro:**
- Thay `beats/notes/spawn/tryHit` scattered → `pattern: PatternEngine`, `baton.onDownbeat` pulse `tempoRing`, `tracker.onHands` gọi `pattern.onDownbeat` khi `r.swinging && vy<-0.9`, check dynamics tay trái `handL.y` (forte>0.6, piano<0.35) → nếu sai dynamics thì Perfect→Good
- `draw()` gọi `pattern.drawGuide` thay vì vẽ nốt scattered, thêm `since` pulse vòng tempo, hiển thị `BPM timeSig` và `Cue/Dynamics/Beat x/y`
- `loop()` gọi `pattern.checkMiss` thay vì spawn miss, `start()` reset `pattern.idx`, `loadBeats()` gọi `pattern.load(data,'4/4',120)` (strauss→3/4)
- Giữ 3D hall + parallax, chỉ đổi cơ chế chỉ huy

**Build:** `551KB gz141KB` (+ vision 153KB), preview 200, `phase4-maestro` ready.

## Test
- Mở https://okestra-mauve.vercel.app → Chọn tác phẩm → vung tay phải xuống đúng phách 1 (down) → Perfect, tay trái cao/thấp đúng dynamics → giữ Perfect, sai dynamics → Good. Không vung quá 0.3s → Miss.
- Bàn phím: Space = downbeat, Arrows = hướng, A/D parallax

## Tiếp Phase 5
Power-ups, baton unlock, achievements
