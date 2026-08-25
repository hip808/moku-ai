const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={mode:"play",k:[.5,.5,.5,.5],cv:[0,0,0,0],gate:[false,false],cvOut:[0,0],gateOut:[false,false],bpm:120,step:0,lastTick:0,selectedPort:null,cables:[],audio:null,currentApp:"generative",generated:null};

const appPresets={
 generative:{name:"GENERATIVE SEQUENCER",desc:"4-step probability sequencer with CV modulation.",labels:["PROB","TRANS","CHAOS","SLEW"],type:"generative"},
 random:{name:"CORRELATED RANDOM",desc:"Buchla-style correlated random voltages with clock, chaos and slew.",labels:["RATE","CHAOS","CORREL","SLEW"],type:"random"},
 lfo:{name:"DUAL LFO",desc:"Two modulation oscillators with related phase and CV control.",labels:["RATE 1","RATE 2","PHASE","SHAPE"],type:"lfo"},
 quantizer:{name:"CV QUANTIZER",desc:"Musical CV quantizer with scale and transpose control.",labels:["SCALE","TRANS","HOLD","GLIDE"],type:"quantizer"}
};

function showMode(mode){state.mode=mode;$$('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$$('.mode-panel').forEach(p=>p.classList.remove('active'));$('#'+mode+'Mode').classList.add('active');setTimeout(drawCables,80)}
$$('.mode').forEach(b=>b.onclick=()=>showMode(b.dataset.mode));$('#openCreate').onclick=()=>showMode('create');

function setKnob(i,v){v=Math.max(0,Math.min(1,v));state.k[i]=v;const el=$(`.knob[data-k="${i}"] .pointer`);el.style.transform=`translateX(-50%) rotate(${-135+v*270}deg)`;$('#k'+(i+1)+'Value').textContent=Math.round(v*100)}
$$('.knob').forEach(knob=>{const i=+knob.dataset.k;let startY,startV;const down=e=>{e.preventDefault();startY=e.clientY??e.touches?.[0]?.clientY;startV=state.k[i];knob.setPointerCapture?.(e.pointerId)};const move=e=>{if(startY==null)return;const y=e.clientY??e.touches?.[0]?.clientY;setKnob(i,startV+(startY-y)/150)};const up=()=>{startY=null};knob.addEventListener('pointerdown',down);knob.addEventListener('pointermove',move);knob.addEventListener('pointerup',up);knob.addEventListener('pointercancel',up)});
state.k.forEach((v,i)=>setKnob(i,v));

$('#randomBtn').onclick=()=>state.k.forEach((_,i)=>setKnob(i,Math.random()));
$('#panicBtn').onclick=()=>{state.gateOut=[false,false];updateMeters();stopAudio()};
$('#homeBtn').onclick=()=>loadApp('generative');

$('#cv1src').oninput=e=>{state.cv[0]=e.target.value/10;$('#cv1Read').textContent=state.cv[0].toFixed(2)+'V'};
$('#cv2src').oninput=e=>{state.cv[1]=e.target.value/10;$('#cv2Read').textContent=state.cv[1].toFixed(2)+'V'};
$('#bpm').oninput=e=>{state.bpm=+e.target.value;$('#bpmRead').textContent=state.bpm+' BPM'};
$('#manualGate').onpointerdown=()=>state.gate[0]=true;$('#manualGate').onpointerup=()=>state.gate[0]=false;$('#manualGate').onpointercancel=()=>state.gate[0]=false;

function portCenter(el){const r=el.getBoundingClientRect(),wrap=$('.rack-wrap').getBoundingClientRect();return{x:r.left+r.width/2-wrap.left,y:r.top+r.height/2-wrap.top}}
function drawCables(){const svg=$('#cableLayer');svg.innerHTML='';const wrap=$('.rack-wrap');svg.setAttribute('viewBox',`0 0 ${wrap.clientWidth} ${wrap.clientHeight}`);for(const c of state.cables){const a=document.querySelector(`[data-port="${c.a}"]`),b=document.querySelector(`[data-port="${c.b}"]`);if(!a||!b)continue;const p1=portCenter(a),p2=portCenter(b),dx=Math.abs(p2.x-p1.x)*.42+45;const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M ${p1.x} ${p1.y} C ${p1.x+dx} ${p1.y+30}, ${p2.x-dx} ${p2.y+30}, ${p2.x} ${p2.y}`);path.setAttribute('fill','none');path.setAttribute('stroke',c.color||'#27e1b5');path.setAttribute('stroke-width','6');path.setAttribute('stroke-linecap','round');path.setAttribute('opacity','.88');svg.appendChild(path)}}
window.addEventListener('resize',drawCables);
$$('.jack').forEach(j=>j.onclick=()=>{if(j.dataset.kind==='output')return;if(!state.selectedPort){state.selectedPort=j;j.classList.add('selected');return}if(state.selectedPort===j){j.classList.remove('selected');state.selectedPort=null;return}const a=state.selectedPort,b=j;if(a.dataset.kind==='source'&&b.dataset.kind==='input'){state.cables.push({a:a.dataset.port,b:b.dataset.port,color:['#27e1b5','#6fd3ff','#a984ff','#ffad66'][state.cables.length%4]});a.classList.add('patched');b.classList.add('patched')}state.selectedPort.classList.remove('selected');state.selectedPort=null;drawCables()});
$('#clearPatch').onclick=()=>{state.cables=[];$$('.jack').forEach(j=>j.classList.remove('patched','selected'));state.selectedPort=null;drawCables()};

function patched(sourceSignal,inputName){return state.cables.some(c=>document.querySelector(`[data-port="${c.a}"]`)?.dataset.signal===sourceSignal && document.querySelector(`[data-port="${c.b}"]`)?.dataset.input===inputName)}
function getInput(name){if(name==='cv1')return patched('cv1','cv1')?state.cv[0]:0;if(name==='cv2')return patched('cv2','cv2')?state.cv[1]:0;if(name==='gate1')return (patched('gate','gate1')&&state.gate[0])||patched('clock','gate1');return 0}

function loadApp(key){state.currentApp=key;const a=appPresets[key];$('#appName').textContent=a.name;$('#appDesc').textContent=a.desc;a.labels.forEach((x,i)=>$('#k'+(i+1)+'Label').textContent=x);$('#cpuText').textContent='CPU '+Math.round(12+Math.random()*24)+'%';showMode('play')}

function tick(now){const period=60000/state.bpm;if(now-state.lastTick<period)return;state.lastTick=now;const a=appPresets[state.currentApp]||appPresets.generative;const cv1=getInput('cv1');
 if(a.type==='generative'){const p=Math.min(1,Math.max(0,state.k[state.step]+cv1/20));state.gateOut[0]=Math.random()<p;state.gateOut[1]=state.step===0;state.cvOut[0]=(state.step-1.5)+state.k[1]*2;state.cvOut[1]=(Math.random()*2-1)*5*state.k[2];state.step=(state.step+1)%4}
 if(a.type==='random'){const corr=state.k[2];const base=(Math.random()*2-1)*5*(.2+state.k[1]*.8);state.cvOut[0]=base;state.cvOut[1]=base*corr+(Math.random()*2-1)*5*(1-corr);state.gateOut[0]=true;state.gateOut[1]=Math.random()<state.k[1]}
 if(a.type==='lfo'){const t=now/1000;state.cvOut[0]=Math.sin(t*(.2+state.k[0]*7))*5;state.cvOut[1]=Math.sin(t*(.2+state.k[1]*7)+state.k[2]*Math.PI*2)*5;state.gateOut[0]=state.cvOut[0]>0;state.gateOut[1]=state.cvOut[1]>0}
 if(a.type==='quantizer'){const v=cv1;const semi=Math.round(v*12);const major=[0,2,4,5,7,9,11],oct=Math.floor(semi/12),s=((semi%12)+12)%12,q=major.reduce((x,y)=>Math.abs(y-s)<Math.abs(x-s)?y:x,0);state.cvOut[0]=oct+q/12+(state.k[1]-.5)*2;state.cvOut[1]=state.cvOut[0]+.333;state.gateOut[0]=true}
 updateMeters();setTimeout(()=>{state.gateOut=[false,false];updateMeters()},90)}

function updateMeters(){$('#cvOut1').textContent=state.cvOut[0].toFixed(2)+'V';$('#cvOut2').textContent=state.cvOut[1].toFixed(2)+'V';$('#gateOut1Text').textContent=state.gateOut[0]?'HIGH':'LOW';$('#gateOut2Text').textContent=state.gateOut[1]?'HIGH':'LOW';$('#gateOut1').classList.toggle('hot',state.gateOut[0]);$('#gateOut2').classList.toggle('hot',state.gateOut[1])}

const canvas=$('#displayCanvas'),ctx=canvas.getContext('2d');
function drawDisplay(t){const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#020808';ctx.fillRect(0,0,w,h);const a=appPresets[state.currentApp]||appPresets.generative;
 if(a.type==='generative'){for(let i=0;i<4;i++){const x=42+i*90,hh=40+state.k[i]*110;ctx.fillStyle=i===state.step?'#27e1b5':'#2a4c56';ctx.fillRect(x,h-25-hh,55,hh);ctx.fillStyle='#a8c2ca';ctx.font='13px sans-serif';ctx.fillText(String(i+1),x+24,h-8)}}
 if(a.type==='random'){ctx.strokeStyle='#a984ff';ctx.lineWidth=2;ctx.beginPath();for(let x=0;x<w;x++){const y=h/2+Math.sin(x*.035+t*.0015)*30+Math.sin(x*.09+t*.0008)*22;x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();ctx.fillStyle='#27e1b5';ctx.font='15px sans-serif';ctx.fillText('CORRELATION '+Math.round(state.k[2]*100)+'%',18,28)}
 if(a.type==='lfo'){for(let c=0;c<2;c++){ctx.strokeStyle=c?'#6fd3ff':'#27e1b5';ctx.beginPath();for(let x=0;x<w;x++){const y=h/2+Math.sin((x/w)*Math.PI*5+t*.001*(c?2:1)+c*state.k[2]*Math.PI*2)*45*(c?-.8:1);x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}}
 if(a.type==='quantizer'){ctx.fillStyle='#27e1b5';ctx.font='bold 38px sans-serif';const notes=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];const n=((Math.round(state.cvOut[0]*12)%12)+12)%12;ctx.fillText(notes[n],35,95);ctx.font='17px monospace';ctx.fillStyle='#9fbdc5';ctx.fillText('OUT '+state.cvOut[0].toFixed(3)+' V',35,135)}}
function loop(t){tick(t);drawDisplay(t);requestAnimationFrame(loop)}requestAnimationFrame(loop);

function startAudio(){if(state.audio)return;const ac=new(window.AudioContext||window.webkitAudioContext)(),osc=ac.createOscillator(),g=ac.createGain(),f=ac.createBiquadFilter();osc.type='sawtooth';g.gain.value=.06;f.type='lowpass';f.frequency.value=1200;osc.connect(f).connect(g).connect(ac.destination);osc.start();state.audio={ac,osc,g,f};$('#audioBtn').textContent='AUDIO OFF'}function stopAudio(){if(!state.audio)return;state.audio.ac.close();state.audio=null;$('#audioBtn').textContent='AUDIO ON'}$('#audioBtn').onclick=()=>state.audio?stopAudio():startAudio();

$$('[data-prompt]').forEach(b=>b.onclick=()=>$('#prompt').value=b.dataset.prompt);
function inferPrompt(p){p=p.toLowerCase();let type=p.includes('lfo')?'lfo':p.includes('quant')?'quantizer':p.includes('random')||p.includes('buchla')?'random':'generative';const base=appPresets[type];let labels=[...base.labels];if(p.includes('rate'))labels[0]='RATE';if(p.includes('chaos'))labels[1]='CHAOS';if(p.includes('correlation'))labels[2]='CORREL';if(p.includes('slew'))labels[3]='SLEW';return{type,name:base.name,summary:base.desc,labels,mapping:[['K1',labels[0]],['K2',labels[1]],['K3',labels[2]],['K4',labels[3]],['CV1',p.includes('cv1')?'modulation':'optional'],['GATE IN 1',p.includes('clock')?'clock':'trigger'],['CV OUT 1','primary CV'],['CV OUT 2','related CV']]}}

$('#generateBtn').onclick=async()=>{const steps=$$('.step');steps.forEach((s,i)=>{s.classList.remove('done');s.classList.toggle('active',i===0)});$('#proposal').className='proposal';$('#proposal').innerHTML='<div class="proposal-placeholder">Understanding your idea…</div>';for(let i=0;i<4;i++){await new Promise(r=>setTimeout(r,350));steps[i].classList.remove('active');steps[i].classList.add('done');if(steps[i+1])steps[i+1].classList.add('active')}state.generated=inferPrompt($('#prompt').value);const g=state.generated;$('#proposal').innerHTML=`<div class="eyebrow">READY TO INSTALL</div><h2>${g.name}</h2><div class="summary">${g.summary}</div><div class="mapping">${g.mapping.map(([a,b])=>`<div><small>${a}</small><b>${b}</b></div>`).join('')}</div><span class="code-chip">MOKU HAL</span><span class="code-chip">Sandboxed</span><span class="code-chip">Validated</span>`;$('#installBtn').disabled=false};
$('#installBtn').onclick=()=>{if(!state.generated)return;const g=state.generated;appPresets[g.type]={...appPresets[g.type],labels:g.labels};loadApp(g.type)};
loadApp('generative');