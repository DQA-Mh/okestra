export class Score {
  score=0; combo=0; maxCombo=0; perfect=0; good=0; miss=0; audience=50
  onHit?: (r:string,s:number,c:number)=>void
  onAud?: (v:number)=>void
  hit(r:'Perfect'|'Good'|'Miss'){
    if(r==='Perfect'){ this.perfect++; this.combo++; this.score+=100+Math.floor(this.combo*0.5); this.audience=Math.min(100,this.audience+2) }
    else if(r==='Good'){ this.good++; this.combo++; this.score+=50; this.audience=Math.min(100,this.audience+0.8) }
    else { this.miss++; this.combo=0; this.audience=Math.max(0,this.audience-5) }
    this.maxCombo=Math.max(this.maxCombo,this.combo)
    this.onHit?.(r,this.score,this.combo)
    this.onAud?.(this.audience)
  }
  get acc(){ const t=this.perfect+this.good+this.miss; return t?((this.perfect+this.good*0.5)/t*100):0 }
  get rank(){ const a=this.acc; if(a>=95&&this.miss===0) return 'S'; if(a>=85) return 'A'; if(a>=70) return 'B'; if(a>=50) return 'C'; return 'D' }
  reset(){ this.score=0; this.combo=0; this.maxCombo=0; this.perfect=0; this.good=0; this.miss=0; this.audience=50 }
}
