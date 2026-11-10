'use strict';

const waterAtPaper = .70;
const pumpWalkTime = 2.75;
const pumpZ = 3.84;
const rootKeys = ['KeyQ','KeyE','KeyZ','KeyC'];
const rootLife = 9.5;
const walkerInPeat = [-1.70,-2.72,6.54];
const walkerTurnTime = 1.7;
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
      return {id,age:0,water:.40,strokeAt:-1,surgeAt:8.5,surgingUntil:0,submerged:0,
        warned:false,trip:{position:0,goal:0,stopped:false,stepAt:0,exposure:0}};
    case 'fungal':
      return {id,age:0,roots:[null,null,null,null],cutAt:[-5,-5,-5,-5],spawnAt:2.5,lastRoot:-1,
        bloom:null,bloomAt:10.8,shutAt:-5,sporesAt:-5};
    case 'bog':
      return {id,age:0,station:0,crossing:null,failed:new Set(),
        stareAt:8.4,stareUntil:-5,warned:false,heard:false};
    case 'eclipse':
      return {id,age:0,circuit:newCircuit(0),lift:.12,anchors:0,beam:null,beamAt:11.4};
    default:
      return null;
  }
}
function roomBlock() {
  const room = run.room;
  if (room?.id === 'abyss' && room.water >= waterAtPaper) return 'Paper submerged. Walk to the wall pump.';
  if (room?.id === 'fungal' && room.roots.some(root => root?.age >= 6.65)) return 'Roots cover the ink. Cut a knot.';
  if (room?.crossing) return 'Cross to the next packet.';
  if (room?.circuit) return 'Restore power to the desk tether.';
  return '';
}
function packetProgress() {
  return run.page/(questionsPerCourse-1);
}
function pumpAway() {
  const trip = run.room?.trip;
  return Boolean(trip && (trip.goal || trip.position));
}
function pumpInTransit() {
  const trip = run.room?.trip;
  return trip && trip.position !== trip.goal;
}
function floodPhase(room) {
  if (room.age < room.surgingUntil) return 'sweep';
  return room.surgeAt-room.age < 2.25 ? 'warning' : 'quiet';
}
function returnFromPump() {
  if (!pumpAway()) return false;
  const trip = run.room.trip;
  if (trip.goal === 1) {
    trip.goal = 0;
    trip.stopped = false;
    run.view = trip.position ? 'left' : 'desk';
  }
  return true;
}
function pump() {
  const room = run.room;
  if (run.mode !== 'running' || room?.id !== 'abyss') return;
  const trip = room.trip;
  if (!pumpAway()) {
    trip.goal = 1;
    trip.stopped = false;
    run.view = 'right';
  } else if (pumpInTransit()) {
    trip.stopped = !trip.stopped;
  } else if (run.view !== 'right') {
    look('right');
  } else if (focused() && room.age >= room.strokeAt+.42) {
    room.strokeAt = room.age;
    room.water = Math.max(.12,room.water-.32);
    room.submerged = 0;
    tone(131,.34,.30,.25,'triangle',65);
    noise(680,.46,.34,.3,0,'lowpass');
  }
  renderUI();
}
function tickPumpWalk(room,dt,phase) {
  const trip = room.trip;
  if (phase !== 'sweep') trip.exposure = 0;
  if (!pumpInTransit() || trip.stopped) return;
  if (phase === 'sweep' && trip.exposure < .56) {
    trip.exposure += dt;
    if (trip.exposure >= .56) {
      trip.stopped = true;
      loseComposure('The Angler followed the splash. Stay still when the light sweeps.',-.62);
      return;
    }
  }
  const next = trip.position+Math.sign(trip.goal-trip.position)*dt/pumpWalkTime;
  trip.position = clamp(next);
  if (room.age >= trip.stepAt) {
    trip.stepAt = room.age+.43;
    noise(645,.25,.25,trip.position*.6-.3,0,'lowpass');
    tone(109,.21,.14,0,'sine',65);
  }
  if (trip.position === 0) {
    run.view = 'desk';
    notice('Back at the desk. The paper is still here.',2.4);
  }
  if (trip.position === 1) {
    run.view = 'right';
    notice('Pull the pump with E. Return to your desk with S.',3.4);
  }
}
function tickFlood(room,dt) {
  room.age += dt;
  const pressure = packetProgress();
  if (room.age >= room.surgeAt) {
    room.surgingUntil = room.age+mix(1.75,2.18,pressure);
    room.surgeAt = room.age+mix(14.2,10.2,pressure);
    room.warned = false;
    noise(560,2.2,.51,-.69,0,'lowpass');
    tone(76,1.16,.26,-.7,'sine',43);
  }
  const phase = floodPhase(room);
  if (phase === 'warning' && !room.warned) {
    room.warned = true;
    tone(295,.83,.29,-.78,'sine',87);
    noise(840,1.1,.24,-.78,.13,'lowpass');
  }
  const rate = phase === 'sweep' ? mix(.092,.131,pressure) : mix(.023,.038,pressure);
  room.water = clamp(room.water+rate*dt);
  tickPumpWalk(room,dt,phase);
  if (run.mode !== 'running') return;
  room.submerged = room.water > .94 && !pumpAway() ? room.submerged+dt : 0;
  if (room.submerged >= 3.25) {
    room.water = .54;
    room.submerged = 0;
    loseComposure('The Angler lunged over the submerged desk.',-.65);
  }
}
function cutRoot(index) {
  const room = run.room;
  if (run.mode !== 'running' || room?.id !== 'fungal' || !room.roots[index] || !deskReady()) return;
  room.roots[index] = null;
  room.cutAt[index] = room.age;
  noise(1700,.26,.28,index%2 ? .58 : -.58);
  tone(312,.21,.18,index%2 ? .58 : -.58,'triangle',101);
  renderUI();
}
function sealVent() {
  const room = run.room;
  if (run.mode !== 'running' || !room?.bloom || run.view !== 'right' || !focused()) return;
  room.bloom = null;
  room.shutAt = room.age;
  room.bloomAt = room.age+mix(15.8,10.4,packetProgress());
  noise(460,.46,.45,.71,0,'lowpass');
  tone(225,.27,.22,.71,'triangle',79);
  notice('Shutter closed. Back to the paper.',2.6);
  renderUI();
}
function tickBloom(room,pressure) {
  if (!room.bloom && room.age >= room.bloomAt) {
    room.bloom = {start:room.age,until:room.age+mix(5.1,4.1,pressure)};
    noise(735,1.48,.43,.78,0,'lowpass');
    tone(143,1.56,.29,.78,'sawtooth',73,.17);
  }
  if (room.bloom && room.age >= room.bloom.until) {
    room.bloom = null;
    room.sporesAt = room.age;
    room.bloomAt = room.age+mix(15.8,10.4,pressure);
    loseComposure('The Bloom filled the room with spores.',.76);
  }
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
  tickBloom(room,pressure);
  if (run.mode !== 'running') return;
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
  run.view = 'desk';
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
  if (run.mode !== 'running' || !crossing || run.view === 'pit' || run.elapsed < crossing.readyAt ||
      crossing.path.length >= bridgePlans[room.station].length) return;
  if (lane === -1) {
    if (!crossing.path.length) return;
    if (bogNoise('The Walker heard the plank creak.')) return;
    crossing.path.pop();
    crossing.readyAt = run.elapsed+.45;
    noise(430,.18,.24,0,0,'lowpass');
    return;
  }
  const row = crossing.path.length;
  const board = `${room.station}/${row}/${lane}`;
  if (Math.abs((crossing.path.at(-1) ?? 1)-lane) > 1) return;
  if (room.failed.has(board)) return;
  if (bogNoise('The Walker heard the plank creak.')) return;
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
  run.view = 'desk';
  notice('Packet recovered. Put it on the desk.',2.7);
  tone(328,.33,.23,0,'triangle',439);
}
function bogStare(room) {
  if (room.age < room.stareUntil) return 'listening';
  return room.stareAt-room.age < walkerTurnTime ? 'turning' : 'away';
}
function bogNoise(message) {
  const room = run.room;
  if (room?.id !== 'bog' || bogStare(room) !== 'listening') return false;
  if (!room.heard) {
    room.heard = true;
    loseComposure(message,-.48);
  }
  return true;
}
function tickBog(room,dt) {
  room.age += dt;
  if (room.age >= room.stareAt) {
    const pressure = packetProgress();
    room.stareUntil = room.age+mix(2.55,3.05,pressure);
    room.stareAt = room.age+mix(14.0,10.8,pressure);
    room.warned = false;
    room.heard = false;
    noise(172,1.14,.30,-.48,0,'lowpass');
    tone(63,.87,.27,-.48,'triangle',50);
  } else if (!room.warned && bogStare(room) === 'turning') {
    room.warned = true;
    noise(435,1.1,.34,-.48,0,'lowpass');
  }
  tickBridge(room);
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
  if (run.mode !== 'running' || !circuit || circuit.complete || !deskReady()) return;
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
function leanFromBeam(side) {
  const beam = run.room?.beam;
  if (run.mode !== 'running' || run.view !== 'up' || !beam || beam.dropped) return;
  beam.lean = side;
  noise(560,.25,.22,side*.61,0,'lowpass');
  renderUI();
}
function tickCeiling(room,pressure) {
  if (!room.beam && room.age >= room.beamAt) {
    const side = Math.random() < .5 ? -1 : 1;
    room.beam = {side,starts:room.age,drops:room.age+mix(5.4,4.25,pressure),lean:0,dropped:false};
    noise(850,1.45,.42,side*.79,0,'lowpass');
    tone(105,1.35,.31,side*.69,'sawtooth',53);
  }
  const beam = room.beam;
  if (!beam || room.age < beam.drops) return;
  if (beam.dropped) {
    if (room.age-beam.drops > .90) room.beam = null;
    return;
  }
  beam.dropped = true;
  room.beamAt = room.age+mix(16,11,pressure);
  noise(420,.86,.52,beam.side*.83,0,'lowpass');
  if (run.view === 'up' && beam.lean === -beam.side && camera.x*beam.lean > .24) {
    notice('The beam missed. Back to the desk.',2.5);
  } else loseComposure('A ceiling beam struck the desk.',beam.side*.72);
}
function tickTether(room,dt) {
  room.age += dt;
  tickCeiling(room,packetProgress());
  if (run.mode !== 'running') return;
  const circuit = room.circuit, floating = circuit && !circuit.complete;
  if (floating && circuit.index > 0) {
    const connected = circuit.powered.length/circuitPaths[circuit.index].length;
    const ceiling = room.beam && !room.beam.dropped;
    circuit.pull += dt*(circuit.index === 1 ? .028 : .046)*(1-.48*connected)*(ceiling ? .63 : 1);
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
    case 'bog': tickBog(room,dt); break;
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
  if (room?.id === 'abyss') {
    room.trip.position = room.trip.goal = 0;
  } else if (room?.id === 'bog') {
    room.crossing = null;
    room.station = bogStations.length-1;
  } else if (room?.id === 'eclipse') {
    room.circuit = null;
    room.lift = 0;
    room.anchors = circuitPaths.length;
    room.beam = null;
  }
}
function deskOffset() {
  if (run.room?.id === 'bog') {
    const [x,z] = bogStations[run.room.station];
    return [x,0,z];
  }
  return [0,run.room?.id === 'eclipse' ? run.room.lift : 0,0];
}
function pitSight(x,y,z) {
  const [wx,wy,wz] = walkerInPeat;
  return {x,y,z,yaw:Math.atan2(wx-x,wz-z),pitch:Math.atan2(wy+1.53-y,Math.hypot(wx-x,wz-z)),reading:false};
}
function targetView() {
  const room = run.room, crossing = room?.crossing;
  if (crossing && (run.mode === 'running' || run.mode === 'paused')) {
    const station = run.room.station, row = crossing.path.length;
    const lane = crossing.path.at(-1);
    const [x,z] = row ? bridgeCell(station,row-1,lane) : bridgeOrigin(station);
    const {dx,dz} = bridgeHeading(station);
    const falling = crossing.fallUntil > run.elapsed;
    const slip = falling ? (crossing.failLane-(lane ?? 1))*.16 : 0;
    const position = {x:x-dx*.18+dz*slip,z:z-dz*.18-dx*slip,y:falling?-.43:.04};
    if (run.view === 'pit') return pitSight(position.x,position.y,position.z);
    return {...position,pitch:falling?-.95:-.88,yaw:Math.atan2(dx,dz),reading:false};
  }
  const [x,y,z] = deskOffset();
  if (run.view === 'pit') return pitSight(x,0,z);
  const view = views[run.view];
  if (pumpAway()) {
    const trip = room.trip, t = trip.position;
    const walkX = 2.90*clamp(t/.51), walkZ = .28*clamp(t/.51)+2.71*clamp((t-.51)/.49);
    const bob = pumpInTransit() && !trip.stopped && !reducedMotion ? Math.sin(t*39)*.065 : 0;
    return {...view,x:walkX,z:walkZ,y:.33*ease(t*8)+bob,reading:false};
  }
  if (run.view === 'up' && room?.beam) return {...view,x:room.beam.lean*.56,y:0,z,reading:false};
  const reading = run.view === 'desk';
  return {...view,x,y:(view.y ?? 0)+(reading ? y : 0),z:z+(view.z ?? 0),reading};
}
function inspectRoom() {
  if (run.room?.id === 'bog') look(run.view === 'pit' ? 'desk' : 'pit');
  else if (run.room?.id === 'eclipse') look(run.view === 'up' ? 'desk' : 'up');
}
function roomKey(event) {
  const room = run.room;
  if (!room) return false;
  const key = event.code;
  if (key === 'KeyR' && (room.id === 'bog' || room.id === 'eclipse')) {
    if (!event.repeat) inspectRoom();
    return true;
  }
  if (room.id === 'abyss' && (key === 'KeyE' || key === 'Space')) {
    if (!event.repeat) pump();
    return true;
  }
  if (room.id === 'fungal' && rootKeys.includes(key)) {
    if (!event.repeat) cutRoot(rootKeys.indexOf(key));
    return true;
  }
  if (room.id === 'fungal' && key === 'KeyF') {
    if (!event.repeat) sealVent();
    return true;
  }
  if (room.crossing) {
    const keys = {KeyA:0,ArrowLeft:0,KeyW:1,ArrowUp:1,KeyD:2,ArrowRight:2,KeyS:-1,ArrowDown:-1};
    if (!event.repeat && key in keys) stepBridge(keys[key]);
    return key in keys || /^Digit[1-9]$/.test(key) || key === 'Enter';
  }
  if (room.beam && run.view === 'up' && (key === 'Digit1' || key === 'Digit2')) {
    if (!event.repeat) leanFromBeam(key === 'Digit1' ? -1 : 1);
    return true;
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
    case 'abyss': {
      const phase = floodPhase(room);
      if (phase === 'sweep') return pumpInTransit() && !room.trip.stopped ? 'The light is sweeping. Stop walking · E' : 'The Angler’s light sweeps the water. Stay still.';
      if (phase === 'warning') return pumpInTransit() && !room.trip.stopped ? 'WINDOW · Stop before the light sweeps · E' : 'The window is glowing. A sweep is coming.';
      if (pumpInTransit()) return room.trip.stopped ? 'The light is gone. Walk again with E.' : '';
      if (pumpAway()) return 'Pull the pump until the water drops. S returns to the desk.';
      return roomBlock() || (room.water > .56 ? 'Water is nearing the paper. E walks to the pump.' : '');
    }
    case 'fungal': {
      if (room.bloom) return run.view === 'right' ? 'Close the shutter before it exhales · F' : 'SERVICE WALL · It’s drawing breath. Look right.';
      return roomBlock() || (room.roots.some(Boolean) ? 'Cut the glowing knots on the paper.' : '');
    }
    case 'bog': {
      const stare = bogStare(room);
      if (stare === 'listening') return run.view === 'pit' ? 'Facing you. Stay still until it turns away.' : 'The Walker is listening. Keep still. R checks the pit.';
      if (stare === 'turning') return 'The footsteps stop. Check the Walker · R';
      if (run.view === 'pit') return 'Its back is turned. R to look down.';
      if (!room.crossing) return '';
      const wake = bogWake(room);
      if (wake.phase === 'warning') return 'The Walker’s wake is coming. Watch the marked planks.';
      if (wake.phase === 'washed') return 'Avoid the submerged planks until the wake passes.';
      return 'Follow the brass braces. R looks up at the Walker.';
    }
    case 'eclipse': {
      const beam = room.beam;
      if (!beam || beam.dropped) return '';
      if (run.view !== 'up') return 'A beam is coming loose. Look up · R';
      return beam.lean === -beam.side ? 'Stay leaned until it drops.' :
        beam.side < 0 ? 'Left beam is splitting. Lean right · 2' : 'Right beam is splitting. Lean left · 1';
    }
    default:
      return '';
  }
}
function roomAlert() {
  const room = run.room;
  if (room?.id === 'abyss' && floodPhase(room) !== 'quiet') return 'left';
  if (room?.bloom) return 'right';
  if (room?.id === 'bog' && bogStare(room) !== 'away') return 'pit';
  if (room?.beam && !room.beam.dropped) return 'up';
  return '';
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
  board.inert = !show || !deskReady();
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
  const away = flooding && pumpAway(), pumping = away && !pumpInTransit() && run.view === 'right';
  const handle = $('pump');
  handle.hidden = !flooding;
  $('water-gauge').hidden = !flooding;
  write($('look-desk'),away ? '↓ Return' : '↓ Desk');
  $('inspect').hidden = !room || !['bog','eclipse'].includes(room.id);
  $('inspect').dataset.view = room?.id === 'bog' ? 'pit' : 'up';
  write($('inspect'),room?.id === 'bog' ? 'Pit · R' : 'Ceiling · R');
  $('seal-vent').hidden = !room?.bloom || run.view !== 'right';
  $('seal-vent').disabled = !$('seal-vent').hidden && !focused();
  const lean = room?.beam && !room.beam.dropped && run.view === 'up';
  $('beam-dodge').hidden = !lean;
  if (lean) {
    $('lean-left').setAttribute('aria-pressed',String(room.beam.lean === -1));
    $('lean-right').setAttribute('aria-pressed',String(room.beam.lean === 1));
  }
  $('bridge-control').hidden = !crossing;
  $('bridge-look').toggleAttribute('data-alert',Boolean(crossing && bogStare(room) !== 'away'));
  $('water-on-paper').hidden = !flooding || room.water < .49;
  if (flooding) {
    $('water-on-paper').style.setProperty('--water',Math.max(0,(room.water-.49)/.51)*100+'%');
    handle.toggleAttribute('data-alert',pumpInTransit() && floodPhase(room) !== 'quiet' && !room.trip.stopped);
    handle.toggleAttribute('data-stroking',room.age-room.strokeAt < .22);
    handle.disabled = pumping && (!focused() || room.age-room.strokeAt < .42);
    const action = pumpInTransit() ? room.trip.stopped ? 'Walk' : 'Stop' :
      pumping ? 'Pull' : away ? 'Face pump' : 'Walk to pump';
    write(handle,`${action} · E`);
    $('water-gauge').classList.toggle('danger',room.water >= waterAtPaper);
    write($('water-gauge'),`Water ${Math.round(room.water*100)}%`);
  }
  if (crossing) {
    const row = crossing.path.length, length = bridgePlans[room.station].length;
    write($('bridge-progress'),`Crossing ${room.station+1} / 3 · ${row} / ${length} planks`);
    const moving = run.elapsed < crossing.readyAt || row >= length || run.view === 'pit';
    write($('bridge-look'),run.view === 'pit' ? 'Planks · R' : 'Walker · R');
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
$('inspect').onclick = inspectRoom;
$('seal-vent').onclick = sealVent;
$('bridge-look').onclick = inspectRoom;
$('lean-left').onclick = () => leanFromBeam(-1);
$('lean-right').onclick = () => leanFromBeam(1);
$('bridge-back').onclick = () => stepBridge(-1);
bridgeButtons.forEach((button,index) => { button.onclick = () => stepBridge(index); });
rootButtons.forEach((button,index) => { button.onclick = () => cutRoot(index); });
circuitButtons.forEach((button,index) => { button.onclick = () => rotateCircuit(index); });
