// TilesEngine — Magic Tiles 3: 4 lane, tiles rơi, tap/hold
export type Tile = {
  lane: number // 0..3
  time: number // hit time
  endTime?: number // cho long tile (hold)
  type: 'tap'|'hold'
  y: number // 0..1 progress
  hit: boolean
  missed: boolean
  active: boolean
}

export type HitRes = 'Perfect'|'Good'|'Miss'|null

export class TilesEngine {
  tiles: Tile[] = []
  idx = 0
  beats: {time:number, lane:number, hold?:number}[] = []
  speed = 420 // px/s
  travel = 1.45 // s từ top tới hit line
  perfectW = 0.08
  goodW = 0.15
  canvasH = 720
  hitY = 0.82 // hit line 82% height

  load(beats: {time:number, dir:number}[]){
    // Map dir -> lane, 20% long hold
    this.beats = beats.map((b,i)=>{
      const lane = b.dir % 4
      const isHold = Math.random()<0.18 && i>2 // 18% long
      return { time:b.time, lane, hold: isHold? 0.55 : undefined }
    }).sort((a,b)=>a.time-b.time)
    this.idx=0
    this.tiles=[]
    console.log(`[Tiles] ${this.beats.length} tiles (4 lanes)`)
  }

  update(songTime:number){
    // spawn
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
    // update y + miss
    for(const t of this.tiles){
      if(!t.active) continue
      const dt = songTime - (t.time - this.travel)
      t.y = dt / this.travel // 0..1 (0 top, hitY at 1)
      if(songTime > t.time + 0.25 && !t.hit){
        t.active=false; t.missed=true
      }
      // long tile: nếu đã hit đầu mà giữ chưa đủ endTime thì giữ
      if(t.type==='hold' && t.hit && t.endTime && songTime < t.endTime){
        t.active=true // giữ active để vẽ hold
      }
    }
    this.tiles = this.tiles.filter(t=> t.active || (t.type==='hold' && t.hit && t.endTime && songTime < t.endTime!))
  }

  // Tap lane 0..3 tại time
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
      // hold: giữ đến endTime
    } else if(res==='Miss'){
      best.active=false; best.missed=true
    }
    return { res, tile:best }
  }

  // Hold check: đang giữ lane
  holding(lane:number, time:number, isHolding:boolean){
    for(const t of this.tiles){
      if(t.type!=='hold' || !t.hit) continue
      if(t.lane!==lane) continue
      if(!isHolding && time < (t.endTime||0)){
        // thả sớm -> Good hoặc Miss
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

  // Vẽ 4 lane + tiles (Magic Tiles 3)
  draw(ctx:CanvasRenderingContext2D, W:number, H:number, songTime:number){
    const lanes=4
    const laneW = W / lanes
    // lane background
    for(let i=0;i<lanes;i++){
      ctx.fillStyle = i%2===0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)'
      ctx.fillRect(i*laneW, 0, laneW, H)
      ctx.strokeStyle='rgba(212,179,106,0.18)'
      ctx.beginPath(); ctx.moveTo(i*laneW,0); ctx.lineTo(i*laneW,H); ctx.stroke()
    }
    // hit line
    const hitY = H * this.hitY
    ctx.strokeStyle='#d4b36a'
    ctx.lineWidth=3
    ctx.beginPath(); ctx.moveTo(0,hitY); ctx.lineTo(W,hitY); ctx.stroke()
    ctx.fillStyle='rgba(212,179,106,0.12)'
    ctx.fillRect(0, hitY-28, W, 56)
    // lane keys
    const keys=['D','F','J','K']
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='700 13px Inter'; ctx.textAlign='center'
    for(let i=0;i<lanes;i++) ctx.fillText(keys[i], i*laneW + laneW/2, hitY+6)

    // tiles
    for(const t of this.tiles){
      if(!t.active && !t.hit) continue
      const x = t.lane*laneW + laneW/2
      const y = t.y * hitY // y 0..hitY
      const isHold = t.type==='hold'
      const h = isHold ? ( (t.endTime! - t.time)/this.travel * hitY ) : 54
      const w = laneW * 0.82
      // tile body
      ctx.fillStyle = t.hit ? 'rgba(212,179,106,0.95)' : (isHold ? '#8a6fdb' : '#0f1428')
      ctx.strokeStyle = t.hit ? '#fff' : '#d4b36a'
      ctx.lineWidth = isHold? 2 : 1.5
      const tileH = isHold ? h : 54
      const tileY = isHold ? (t.y*hitY - h + 28) : (y - 27)
      // rounded rect
      const r=10
      ctx.beginPath()
      // @ts-ignore roundRect
      if(ctx.roundRect) ctx.roundRect(x-w/2, tileY, w, tileH, r)
      else { ctx.rect(x-w/2, tileY, w, tileH) }
      ctx.fill(); ctx.stroke()
      // icon
      if(!isHold){
        ctx.fillStyle=t.hit ? '#1a1204' : '#f5e8c8'
        ctx.font='700 11px Inter'; ctx.textAlign='center'
        ctx.fillText(t.lane%2===0?'♪':'♫', x, tileY + 32)
      } else {
        ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font='600 10px Inter'
        ctx.fillText('HOLD', x, tileY + 20)
        // hold line
        ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(x, tileY+28); ctx.lineTo(x, tileY+h-10); ctx.stroke()
      }
      // time left
      if(t.time > songTime){
        ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='10px Inter'
        ctx.fillText((t.time - songTime).toFixed(2)+'s', x, tileY - 8)
      }
    }
    ctx.textAlign='left'
  }
}
