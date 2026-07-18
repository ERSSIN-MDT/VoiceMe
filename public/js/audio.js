export class AudioManager{constructor(audio,onLevel){this.audio=audio;this.onLevel=onLevel;this.stream=null;this.rawStream=null;this.context=null;this.timer=null;this.settings={noiseSuppression:true,echoCancellation:true,autoGainControl:true};this.destination=null}
constraints(deviceId){return{audio:{deviceId:deviceId?{exact:deviceId}:undefined,channelCount:1,echoCancellation:this.settings.echoCancellation,noiseSuppression:this.settings.noiseSuppression,autoGainControl:this.settings.autoGainControl}}}
async start(deviceId){
  const next=await navigator.mediaDevices.getUserMedia(this.constraints(deviceId));
  this.stop();
  this.rawStream=next;
  try{
    this.context=new AudioContext();
    if(this.context.state==='suspended')await this.context.resume();
    const source=this.context.createMediaStreamSource(this.rawStream);
    let lastNode=source;
    if(this.settings.noiseSuppression){
      const hp=this.context.createBiquadFilter();
      hp.type='highpass';
      hp.frequency.value=85;
      lastNode.connect(hp);
      lastNode=hp;
    }
    let gateGain=null;
    if(this.settings.noiseSuppression){
      gateGain=this.context.createGain();
      lastNode.connect(gateGain);
      lastNode=gateGain;
    }
    if(this.settings.autoGainControl){
      const comp=this.context.createDynamicsCompressor();
      comp.threshold.value=-24;
      comp.knee.value=30;
      comp.ratio.value=12;
      comp.attack.value=0.003;
      comp.release.value=0.25;
      lastNode.connect(comp);
      lastNode=comp;
    }
    this.destination=this.context.createMediaStreamDestination();
    lastNode.connect(this.destination);
    this.stream=this.destination.stream;
    const analyser=this.context.createAnalyser();
    analyser.fftSize=256;
    source.connect(analyser);
    const data=new Uint8Array(analyser.fftSize);
    let gateOpen=true;
    this.timer=setInterval(()=>{
      if(!this.rawStream)return;
      analyser.getByteTimeDomainData(data);
      let peak=0;
      for(const v of data)peak=Math.max(peak,Math.abs(v-128));
      const level=Math.min(100,peak*1.8);
      this.onLevel(level);
      if(gateGain){
        const isSilent=peak<2.5;
        if(isSilent&&gateOpen){
          gateGain.gain.setTargetAtTime(0.01,this.context.currentTime,0.05);
          gateOpen=false;
        }else if(!isSilent&&!gateOpen){
          gateGain.gain.setTargetAtTime(1.0,this.context.currentTime,0.02);
          gateOpen=true;
        }
      }
    },80);
  }catch{
    this.stream=next;
    this.startMeter();
  }
  return this.stream;
}
startMeter(){try{this.context=new AudioContext();const source=this.context.createMediaStreamSource(this.stream),analyser=this.context.createAnalyser();analyser.fftSize=256;source.connect(analyser);const data=new Uint8Array(analyser.fftSize);this.timer=setInterval(()=>{analyser.getByteTimeDomainData(data);let peak=0;for(const v of data)peak=Math.max(peak,Math.abs(v-128));this.onLevel(Math.min(100,peak*1.8))},80)}catch{}}
stopMeter(){clearInterval(this.timer);this.timer=null;this.context?.close().catch(()=>{});this.context=null}
stop(){this.stopMeter();this.rawStream?.getTracks().forEach(t=>t.stop());this.rawStream=null;this.stream=null}
async devices(){const list=await navigator.mediaDevices.enumerateDevices();return{inputs:list.filter(d=>d.kind==='audioinput'),outputs:list.filter(d=>d.kind==='audiooutput')}}
}
