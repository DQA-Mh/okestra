import type { HandState } from '../hand/Tracker'

// Baton tempo: phát hiện downbeat khi baton vung xuống đủ mạnh
export class Baton {
  lastY = 0.5
  lastVy = 0
  onDownbeat: ((vel:number, time:number)=>void) | null = null

  update(right: HandState, now:number){
    const vy = right.vy
    // Downbeat: đang đi xuống (vy âm) và vừa qua ngưỡng, trước đó vy dương hoặc nhỏ
    const isDown = vy < -1.2 && this.lastVy > -0.5
    if(isDown && right.swinging){
      this.onDownbeat?.(Math.abs(vy), now)
    }
    this.lastVy = vy
    this.lastY = right.y
  }
}
