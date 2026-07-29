window.BuahWira=window.BuahWira||{};

const BUAHWIRA_BGM_PATH='./assets/audio/bgm/buahwira-adventure.mp3';
const BUAHWIRA_SLICE_SFX_PATH='./assets/audio/sfx/fruit-slice.wav';
const clampVolume=value=>Math.max(0,Math.min(1,Number(value)||0));

BuahWira.Audio={
  bgm:null,ctx:null,initialized:false,interacted:false,gamePaused:false,masterVolume:.6,
  fruitSliceBuffer:null,sliceSoundLoadPromise:null,sliceSoundLoadAttempted:false,
  initialize(){
    if(this.initialized)return;
    const saved=Number(BuahWira.game.save.masterVolume);
    this.masterVolume=Number.isFinite(saved)&&saved>=0&&saved<=1?saved:.6;
    this.bgm=new Audio(BUAHWIRA_BGM_PATH);
    this.bgm.loop=true;
    this.bgm.preload='auto';
    this.bgm.muted=this.masterVolume===0;
    this.bgm.volume=this.masterVolume;
    this.bgm.addEventListener('canplaythrough',()=>console.info('BuahWira background music is ready'));
    this.bgm.addEventListener('error',()=>console.error('Failed to load BuahWira background music',this.bgm.error));
    this.initialized=true;
  },
  async unlock(){
    this.interacted=true;
    this.initialize();
    if(!this.ctx){this.ctx=new AudioContext()}
    if(this.ctx.state==='suspended'){
      try{await this.ctx.resume()}catch(error){console.error('BuahWira audio context could not resume',error)}
    }
    this.preloadFruitSliceSound();
  },
  async preloadFruitSliceSound(){
    if(this.fruitSliceBuffer)return this.fruitSliceBuffer;
    if(this.sliceSoundLoadPromise)return this.sliceSoundLoadPromise;
    if(!this.ctx)return null;
    this.sliceSoundLoadAttempted=true;
    this.sliceSoundLoadPromise=fetch(BUAHWIRA_SLICE_SFX_PATH)
      .then(response=>{
        if(!response.ok)throw new Error(`Failed to load fruit slice sound: ${response.status} ${BUAHWIRA_SLICE_SFX_PATH}`);
        return response.arrayBuffer();
      })
      .then(buffer=>this.ctx.decodeAudioData(buffer))
      .then(buffer=>{
        this.fruitSliceBuffer=buffer;
        console.info('BuahWira fruit slice sound loaded successfully',{path:BUAHWIRA_SLICE_SFX_PATH});
        return buffer;
      })
      .catch(error=>{
        console.error('Unable to load BuahWira fruit slice sound',{path:BUAHWIRA_SLICE_SFX_PATH,error});
        return null;
      });
    return this.sliceSoundLoadPromise;
  },
  playFruitSliceSound(){
    if(!this.interacted||this.masterVolume<=0||!this.ctx||this.ctx.state!=='running'||!this.fruitSliceBuffer)return false;
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();
    source.buffer=this.fruitSliceBuffer;
    source.playbackRate.value=.94+Math.random()*.12;
    gain.gain.value=this.masterVolume*.9;
    source.connect(gain).connect(this.ctx.destination);
    source.start(0);
    return true;
  },
  async setMasterVolume(value){
    this.initialize();
    this.masterVolume=clampVolume(value);
    BuahWira.game.save.masterVolume=this.masterVolume;
    BuahWira.Storage.write(BuahWira.game.save);
    this.bgm.volume=this.masterVolume;
    this.bgm.muted=this.masterVolume===0;
    if(this.masterVolume===0){this.pauseBgm();return}
    if(this.interacted&&!this.gamePaused)await this.playBgm();
  },
  async ensureBgmPlaying({reason='unknown'}={}){
    this.initialize();
    if(!this.interacted||this.gamePaused||this.masterVolume<=0)return false;
    this.bgm.muted=false;
    this.bgm.volume=this.masterVolume;
    if(!this.bgm.paused)return true;
    try{
      await this.bgm.play();
      console.info('BuahWira BGM resumed successfully',{reason,volume:this.bgm.volume,paused:this.bgm.paused,currentTime:this.bgm.currentTime,currentSrc:this.bgm.currentSrc});
      return true;
    }catch(error){
      console.error('Failed to resume BuahWira BGM',{reason,error});
      return false;
    }
  },
  async playBgm(){return this.ensureBgmPlaying({reason:'play-bgm'})},
  pauseBgm(){this.bgm?.pause()},
  async resumeBgm(reason='resume'){this.gamePaused=false;return this.ensureBgmPlaying({reason})},
  play(freq=440,duration=.09,type='sine'){
    if(!this.interacted||this.masterVolume<=0)return;
    this.unlock().then(()=>{
      if(!this.ctx||this.ctx.state!=='running')return;
      const oscillator=this.ctx.createOscillator(),gain=this.ctx.createGain();
      oscillator.frequency.value=freq;oscillator.type=type;
      gain.gain.setValueAtTime(.065*this.masterVolume,this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+duration);
      oscillator.connect(gain).connect(this.ctx.destination);oscillator.start();oscillator.stop(this.ctx.currentTime+duration);
    })
  },
  playEffect(name){
    if(name==='slice')return this.playFruitSliceSound();
    const tones={button:[390,.05,'triangle'],spawn:[430,.08,'sine'],correct:[820,.16,'sine'],wrong:[180,.18,'sawtooth'],complete:[760,.2,'triangle']};
    this.play(...(tones[name]||tones.button));
  },
  diagnostics(){return {bgmExists:Boolean(this.bgm),bgmPaused:this.bgm?.paused,bgmMuted:this.bgm?.muted,bgmVolume:this.bgm?.volume,bgmReadyState:this.bgm?.readyState,bgmCurrentSrc:this.bgm?.currentSrc,sliceSoundLoaded:Boolean(this.fruitSliceBuffer),sliceSoundPath:BUAHWIRA_SLICE_SFX_PATH,audioContextState:this.ctx?.state,masterVolume:this.masterVolume,userInteracted:this.interacted}}
};

document.addEventListener('pointerdown',event=>{if(event.target.closest('button,input,#field'))BuahWira.Audio.unlock()},{passive:true});
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;BuahWira.Audio.unlock();BuahWira.Audio.playEffect('button')});
document.addEventListener('visibilitychange',()=>{if(document.hidden){BuahWira.Audio.gamePaused=true;BuahWira.Audio.pauseBgm()}else if(BuahWira.game.state==='playing'){BuahWira.Audio.resumeBgm()}});
