'use strict';

const $ = id => document.getElementById(id);
const stage = $('stage'), paper = $('paper'), canvas = $('room');
const ctx = canvas.getContext('2d', {alpha:false});
const lookButtons = [...$('controls').querySelectorAll('[data-view]')];
const targets = [...$('targets').querySelectorAll('button')];
let debug = new URLSearchParams(location.search).get('debug') === '1';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = n => Math.max(0,Math.min(1,n));
const mix = (a,b,t) => a + (b - a) * t;
const mixPoint = (a,b,t) => a.map((v,i) => mix(v,b[i],t));
const ease = t => clamp(t) ** 2 * (3 - 2 * clamp(t));
const writingTime = 1.12;
const examTime = examMinutes * 60;
const views = {
  left: {yaw:-.84,pitch:.01},front: {yaw:0,pitch:0},
  right: {yaw:.84,pitch:.025},up: {yaw:0,pitch:.92},
  desk: {yaw:0,pitch:-1.45,y:.35,z:1.16}
};
const camera = {yaw:0,pitch:0,x:0,y:0,z:0,lean:0,walking:0,roll:0};
const sheetPlane = {left:-.59,right:.59,y:-.566,near:.75,far:1.79,width:540,height:464};
const run = {mode:'title',course:0,view:'front',elapsed:0,remaining:examTime,health:3};
let lastPaper = '', lastFrame = performance.now(), ambientDue = 0;
let stageWidth = 576, stageHeight = 324, focal = 267;
let audio, master, noiseBuffer;
let muted = false;
try { muted = localStorage.getItem('night-final-sound') === 'off'; } catch {}

new ResizeObserver(([entry]) => {
  const {width,height} = entry.contentRect;
  if (!width || !height) return;
  stageWidth = width;
  stageHeight = height;
  canvas.width = Math.max(108,Math.round(canvas.height * width / height));
  ctx.imageSmoothingEnabled = false;
}).observe(stage);

