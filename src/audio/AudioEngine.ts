export class AudioEngine {
  ctx: AudioContext | null = null
  t0 = 0
  playing = false
  el: HTMLAudioElement | null = null

  constructor() {
    try { this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)() } catch {}
  }
  get time() {
    if (!this.playing) return 0
    if (this.el && !this.el.paused) return this.el.currentTime
    if (this.ctx) return this.ctx.currentTime - this.t0
    return performance.now()/1000 - this.t0
  }
  async play(url?: string) {
    if (this.ctx?.state === 'suspended') await this.ctx.resume()
    if (url) {
      if (!this.el) { this.el = new Audio(url); this.el.crossOrigin='anonymous' }
      this.el.currentTime = 0; await this.el.play(); this.playing = true; return
    }
    this.t0 = this.ctx ? this.ctx.currentTime : performance.now()/1000
    this.playing = true
  }
  stop(){ this.playing=false; this.el?.pause() }
}
