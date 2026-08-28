// TilesEngine — Magic Tiles 3 FIX: tiles đen to, full lane, dễ thấy như gốc
export type Tile = { lane:number, time:number, endTime?:number, type:'tap'|'hold', y:number, hit:boolean, missed:boolean, active:boolean }
export type HitRes = 'Perfect'|'Good'|'Miss'|null
export class TilesEngine {
  tiles: Tile[] = []
  idx = 0
  beats: {time:number, lane:number, hold?:number}[] = []
  travel = 1.42
  perfectW = 0.08
  goodW = 0.16
  canvasH = 720
  hitY = 0.78
  load(beats: {time:number, dir:number}[]){
    this.beats = beats.map((b,i)=>{
      const lane = b.dir % 4
      const isHold = Math.random()<0.16 && i>2
      return { time:b.time, lane, hold: isHold? 0.65 : undefined }
    }).sort((a,b)=>a.time-b.time)
    this.idx=0; this.tiles=[]
    console.log(`[Tiles] ${this.beats.length} tiles`)
  }
  update(songTime:number){
    while(this.idx < this.beats.length && this.beats[this.idx].time - this.travel <= songTime){
      const b=this.beats[this.idx]
      this.tiles.push({ lane:b.lane, time:b.time, endTime: b.hold? b.time + b.hold : undefined, type: b.hold? 'hold':'tap', y:0, hit:false, missed:false, active:true })
      this.idx++
    }
    for(const t of this.tiles){
      if(!t.active) continue
      const dt = songTime - (t.time - this.travel)
      t.y = dt / this.travel
      if(songTime > t.time + 0.28 && !t.hit){ t.active=false; t.missed=true }
      if(t.type==='hold' && t.hit && t.endTime && songTime < t.endTime) t.active=true
    }
    this.tiles = this.tiles.filter(t=> t.active || (t.type==='hold' && t.hit && t.endTime && songTime < t.endTime!))
  }
  tap(lane:number, time:number): { res:HitRes, tile:Tile|null }{
    let best:Tile|null=null, bestDiff=Infinity
    for(const t of this.tiles){ if(!t.active || t.hit || t.lane!==lane) continue; const diff=Math.abs(time - t.time); if(diff<bestDiff){ best=t; bestDiff=diff } }
    if(!best) return { res:null, tile:null }
    let res:HitRes=null
    if(bestDiff<=this.perfectW) res='Perfect'
    else if(bestDiff<=this.goodW) res='Good'
    else if(bestDiff<=0.28) res='Miss'
    if(res==='Perfect' || res==='Good'){ best.hit=true; if(best.type==='tap') best.active=false }
    else if(res==='Miss'){ best.active=false; best.missed=true }
    return { res, tile:best }
  }
  draw(ctx:CanvasRenderingContext2D, W:number, H:number, songTime:number){
    const lanes=4, laneW=W/lanes, hitY=H*this.hitY
    // nền lane — đen như Magic Tiles 3 gốc, hit line vàng to
    ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H)
    for(let i=0;i<lanes;i++){
      ctx.fillStyle = i%2===0 ? '#0a0a0a' : '#111111'
      ctx.fillRect(i*laneW,0,laneW,H)
      ctx.strokeStyle='rgba(212,179,106,0.35)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(i*laneW,0); ctx.lineTo(i*laneW,H); ctx.stroke()
      // lane label to hơn
      ctx.fillStyle='rgba(212,179,106,0.9)'; ctx.font='800 20px Inter'; ctx.textAlign='center'
      ctx.fillText(['D','F','J','K'][i], i*laneW+laneW/2, hitY+34)
    }
    // hit line — to, sáng, có glow
    ctx.shadowColor='#d4b36a'; ctx.shadowBlur=18
    ctx.strokeStyle='#facc15'; ctx.lineWidth=6
    ctx.beginPath(); ctx.moveTo(0,hitY); ctx.lineTo(W,hitY); ctx.stroke()
    ctx.shadowBlur=0
    ctx.fillStyle='rgba(250,204,21,0.16)'; ctx.fillRect(0, hitY-36, W, 72)
    ctx.fillStyle='#facc15'; ctx.font='700 12px Inter'; ctx.textAlign='center'; ctx.fillText('HIT LINE — TAP ĐÚNG NHỊP', W*0.5, hitY+52); ctx.textAlign='left'

    // tiles — ĐEN TO như Magic Tiles 3 gốc, full lane
    for(const t of this.tiles){
      if(!t.active && !t.hit) continue
      const x = t.lane*laneW, w=laneW-4
      const isHold = t.type==='hold'
      const h = isHold ? ((t.endTime!-t.time)/this.travel*hitY) : 96
      const y = t.y*hitY - (isHold? h-10 : 48)
      // tile body — đen, viền vàng khi chưa hit, vàng khi hit
      ctx.fillStyle = t.hit ? '#facc15' : '#000'
      ctx.strokeStyle = t.hit ? '#fff' : '#facc15'
      ctx.lineWidth= isHold? 3:2.5
      ctx.shadowColor = isHold ? '#8a6fdb' : '#d4b36a'
      ctx.shadowBlur = 14
      const r=8
      ctx.beginPath()
      // @ts-ignore
      if((ctx as any).roundRect) (ctx as any).roundRect(x+2, y, w, h, r)
      else ctx.rect(x+2, y, w, h)
      ctx.fill(); ctx.stroke()
      ctx.shadowBlur=0
      // top highlight
      ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.fillRect(x+6, y+4, w-12, 12)
      // text to
      if(!isHold){
        ctx.fillStyle= t.hit ? '#000' : '#fff'
        ctx.font='800 22px Inter'; ctx.textAlign='center'
        ctx.fillText('♪', x+laneW/2, y+h/2+8)
        ctx.textAlign='left'
      } else {
        ctx.fillStyle='#fff'; ctx.font='700 13px Inter'; ctx.textAlign='center'
        ctx.fillText('HOLD', x+laneW/2, y+26)
        ctx.fillText('↕', x+laneW/2, y+h/2+6)
        ctx.textAlign='left'
      }
    }
    // preview khi chưa chơi — hiện 4 tiles mẫu to để thấy có nốt
    if(this.tiles.length===0 && this.idx===0){
      ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font='800 18px Inter'; ctx.textAlign='center'
      ctx.fillText('▶ Nhấn Bắt đầu — tiles đen sẽ rơi 4 lane', W*0.5, H*0.5 - 10)
      ctx.font='600 13px Inter'; ctx.fillStyle='rgba(212,179,106,0.9)'
      ctx.fillText('D  F  J  K  để tap • Tay phải x*4 = lane', W*0.5, H*0.5 + 18)
      // vẽ 4 tiles mẫu
      for(let lane=0;lane<4;lane++){
        const x=lane*laneW, w=laneW-4, y=H*0.5+40 + (lane%2)*14
        ctx.fillStyle='#000'; ctx.strokeStyle='#facc15'; ctx.lineWidth=2.5
        ctx.shadowColor='#d4b36a'; ctx.shadowBlur=10
        ctx.beginPath(); (ctx as any).roundRect ? (ctx as any).roundRect(x+2,y,w,68,8) : ctx.rect(x+2,y,w,68)
        ctx.fill(); ctx.stroke(); ctx.shadowBlur=0
        ctx.fillStyle='#fff'; ctx.font='800 18px Inter'; ctx.textAlign='center'; ctx.fillText('♪', x+laneW/2, y+42)
      }
      ctx.textAlign='left'
    }
  }
}
