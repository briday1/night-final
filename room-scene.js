'use strict';

function damagePhase() {
  return run.shift ? ease(run.shift.time/2.35) : 1;
}
function shatteredWindow(level,time) {
  const phase = level === 1 ? damagePhase() : 1;
  const start = mix(2.58,1.80,phase), end = mix(5.48,6.09,phase);
  const edge = [[start,-.73],[start+.17,.05],[start-.17,1.21],[start+.37,1.73],[3.24,1.65],
    [3.92,1.94],[4.45,1.65],[end-.09,1.78],[end,1.04],[end-.18,.41],[end+.10,-.54],[end-.62,-.91],[3.17,-.76]];
  const opening = edge.map(([z,y]) => [-3.95,y,z]);
  shape('#6e7775',opening);
  const interior = edge.map(([z,y])=>[-3.92,mix(.39,y,.92),mix(4,z,.96)]);
  shape('#091c2d',interior);
  ctx.save();
  if (worldPath(interior)) {
    ctx.clip();
    for (let i=0;i<23;i++) {
      const y = -.65+((i*.17+time*.34)%2.5);
      const z = start+(i*11%41)/41*(end-start);
      side(i%4?'#1b4458':'#3d7883',-3.90,z,y,z+.10+i%4*.055,y+.038);
    }
    const shadow = level === 1 ? (run.shift ? ease((run.shift.time-.30)/1.1) : omenPower()) : 0;
    if (shadow > .08) {
      const tail = 2.2+shadow*1.45;
      shape('#080f21b5',[[-3.89,.68,tail-.79],[-3.89,.94,tail+.22],[-3.89,.64,tail+1.10],
        [-3.89,.21,tail+1.63],[-3.89,.09,tail+.82],[-3.89,.31,tail+.20],[-3.89,-.01,tail-.56]]);
    }
  }
  ctx.restore();
  for (const [z,y,size] of [[start+.17,1.20,.38],[3.44,1.66,.32],[end-.06,1.32,.48],[end-.31,-.65,.46],[start+.36,-.58,.43]]) {
    shape('#50747d',[[-3.89,y,z],[-3.86,y-size,z+.15],[-3.85,y+.10,z+size]]);
    worldLine('#98b4ab',[-3.89,y,z],[-3.86,y-size,z+.15]);
  }
  shape('#796e5e',[[-4,-.62,2.42],[-3.62,-.65,2.70],[-3.55,-.82,3.85],[-4,-.71,4.18]]);
  shape('#6d5b53',[[-3.91,.87,4.05],[-3.72,.44,4.13],[-3.61,-.58,4.57],[-3.84,-.63,4.45]]);
  if (level !== 1) return;
  const room = run.room;
  const force = phase*(room.age < room.surgingUntil ? 1 : .45);
  for (let i=0;i<8;i++) {
    const z = 2.54+i*.38, y = .32+Math.sin(i*2.8)*.17;
    const offset = Math.sin(time*9+i)*.06;
    shape(i%3?'#296177a8':'#438999ad',[[-3.91,y,z],[-3.91,y-.07,z+.25],
      [-3.82+force*.77,-1.23,z+.49+offset],[-3.82+force*.61,-1.24,z+.17]]);
  }
}
function waterHeight() {
  if (run.course !== 1) return -1.26;
  const rise = run.shift ? .28*damagePhase() : 0;
  return -1.322+(run.room.water+rise)*1.07;
}
function floodFloor(time,overDesk=false) {
  const level = run.course;
  if (level < 1 || level > 2 || (level === 2 && overDesk)) return;
  const phase = level === 1 ? damagePhase() : 1;
  const surface = waterHeight();
  if (overDesk && surface < -.57) return;
  const width = level === 2 ? 2.55 : 7.85;
  const minX = -3.97, minZ = level === 2 ? 2.35 : -1.25;
  const maxX = minX+width*phase;
  if (overDesk) {
    flat('#27708f84',-1.32,.47,1.32,1.99,surface+.007);
    flat('#96d7cd82',-1.31,1.73,1.31,1.77,surface+.009);
    return;
  }
  flat(level === 1 ? '#163e56d4' : '#1e435584',minX,minZ,maxX,6.98,surface);
  for (let i=0;i<24;i++) {
    const z = minZ+((i*31%97)/97)*(6.98-minZ);
    const x = minX+((i*13%43)/43)*width*phase;
    const wave = Math.sin(time*2.2+i*1.72)*.23;
    if (x+wave+.51 < maxX && x+wave > minX) {
      flat(i%3?'#4e8d9c94':'#aed2c4a0',x+wave,z,x+wave+.42+i%4*.045,z+.019,surface+.005);
    }
  }
  if (level !== 1) return;
  front('#326c766b',-4,surface-.04,4,surface+.036,6.94);
  side('#79a8a695',-3.93,minZ,surface-.01,6.95,surface+.024);
  for (let i=0;i<4;i++) {
    const x = -3.3+i*.89+.22*Math.sin(time*.8+i), z = 2.27+(i*13%7)*.60;
    const y = surface+.025+Math.sin(time*3+i)*.024;
    shape(i%2?'#6d574b':'#453d44',[[x,y,z],[x+.42,y,z+.15],[x+.61,y,z+.51],[x+.23,y,z+.33]]);
    worldLine('#9a7d61',[x,y+.007,z],[x+.42,y+.007,z+.15]);
  }
}
function swimmingAngler(time) {
  const room = run.room;
  if (room.water < .37 || run.trial || run.shift) return;
  const near = ease((room.water-.37)/.62);
  const c = cameraPoint([mix(-3.54,-.39,near)+Math.sin(time*.79)*.31,waterHeight()+.11,
    mix(5.47,2.24,near)+Math.sin(time*1.39)*.21]);
  if (c[2] < .20) return;
  const [x,y] = project(c);
  angler(x,y,(.43+.34*near)*focal/c[2],time,near);
}
function growthLine(path,color,width,growth=1) {
  for (let i=1;i<path.length;i++) {
    const fraction = clamp(growth*(path.length-1)-(i-1));
    if (!fraction) break;
    worldLine(color,path[i-1],mixPoint(path[i-1],path[i],fraction),Math.max(1,width*(1-i/(path.length*1.6))));
  }
}
const wallTendrils = [
  [[3.88,1.26,4.08],[3.35,1.93,4.12],[2.54,1.96,3.92],[1.78,2.00,3.52],[.82,1.85,3.16],[-.04,1.91,2.44],[-.75,1.54,2.12]],
  [[3.80,.94,4.23],[3.41,.75,3.41],[2.88,.45,2.56],[2.13,.15,2.28],[1.67,-.40,1.72],[1.03,-.53,1.39]],
  [[3.86,-.28,4.28],[3.67,-.87,3.70],[3.06,-1.25,3.12],[2.41,-1.27,3.26],[1.68,-1.27,2.78],[.70,-1.24,2.98]],
  [[3.88,1.13,4.66],[3.46,1.58,5.62],[2.98,1.51,6.64],[1.71,1.18,6.89],[.86,1.37,6.89],[.34,.96,6.88]]
];
function colonizedWall(level,time) {
  const phase = level === 2 ? damagePhase() : 1;
  const near = mix(2.66,1.96,phase), far = mix(4.85,5.47,phase);
  shape('#6e556c',[[3.945,-1.18,near],[3.945,-.17,near+.19],[3.945,.48,near-.10],
    [3.945,1.63,near+.50],[3.945,1.84,3.79],[3.945,1.52,far],[3.945,.38,far-.10],
    [3.945,-.57,far+.24],[3.945,-1.22,far-.57]]);
  shape('#211826',[[3.92,-1.10,near+.16],[3.92,-.24,near+.33],[3.92,.47,near+.07],
    [3.92,1.48,near+.62],[3.92,1.72,3.83],[3.92,1.42,far-.18],[3.92,.44,far-.27],
    [3.92,-.51,far+.07],[3.92,-1.09,far-.66]]);
  for (const z of [2.36,5.13]) {
    shape('#726171',[[3.90,1.61,z],[3.81,1.52,z+.21],[3.54,-1.21,z+.42],[3.70,-1.25,z+.13]]);
  }
  for (let i=0;i<wallTendrils.length;i++) {
    const growth = wallTendrils[i], amount = clamp(phase*(1.4-i*.06));
    growthLine(growth,'#412c44',7,amount);
    growthLine(growth,'#8f627c',3,amount);
    growthLine(growth.map(([x,y,z],j)=>[x-.037,y+.049*Math.sin(j*2),z-.036]),'#b58a9b',1,amount);
  }
  const caps = [
    [[3.69,1.28,3.22],.43],[[3.51,.56,4.50],.56],[[3.58,-.38,2.91],.42],
    [[2.54,1.88,3.94],.51],[[1.75,1.73,3.56],.34],[[.51,1.77,2.94],.31],
    [[2.69,-1.04,2.44],.47],[[1.92,-1.02,2.77],.25],[[3.61,1.22,5.40],.33]
  ];
  for (const [position,size] of caps) shelfFungus(position,size*phase,time,true);
  if (level === 2) bloom(.16+.11*Math.sin(time*1.7),time);
}
function livingRoots(time) {
  if (run.room?.id !== 'fungal') return;
  const starts = [[-.68,-.554,1.76],[.68,-.554,1.76],[-.68,-.554,.78],[.68,-.554,.78]];
  run.room.roots.forEach((root,i) => {
    const [x,y,z] = starts[i];
    if (!root) {
      const t = run.room.age-run.room.cutAt[i];
      if (t < .38) {
        const p = screenPoint([x,y+.09,z]);
        if (p) for (let k=0;k<6;k++) box('#f1ac779a',p[0]+Math.cos(k*2.4)*t*30,p[1]+Math.sin(k*2.4)*t*28,2,2);
      }
      return;
    }
    const sign = Math.sign(x);
    const from = [sign*1.63,-.98,z+.46], bend = [sign*1.23,-.52,z+.23];
    growthLine([from,bend,[x,y,z]],'#653c59',7);
    growthLine([from,bend,[x,y,z]],'#b68098',3);
    shelfFungus([x,y+.075,z],.098+root.age*.009,time,true);
  });
}
function peatPit(level,time) {
  const fall = level === 3 ? damagePhase() : 1;
  flat('#171a22',-4,-2,4,7,-2.83);
  for (let i=0;i<37;i++) {
    const x = -3.88+(i*83%241)/31, z = -1.2+(i*53%277)/34;
    const y = -2.815+.018*Math.sin(time*1.7+i);
    flat(i%4?'#372c2c':'#67453b',x,z,x+.12+i%5*.072,z+.025,y);
  }
  for (const sign of [-1,1]) {
    shape('#47373a',[[sign*4,-1.31,-2],[sign*3.5,-1.32,-2],[sign*3.70,-1.32,1.44],
      [sign*3.36,-1.33,3.04],[sign*3.69,-1.33,4.95],[sign*3.43,-1.33,7],[sign*4,-1.31,7]]);
    for (let i=0;i<7;i++) {
      const z = -.4+i*1.09, x = sign*(3.45+.16*Math.sin(i*2));
      shape(i%2?'#5e4440':'#332731',[[x,-1.31,z],[x+sign*.26,-1.31,z+.48],[x+sign*.09,-2.53,z+.38],[x,-2.30,z+.14]]);
    }
  }
  for (const [i,[x,z]] of bogStations.entries()) {
    const y = -1.34-(level === 4 && i ? .14 : 0);
    shape('#362b30',[[x-1.26,y,z+.41],[x+1.28,y,z+.40],[x+1.12,y-.81,z+.40],[x-.97,y-1.20,z+.50]]);
    shape('#65504a',[[x-1.31,y,z+.41],[x-.97,y,z+.24],[x+1.22,y,z+.31],[x+1.30,y,z+1.90],
      [x+.92,y,z+2.13],[x-.50,y,z+2.23],[x-1.27,y,z+1.91]]);
    if (i) front('#8f7464',x-.34,y+.01,x+.35,y+.041,z+1.42);
  }
  if (fall < 1) for (let i=0;i<13;i++) {
    const x = -3.24+(i*71%121)/19, z = .7+(i*61%90)/16;
    const y = -1.33-fall*(.64+i%6*.20);
    shape(i%2?'#5f4941':'#4b3b3c',[[x,y,z],[x+.73,y+.03,z-.13],[x+.60,y-.15,z+.61],[x-.15,y-.07,z+.72]]);
  }
  if (level === 3) catwalk(time);
}
function plankMesh(station,row,lane,time,current,possible,wave) {
  const [x,z] = bridgeCell(station,row,lane);
  const {dx,dz,length} = bridgeHeading(station), span = length/(bridgePlans[station].length+1);
  const h = span*.55, w = .35;
  const safe = plankSupported(station,row,lane);
  const dropped = station < run.room.station || run.room.failed.has(`${station}/${row}/${lane}`);
  const washed = wave === 'washed';
  const y = -1.30-(dropped ? .65+row*.08 : washed ? .38 : 0);
  const point = (lateral,forward,drop=0) => [x+dz*lateral+dx*forward,y-drop,z-dx*lateral+dz*forward];
  const face = (color,a,b,drop=0) => shape(color,[point(-w,a,drop),point(w,a,drop),point(w,b),point(-w,b)]);
  if (safe && !dropped) {
    face(washed ? '#3d4451' : current && possible ? '#b28858' : '#795940',-h,h);
    for (const side of [-1,1]) {
      const edge = side*w*.81;
      worldLine('#4e392f',point(edge,-h*.86,-.009),point(edge,h*.86,-.009),2);
      for (const end of [-1,1]) {
        const near = end*h*.75;
        shape('#d2a477',[point(edge-.043,near-.052,-.013),point(edge+.043,near-.052,-.013),
          point(edge+.043,near+.052,-.013),point(edge-.043,near+.052,-.013)]);
      }
    }
    if (current) worldLine(washed ? '#a896ac' : wave === 'warning' ? '#f1a072' : '#edc68e',point(-w,-h,-.014),point(w,-h,-.014),3);
  } else {
    face('#54403a',-h,-h*.26,.11+Math.sin(time*2+x)*.027);
    face('#493634',h*.32,h,.32);
    if (current && !dropped) {
      worldLine('#d18b70',point(-.13,-.075,-.025),point(.13,.075,-.025),2);
      worldLine('#d18b70',point(.13,-.075,-.025),point(-.13,.075,-.025),2);
    }
  }
  if (washed) {
    const splash = Math.sin(time*12+lane)*.12;
    face('#4e5267b2',-h+splash,h+splash,-.19);
    worldLine('#a88daca6',point(-w,-h+splash,-.205),point(w,-h+splash,-.205),2);
  }
  if (current && !dropped) worldText(['A','W','D'][lane],point(0,0,-.029),safe && !washed?'#fff0c9':'#edb59b',26);
}
function catwalk(time) {
  const room = run.room, wake = bogWake(room);
  for (let station=bridgePlans.length-1;station>=0;station--) {
    ctx.save();
    if (room.crossing && station !== room.station) ctx.globalAlpha = .43;
    for (let row=bridgePlans[station].length-1;row>=0;row--) {
      for (let lane=0;lane<3;lane++) {
        const crossing = station === room.station && room.crossing;
        const current = crossing && crossing.path.length === row;
        const possible = !crossing || Math.abs((crossing.path.at(-1) ?? 1)-lane)<=1;
        const wave = current && (wake.mask & (1<<lane)) ? wake.phase : 'calm';
        plankMesh(station,row,lane,time,current,possible,wave);
      }
    }
    ctx.restore();
  }
}
function tornWall() {
  const phase = damagePhase();
  const west = mix(-.66,-2.52,phase), east = mix(.55,2.60,phase);
  shape('#31263e',[[-4,-1.34,7],[-4,2.10,7],[west+.08,2.10,7],[west+.45,1.28,7],
    [west-.28,.79,7],[west+.27,.08,7],[west-.33,-.48,7],[west,-1.34,7]]);
  shape('#3c2d44',[[4,-1.34,7],[4,2.10,7],[east-.35,2.10,7],[east-.13,1.51,7],
    [east+.33,1.03,7],[east-.27,.58,7],[east-.11,-.13,7],[east-.36,-.59,7],[east,-1.34,7]]);
  for (const [x,side] of [[west,-1],[east,1]]) {
    for (let i=0;i<7;i++) {
      const y = -.99+i*.44, tip = x+side*(Math.sin(i*2)*.27);
      shape(i%2?'#746071':'#533e57',[[tip+side*.30,y,6.97],[tip-side*.12,y+.21,6.94],
        [tip+side*.46,y+.33,7],[tip+side*.62,y+.17,7]]);
    }
  }
}
function suspendedRoom(time) {
  const phase = damagePhase();
  for (let i=0;i<10;i++) {
    const x = -.14+Math.sin(i*3.66)*3.20;
    const y = mix(-1.22,-.30+i*.195,phase) + .13*Math.sin(time*1.5+i);
    const z = 3.04+(i*49%33)/10, s = .10+(i%4)*.11;
    shape(i%3?'#514154':'#936c73',[[x-s,y-.06,z],[x,y+s*.70,z+.12],[x+s,y+.04,z+.29],[x+s*.30,y-s*.66,z+.09]]);
  }
  const lift = run.room.lift, tethered = !run.room.circuit || run.room.circuit.complete;
  for (const side of [-1,1]) {
    const root = [side*2.10,1.98,2.49], clasp = [side*1.19,-.55+lift,1.84];
    const bend = [side*(tethered?1.65:1.76),tethered?.70:1.04,2.16+Math.sin(time*2+side)*.08];
    const end = tethered ? clasp : [side*1.50,.48+Math.sin(time*2.3+side)*.12,1.72];
    growthLine([root,bend,end],tethered?'#a79278':'#9e606f',3);
    if (!tethered) {
      const p = screenPoint(end);
      if (p) {
        disk('#e7a27d86',p[0],p[1],4,5,time);
        disk('#ffe4ae',p[0],p[1],2,4,time);
      }
    }
  }
}
function tetherClamps() {
  const {anchors,lift} = run.room;
  for (let i=0;i<anchors;i++) {
    const x = .81+.123*i;
    flat('#c8a076',x,1.77,x+.082,1.88,-.567+lift);
    flat('#4d3c42',x+.023,1.79,x+.060,1.85,-.566+lift);
  }
}

