// TilesEngine — Magic Tiles 3: 4 lane, tiles rơi, tap/hold — FIX: tiles to, sáng hơn, dễ thấy
export type Tile = {
  lane: number
  time: number
  endTime?: number
  type: 'tap'|'hold'
  y: number
  hit: boolean
  missed: boolean
  active: boolean
}

export type HitRes = 'Perfect'|'Good'|'Miss'|null

export class TilesEngine {
  tiles: Tile[] = []
  idx = 0
  beats: {time:number, lane:number, hold?:number}[] = []
  speed = 420
  travel = 1.45
  perfectW = 0.08
  goodW = 0.15
  canvasH = 720
  hitY = 0.82

  load(beats: {time:number, dir:number}[]){
    this.beats = beats.map((b,i)=>{
      const lane = b.dir % 4
      const isHold = Math.random()<0.18 && i>2
      return { time:b.time, lane, hold: isHold? 0.55 : undefined }
    }).sort((a,b)=>a.time-b.time)
    this.idx=0
    this.tiles=[]
    console.log(`[Tiles] ${this.beats.length} tiles (4 lanes)`)
  }

  update(songTime:number){
    while(this.idx < this.beats.length && this.beats[this.idx].time - this.travel <= songTime){
      const b=this.beats[this.idx]
      this.tiles.push({
        lane:b.lane,
        time:b.time,
        endTime: b.hold? b.time + b.hold : undefined,
        type: b.hold? 'hold':'tap',
        y:0, hit:false, missed:false, active:true
      })
      this.idx++
    }
    for(const t of this.tiles){
      if(!t.active) continue
      const dt = songTime - (t.time - this.travel)
      t.y = dt / this.travel
      if(songTime > t.time + 0.25 && !t.hit){
        t.active=false; t.missed=true
      }
      if(t.type==='hold' && t.hit && t.endTime && songTime < t.endTime){
        t.active=true
      }
    }
    this.tiles = this.tiles.filter(t=> t.active || (t.type==='hold' && t.hit && t.endTime && songTime < t.endTime!))
  }

  tap(lane:number, time:number): { res:HitRes, tile:Tile|null }{
    let best:Tile|null=null, bestDiff=Infinity
    for(const t of this.tiles){
      if(!t.active || t.hit) continue
      if(t.lane!==lane) continue
      const diff=Math.abs(time - t.time)
      if(diff<bestDiff){ best=t; bestDiff=diff }
    }
    if(!best) return { res:null, tile:null }
    let res:HitRes=null
    if(bestDiff<=this.perfectW) res='Perfect'
    else if(bestDiff<=this.goodW) res='Good'
    else if(bestDiff<=0.25) res='Miss'
    if(res==='Perfect' || res==='Good'){
      best.hit=true
      if(best.type==='tap') best.active=false
    } else if(res==='Miss'){
      best.active=false; best.missed=true
    }
    return { res, tile:best }
  }

  holding(lane:number, time:number, isHolding:boolean){
    for(const t of this.tiles){
      if(t.type!=='hold' || !t.hit) continue
      if(t.lane!==lane) continue
      if(!isHolding && time < (t.endTime||0)){
        t.active=false
        return 'Good'
      }
      if(time >= (t.endTime||0)){
        t.active=false
        return 'Perfect'
      }
    }
    return null
  }

  draw(ctx:CanvasRenderingContext2D, W:number, H:number, songTime:number){
    const lanes=4
    const laneW = W / lanes
    // lane background — sáng hơn để thấy
    for(let i=0;i<lanes;i++){
      ctx.fillStyle = i%2===0 ? 'rgba(212,179,106,0.07)' : 'rgba(255,255,255,0.03)'
      ctx.fillRect(i*laneW, 0, laneW, H)
      ctx.strokeStyle='rgba(212,179,106,0.28)'
      ctx.lineWidth=1.5
      ctx.beginPath(); ctx.moveTo(i*laneW,0); ctx.lineTo(i*laneW,H); ctx.stroke()
    }
    // hit line — to + glow
    const hitY = H * this.hitY
    ctx.shadowColor='#d4b36a'; ctx.shadowBlur=12
    ctx.strokeStyle='#d4b36a'
    ctx.lineWidth=4
    ctx.beginPath(); ctx.moveTo(0,hitY); ctx.lineTo(W,hitY); ctx.stroke()
    ctx.shadowBlur=0
    ctx.fillStyle='rgba(212,179,106,0.18)'
    ctx.fillRect(0, hitY-32, W, 64)
    // lane keys — to hơn
    const keys=['D','F','J','K']
    ctx.fillStyle='#f5e8c8'; ctx.font='800 18px Inter'; ctx.textAlign='center'
    for(let i=0;i<lanes;i++){
      ctx.fillStyle='rgba(212,179,106,0.95)'
      ctx.fillRect(i*laneW + laneW/2 - 22, hitY+10, 44, 22)
      ctx.fillStyle='#0a0e1a'
      ctx.fillText(keys[i], i*laneW + laneW/2, hitY+26)
    }
    ctx.textAlign='left'

    // tiles — TO, SÁNG, có viền glow
    for(const t of this.tiles){
      if(!t.active && !t.hit) continue
      const x = t.lane*laneW + laneW/2
      const y = t.y * hitY
      const isHold = t.type==='hold'
      const h = isHold ? ( (t.endTime! - t.time)/this.travel * hitY ) : 68
      const w = laneW * 0.88
      const tileH = isHold ? h : 68
      const tileY = isHold ? (t.y*hitY - h + 34) : (y - 34)
      // glow
      ctx.shadowColor = t.hit ? '#fff' : (isHold ? '#8a6fdb' : '#d4b36a')
      ctx.shadowBlur = t.hit ? 16 : 10
      ctx.fillStyle = t.hit ? '#facc15' : (isHold ? '#6d28d9' : '#0f172a')
      ctx.strokeStyle = t.hit ? '#fff' : '#facc15'
      ctx.lineWidth = 2.5
      const r=12
      ctx.beginPath()
      // @ts-ignore
      if((ctx as any).roundRect) (ctx as any).roundRect(x-w/2, tileY, w, tileH, r)
      else ctx.rect(x-w/2, tileY, w, tileH)
      ctx.fill(); ctx.stroke()
      ctx.shadowBlur=0
      // inner highlight
      ctx.fillStyle='rgba(255,255,255,0.12)'
      ctx.fillRect(x-w/2+4, tileY+4, w-8, 10)
      // icon to
      if(!isHold){
        ctx.fillStyle=t.hit ? '#1a1204' : '#f5e8c8'
        ctx.font='800 18px Inter'; ctx.textAlign='center'
        ctx.fillText(t.lane%2===0?'♪':'♫', x, tileY + 42)
        ctx.textAlign='left'
      } else {
        ctx.fillStyle='#fff'; ctx.font='700 12px Inter'; ctx.textAlign='center'
        ctx.fillText('HOLD ↕', x, tileY + 24)
        ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1.5
        ctx.beginPath(); ctx.moveTo(x, tileY+32); ctx.lineTo(x, tileY+h-12); ctx.stroke()
        ctx.textAlign='left'
      }
    }
    // preview khi chưa chơi: hiện 3 tiles mẫu để thấy có nốt
    if(this.tiles.length===0 && this.idx===0){
      ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font='700 14px Inter'; ctx.textAlign='center'
      ctx.fillText('Nhấn Bắt đầu để tiles rơi • D F J K để tap • M đổi Maestro', W*0.5, H*0.5)
      ctx.textAlign='left'
    }
  }
}
