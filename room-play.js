'use strict';

const waterAtPaper = .70;
const rootKeys = ['KeyQ','KeyE','KeyZ','KeyC'];
const rootLife = 9.5;
const bogStations = [[0,0],[-2.14,2.15],[1.96,3.24],[.18,4.56]];
const bridgePlans = [
  [0b101,0b011,0b110,0b100],
  [0b011,0b100,0b110,0b010],
  [0b110,0b001,0b010,0b101]
];
const circuitPaths = [
  [0,1,4,5,8],
  [0,3,4,7,8],
  [0,1,2,5,4,3,6,7,8]
];
const ports = [
  {bit:1,opposite:4,dx:0,dy:-1,tip:[30,0],name:'north'},
  {bit:2,opposite:8,dx:1,dy:0,tip:[60,30],name:'east'},
  {bit:4,opposite:1,dx:0,dy:1,tip:[30,60],name:'south'},
  {bit:8,opposite:2,dx:-1,dy:0,tip:[0,30],name:'west'}
];
const bridgeButtons = [...$('bridge-steps').querySelectorAll('button')];
const rootButtons = [...$('root-knots').querySelectorAll('button')];
const circuitButtons = [...$('circuit-grid').querySelectorAll('button')];

function openRoom(id) {
  switch (id) {
    case 'abyss':
      return {id,age:0,water:.30,strokeAt:-1,surgeAt:7,surgingUntil:0,submerged:0};
    case 'fungal':
      return {id,age:0,roots:[null,null,null,null],cutAt:[-5,-5,-5,-5],spawnAt:2.5,lastRoot:-1};
    case 'bog':
      return {id,station:0,crossing:null,failed:new Set()};
    case 'eclipse':
      return {id,age:0,circuit:newCircuit(0),lift:.12,anchors:0};
    default:
      return null;
  }
}
function roomBlock() {
  const room = run.room;
  if (room?.id === 'abyss' && room.water >= waterAtPaper) return 'Paper submerged. Work the pump.';
  if (room?.id === 'fungal' && room.roots.some(root => root?.age >= 6.65)) return 'Roots cover the ink. Cut a knot.';
  if (room?.crossing) return 'Cross to the next packet.';
  if (room?.circuit) return 'Restore power to the desk tether.';
  return '';
}
function packetProgress() {
  return run.page/(questionsPerCourse-1);
}
function pump() {
  const room = run.room;
  if (run.mode !== 'running' || room?.id !== 'abyss' || room.age < room.strokeAt+.40) return;
  room.strokeAt = room.age;
  room.water = Math.max(.12,room.water-.185);
  room.submerged = 0;
  tone(131,.27,.27,.25,'triangle',65);
  noise(680,.38,.31,.3,0,'lowpass');
  renderUI();
}
function tickFlood(room,dt) {
  room.age += dt;
  const pressure = packetProgress();
  if (room.age >= room.surgeAt) {
    room.surgingUntil = room.age+mix(1.9,2.65,pressure);
    room.surgeAt += mix(13.3,8.1,pressure);
    noise(560,2.2,.51,-.69,0,'lowpass');
    tone(76,1.16,.26,-.7,'sine',43);
  }
  const rate = room.age < room.surgingUntil ? mix(.093,.14,pressure) : mix(.033,.054,pressure);
  room.water = clamp(room.water+rate*dt);
  room.submerged = room.water > .94 ? room.submerged+dt : 0;
  if (room.submerged >= 1.95) {
    room.water = .54;
    room.submerged = 0;
    loseComposure('The Angler lunged over the submerged desk.',-.65);
  }
}
function cutRoot(index) {
  const room = run.room;
  if (run.mode !== 'running' || room?.id !== 'fungal' || !room.roots[index] || !focused()) return;
  room.roots[index] = null;
  room.cutAt[index] = room.age;
  noise(1700,.26,.28,index%2 ? .58 : -.58);
  tone(312,.21,.18,index%2 ? .58 : -.58,'triangle',101);
  renderUI();
}
function tickRoots(room,dt) {
  room.age += dt;
  const pressure = packetProgress();
  for (const [index,root] of room.roots.entries()) {
    if (!root) continue;
    root.age += dt*mix(.93,1.57,pressure);
    if (root.age < rootLife) continue;
    room.roots[index] = null;
    room.cutAt[index] = room.age;
    loseComposure('The Bloom released spores across the page.',index%2 ? .70 : -.70);
    if (run.mode !== 'running') return;
  }
  if (room.age < room.spawnAt || room.roots.filter(Boolean).length >= (run.page >= 7 ? 3 : 2)) return;
  const open = room.roots.map((root,i) => !root && i !== room.lastRoot ? i : -1).filter(i => i >= 0);
  const index = open[Math.floor(Math.random()*open.length)];
  room.roots[index] = {age:0};
  room.lastRoot = index;
  room.spawnAt = room.age+mix(6.9,2.85,pressure);
  noise(1420,.66,.28,index%2 ? .76 : -.76);
  tone(189,.32,.14,0,'triangle',93,.15);
}
function bridgeOrigin(station) {
  const [x,z] = bogStations[station];
  return [x,z+1.19];
}
function bridgeHeading(station) {
  const [x,z] = bridgeOrigin(station), [tx,tz] = bridgeOrigin(station+1);
  const length = Math.hypot(tx-x,tz-z);
  return {x,z,dx:(tx-x)/length,dz:(tz-z)/length,length};
}
function bridgeCell(station,row,lane) {
  const {x,z,dx,dz,length} = bridgeHeading(station);
  const distance = length*(row+1)/(bridgePlans[station].length+1);
  return [x+dx*distance+dz*(lane-1)*.72,z+dz*distance-dx*(lane-1)*.72];
}
function plankSupported(station,row,lane) {
  return Boolean(bridgePlans[station][row] & (1<<lane));
}
function beginCrossing(room) {
  room.crossing = {path:[],startedAt:run.elapsed,readyAt:run.elapsed+.65,fallUntil:0,failLane:null,lastWake:-1};
  noise(340,.65,.45,0,0,'lowpass');
}
function bogWake(room) {
  if (!room.crossing || room.station === 0) return {phase:'calm',mask:0,cycle:0};
  const late = room.station === 2;
  const age = run.elapsed-room.crossing.startedAt, period = late ? 4.35 : 5.55;
  const cycle = Math.floor(age/period), time = age%period;
  const mask = (late ? [0b011,0b110,0b101] : [0b001,0b100,0b010])[cycle%3];
  const warning = late ? 1.72 : 2.65, crest = warning+1.0;
  const phase = time < warning || time >= crest+1.10 ? 'calm' : time < crest ? 'warning' : 'washed';
  return {phase,mask,cycle};
}
function stepBridge(lane) {
  const room = run.room, crossing = room?.crossing;
  if (run.mode !== 'running' || !crossing || run.elapsed < crossing.readyAt ||
      crossing.path.length >= bridgePlans[room.station].length) return;
  if (lane === -1) {
    if (!crossing.path.length) return;
    crossing.path.pop();
    crossing.readyAt = run.elapsed+.45;
    noise(430,.18,.24,0,0,'lowpass');
    return;
  }
  const row = crossing.path.length;
  const board = `${room.station}/${row}/${lane}`;
  if (Math.abs((crossing.path.at(-1) ?? 1)-lane) > 1) return;
  if (room.failed.has(board)) return;
  const wake = bogWake(room);
  const washed = wake.phase === 'washed' && (wake.mask & (1<<lane));
  if (washed || !plankSupported(room.station,row,lane)) {
    crossing.fallUntil = run.elapsed+.68;
    crossing.readyAt = crossing.fallUntil;
    crossing.failLane = lane;
    if (!washed) room.failed.add(board);
    loseComposure(washed ? 'The wake pulled you off the plank.' : 'A broken board dropped you into the peat.',(lane-1)*.48);
    return;
  }
  crossing.path.push(lane);
  crossing.readyAt = run.elapsed+.47;
  noise(495,.24,.26,(lane-1)*.48,0,'lowpass');
  tone(92,.20,.13,(lane-1)*.48,'triangle',54);
}
function tickBridge(room) {
  if (!room.crossing) return;
  const wake = bogWake(room);
  if (wake.phase === 'warning' && wake.cycle !== room.crossing.lastWake) {
    room.crossing.lastWake = wake.cycle;
    noise(375,1.18,.43,0,0,'lowpass');
    tone(117,.34,.20,0,'triangle',57,.18);
  }
  if (room.crossing.path.length < bridgePlans[room.station].length ||
      run.elapsed < room.crossing.readyAt) return;
  room.station++;
  room.crossing = null;
  notice('Packet recovered. Put it on the desk.',2.7);
  tone(328,.33,.23,0,'triangle',439);
}
function rotatePorts(mask) {
  return ((mask<<1)|(mask>>3))&15;
}
function portBetween(from,to) {
  return ports.find(p => p.dx === to%3-from%3 && p.dy === Math.floor(to/3)-Math.floor(from/3)).bit;
}
function newCircuit(index) {
  const route = circuitPaths[index], masks = [3,5,10,6,12,5,9,10,3];
  for (const [i,cell] of route.entries()) {
    const enter = i === 0 ? 8 : portBetween(cell,route[i-1]);
    const exit = i === route.length-1 ? 2 : portBetween(cell,route[i+1]);
    masks[cell] = enter|exit;
  }
  // Each board is built from a complete route, then rotated into its starting state.
  for (const [cell,turns] of [[0,1],[1,1],[3,2],[4,1],[5,3],[7,1],[8,1]]) {
    for (let turn=0;turn<turns;turn++) masks[cell] = rotatePorts(masks[cell]);
  }
  return {index,masks,powered:[],complete:false,releasedAt:0,pull:0,warned:false};
}
function poweredRoute(circuit) {
  const powered = [];
  let cell = 0, entry = 8;
  while (!powered.includes(cell) && (circuit.masks[cell]&entry)) {
    powered.push(cell);
    const exit = circuit.masks[cell]^entry;
    if (cell === 8 && exit === 2) return {powered,complete:true};
    const port = ports.find(p => p.bit === exit);
    const x = cell%3+port.dx, y = Math.floor(cell/3)+port.dy;
    if (x<0 || x>2 || y<0 || y>2) break;
    cell = y*3+x;
    entry = port.opposite;
  }
  return {powered,complete:false};
}
function rotateCircuit(index) {
  const room = run.room, circuit = room?.circuit;
  if (run.mode !== 'running' || !circuit || circuit.complete || !focused()) return;
  circuit.masks[index] = rotatePorts(circuit.masks[index]);
  Object.assign(circuit,poweredRoute(circuit));
  noise(800,.13,.16,(index%3-1)*.4);
  tone(177+24*circuit.powered.length,.18,.21,0,'triangle',124);
  if (circuit.complete) {
    room.anchors++;
    circuit.releasedAt = room.age+.85;
    tone(330,.62,.31,0,'triangle',494);
    noise(420,.42,.27,0,0,'lowpass');
  }
  renderCircuit();
}
function tickTether(room,dt) {
  room.age += dt;
  const circuit = room.circuit, floating = circuit && !circuit.complete;
  if (floating && circuit.index > 0) {
    const connected = circuit.powered.length/circuitPaths[circuit.index].length;
    circuit.pull += dt*(circuit.index === 1 ? .028 : .046)*(1-.48*connected);
    if (circuit.pull >= .72 && !circuit.warned) {
      circuit.warned = true;
      tone(82,1.16,.44,0,'sawtooth',34);
      noise(460,.78,.30,0,0,'lowpass');
    }
    if (circuit.pull >= 1) {
      circuit.pull = .10;
      circuit.warned = false;
      loseComposure('The rift dragged the desk into a ceiling beam.',0);
    }
  }
  const height = floating ? .15+.41*circuit.pull+Math.sin(room.age*2.1)*.065 : 0;
  room.lift = mix(room.lift,height,1-Math.exp(-dt*5));
  if (room.circuit?.complete && room.age >= room.circuit.releasedAt) {
    room.circuit = null;
    notice('Tether locked. The paper is down.',2.7);
  }
}
function tickRoom(dt) {
  const room = run.room;
  switch (room?.id) {
    case 'abyss': tickFlood(room,dt); break;
    case 'fungal': tickRoots(room,dt); break;
    case 'bog': tickBridge(room); break;
    case 'eclipse': tickTether(room,dt); break;
  }
}
function roomPageTurn() {
  const room = run.room;
  if (room?.id === 'bog' && run.page%3 === 0) beginCrossing(room);
  if (room?.id === 'eclipse' && run.page%4 === 0) {
    room.circuit = newCircuit(run.page/4);
    noise(490,.7,.40,0,0,'lowpass');
    tone(139,.6,.31,0,'sawtooth',41);
  }
}
function skipRoomCheckpoints() {
  const room = run.room;
  if (room?.id === 'bog') {
    room.crossing = null;
    room.station = bogStations.length-1;
  } else if (room?.id === 'eclipse') {
    room.circuit = null;
    room.lift = 0;
    room.anchors = circuitPaths.length;
  }
}
function deskOffset() {
  if (run.room?.id === 'bog') {
    const [x,z] = bogStations[run.room.station];
    return [x,0,z];
  }
  return [0,run.room?.id === 'eclipse' ? run.room.lift : 0,0];
}
function targetView() {
  const crossing = run.room?.crossing;
  if (crossing && (run.mode === 'running' || run.mode === 'paused')) {
    const station = run.room.station, row = crossing.path.length;
    const lane = crossing.path.at(-1);
    const [x,z] = row ? bridgeCell(station,row-1,lane) : bridgeOrigin(station);
    const {dx,dz} = bridgeHeading(station);
    const falling = crossing.fallUntil > run.elapsed;
    const slip = falling ? (crossing.failLane-(lane ?? 1))*.16 : 0;
    return {x:x-dx*.18+dz*slip,z:z-dz*.18-dx*slip,y:falling?-.43:.04,pitch:falling?-.95:-.88,
      yaw:Math.atan2(dx,dz),reading:false};
  }
  const view = views[run.view], [x,y,z] = deskOffset();
  const reading = run.view === 'desk';
  return {...view,x,y:(view.y ?? 0)+(reading ? y : 0),z:z+(view.z ?? 0),reading};
}
function roomKey(event) {
  const room = run.room;
  if (!room) return false;
  const key = event.code;
  if (room.id === 'abyss' && (key === 'KeyE' || key === 'Space')) {
    if (!event.repeat) pump();
    return true;
  }
  if (room.id === 'fungal' && rootKeys.includes(key)) {
    if (!event.repeat) cutRoot(rootKeys.indexOf(key));
    return true;
  }
  if (room.crossing) {
    const keys = {KeyA:0,ArrowLeft:0,KeyW:1,ArrowUp:1,KeyD:2,ArrowRight:2,KeyS:-1,ArrowDown:-1};
    if (!event.repeat && key in keys) stepBridge(keys[key]);
    return key in keys || /^Digit[1-9]$/.test(key) || key === 'Enter';
  }
  if (room.circuit && /^Digit[1-9]$/.test(key)) {
    if (!event.repeat) rotateCircuit(Number(key.at(-1))-1);
    return true;
  }
  return false;
}
function roomCue() {
  const room = run.room;
  switch (room?.id) {
    case 'abyss':
      if (room.water >= waterAtPaper) return 'The paper is going under. Pump!';
      if (room.age < room.surgingUntil) return 'Surge through the broken window.';
      return room.age < 7 ? 'Tap Pump or E to drain the rising water.' : '';
    case 'fungal':
      return roomBlock() || (room.roots.some(Boolean) ? 'Cut the glowing knots on the paper.' : '');
    case 'bog':
      if (!room.crossing) return '';
      const wake = bogWake(room);
      if (wake.phase === 'warning') return 'The Walker’s wake is coming. Watch the marked planks.';
      if (wake.phase === 'washed') return 'Avoid the submerged planks until the wake passes.';
      return 'Follow braced planks. A / W / D to step. S to go back.';
    default:
      return '';
  }
}
function renderRoots(room) {
  const visible = room?.id === 'fungal';
  $('root-knots').hidden = !visible;
  $('root-web').toggleAttribute('hidden',!visible);
  if (!visible) return;
  for (let i=0;i<4;i++) {
    const root = room.roots[i];
    const growth = root ? Math.min(1,root.age/rootLife) : 0;
    const branch = $('root-web').children[i];
    branch.style.strokeDashoffset = String(1-growth);
    branch.style.opacity = root ? '.94' : '0';
    const button = rootButtons[i];
    button.hidden = !root;
    button.classList.toggle('urgent',growth > .65);
  }
}
let circuitKey = '';
function renderCircuit() {
  const circuit = run.room?.circuit;
  const show = run.mode === 'running' && Boolean(circuit);
  const board = $('circuit');
  board.hidden = !show;
  board.inert = !show || !focused();
  if (!show) { circuitKey = ''; return; }
  const hint = $('circuit-hint');
  write(hint,circuit.index === 0 || circuit.complete ? 'Tap tiles or use keys 1–9.' :
    `Desk pull ${Math.floor(circuit.pull*100)}% · Tap tiles or use 1–9`);
  hint.classList.toggle('urgent',circuit.pull >= .72 && !circuit.complete);
  const key = [circuit.index,...circuit.masks].join('/');
  if (key === circuitKey) return;
  circuitKey = key;
  Object.assign(circuit,poweredRoute(circuit));
  write($('circuit-count'),`Tether ${circuit.index+1} / 3`);
  write($('circuit-state'),circuit.complete ? '✓ Tether locked' : 'Rotate tiles to connect the source to the anchor.');
  board.toggleAttribute('data-powered',circuit.complete);
  circuitButtons.forEach((button,i) => {
    const arms = ports.filter(p => circuit.masks[i]&p.bit);
    button.innerHTML = `<svg viewBox="0 0 60 60" aria-hidden="true"><path d="${arms.map(p=>`M30 30L${p.tip.join(' ')}`).join(' ')}"/><circle cx="30" cy="30" r="5"/></svg><span>${i+1}</span>`;
    button.toggleAttribute('data-powered',circuit.powered.includes(i));
    button.setAttribute('aria-label',`Tile ${i+1}, ${arms.map(p=>p.name).join(' to ')}${circuit.powered.includes(i) ? ', powered' : ''}`);
    button.disabled = circuit.complete;
  });
}
function renderRoomControls(running) {
  const room = running ? run.room : null;
  const flooding = room?.id === 'abyss', crossing = room?.crossing;
  $('pump-station').hidden = !flooding;
  $('bridge-control').hidden = !crossing;
  $('water-on-paper').hidden = !flooding || room.water < .49;
  if (flooding) {
    const submerged = room.water >= waterAtPaper;
    $('water-on-paper').style.setProperty('--water',Math.max(0,(room.water-.49)/.51)*100+'%');
    $('pump').toggleAttribute('data-stroking',room.age-room.strokeAt < .22);
    $('pump').toggleAttribute('data-submerged',submerged);
    write($('water-gauge'),`Water ${Math.round(room.water*100)}% · ${submerged ? 'paper wet' : room.water>.55 ? 'rising' : 'below desk'}`);
  }
  if (crossing) {
    const row = crossing.path.length, length = bridgePlans[room.station].length;
    write($('bridge-progress'),`Crossing ${room.station+1} / 3 · ${row} / ${length} planks`);
    const moving = run.elapsed < crossing.readyAt || row >= length;
    $('bridge-back').disabled = moving || row === 0;
    const lastLane = crossing.path.at(-1) ?? 1;
    const wake = bogWake(room);
    bridgeButtons.forEach((button,lane) => {
      const safe = plankSupported(room.station,row,lane);
      const wave = wake.mask & (1<<lane) ? wake.phase : 'calm';
      button.disabled = moving || Math.abs(lastLane-lane)>1 || room.failed.has(`${room.station}/${row}/${lane}`);
      button.toggleAttribute('data-braced',safe);
      button.dataset.wave = wave;
      button.setAttribute('aria-label',`${['Left','Center','Right'][lane]} plank, ${wave === 'washed' ? 'submerged' : safe ? 'braced' : 'broken'}${wave === 'warning' ? ', wake incoming' : ''}`);
    });
  }
  renderRoots(room);
  renderCircuit();
}
$('pump').onclick = pump;
$('bridge-back').onclick = () => stepBridge(-1);
bridgeButtons.forEach((button,index) => { button.onclick = () => stepBridge(index); });
rootButtons.forEach((button,index) => { button.onclick = () => cutRoot(index); });
circuitButtons.forEach((button,index) => { button.onclick = () => rotateCircuit(index); });