const hallDoorX = 1.93;
const seatRows = [[2.52,1.78],[3.88,1.90],[5.18,1.75]];
const signGlyphs = {
  A:'.###./#...#/#...#/#####/#...#/#...#/#...#',
  C:'.####/#..../#..../#..../#..../#..../.####',
  E:'#####/#..../#..../####./#..../#..../#####',
  F:'#####/#..../#..../####./#..../#..../#....',
  H:'#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I:'.###./..#../..#../..#../..#../..#../.###.',
  L:'#..../#..../#..../#..../#..../#..../#####',
  M:'#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
  N:'#...#/##..#/##..#/#.#.#/#..##/#..##/#...#',
  O:'.###./#...#/#...#/#...#/#...#/#...#/.###.',
  R:'####./#...#/#...#/####./#.#../#..#./#...#',
  S:'.####/#..../#..../.###./....#/....#/####.',
  T:'#####/..#../..#../..#../..#../..#../..#..',
  V:'#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  X:'#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  0:'.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  1:'..#../.##../..#../..#../..#../..#../.###.',
  3:'####./....#/....#/.###./....#/....#/####.'
};
function makeSign(text,[x,y,z],height,[dx,dz]=[1,0]) {
  const pixel = height/7, halfWidth = (text.length*6-1)/2;
  const vertex = (column,row) => {
    const across = (column-halfWidth)*pixel;
    return [x+across*dx,y+(3.5-row)*pixel,z+across*dz];
  };
  const strokes = [];
  // Place the letters on the surface before projecting them with the rest of the room.
  for (const [index,letter] of [...text].entries()) {
    if (letter === ' ') continue;
    const rows = signGlyphs[letter].split('/');
    rows.forEach((row,i) => {
      for (const ink of row.matchAll(/#+/g)) {
        const left = index*6+ink.index, right = left+ink[0].length;
        strokes.push([vertex(left,i),vertex(right,i),vertex(right,i+1),vertex(left,i+1)]);
      }
    });
  }
  return strokes;
}
const chalkboardTitle = makeSign('FINAL EXAMINATION',[-1.47,1.12,6.959],.224);
const chalkboardRoom = makeSign('ROOM 013',[-1.47,.76,6.959],.14);
function teachingWall(level) {
  const p = palettes[level], chalk = level < 2 ? '#bdbdab' : '#a992a1';
  front('#211e20',-3.69,.12,.77,1.55);
  front(p.trim,-3.64,.17,.71,1.50,6.974);
  front(level === 0 ? '#2d413b' : level === 1 ? '#263943' : '#302631',-3.57,.25,.63,1.42,6.971);
  front('#627063',-3.55,1.38,.61,1.41,6.969);
  front('#a68763',-3.63,.17,.74,.23,6.961);
  for (let i=0;i<6;i++) front(level?'#4d4f51':'#46594d',-3.42,.35+i*.074,-2.58+i*.18,.36+i*.074,6.963);
  drawSign(chalkboardTitle,chalk);
  drawSign(chalkboardRoom,chalk);
  const tallies = 2+Math.min(4,level)+Math.floor(omenPower()*3);
  for (let i=0;i<tallies;i++) front(chalk,-.08+i*.079,.45,-.06+i*.079,.56,6.959);
  front('#d3b590',.36,.23,.49,.26,6.959);
  front('#807365',2.95,.19,3.77,1.15,6.969);
  front('#64584e',3.00,.24,3.72,1.09,6.964);
  front('#ada17a',3.12,.47,3.40,.97,6.958);
  front('#a48166',3.43,.29,3.65,.76,6.958);
  for (let i=0;i<4;i++) {
    front('#675f55',3.16,.62+i*.071,3.37,.637+i*.071,6.956);
  }
  const center = [-1.48,1.81,6.966], x = center[0], y = center[1];
  const dial = r => regularPoints(x,y,r,12).map(([a,b])=>[a,b,6.961]);
  shape('#29272a',dial(.212));
  shape(level<2 ? '#c8b99c' : '#8e7d82',dial(.177));
  for (let i=0;i<4;i++) {
    const a = Math.PI*.5*i, bx = x+Math.cos(a)*.14, by = y+Math.sin(a)*.14;
    front('#65554b',bx-.016,by-.016,bx+.016,by+.016,6.958);
  }
  const minute = Math.PI*.5-(42+run.elapsed/60)*Math.PI/30;
  worldLine('#534743',center,[x+Math.cos(minute)*.127,y+Math.sin(minute)*.127,6.955]);
  worldLine('#534743',center,[x-.029,y+.090,6.955]);
}
function emptyDesk(x,y,z,level,chair=true) {
  const position = cameraPoint([x,y-.78,z]);
  if (position[2] < .20) return;
  const [px,py] = project(position), margin = focal*1.22/position[2];
  if (px+margin < 0 || px-margin > canvas.width || py+margin < 0 || py-margin > canvas.height) return;
  const edge = ['#574d4a','#404b51','#50404d','#533d3d','#584658'][level];
  const wood = ['#a17b58','#63828a','#825d77','#83604a','#865f85'][level];
  const top = (color,x1,z1,x2,z2,at) => flat(color,x+x1,z+z1,x+x2,z+z2,y+at);
  const frame = (a,b,c,d,e,f,palette) => block(x+a,y+b,z+c,x+d,y+e,z+f,palette);
  const metal = [edge,'#30353a','#7c7d74'];
  if (chair) {
    for (const left of [-.31,.28]) {
      frame(left,-1.34,-.69,left+.037,-.95,-.65,metal);
      frame(left,-1.34,-.30,left+.037,-.95,-.26,metal);
    }
    frame(-.35,-.98,-.72,.35,-.89,-.25,['#56463f',edge,wood]);
    for (const left of [-.30,.27]) frame(left,-.93,-.69,left+.038,-.49,-.65,metal);
    frame(-.37,-.65,-.71,.37,-.41,-.65,['#685041',edge,wood]);
    front('#b08766',x-.30,y-.49,x+.31,y-.466,z-.714);
  }
  for (const left of [-.52,.46]) for (const back of [-.23,.35]) {
    frame(left,-1.34,back,left+.040,-.64,back+.041,metal);
  }
  frame(-.57,-.76,-.27,.56,-.59,.43,['#5b4843',edge,wood]);
  top('#ba94707a',-.55,-.23,.54,-.205,-.585);
  top('#4d403a81',-.55,.34,.54,.36,-.585);
}
function classroomFurniture(level,time) {
  if (level > 2) return;
  const pieces = seatRows.flatMap(([z,x],row) => [-1,1].map(side => {
    const surge = level === 1 && run.room.age < run.room.surgingUntil;
    const drift = level === 1 ? run.room.water*(.15+.07*row) : level === 2 ? .10*(2-row) : 0;
    const sway = surge && !reducedMotion ? Math.sin(time*3.3+row)*.06 : 0;
    return [side*(x+drift+sway),0,z+drift*side];
  })).sort((a,b)=>cameraPoint(b)[2]-cameraPoint(a)[2]);
  const wood = level === 0 ? '#8a6954' : level === 1 ? '#526770' : '#73576a';
  block(-2.75,-1.34,5.89,-.45,-.66,6.49,['#55444a','#40373a',wood]);
  block(-2.83,-.69,5.84,-.36,-.58,6.52,['#634c42','#46383b',wood]);
  block(-2.59,-.573,6.09,-2.18,-.53,6.41,['#6c5548','#534849','#b09f85']);
  for (const [x,y,z] of pieces) emptyDesk(x,y,z,level);
  if (level === 2) {
    const growth = damagePhase(), pulse = omenPower();
    for (const [x,,z] of pieces.filter(part=>part[0]>0)) {
      const breath = reducedMotion ? 0 : pulse*Math.sin(time*2+z)*.11;
      growthLine([[x+.55,-1.27,z+.63],[x+.37,-.76+breath,z+.42],[x-.27,-.56+breath,z+.17]],'#7b5c78',3,growth);
      if (growth > .58) shelfFungus([x+.43,-.55+breath,z+.29],.14+pulse*.035,time,true);
    }
  }
}
function ceilingFixtures(level,opening,time) {
  if (opening > .78) return;
  const omen = omenPower();
  for (const [i,z] of [3.29,5.12,6.29].entries()) {
    const x = level < 3 ? 0 : (i%2 ? 1 : -1)*1.55;
    const y = 2.015+opening*8.3-(level >= 2 && i === 0 ? .22 : 0);
    const swing = level >= 2 && i === 0 && !reducedMotion ? Math.sin(time*1.4)*.09 : 0;
    const casing = [[x-1.22,y,z-.14],[x+1.22,y+swing,z-.14],[x+1.22,y+swing,z+.14],[x-1.22,y,z+.14]];
    shape('#24262a',casing);
    const lit = (level === 0 && omen < .55) || (level === 1 && i === 2 && omen < .62) ||
      (level === 2 && i === 1 && omen < .46);
    for (const offset of [-.065,.056]) {
      shape(lit ? '#d8d0ab' : '#65555e',[[x-1.12,y-.01,z+offset],[x+1.12,y+swing-.01,z+offset],
        [x+1.12,y+swing-.01,z+offset+.040],[x-1.12,y-.01,z+offset+.040]]);
    }
    if (level >= 2 && i === 0) worldLine('#776471',[x-.75,y,z],[x-.84,y+.25,z+.11],2);
  }
}
function peatHand() {
  if (run.course !== 3 || reducedMotion) return;
  const {station,crossing} = run.room;
  const crossingBeat = crossing ? clamp((run.elapsed-crossing.startedAt-.50)/2.35) : 0;
  const reach = Math.max(omenPower(),Math.sin(Math.PI*crossingBeat)**2*.94);
  if (reach < .15) return;
  const [dx,,dz] = deskOffset();
  const [x,z] = crossing && station < bridgePlans.length ?
    bridgeCell(station,Math.min(crossing.path.length,3),2) : [dx+1.62,dz+2.66];
  const palm = [x+.47,-2.49+reach*1.54,z+.22];
  const wrist = [palm[0]+.09,palm[1]-.39,palm[2]+.08];
  limb([palm[0]+.18,-2.82,palm[2]+.32],wrist,.13,.084,'#3d3037','#654f50');
  limb(wrist,palm,.085,.139,'#54434b','#806865');
  for (let i=0;i<4;i++) {
    const base = [palm[0]+(i-1.45)*.078,palm[1],palm[2]+.012*i];
    const joint = [base[0]+(i-1.5)*.043,base[1]+.21+i*.023,base[2]-.12];
    const tip = [joint[0]-.045,joint[1]+.089,joint[2]-.16];
    limb(base,joint,.038,.027,'#665354','#917a70');
    limb(joint,tip,.026,.007,'#665354','#9d8675');
  }
}
function roomShadows(level,time) {
  const omen = omenPower(), w = canvas.width, h = canvas.height;
  const dim = level ? [0,.040,.065,.10,.13][level] : 0;
  const alpha = dim+omen*(reducedMotion ? .035 : .05+level*.020);
  if (!alpha) return;
  const shadow = ctx.createLinearGradient(0,0,w*.20,h);
  shadow.addColorStop(0,`rgba(10,9,23,${Math.min(.47,alpha*1.64)})`);
  shadow.addColorStop(.62,`rgba(12,13,22,${alpha*.8})`);
  shadow.addColorStop(1,`rgba(12,13,22,${alpha*.34})`);
  ctx.fillStyle = shadow;
  ctx.fillRect(0,0,w,h);
  if (level === 4 && omen > .49 && !reducedMotion) {
    const y = h*(.47+.18*Math.sin(time*1.7)), center = w*(.57+Math.sin(time*.47)*.08);
    screenPoly('#17122626',[[center-w*.43,0],[center+w*.12,0],[center+w*.32,y],[center-w*.21,y+h*.06]]);
  }
}
