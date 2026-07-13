export class AudioManager{constructor(audio,onLevel){this.audio=audio;this.onLevel=onLevel;this.stream=null;this.context=null;this.timer=null;this.settings={noiseSuppression:true,echoCancellation:true,autoGainControl:true}}
constraints(deviceId){return{audio:{deviceId:deviceId?{exact:deviceId}:undefined,channelCount:1,echoCancellation:this.settings.echoCancellation,noiseSuppression:this.settings.noiseSuppression,autoGainControl:this.settings.autoGainControl}}}
async start(deviceId){const next=await navigator.mediaDevices.getUserMedia(this.constraints(deviceId));this.stopMeter();const previous=this.stream;this.stream=next;this.startMeter();previous?.getTracks().forEach(t=>t.stop());return next}
startMeter(){try{this.context=new AudioContext();const source=this.context.createMediaStreamSource(this.stream),analyser=this.context.createAnalyser();analyser.fftSize=256;source.connect(analyser);const data=new Uint8Array(analyser.fftSize);this.timer=setInterval(()=>{analyser.getByteTimeDomainData(data);let peak=0;for(const v of data)peak=Math.max(peak,Math.abs(v-128));this.onLevel(Math.min(100,peak*1.8))},80)}catch{}}
stopMeter(){clearInterval(this.timer);this.timer=null;this.context?.close();this.context=null}
stop(){this.stopMeter();this.stream?.getTracks().forEach(t=>t.stop());this.stream=null}
async devices(){const list=await navigator.mediaDevices.enumerateDevices();return{inputs:list.filter(d=>d.kind==='audioinput'),outputs:list.filter(d=>d.kind==='audiooutput')}}
}
