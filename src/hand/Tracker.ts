export type HandState = { x:number, y:number, vx:number, vy:number, swinging:boolean, dir:number }

export class Tracker {
  video: HTMLVideoElement
  canvas: HTMLCanvasElement
  onHands: ((right: HandState, left: HandState)=>void) | null = null
  private landmarker: any = null
  private running = false
  private sxR=0.5
  private syR=0.5
  private pxR=0.5
  private pyR=0.5
  private txR=0.5
  private tyR=0.5
  private sxL=0.5
  private syL=0.5
  private pxL=0.5
  private pyL=0.5
  private txL=0.5
  private tyL=0.5
  private last = performance.now()
  private mx=0.5
  private my=0.5
  private mDown=false

  constructor(video: HTMLVideoElement, canvas: HTMLCanvasElement){
    this.video=video; this.canvas=canvas
    const c=document.getElementById('c') as HTMLCanvasElement
    if(c){
      c.addEventListener('mousemove', e=>{ const r=c.getBoundingClientRect(); this.mx=(e.clientX-r.left)/r.width; this.my=1-(e.clientY-r.top)/r.height })
      c.addEventListener('mousedown', ()=>this.mDown=true)
      window.addEventListener('mouseup', ()=>this.mDown=false)
      c.addEventListener('touchmove', e=>{ const t=e.touches[0]; const r=c.getBoundingClientRect(); this.mx=(t.clientX-r.left)/r.width; this.my=1-(t.clientY-r.top)/r.height; this.mDown=true }, {passive:true})
      window.addEventListener('touchend', ()=>this.mDown=false)
    }
  }

  async start(){
    if(this.running) return
    this.running=true
    try{
      const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const resolver = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm')
      this.landmarker = await HandLandmarker.createFromOptions(resolver, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' },
        numHands: 2, runningMode: 'VIDEO', minHandDetectionConfidence: 0.6, minTrackingConfidence: 0.6
      })
      console.log('[Tracker] Tasks Vision ready')
    }catch(e){ console.warn('[Tracker] fallback mouse', e) }
    requestAnimationFrame(this.loop)
  }

  stop(){ this.running=false }

  private loop = ()=>{
    if(!this.running) return
    const now=performance.now()
    const dt=Math.max(0.001,(now-this.last)/1000)
    this.last=now

    // MediaPipe detect
    if(this.landmarker && this.video.readyState>=2){
      const res=this.landmarker.detectForVideo(this.video, now)
      const ctx=this.canvas.getContext('2d')!
      ctx.clearRect(0,0,this.canvas.width,this.canvas.height)
      ctx.drawImage(this.video,0,0,this.canvas.width,this.canvas.height)
      if(res.landmarks?.length){
        ctx.fillStyle='#00ff88'
        for(const hand of res.landmarks){
          for(const p of hand){ ctx.beginPath(); ctx.arc(p.x*this.canvas.width, p.y*this.canvas.height, 3,0,Math.PI*2); ctx.fill() }
          // phân biệt phải/trái qua handedness
        }
        // Lấy 2 tay: tay đầu là phải (mirror)
        const h0=res.landmarks[0]
        const h1=res.landmarks[1]
        if(h0){ this.txR=1-h0[0].x; this.tyR=1-h0[0].y }
        if(h1){ this.txL=1-h1[0].x; this.tyL=1-h1[0].y } else if(!h1 && this.mDown){ this.txL=this.mx; this.tyL=this.my }
      }
    } else if(this.mDown){
      // fallback chuột cho tay phải
      this.txR=this.mx; this.tyR=this.my
      // tay trái giữ nguyên hoặc theo chuột khi Shift
    }

    // smooth
    this.sxR += (this.txR - this.sxR)*Math.min(1, dt*12)
    this.syR += (this.tyR - this.syR)*Math.min(1, dt*12)
    this.sxL += (this.txL - this.sxL)*Math.min(1, dt*12)
    this.syL += (this.tyL - this.syL)*Math.min(1, dt*12)
    const vxR=(this.sxR-this.pxR)/dt, vyR=(this.syR-this.pyR)/dt
    const vxL=(this.sxL-this.pxL)/dt, vyL=(this.syL-this.pyL)/dt
    this.pxR=this.sxR; this.pyR=this.syR; this.pxL=this.sxL; this.pyL=this.syL

    const mk = (x:number,y:number,vx:number,vy:number):HandState=>{
      const mag=Math.hypot(vx,vy)
      const swing=mag>0.35
      let dir=0
      if(swing){ if(Math.abs(vx)>Math.abs(vy)) dir=vx>0?3:2; else dir=vy>0?1:0 }
      return { x,y, vx, vy, swinging: swing, dir }
    }
    const right=mk(this.sxR,this.syR,vxR,vyR)
    const left=mk(this.sxL,this.syL,vxL,vyL)
    this.onHands?.(right, left)
    requestAnimationFrame(this.loop)
  }

  getMouse(){ return { x:this.mx, y:this.my, down:this.mDown } }
}
