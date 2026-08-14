/* Shared lightweight sound-effects library — synthesized with Web Audio, no audio files. */
(function(){
  let ctx=null;
  let muted=localStorage.getItem('sfx_muted')==='1';

  function getCtx(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return null;
      ctx=new AC();
    }
    if(ctx.state==='suspended')ctx.resume();
    return ctx;
  }

  ['pointerdown','keydown','touchstart'].forEach(evt=>{
    document.addEventListener(evt,()=>{ getCtx(); },{once:true,passive:true});
  });

  function tone(freq,dur,type,startGain,when){
    if(muted)return;
    const c=getCtx();
    if(!c)return;
    const t0=c.currentTime+(when||0);
    const osc=c.createOscillator();
    const gain=c.createGain();
    osc.type=type||'sine';
    osc.frequency.setValueAtTime(freq,t0);
    gain.gain.setValueAtTime(startGain!=null?startGain:0.18,t0);
    gain.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    osc.connect(gain);gain.connect(c.destination);
    osc.start(t0);osc.stop(t0+dur+0.02);
  }

  function sweep(freqFrom,freqTo,dur,type,startGain){
    if(muted)return;
    const c=getCtx();
    if(!c)return;
    const t0=c.currentTime;
    const osc=c.createOscillator();
    const gain=c.createGain();
    osc.type=type||'sine';
    osc.frequency.setValueAtTime(freqFrom,t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20,freqTo),t0+dur);
    gain.gain.setValueAtTime(startGain!=null?startGain:0.18,t0);
    gain.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    osc.connect(gain);gain.connect(c.destination);
    osc.start(t0);osc.stop(t0+dur+0.02);
  }

  const SFX={
    click(){ tone(600,0.06,'square',0.12); },
    coin(){ tone(988,0.07,'square',0.15); tone(1319,0.09,'square',0.14,0.05); },
    point(){ tone(880,0.08,'triangle',0.16); },
    hit(){ tone(140,0.12,'sawtooth',0.2); },
    hurt(){ sweep(300,80,0.22,'sawtooth',0.2); },
    jump(){ sweep(300,600,0.12,'square',0.14); },
    land(){ tone(120,0.06,'sine',0.15); },
    swoosh(){ sweep(500,120,0.15,'sine',0.1); },
    powerup(){ sweep(400,1200,0.25,'square',0.15); },
    success(){ tone(523,0.1,'triangle',0.16); tone(659,0.1,'triangle',0.15,0.09); tone(784,0.16,'triangle',0.15,0.18); },
    fail(){ tone(220,0.18,'sawtooth',0.18); tone(165,0.26,'sawtooth',0.16,0.14); },
    win(){ tone(523,0.1,'triangle',0.17); tone(659,0.1,'triangle',0.16,0.1); tone(784,0.1,'triangle',0.16,0.2); tone(1047,0.22,'triangle',0.17,0.3); },
    lose(){ sweep(400,80,0.4,'sawtooth',0.18); },
    tick(){ tone(1000,0.03,'square',0.08); },
    select(){ tone(700,0.05,'square',0.12); tone(900,0.05,'square',0.1,0.04); },
    error(){ tone(160,0.15,'square',0.16); },
    catch(){ tone(700,0.05,'triangle',0.14); tone(1000,0.08,'triangle',0.15,0.05); },
    levelup(){ tone(659,0.09,'triangle',0.16); tone(880,0.09,'triangle',0.16,0.08); tone(1175,0.18,'triangle',0.17,0.16); },
    isMuted(){ return muted; },
    setMuted(v){ muted=!!v; localStorage.setItem('sfx_muted',muted?'1':'0'); },
    toggleMute(){ SFX.setMuted(!muted); return muted; },
    getContext(){ return getCtx(); },
  };

  window.SFX=SFX;

  function mountToggle(){
    const btn=document.getElementById('sfx-toggle');
    if(!btn||btn.dataset.sfxMounted)return;
    btn.dataset.sfxMounted='1';
    btn.textContent=muted?'🔇':'🔊';
    btn.setAttribute('aria-label','Toggle sound');
    btn.addEventListener('click',()=>{
      const m=SFX.toggleMute();
      btn.textContent=m?'🔇':'🔊';
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',mountToggle);
  }else{
    mountToggle();
  }

  document.addEventListener('click',e=>{
    const el=e.target.closest('button,canvas,.back-btn');
    if(!el||el.id==='sfx-toggle')return;
    SFX.click();
  },true);
})();