function write(element,text) {
  if (element.textContent !== text) element.textContent = text;
}
function course() { return courses[run.course]; }
function inSitting() { return run.mode === 'running' || run.mode === 'practical'; }
function focused() {
  const target = targetView();
  return Math.abs(camera.yaw - target.yaw) < .036 && Math.abs(camera.pitch - target.pitch) < .035 &&
    Math.abs(camera.x-target.x) < .036 && Math.abs(camera.z-target.z) < .036;
}
function deskReady() {
  return run.view === 'desk' && !run.room?.crossing && !pumpAway() && focused();
}
function initSound() {
  if (muted) return;
  try {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      master = audio.createGain();
      master.gain.value = .38;
      master.connect(audio.destination);
      noiseBuffer = audio.createBuffer(1,Math.floor(audio.sampleRate * 2.4),audio.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    audio.resume().catch(() => {});
  } catch {}
}
function soundOutput(level,length,pan,delay) {
  if (muted || !audio || audio.state !== 'running') return null;
  const when = audio.currentTime + delay, amp = audio.createGain();
  const panner = audio.createStereoPanner();
  amp.gain.setValueAtTime(.0001,when);
  amp.gain.exponentialRampToValueAtTime(Math.max(.0002,level),when + Math.min(.08,length*.23));
  amp.gain.exponentialRampToValueAtTime(.0001,when + length);
  panner.pan.value = pan;
  amp.connect(panner).connect(master);
  return {when,amp};
}
function tone(hz,length,level,pan=0,shape='triangle',slide=hz,delay=0) {
  const out = soundOutput(level,length,pan,delay);
  if (!out) return;
  const osc = audio.createOscillator();
  osc.type = shape;
  osc.frequency.setValueAtTime(hz,out.when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20,slide),out.when + length);
  osc.connect(out.amp);
  osc.start(out.when);
  osc.stop(out.when + length + .02);
}
function noise(hz,length,level,pan=0,delay=0,filterType='bandpass') {
  const out = soundOutput(level,length,pan,delay);
  if (!out) return;
  const src = audio.createBufferSource(), filter = audio.createBiquadFilter();
  src.buffer = noiseBuffer;
  src.loop = true;
  filter.type = filterType;
  filter.frequency.value = hz;
  filter.Q.value = .9;
  src.connect(filter).connect(out.amp);
  src.start(out.when);
  src.stop(out.when + length + .02);
}
function soundToggle() {
  muted = !muted;
  try { localStorage.setItem('night-final-sound',muted ? 'off' : 'on'); } catch {}
  if (muted) audio?.suspend().catch(() => {});
  else { ambientDue = 0; initSound(); }
  write($('sound'),muted ? 'Sound off' : 'Sound on');
  $('sound').setAttribute('aria-pressed',String(!muted));
}
const roots = [54,44,64,40,58];
function ambience(time) {
  if (!audio || audio.state !== 'running' || muted || time < ambientDue) return;
  const root = roots[run.course];
  ambientDue = time + 2.8;
  tone(root,3.65,.24,0,'sine',root*.96);
  tone(root*1.49,3.3,.082,-.38,'triangle',root*1.5,.14);
  tone(root*2.12,2.4,.066,.4,'sine',root*2.04,.39);
  noise([1300,280,1600,480,800][run.course],3.2,.12,0,0,'lowpass');
}
function omenPower() {
  if (!run.omen) return 0;
  const progress = clamp((run.elapsed-run.omen.start)/run.omen.duration);
  return progress > 0 && progress < 1 ? Math.sin(progress*Math.PI)**1.35 : 0;
}
function tickOmen() {
  if (run.elapsed < run.nextOmen) return;
  const room = run.room;
  const busy = run.threat || roomAlert() || room?.submerged > 0 ||
    (room?.id === 'abyss' && room.age < room.surgingUntil) ||
    (room?.crossing && bogWake(room).phase !== 'calm') || room?.circuit?.pull > .65;
  if (busy) { run.nextOmen = run.elapsed+2.8; return; }
  const level = run.course;
  run.omen = {start:run.elapsed,duration:2.5+level*.33};
  run.nextOmen = run.elapsed+[21,17,14,11,8.6][level]+(run.page%3)*1.5;
  switch (level) {
    case 0:
      tone(118,.65,.092,0,'triangle',73);
      noise(980,.9,.13,0,.14,'lowpass');
      break;
    case 1:
      tone(63,1.76,.22,-.68,'sine',35);
      noise(520,1.18,.20,-.62,.23,'lowpass');
      break;
    case 2:
      noise(675,1.72,.20,.55,0,'lowpass');
      noise(1020,.73,.21,.39,.96,'bandpass');
      tone(91,1.54,.13,.63,'sine',72,.31);
      break;
    case 3:
      noise(410,1.05,.31,.38,0,'lowpass');
      tone(72,1.4,.21,.27,'triangle',33);
      noise(238,.30,.23,.55,.47,'lowpass');
      break;
    case 4:
      tone(59,2.5,.23,-.44,'sine',38);
      tone(61,2.5,.19,.44,'sine',39);
      noise(720,1.64,.21,0,.48,'lowpass');
      break;
  }
}
const mareApproaches = [
  {view:'front',pan:0,tell:'HALL · A hoof drags against tile.'},
  {view:'left',pan:-.85,tell:'WINDOW · A hoof hits the sill.'},
  {view:'right',pan:.85,tell:'SERVICE DOOR · The latch starts to rattle.'}
];
function warning(pan,near=0) {
  const level = .31+.23*near;
  for (let i=0;i<3;i++) {
    tone(125,.24,level,pan,'triangle',46,i*.24);
    noise(580,.16,level,pan,i*.24,'lowpass');
  }
}
function showPanel(html,screen) {
  $('overlay').dataset.screen = screen;
  $('panel').innerHTML = html;
  $('overlay').hidden = false;
  $('panel').querySelector('button')?.focus({preventScroll:true});
}
function title() {
  Object.assign(run,{mode:'title',course:0,view:'front',elapsed:0,trial:null,threat:null,retreat:null,cinematic:null,shift:null,room:null,omen:null});
  Object.assign(camera,{yaw:-.29,pitch:.025,x:0,y:0,z:0,lean:0,walking:0,roll:0});
  $('caption').hidden = true;
  showPanel(`<div class="title-number">ROOM 013 <span aria-hidden="true">///</span> 23:42</div>
    <h1 class="wordmark">NIGHT<br>FINAL</h1>
    <p class="title-copy">Five papers on the desk. Something in the hall has the answer key.</p>
    <div class="title-actions"><button class="primary" id="begin">${debug ? 'Debug run ›' : 'Sit the final ›'}</button>
    <button id="alternate-run">${debug ? 'Sit the final' : 'Debug run'}</button>
    <button id="instructions">How to play</button><button id="study">Study the syllabus</button></div>
    <div class="title-footer">${debug ? 'SKIP QUESTIONS · PRACTICALS ACTIVE' : 'FIRST-PERSON EXAM HORROR'}</div>`,'title');
  $('begin').onclick = start;
  $('alternate-run').onclick = () => { debug = !debug; start(); };
  $('instructions').onclick = showHelp;
  $('study').onclick = showStudy;
  renderUI();
}
function showHelp() {
  showPanel(`<div class="eyebrow">Examination rules</div><h1>Read first</h1>
    <p>Five subjects. Twelve questions each. Get at least nine right per subject. The ink is permanent, and a fourth miss ends the sitting.</p>
    <p>Use W/A/D/S or the arrows to look around. At the desk, use 1–4 to mark an answer and Enter to advance. Listen for threats while you write.</p>
    <p>E walks to and works the flood pump. On the aisle, E stops or resumes your walk. S returns to the desk. R checks the pit or the ceiling in the last two subjects. The on-screen controls work with a mouse or touch.</p>
    <p>Turn in each packet to start its practical. Finish its objective to move on. The whole sitting has an 18-minute limit. Esc pauses.</p>
    <button class="primary" id="back">Return to title</button>`,'help');
  $('back').onclick = title;
}
function showStudy() {
  showPanel(`<div class="eyebrow">Before the sitting</div><h1>Syllabus</h1>
    <p>Five packets of field notes are stapled to the cover.</p>
    <div class="notes">${courses.map(c => `<details><summary>${c.number} · ${c.title}</summary>
      <p>${c.study}</p></details>`).join('')}</div>
    <button class="primary" id="back">Return to title</button>`,'study');
  $('back').onclick = title;
}
function start() {
  Object.assign(run,{mode:'running',course:0,page:0,elapsed:0,remaining:examTime,courseAge:0,
    view:'front',health:3,pending:0,answers:courses.map(c => Array(c.questions.length).fill(null)),
    exam:makeExam(),misses:0,grades:[],trial:null,threat:null,retreat:null,nextThreat:8.8,mareRoute:0,
    hitUntil:0,notice:'',noticeUntil:0,shift:null,cinematic:null,room:null,omen:null,nextOmen:14.5,loss:''});
  Object.assign(camera,{yaw:0,pitch:0,x:0,y:0,z:0,lean:0,walking:0,roll:0});
  lastPaper = '';
  ambientDue = 0;
  initSound();
  noise(420,.7,.3,0,0,'lowpass');
  $('overlay').hidden = true;
  $('caption').hidden = true;
  write($('pause'),'Pause');
  prepareQuestion();
  notice(course().intro,5.6);
  renderUI();
}
function notice(text,seconds) {
  run.notice = text;
  run.noticeUntil = run.elapsed + seconds;
}
function look(view) {
  if (run.mode !== 'running' || (run.room?.crossing && view !== 'pit' && view !== 'desk')) return;
  if (view === 'desk' && returnFromPump()) { renderUI(); return; }
  if (run.view === view) return;
  run.view = view;
  noise(940,.19,.14,views[view]?.yaw ?? -.44);
  renderUI();
}
function question() { return run.exam[run.course][run.page]; }
function prepareQuestion() {
  if (debug) run.answers[run.course][run.page] = question().correct;
}
function markAnswer(index) {
  if (run.mode !== 'running' || !deskReady() || roomBlock() || index < 0 || index >= question().options.length) return;
  const entries = run.answers[run.course];
  if (entries[run.page] !== null) return;
  if (bogNoise('The Walker heard your pencil.')) { renderUI(); return; }
  entries[run.page] = index;
  run.pending = writingTime;
  if (index !== question().correct) run.misses++;
  for (let i=0;i<3;i++) noise(1630,.16,.18,.15,i*.16);
  renderUI();
}
function nextQuestion() {
  if (run.mode !== 'running' || !deskReady() || run.pending || roomBlock() ||
      run.answers[run.course][run.page] === null) return;
  if (run.page + 1 === questionsPerCourse) {
    startPractical();
    return;
  }
  run.page++;
  prepareQuestion();
  roomPageTurn();
  noise(900,.25,.22,.14);
  renderUI();
}
function skipQuestions() {
  if (!debug || run.mode !== 'running') return;
  const packet = run.exam[run.course];
  run.answers[run.course] = packet.map(q => q.correct);
  run.page = packet.length-1;
  run.pending = 0;
  run.misses = 0;
  skipRoomCheckpoints();
  startPractical();
}
function tickExam(dt) {
  run.courseAge += dt;
  if (run.pending > 0) {
    run.pending = Math.max(0,run.pending - dt);
    if (!run.pending) {
      const good = run.answers[run.course][run.page] === question().correct;
      tone(good?392:196,.22,.24,.12,'triangle',good?523:98);
      if (run.misses > allowedMisses) { finish('grade'); return; }
    }
  }
  if (run.room) { tickRoom(dt); return; }
  tickMare(dt);
}
function loseComposure(message,pan) {
  if (run.hitUntil > run.elapsed) return;
  run.hitUntil = run.elapsed+.52;
  run.health = Math.max(debug ? 1 : 0,run.health-1);
  tone(89,.64,.72,pan,'sawtooth',28);
  noise(840,.45,.64,pan);
  notice(message,3.25);
  if (!run.health) { run.loss = message; finish('caught'); }
}
function tickMare(dt) {
  if (run.retreat && run.elapsed >= run.retreat.until) run.retreat = null;
  if (!run.threat && run.elapsed >= run.nextThreat) {
    const approach = mareApproaches[run.mareRoute++ % mareApproaches.length];
    run.threat = {approach,age:0,defense:0,nextWarn:2.35,limit:mix(9.2,6.7,packetProgress())};
    warning(approach.pan);
  }
  if (!run.threat) return;
  const threat = run.threat, approach = threat.approach;
  threat.age += dt;
  const defending = focused() && run.view === approach.view;
  threat.defense = defending ? threat.defense + dt : Math.max(0,threat.defense - dt*1.7);
  if (threat.defense >= 1.35) {
    run.retreat = {approach,progress:threat.age/threat.limit,until:run.elapsed+.95};
    run.threat = null;
    run.nextThreat = run.elapsed+mix(15.8,9.9,packetProgress())+Math.random()*3;
    notice('It backed away.',2.1);
    tone(220,.6,.23,approach.pan,'triangle',48);
  } else if (threat.age >= threat.limit) {
    run.threat = null;
    run.nextThreat = run.elapsed + 10.4;
    loseComposure('The Hollow Mare reached your desk.',approach.pan);
  } else if (threat.age >= threat.nextWarn) {
    warning(approach.pan,threat.age/threat.limit);
    threat.nextWarn += threat.age >= threat.limit*.65 ? 1.05 : 1.8;
  }
}
const shoeNotes = [170,242,340];
const ventLinks = [0b011,0b110,0b100];
const orreryTarget = [.51,.51,.105];
function startPractical() {
  const spec = course().practical;
  run.mode = 'practical';
  run.omen = null;
  run.view = spec.view;
  run.threat = null;
  run.retreat = null;
  run.trial = {spec,time:0,score:0,feedback:'',feedbackUntil:0,held:false};
  const trial = run.trial;
  if (spec.id === 'ward') Object.assign(trial,{
    patterns:[3,4].map(length => Array.from({length},() => Math.floor(Math.random()*3))),
    start:1.75,entered:0,cue:-1,lastCue:-1
  });
  if (spec.id === 'beam') Object.assign(trial,{aim:[.47,.65],aimed:false,lit:false});
  if (spec.id === 'vents') trial.open = [0b001,0b010,0b101,0b111][Math.floor(Math.random()*4)];
  if (spec.id === 'breath') Object.assign(trial,{air:1,seen:false,exposed:0});
  if (spec.id === 'orrery') Object.assign(trial,{moon:[.29,.66,.071],drag:null});
  targets.forEach((button,i) => {
    const labels = spec.id === 'ward' ? ['Left horseshoe','Middle horseshoe','Right horseshoe'] :
      spec.id === 'vents' ? ['Flip vents A and B','Flip vents B and C','Flip vent C'] :
      spec.id === 'orrery' ? ['Shrink the Moon','Enlarge the Moon','Lock the alignment'] :
      ['Hold the cloth'];
    button.textContent = spec.buttons[i] || '';
    button.setAttribute('aria-label',labels[i] || '');
  });
  noise(620,.6,.29,0,0,'lowpass');
  tone(270,.54,.24,0,'triangle',103);
  renderUI();
}
function trialFeedback(text,seconds=1.3) {
  run.trial.feedback = text;
  run.trial.feedbackUntil = run.trial.time + seconds;
}
function wardPlayback(trial) {
  const pattern = trial.patterns[trial.score];
  const time = trial.time - trial.start;
  const beat = Math.floor(time/.67);
  return {cue:time >= 0 && beat < pattern.length && time % .67 < .43 ? pattern[beat] : -1,
    input:time >= pattern.length*.67 + .27};
}
function breathPhase(time) {
  return (time+2.5) % 6.4;
}
function moonMatches(trial) {
  const [x,y,r] = trial.moon, [tx,ty,tr] = orreryTarget;
  return Math.hypot((x-tx)*canvas.width,(y-ty)*canvas.height) <= canvas.height*.024 && Math.abs(r-tr) < .014;
}
function tapPractical(index) {
  const trial = run.trial;
  if (run.mode !== 'practical' || !trial || !focused() || !trial.spec.buttons[index]) return;
  switch (trial.spec.id) {
    case 'ward': {
      if (!wardPlayback(trial).input) return;
      tone(shoeNotes[index],.35,.31,(index-1)*.5,'triangle',shoeNotes[index]*.92);
      trial.pressed = index;
      trial.pressedUntil = trial.time + .21;
      if (trial.patterns[trial.score][trial.entered] !== index) {
        trial.entered = 0;
        trial.start = trial.time + 1.05;
        trialFeedback('Wrong shoe. Watch the same pattern again.',1.6);
        break;
      }
      trial.entered++;
      if (trial.entered === trial.patterns[trial.score].length) {
        trial.score++;
        trial.entered = 0;
        trial.start = trial.time + .93;
        tone(520,.28,.21,0,'triangle',660,.18);
      }
      break;
    }
    case 'vents':
      trial.open ^= ventLinks[index];
      trial.score = [0,1,2].filter(i => !(trial.open & 1 << i)).length;
      noise(1360,.45,.34,.62);
      tone(195,.31,.22,.62,'triangle',64);
      break;
    case 'breath':
      trial.held = true;
      break;
    case 'orrery':
      if (index < 2) {
        trial.moon[2] = Math.max(.046,Math.min(.165,trial.moon[2] + (index ? .017 : -.017)));
        tone(240,.20,.18,(index-.5)*.3,'triangle',120);
      } else if (moonMatches(trial)) trial.score = 1;
      else trialFeedback('Bring the center marks together and match the rims.');
      break;
  }
  if (trial.score >= trial.spec.goal) clearPractical();
  renderUI();
}
function tickPractical(dt) {
  const trial = run.trial;
  trial.time += dt;
  if (trial.spec.id === 'ward') {
    const {cue} = wardPlayback(trial);
    trial.cue = cue;
    if (cue >= 0 && cue !== trial.lastCue) tone(shoeNotes[cue],.41,.31,(cue-1)*.5,'triangle',shoeNotes[cue]*.86);
    trial.lastCue = cue;
  } else if (trial.spec.id === 'beam') {
    trial.lit = trial.aimed && focused() && anglerInBeam(trial);
    trial.score = Math.max(0,trial.score + (trial.lit ? dt : -.23*dt));
  } else if (trial.spec.id === 'breath') {
    const phase = breathPhase(trial.time), facing = phase < 1.95;
    if (facing && !trial.seen) {
      trial.exposed = 0;
      noise(460,.42,.25,0,0,'lowpass');
    } else if (!facing && trial.seen) {
      if (trial.exposed <= .40) {
        trial.score++;
        tone(388,.23,.19,0,'triangle',470);
      } else trialFeedback('It heard you. Be ready when it turns again.',2);
    }
    trial.seen = facing;
    trial.air = clamp(trial.air + (trial.held ? -.34 : .62)*dt);
    if (facing && (!trial.held || trial.air <= 0)) trial.exposed += dt;
  }
  if (trial.score >= trial.spec.goal) clearPractical();
}
function clearPractical() {
  run.grades.push(questionsPerCourse-run.misses);
  run.trial = null;
  tone(392,.7,.26,0,'triangle',295);
  tone(587,.8,.23,0,'sine',247,.24);
  if (run.course + 1 === courses.length) {
    run.mode = 'ending';
    run.view = 'front';
    run.cinematic = {time:0,beat:-1};
    return;
  }
  run.mode = 'shift';
  run.shift = {time:0};
  run.course++;
  run.room = openRoom(course().id);
  run.view = ['front','left','right','front','up'][run.course];
  $('caption').hidden = false;
  write($('caption'),course().shift);
  noise(310,2.1,.65,0,0,'lowpass');
  tone(94,2.2,.38,0,'sawtooth',33);
}
function tickShift(dt) {
  run.shift.time += dt;
  if (run.shift.time < 3.45) return;
  run.shift = null;
  run.mode = 'running';
  run.page = 0;
  run.view = 'desk';
  run.courseAge = 0;
  run.misses = 0;
  run.health = Math.min(3,run.health+1);
  run.nextThreat = run.elapsed + 8.4;
  run.nextOmen = run.elapsed+Math.max(4.3,8.5-run.course*.87);
  $('caption').hidden = true;
  prepareQuestion();
  notice(course().intro,5.1);
}
const reveal = [
  [0.45,'PROCTOR · Put down your pencil.',81],
  [2.50,'',51],
  [5.35,'PROCTOR · I have been here all evening.',59],
  [8.90,'PROCTOR · You were the practical.',41],
  [12.05,'',29]
];
function tickEnding(dt) {
  const shot = run.cinematic;
  shot.time += dt;
  if (shot.time >= 2.3) run.view = 'up';
  const beat = shot.beat + 1;
  if (reveal[beat] && shot.time >= reveal[beat][0]) {
    const [,line,hz] = reveal[beat];
    shot.beat = beat;
    $('caption').hidden = !line;
    write($('caption'),line);
    tone(hz,beat === 1 ? 3.2 : 1.4,.61,0,'sawtooth',hz*.61);
    noise(beat === 1 ? 650 : 300,beat === 1 ? 2.9 : 1.6,.7,0,0,'lowpass');
    if (beat === 1) {
      for (let i=0;i<5;i++) noise(230+i*70,.63,.38,i*.39-.78,i*.27,'lowpass');
      tone(48,3.6,.28,-.25,'sine',31,1.02);
      tone(51,3.4,.21,.25,'sine',32,1.08);
    }
  }
  if (shot.time >= 14.1) finish('clear');
}
function finish(reason) {
  run.mode = 'result';
  run.trial = null;
  run.threat = null;
  $('caption').hidden = true;
  const passed = reason === 'clear';
  const heading = {clear:'Sitting complete',grade:'Subject failed',caught:'Composure lost',time:'Time expired'}[reason];
  const detail = {
    clear:'Your score is recorded. The proctor is still watching.',
    grade:`A fourth missed answer ended ${course().title}. The packet required nine correct answers.`,
    caught:run.loss,
    time:'The clock reached midnight before the final was turned in.'
  }[reason];
  const gradebook = courses.map((c,i) => {
    const finished = run.grades[i];
    const graded = run.answers[i].filter(answer => answer !== null).length;
    const score = finished !== undefined ? `${finished}/12 · Cleared` :
      i === run.course ? `${graded-run.misses}/${graded} marked · ${reason === 'grade' ? 'Failed' : 'Unfinished'}` : 'Unopened';
    return `<li><span>${c.title}</span><strong>${score}</strong></li>`;
  }).join('');
  showPanel(`<div class="eyebrow">${debug?'Debug sitting':'Final record'} · Room 013</div>
    <h1>${heading}</h1><p>${detail}</p><ul class="gradebook">${gradebook}</ul>
    <button class="primary" id="restart">New sitting</button> <button id="back">Title</button>`,'result');
  $('restart').onclick = start;
  $('back').onclick = title;
  if (passed) tone(96,2,.21,0,'sine',46);
  renderUI();
}
function pause() {
  if (run.mode === 'paused') {
    run.mode = run.pausedMode;
    $('overlay').hidden = true;
    write($('pause'),'Pause');
    ambientDue = 0;
    initSound();
  } else if (inSitting()) {
    run.pausedMode = run.mode;
    run.mode = 'paused';
    if (run.trial) {
      run.trial.held = false;
      run.trial.drag = null;
    }
    audio?.suspend().catch(() => {});
    write($('pause'),'Resume');
    showPanel('<div class="eyebrow">Clock suspended</div><h1>Paused</h1><button class="primary" id="resume">Resume sitting</button>','pause');
    $('resume').onclick = pause;
  }
  renderUI();
}
function paperUI() {
  const answer = run.answers[run.course][run.page], q = question();
  const pending = run.pending > 0;
  const block = roomBlock();
  const key = [run.course,run.page,answer,pending,block].join('/');
  if (key !== lastPaper) {
    lastPaper = key;
    write($('packet'),course().title);
    write($('item'),`${run.page+1} / ${questionsPerCourse}`);
    write($('question'),q.prompt);
    const plate = paperPlates[run.course];
    $('plate').hidden = plate.item !== run.page;
    $('plate').innerHTML = $('plate').hidden ? '' :
      `<svg viewBox="${plate.viewBox}" role="img" aria-label="${plate.label}">${plate.drawing}</svg>`;
    $('answers').replaceChildren(...q.options.map((option,i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${i+1}. ${option.text}`;
      button.disabled = answer !== null || Boolean(block);
      if (answer !== null && !pending) {
        if (answer === i) button.dataset.mark = i === q.correct ? 'right' : 'wrong';
        else if (i === q.correct) button.dataset.mark = 'key';
      }
      button.onclick = () => markAnswer(i);
      return button;
    }));
    write($('paper-note'),`Packet ${course().number} · ${allowedMisses} misses allowed`);
    write($('next'),run.page+1 === questionsPerCourse ? 'Turn in packet' : 'Next ›');
    $('next').disabled = answer === null || pending || Boolean(block);
    write($('paper-status'),block || (pending ? 'Ink drying…' : answer === null ? 'Make one mark.' :
      answer === q.correct ? '✓ Correct' : '× Miss recorded'));
  }
  $('writing').value = answer === null ? 0 : 1 - run.pending / writingTime;
}
function renderTrial() {
  const trial = run.trial;
  const {spec} = trial;
  write($('trial-title'),spec.title);
  write($('trial-brief'),spec.brief);
  let message = '', lit = 0;
  switch (spec.id) {
    case 'ward': {
      const playing = wardPlayback(trial);
      message = `${trial.score} / 2 patterns · ${playing.input ?
        `Your turn · ${trial.entered} / ${trial.patterns[trial.score].length}` : 'Watch the shoes'}`;
      const cue = trial.pressedUntil > trial.time ? trial.pressed : trial.cue;
      if (cue >= 0) lit = 1 << cue;
      break;
    }
    case 'beam':
      message = `${Math.floor(100*clamp(trial.score/spec.goal))}% repelled · ${trial.lit ? 'Keep it in the beam' : 'Find the lure'}`;
      break;
    case 'vents':
      message = ['A','B','C'].map((name,i) => `${name} ${trial.open & 1 << i ? 'OPEN' : 'SEALED'}`).join(' · ');
      lit = trial.open;
      break;
    case 'breath':
      message = `${trial.score} / 3 stares · ${trial.seen ? 'HOLD' : breathPhase(trial.time) > 5.65 ? 'TURNING' : 'BREATHE'} · Air ${Math.floor(trial.air*100)}%`;
      if (trial.seen) lit = 1;
      break;
    case 'orrery':
      message = moonMatches(trial) ? 'TOTALITY · Lock the alignment' : 'Aim with drag or arrows · 1 / 2 resize · 3 lock';
      break;
  }
  const showFeedback = trial.feedbackUntil > trial.time && !(spec.id === 'orrery' && moonMatches(trial));
  write($('trial-score'),showFeedback ? trial.feedback : message);
  targets.forEach((button,i) => {
    button.toggleAttribute('data-lit',Boolean(lit & 1<<i));
    button.toggleAttribute('data-held',Boolean(trial.held));
    button.toggleAttribute('data-ready',spec.id === 'orrery' && i === 2 && moonMatches(trial));
    button.disabled = spec.id === 'ward' && !wardPlayback(trial).input;
  });
}
function clockText(time) {
  const n = Math.ceil(time);
  return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
}
function renderUI() {
  const running = run.mode === 'running', practical = run.mode === 'practical';
  const cinema = run.mode === 'shift' || run.mode === 'ending';
  stage.classList.toggle('in-run',running || practical || run.mode === 'paused');
  stage.classList.toggle('cinema',cinema);
  stage.classList.toggle('hit',running && run.hitUntil > run.elapsed);
  stage.classList.toggle('debug-run',debug);
  stage.dataset.course = course().id;
  stage.dataset.view = run.view;
  stage.dataset.trial = practical ? run.trial.spec.id : '';
  stage.style.setProperty('--course',course().accent);
  if (!running) stage.removeAttribute('data-defense');
  $('trial').hidden = !practical;
  $('debug-skip').hidden = !debug || !running;
  $('controls').hidden = !running || Boolean(run.room?.crossing);
  paper.inert = !running || !deskReady();
  renderRoomControls(running);
  if (running) paperUI();
  if (practical) renderTrial();
  if (!running && !practical && run.mode !== 'paused') {
    write($('cue'),'');
    return;
  }
  write($('course'),`${course().number} · ${course().title}`);
  write($('clock'),debug ? 'Debug · Clock off' : clockText(run.remaining));
  $('clock').classList.toggle('low',run.remaining < 60);
  write($('marks'),`${run.answers[run.course].filter(a => a !== null).length} / 12 marked`);
  write($('misses'),`${run.misses} / ${allowedMisses} missed`);
  $('misses').classList.toggle('danger',run.misses >= allowedMisses);
  write($('nerve'),`Composure ${run.health} / 3`);
  $('nerve').classList.toggle('danger',run.health === 1);
  const approach = run.threat?.approach;
  const alert = running ? approach?.view || roomAlert() : '';
  const confronting = running && approach && run.view === approach.view && focused();
  stage.toggleAttribute('data-defense',Boolean(confronting && run.threat.defense > 0));
  const cue = running && approach ? confronting ?
    `Keep your eyes on it · ${Math.floor(clamp(run.threat.defense/1.35)*100)}%` :
    approach.tell : running ? (run.hitUntil > run.elapsed ? run.notice :
      roomCue() || (run.noticeUntil > run.elapsed ? run.notice : '')) : '';
  write($('cue'),cue);
  $('cue').toggleAttribute('data-alert',Boolean(alert));
  for (const button of lookButtons) {
    const view = button.dataset.view;
    button.setAttribute('aria-pressed',String(view === run.view));
    button.toggleAttribute('data-alert',view === alert);
  }
}
function screenInput(event) {
  const box = canvas.getBoundingClientRect();
  return [clamp((event.clientX-box.left)/box.width),clamp((event.clientY-box.top)/box.height)];
}
function aim(event) {
  if (run.mode !== 'practical') return;
  const trial = run.trial;
  if (trial.spec.id === 'beam') {
    trial.aim = screenInput(event);
    trial.aimed = true;
  } else if (trial.spec.id === 'orrery' && trial.drag === event.pointerId) {
    const [x,y] = screenInput(event);
    trial.moon[0] = x;
    trial.moon[1] = y;
  }
}
canvas.addEventListener('pointerdown',event => {
  if (run.mode !== 'practical' || event.button !== 0 || !['beam','orrery'].includes(run.trial.spec.id)) return;
  canvas.setPointerCapture(event.pointerId);
  if (run.trial.spec.id === 'orrery') run.trial.drag = event.pointerId;
  aim(event);
});
canvas.addEventListener('pointermove',aim);
for (const type of ['pointerup','pointercancel','lostpointercapture']) {
  canvas.addEventListener(type,() => { if (run.trial) run.trial.drag = null; });
}
targets.forEach((button,i) => {
  button.onclick = () => { if (run.trial?.spec.id !== 'breath') tapPractical(i); };
  button.addEventListener('pointerdown',event => {
    if (run.trial?.spec.id !== 'breath' || event.button !== 0) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    tapPractical(i);
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) {
    button.addEventListener(type,() => { if (run.trial) run.trial.held = false; });
  }
});
const bindings = {KeyA:'left',ArrowLeft:'left',KeyW:'front',ArrowUp:'front',
  KeyD:'right',ArrowRight:'right',KeyS:'desk',ArrowDown:'desk'};
const arrows = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1],
  KeyA:[-1,0],KeyD:[1,0],KeyW:[0,-1],KeyS:[0,1]};
window.addEventListener('keydown',event => {
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  const code = event.code;
  if (code === 'Escape' && !event.repeat) {
    if (run.mode === 'title' && $('overlay').dataset.screen !== 'title') title();
    else pause();
    return;
  }
  if (!inSitting()) return;
  const digit = /^Digit[1-4]$/.test(code) ? Number(code.at(-1))-1 : -1;
  if (run.mode === 'practical') {
    const trial = run.trial, id = trial.spec.id;
    const delta = arrows[code];
    if (delta && (id === 'beam' || id === 'orrery')) {
      const target = id === 'beam' ? trial.aim : trial.moon;
      target[0] = clamp(target[0] + delta[0]*.034*canvas.height/canvas.width);
      target[1] = clamp(target[1] + delta[1]*.034);
      trial.aimed = true;
      event.preventDefault();
    } else if (id === 'breath' ? code === 'Space' : digit >= 0) {
      event.preventDefault();
      if (!event.repeat) tapPractical(id === 'breath' && code === 'Space' ? 0 : digit);
    }
    return;
  }
  if (debug && code === 'KeyN') { event.preventDefault(); if (!event.repeat) skipQuestions(); }
  else if (roomKey(event)) { event.preventDefault(); }
  else if (bindings[code]) { event.preventDefault(); look(bindings[code]); }
  else if (digit >= 0) { event.preventDefault(); if (!event.repeat) markAnswer(digit); }
  else if (code === 'Enter' && run.view === 'desk') { event.preventDefault(); if (!event.repeat) nextQuestion(); }
});
window.addEventListener('keyup',event => {
  if (event.code === 'Space' && run.trial?.spec.id === 'breath') run.trial.held = false;
});
window.addEventListener('blur',() => {
  if (run.trial) {
    run.trial.held = false;
    run.trial.drag = null;
  }
});
document.addEventListener('visibilitychange',() => { if (document.hidden && inSitting()) pause(); });
for (const type of ['selectstart','dragstart','contextmenu']) stage.addEventListener(type,event => event.preventDefault());
for (const button of lookButtons) if (button.id !== 'inspect') button.onclick = () => look(button.dataset.view);
$('sound').onclick = soundToggle;
$('pause').onclick = pause;
$('next').onclick = nextQuestion;
$('debug-skip').onclick = skipQuestions;
write($('sound'),muted ? 'Sound off' : 'Sound on');
$('sound').setAttribute('aria-pressed',String(!muted));

function frame(now) {
  const dt = Math.min(.10,Math.max(0,(now-lastFrame)/1000));
  lastFrame = now;
  if (inSitting()) {
    run.elapsed += dt;
    if (!debug) run.remaining = Math.max(0,examTime-run.elapsed);
    if (!run.remaining) finish('time');
    else if (run.mode === 'running') {
      tickExam(dt);
      if (run.mode === 'running') tickOmen();
    }
    else tickPractical(dt);
    ambience(run.elapsed);
  } else if (run.mode === 'shift') tickShift(dt);
  else if (run.mode === 'ending') tickEnding(dt);

  if (run.mode !== 'paused') {
    const view = targetView(), blend = 1 - Math.exp(-dt*(reducedMotion ? 18 : 6.5));
    camera.yaw = mix(camera.yaw,view.yaw,blend);
    camera.pitch = mix(camera.pitch,view.pitch,blend);
    camera.x = mix(camera.x,view.x,blend);
    camera.y = mix(camera.y,view.y ?? 0,blend);
    camera.z = mix(camera.z,view.z,blend);
    camera.lean = mix(camera.lean,view.reading ? 1 : 0,blend);
    const walking = run.room?.crossing || (pumpInTransit() && !run.room.trip.stopped);
    camera.walking = mix(camera.walking,walking ? 1 : 0,blend);
    camera.roll = reducedMotion ? 0 : run.shift ? Math.sin(run.shift.time*26)*.021*(1-ease(run.shift.time/3.3)) :
      run.cinematic && run.cinematic.time > 2.4 && run.cinematic.time < 5 ?
        Math.sin(run.cinematic.time*28)*.027 : 0;
  }
  const circuit = run.room?.circuit, shortScreen = stageHeight <= 450;
  const readingFocal = Math.min(shortScreen ? 184 : circuit ? 198 : 224,canvas.width*(circuit ? .56 : .62));
  const roomFocal = run.mode === 'ending' ? 267 : Math.min(267,canvas.width*.96);
  focal = mix(mix(roomFocal,readingFocal,camera.lean),Math.min(207,canvas.width*.72),camera.walking);
  renderUI();
  renderScene(now/1000);
  requestAnimationFrame(frame);
}
