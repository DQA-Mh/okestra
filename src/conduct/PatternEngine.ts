// PatternEngine — y như Maestro VR: pattern 4/4, 3/4, downbeat, tempo, dynamics
// Mỗi beat có hướng mong đợi, thời gian, và pattern index trong ô nhịp

export type PatternBeat = {
  time: number // giây
  beatInMeasure: number // 0..3 cho 4/4, 0..2 cho 3/4
  dir: number // 0=down 1=up 2=left 3=right (hướng baton mong đợi)
  downbeat: boolean // phách 1
  dynamics: 'pp'|'p'|'mp'|'mf'|'f'|'ff' // tay trái cao/thấp
  cue?: string // nhạc cụ cần cue
  measure: number
}

export type ConductResult = 'Perfect'|'Good'|'Miss' | null

export class PatternEngine {
  beats: PatternBeat[] = []
  idx = 0
  bpm = 120
  timeSig: '4/4'|'3/4' = '4/4'
  // Scoring windows như Maestro VR Casual (rộng hơn realistic)
  perfectWindow = 0.09
  goodWindow = 0.19

  // Tạo pattern từ beatmap đơn giản (time + dir) → thêm beatInMeasure/downbeat/dynamics
  load(beats: {time:number, dir:number}[], timeSig: '4/4'|'3/4' = '4/4', bpm=120){
    this.timeSig=timeSig; this.bpm=bpm
    const perMeasure = timeSig==='4/4'?4:3
    const pattern4 = [0,2,3,1] // down, left, right, up (Maestro 4/4)
    const pattern3 = [0,2,1] // down, left, up (waltz)
    const pat = timeSig==='4/4'?pattern4:pattern3
    this.beats = beats.map((b,i)=>{
      const m = Math.floor(i / perMeasure)
      const bi = i % perMeasure
      const expectedDir = pat[bi] // hướng mong đợi theo pattern, nếu beatmap có dir thì ưu tiên beatmap dir khi khác?
      // Maestro cho phép tự do hơn ở Casual: dùng dir từ beatmap nếu có, nhưng vẫn check pattern
      return {
        time: b.time,
        beatInMeasure: bi,
        dir: b.dir ?? expectedDir,
        downbeat: bi===0,
        dynamics: (['p','mp','mf','f'] as const)[Math.floor(Math.random()*4)],
        cue: bi===0 ? (['Strings','Brass','Winds','Perc'][m%4]) : undefined,
        measure: m
      }
    })
    this.idx=0
    console.log(`[Pattern] ${this.beats.length} beats ${timeSig} bpm${bpm}`)
  }

  // Gọi khi baton downbeat (tay phải vung xuống)
  // handDir: hướng baton, time: audio.time, pos: {x,y}
  onDownbeat(handDir:number, time:number, pos:{x:number,y:number}): { result:ConductResult, beat:PatternBeat|null, diff:number }{
    if(this.idx >= this.beats.length) return { result:null, beat:null, diff:Infinity }
    const beat = this.beats[this.idx]
    const diff = Math.abs(time - beat.time)
    // Chỉ check downbeat cho phách 1, các phách khác cho phép Good ngay cả khi không downbeat?
    // Maestro: mọi phách đều cần đúng hướng, downbeat quan trọng hơn
    const dirOk = handDir===beat.dir
    let res: ConductResult=null
    if(diff <= this.perfectWindow && dirOk) res='Perfect'
    else if(diff <= this.goodWindow) res='Good'
    else if(diff <= 0.30) res='Miss' // quá trễ vẫn Miss để tiến idx
    // Nếu Miss do sai hướng nhưng timing Perfect → Good (như Maestro casual)
    if(!dirOk && res==='Perfect') res='Good'
    // Chỉ tiến idx khi có hit (Perfect/Good) hoặc đã quá missWindow
    if(res==='Perfect' || res==='Good' || diff>this.goodWindow){
      this.idx++
    }
    return { result: res, beat, diff }
  }

  // Gọi mỗi frame để check miss do quá hạn (không vung)
  checkMiss(time:number): PatternBeat | null{
    if(this.idx >= this.beats.length) return null
    const beat = this.beats[this.idx]
    if(time > beat.time + 0.30){
      this.idx++
      return beat
    }
    return null
  }

  get currentBeat(): PatternBeat | null{
    return this.beats[this.idx] ?? null
  }

  // Vẽ pattern guide (quỹ đạo) lên canvas — như Maestro VR Casual arrows
  drawGuide(ctx:CanvasRenderingContext2D, W:number, H:number, time:number){
    const lookAhead = 1.6
    const future = this.beats.slice(this.idx, this.idx+6).filter(b=>b.time - time < lookAhead && b.time >= time - 0.2)
    if(!future.length) return
    // Quỹ đạo 4/4: điểm pattern trong không gian 2D (giữa màn hình)
    const cx=W*0.5, cy=H*0.5
    const size=90 // kích thước pattern
    const posForBeat = (bi:number)=>{
      // 4/4 pattern positions: 1:down center, 2:left, 3:right, 4:up
      const map4: Record<number,{x:number,y:number}> = {
        0:{x:0,y: size*0.7}, // down
        1:{x:-size*0.7,y: 0}, // left
        2:{x:size*0.7,y: 0}, // right
        3:{x:0,y:-size*0.7}, // up
      }
      const map3: Record<number,{x:number,y:number}> = {
        0:{x:0,y:size*0.7},
        1:{x:-size*0.6,y:0},
        2:{x:size*0.6,y:-size*0.5},
      }
      const map = this.timeSig==='4/4'?map4:map3
      const p=map[bi]||{x:0,y:0}
      return { x: cx + p.x, y: cy + p.y }
    }
    // Vẽ đường quỹ đạo mờ
    ctx.strokeStyle='rgba(212,179,106,0.18)'
    ctx.lineWidth=2
    ctx.setLineDash([6,6])
    ctx.beginPath()
    future.forEach((b,i)=>{
      const pos=posForBeat(b.beatInMeasure)
      if(i===0) ctx.moveTo(pos.x, pos.y)
      else ctx.lineTo(pos.x, pos.y)
    })
    ctx.stroke()
    ctx.setLineDash([])
    // Vẽ từng beat sắp tới
    future.forEach(b=>{
      const pos=posForBeat(b.beatInMeasure)
      const dt=b.time - time
      const alpha = Math.max(0.25, 1 - dt/lookAhead)
      const scale = b.downbeat ? 1.18 : 1
      const pulse = 1 + Math.sin(time*6 + b.time)*0.06
      const r=22*scale*pulse
      const col = b.downbeat ? '#d4b36a' : ['#ef4444','#22c55e','#06b6d4','#facc15'][b.dir%4]
      ctx.globalAlpha=alpha
      // vòng ngoài
      ctx.beginPath(); ctx.arc(pos.x, pos.y, r+10, 0, Math.PI*2); ctx.strokeStyle=col; ctx.lineWidth= b.downbeat?3:2; ctx.stroke()
      // nốt
      ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI*2); ctx.fillStyle=col; ctx.fill(); ctx.strokeStyle='#ffffffcc'; ctx.lineWidth=1.5; ctx.stroke()
      // mũi tên hướng
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(b.dir*Math.PI/2); ctx.fillStyle='#0a0e1a'; ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(-6,7); ctx.lineTo(6,7); ctx.closePath(); ctx.fill(); ctx.restore()
      // cue
      if(b.cue){
        ctx.fillStyle='#fff'; ctx.font='700 10px Inter'; ctx.textAlign='center'; ctx.fillText(b.cue, pos.x, pos.y + r + 14)
      }
      // beat number
      ctx.fillStyle='#0a0e1a'; ctx.font='800 12px Inter'; ctx.textAlign='center'; ctx.fillText(String(b.beatInMeasure+1), pos.x, pos.y+4)
      // time left
      if(dt>0){
        ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.font='10px Inter'; ctx.fillText(`${dt.toFixed(2)}s`, pos.x, pos.y + r + 26)
      }
    })
    ctx.globalAlpha=1
    // Center cross
    ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1
    ctx.beginPath(); ctx.moveTo(cx-18,cy); ctx.lineTo(cx+18,cy); ctx.moveTo(cx,cy-18); ctx.lineTo(cx,cy+18); ctx.stroke()
  }
}
