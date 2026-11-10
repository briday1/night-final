'use strict';

function point(x,y,z) { return [x,y,z]; }
function cameraPoint([x,y,z]) {
  x -= camera.x;
  y -= camera.y;
  z -= camera.z;
  const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
  const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
  const depth = x * sy + z * cy;
  return [x * cy - z * sy,y * cp - depth * sp,y * sp + depth * cp];
}
function project([x,y,z]) {
  const cx = x*focal/z, cy = -y*focal/z;
  const c = Math.cos(camera.roll), s = Math.sin(camera.roll);
  return [canvas.width/2 + cx*c - cy*s,canvas.height/2 + cx*s + cy*c];
}
function placeExamSheet() {
  const {left,right,y,near,far,width,height} = sheetPlane;
  const [dx,dy,dz] = deskOffset();
  const cornerAt = (x,z) => cameraPoint([x+dx,y+dy,z+dz]);
  const origin = cornerAt(left,far), rightEdge = cornerAt(right,far);
  const bottom = cornerAt(left,near), corner = cornerAt(right,near);
  const visible = run.mode === 'running' && !run.room?.crossing &&
    [origin,rightEdge,bottom,corner].every(p => p[2] >= .1);
  const circuit = $('circuit'), hasCircuit = Boolean(run.room?.circuit);
  paper.hidden = !visible || hasCircuit;
  circuit.hidden = !visible || !hasCircuit;
  if (!visible) return;

  // The interactive paper and tether plate share the camera and tabletop plane.
  const column = ([x,y,z]) => {
    const c = Math.cos(camera.roll), s = Math.sin(camera.roll);
    return [stageWidth*(.5*z + (x*c+y*s)*focal/canvas.width),
      stageHeight*(.5*z + (x*s-y*c)*focal/canvas.height),0,z];
  };
  const step = (end,length) => column(end.map((coordinate,i) => (coordinate - origin[i]) / length));
  const matrix = [...step(rightEdge,width),...step(bottom,height),0,0,1,0,...column(origin)];
  (hasCircuit ? circuit : paper).style.transform = `matrix3d(${matrix.join(',')})`;
}
function clip(points) {
  const near = .17, output = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    if (a[2] >= near) output.push(a);
    if ((a[2] >= near) !== (b[2] >= near)) {
      const t = (near - a[2]) / (b[2] - a[2]);
      output.push([a[0] + (b[0] - a[0]) * t,a[1] + (b[1] - a[1]) * t,near]);
    }
  }
  return output;
}
function worldPath(points) {
  const visible = clip(points.map(cameraPoint));
  if (visible.length < 3) return false;
  ctx.beginPath();
  visible.map(project).forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.closePath();
  return true;
}
function shape(color,points) {
  if (!worldPath(points)) return;
  ctx.fillStyle = color;
  ctx.fill();
}
function front(color,x1,y1,x2,y2,z = 6.98) {
  shape(color,[point(x1,y1,z),point(x2,y1,z),point(x2,y2,z),point(x1,y2,z)]);
}
function side(color,x,z1,y1,z2,y2) {
  shape(color,[point(x,y1,z1),point(x,y1,z2),point(x,y2,z2),point(x,y2,z1)]);
}
function flat(color,x1,z1,x2,z2,y) {
  shape(color,[point(x1,y,z1),point(x2,y,z1),point(x2,y,z2),point(x1,y,z2)]);
}
function block(x1,y1,z1,x2,y2,z2,colors) {
  const [face,edge,top] = colors;
  front(face,x1,y1,x2,y2,z2);
  side(edge,x1,z1,y1,z2,y2);
  side(edge,x2,z1,y1,z2,y2);
  front(face,x1,y1,x2,y2,z1);
  flat(top,x1,z1,x2,z2,y2);
}
function worldText(value,location,color,size) {
  const p = cameraPoint(location);
  if (p[2] < .2) return;
  const [x,y] = project(p);
  ctx.font = 'bold ' + Math.max(6,Math.round(size / p[2])) + 'px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(value,x,y);
}
function direction(x,z) {
  const length = Math.hypot(x,z);
  return [x / length,0,z / length];
}
function offset([x,y,z],[fx,,fz],across,up,forward = 0) {
  return [x - fz * across + fx * forward,y + up,z + fx * across + fz * forward];
}
function limb(from,to,widthA,widthB,color,rim) {
  const a = cameraPoint(from), b = cameraPoint(to);
  if (a[2] < .17 || b[2] < .17) return;
  const [x,y] = project(a), [u,v] = project(b);
  const length = Math.max(.01,Math.hypot(u - x,v - y));
  const nx = (v - y) / length, ny = (x - u) / length;
  const wa = widthA * focal / a[2], wb = widthB * focal / b[2];
  ctx.fillStyle = rim || color;
  ctx.beginPath();
  ctx.moveTo(x + nx * wa,y + ny * wa);
  ctx.lineTo(u + nx * wb,v + ny * wb);
  ctx.lineTo(u - nx * wb,v - ny * wb);
  ctx.lineTo(x - nx * wa,y - ny * wa);
  ctx.closePath();
  ctx.fill();
  if (!rim) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + nx * wa * .52,y + ny * wa * .52);
  ctx.lineTo(u + nx * wb * .50,v + ny * wb * .50);
  ctx.lineTo(u - nx * wb,v - ny * wb);
  ctx.lineTo(x - nx * wa,y - ny * wa);
  ctx.closePath();
  ctx.fill();
}
function gait(phase,stride) {
  const cycle = (phase % 1 + 1) % 1;
  if (cycle < .63) return [mix(.5,-.5,cycle / .63) * stride,0];
  const swing = (cycle - .63) / .37;
  return [mix(-.5,.5,swing) * stride,Math.sin(swing * Math.PI) * .20];
}
function groundShadow([x,,z],radius,opacity) {
  shape(`rgba(6,8,6,${opacity})`,[
    [x-radius,-1.336,z-.12],[x-radius*.6,-1.336,z-.36],[x+radius*.62,-1.336,z-.36],
    [x+radius,-1.336,z-.13],[x+radius*.62,-1.336,z+.17],[x-radius*.6,-1.336,z+.17]
  ]);
}
const palettes = [
  {wall:'#3b3d36',left:'#353935',right:'#34312e',floor:'#262b29',ceiling:'#252a28',trim:'#6f6352',slat:'#424639',shadow:'#202526',light:'#d1a674'},
  {wall:'#224050',left:'#1d3848',right:'#26434c',floor:'#192a37',ceiling:'#172532',trim:'#4e6a6b',slat:'#2b4954',shadow:'#141d2b',light:'#79ccd0'},
  {wall:'#3d3345',left:'#363340',right:'#403145',floor:'#29243b',ceiling:'#252333',trim:'#765f7f',slat:'#503a56',shadow:'#241a31',light:'#b199d2'},
  {wall:'#4b3730',left:'#413332',right:'#4a392e',floor:'#362a27',ceiling:'#2b2324',trim:'#765742',slat:'#5a4235',shadow:'#271b1d',light:'#d7996d'},
  {wall:'#373045',left:'#2b2a41',right:'#342940',floor:'#232036',ceiling:'#201b2d',trim:'#665775',slat:'#453554',shadow:'#181626',light:'#ceafef'}
];
const stars = Array.from({length:140},(_,i) => [
  ((i*971+137)%1601)/1601,((i*677+103)%1181)/1181,(i*313)%100/100
]);
function screenPoly(color,points) {
  ctx.beginPath();
  points.forEach(([x,y],i) => i ? ctx.lineTo(Math.round(x),Math.round(y)) : ctx.moveTo(Math.round(x),Math.round(y)));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
function regularPoints(x,y,r,count=12,rotation=0,sy=1) {
  return Array.from({length:count},(_,i) => {
    const a = rotation + i/count*Math.PI*2;
    return [x+Math.cos(a)*r,y+Math.sin(a)*r*sy];
  });
}
function disk(color,x,y,r,count=12,rotation=0,sy=1) {
  screenPoly(color,regularPoints(x,y,r,count,rotation,sy));
}
function screenPoint(world) {
  const p = cameraPoint(world);
  return p[2] >= .17 ? project(p) : null;
}
function line(color,a,b,width=1) {
  ctx.beginPath();
  ctx.moveTo(Math.round(a[0]),Math.round(a[1]));
  ctx.lineTo(Math.round(b[0]),Math.round(b[1]));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
function worldLine(color,a,b,width=1) {
  const p = screenPoint(a), q = screenPoint(b);
  if (p && q) line(color,p,q,width);
}
function box(color,x,y,w,h) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}
function label(text,x,y,color,size=9) {
  ctx.textAlign = 'center';
  ctx.font = 'bold '+Math.round(size)+'px monospace';
  ctx.fillStyle = color;
  ctx.fillText(text,Math.round(x),Math.round(y));
}
function sky(time,opening) {
  const w = canvas.width,h = canvas.height;
  const gradient = ctx.createLinearGradient(0,0,0,h);
  gradient.addColorStop(0,'#0a0c1b');
  gradient.addColorStop(.60,run.course < 4 ? '#222a3b' : '#332342');
  gradient.addColorStop(1,'#211725');
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,w,h);
  for (const [x,y,weight] of stars) {
    const blink = .24 + .75 * weight;
    ctx.globalAlpha = blink * (.8 + .2*Math.sin(time*1.6+x*59));
    box(weight > .86 ? '#e0b8c2' : '#8195ab',x*w,y*h,weight>.87?2:1,weight>.94?2:1);
  }
  ctx.globalAlpha = 1;
  const t = run.cinematic?.time ?? 0;
  if (t <= 2.6) return;
  const appear = ease((t-3.25)/3.3);
  const scale = .48 + .61*appear + .25*ease((t-9)/3.7);
  const width = Math.max(w*.94,h*1.28)*scale;
  const height = width*2/3;
  const x = w*.50-width*.50 + (reducedMotion ? 0 : Math.sin(t*.68)*w*.019);
  const y = h*(.06-.15*appear) + Math.sin(t*1.22)*h*.015;
  ctx.save();
  ctx.globalAlpha = clamp((opening-.11)*1.6) * (.71+.29*appear);
  if (proctorSprite.complete && proctorSprite.naturalWidth) ctx.drawImage(proctorSprite,x,y,width,height);
  else {
    disk('#25444d',w*.5,y+height*.43,height*.24,12,0,1.25);
    for (const sign of [-1,1]) disk('#ecac5e',w*.5+sign*height*.075,y+height*.39,4,5);
  }
  ctx.restore();
}
function roof(opening,level) {
  const p = palettes[level], breakWidth = level < 3 ? 0 : level === 3 ? .32 : .30+1.06*damagePhase();
  for (const side of [-1,1]) {
    const offsetX = side*opening*5.8;
    const offsetY = opening*8.3;
    const points = [
      [side*4+offsetX,2.13+offsetY,-2+opening],
      [side*breakWidth+offsetX,2.13+offsetY+opening*1.12,-2+opening],
      [side*(breakWidth+.15)+offsetX,2.13+offsetY+opening*1.36,1.9+opening*.5],
      [side*breakWidth+offsetX,2.13+offsetY+opening*1.46,4.3+opening],
      [side*(breakWidth+.3)+offsetX,2.13+offsetY+opening*.88,7],
      [side*4+offsetX,2.13+offsetY,7]
    ];
    shape(p.ceiling,points);
    for (let z=-1.4;z<7;z+=1.4) {
      const y = 2.105 + offsetY;
      const inner = side*(breakWidth+.13)+offsetX;
      shape(p.slat,[[side*4+offsetX,y,z+opening],[inner,y+opening,z+opening],
        [inner,y+opening,z+.065+opening],[side*4+offsetX,y,z+.065+opening]]);
    }
  }
  if (level >= 3 && opening < .92) {
    for (const x of [-.85,.84]) {
      flat('#665249',x-.05,-1.5,x+.06,7,2.035 + opening*8.4);
      worldLine('#9a7761',[x,2.01+opening*8.4,.9],[x+Math.sign(x)*.26,1.60+opening*8.4,3.2],2);
    }
  }
}
function fractures(level) {
  if (!level) return;
  const cracks = [
    [[-2.3,1.42,6.96],[-2.06,.81,6.96],[-2.17,.58,6.96],[-1.65,.04,6.96]],
    [[3.98,1.68,4.5],[3.98,.95,4.2],[3.98,.58,4.39],[3.98,-.31,4.12]],
    [[-3.98,1.96,3.6],[-3.98,1.53,3.51],[-3.98,.98,3.66],[-3.98,-.67,3.1]],
    [[1.1,2.08,6.96],[1.47,1.50,6.96],[1.23,1.16,6.96],[1.64,.78,6.96]]
  ];
  for (const crack of cracks.slice(0,level)) {
    for (let i=1;i<crack.length;i++) {
      worldLine('#15141a',crack[i-1],crack[i],2);
      const tip = crack[i].map((v,j) => v + (j === 1 ? -.19 : j === 0 ? (v > 3.9 || v < -3.9 ? 0 : .14) : .12));
      worldLine('#252128',crack[i],tip);
    }
  }
}
function roomShell(level,opening) {
  const p = palettes[level];
  if (level === 4) tornWall();
  else front(p.wall,-4,-1.35,4,2.10,7);
  side(p.left,-4,-2,-1.35,7,2.10);
  side(p.right,4,-2,-1.35,7,2.10);
  if (level < 3) {
    flat(p.floor,-4,-2,4,7,-1.35);
    for (let z=-1;z<7;z++) flat(p.slat,-4,z,4,z+.018,-1.343);
    for (let x=-3;x<=3;x++) flat(p.shadow,x,-2,x+.021,7,-1.343);
  }
  roof(opening,level);
  if (level < 4) front(p.shadow,-4,-1.35,4,-.72);
  side(p.shadow,-3.99,-2,-1.35,7,-.72);
  side(p.shadow,3.99,-2,-1.35,7,-.72);
  if (level < 4) front(p.trim,-4,-.77,4,-.707);
  side(p.trim,-3.985,-2,-.77,7,-.707);
  side(p.trim,3.985,-2,-.77,7,-.707);
  for (let i=0;i<41;i++) {
    const y = ((i*113)%97)/37-.64, z = ((i*59)%223)/25;
    if (level < 4) front(i%3?p.slat:p.shadow,z-4.4,y,z-4.24,y+.012);
    side(p.slat,-3.98,z-1.3,y,z-1.1,y+.013);
    side(p.slat,3.98,z-1.4,y,z-1.26,y+.016);
  }
  if (level < 4) fractures(level);
}
function hall(level) {
  const p = palettes[level];
  front('#151417',-1.30,-1.35,1.30,1.68,6.91);
  front(p.trim,-1.21,-1.35,1.21,1.55,6.90);
  front('#090c11',-1.10,-1.35,1.10,1.44,6.89);
  const depth = level >= 3 ? '#332121' : '#1f292d';
  front(depth,-.91,-1.35,.91,1.24,6.86);
  front('#0b0d10',-.73,-1.35,.73,1.03,6.85);
  flat(depth,-1.05,6.65,1.05,7.1,-1.34);
  front(p.trim,-.52,1.74,.52,1.97);
  worldText('HALL',point(0,1.806,6.97),p.light,66);
  front('#121718',-3.70,-.32,-1.63,1.21);
  front(p.trim,-3.65,-.27,-1.69,1.16);
  front(level>2?'#211f24':'#273331',-3.56,-.17,-1.77,1.07);
  worldText(course().number+' / 05',point(-2.64,.73,6.96),p.light,48);
  for (let i=0;i<4;i++) front(p.slat,-3.28,.44-i*.13,-2.10-i*.12,.455-i*.13);
  front('#1b1719',1.86,.08,3.13,1.37);
  front('#a79073',1.93,.15,3.06,1.29);
  worldText('NIGHT',point(2.50,.94,6.96),'#31252b',46);
  worldText('EXAMINATION',point(2.50,.65,6.96),'#31252b',33);
  worldText('ROOM 013',point(2.50,.35,6.96),'#57383c',34);
  if (level >= 3) {
    for (let i=0;i<8;i++) {
      const x = -.97+i*.28, y = -.64+Math.sin(i*13)*.24;
      shape('#24191e',[[x,-1.35,6.82],[x+.35,-1.35,6.82],[x+.23,y,6.82],[x+.06,y+.17,6.82]]);
    }
  }
}
function windowView(level,time) {
  if (level) { shatteredWindow(level,time); return; }
  side('#161b24',-3.95,2.38,-.68,5.71,1.66);
  side(palettes[0].trim,-3.94,2.49,-.56,5.6,1.54);
  side('#182a36',-3.92,2.64,-.47,5.45,1.43);
  side('#32414d',-3.91,2.66,-.30,5.43,1.41);
  side('#a1a394',-3.90,4.62,.94,4.96,1.23);
  for (let i=0;i<6;i++) {
    const z = 2.7+i*.46;
    worldLine('#172630',[-3.89,-.47,z],[-3.89,1.2-(i%3)*.24,z-.24],2);
  }
  side(palettes[0].trim,-3.86,4.04,-.39,4.14,1.43);
  side(palettes[0].trim,-3.86,2.64,.34,5.45,.43);
  flat(palettes[0].trim,-4,2.42,-3.65,5.68,-.60);
}
function shelfFungus(origin,size,time,lit=false) {
  const c = cameraPoint(origin);
  if (c[2] < .19) return;
  const [x,y] = project(c), s = size*focal/c[2], swing = Math.sin(time*1.7+x*.2)*s*.045;
  screenPoly(lit?'#9c84bb':'#665673',[[x-s*.09,y+s*.65],[x+s*.12,y+s*.65],[x+s*.14+swing,y],[x+swing-s*.09,y]]);
  screenPoly(lit?'#7d669d':'#493952',[[x-s*.87,y+s*.08],[x-s*.63,y-s*.31],[x-s*.24,y-s*.48],
    [x+s*.22,y-s*.53],[x+s*.55,y-s*.35],[x+s*.92,y+s*.03],[x+s*.60,y+s*.20],[x-s*.58,y+s*.24]]);
  screenPoly(lit?'#cca5ec':'#8f6ca7',[[x-s*.57,y-s*.23],[x-s*.24,y-s*.44],[x+s*.19,y-s*.48],
    [x+s*.43,y-s*.34],[x-s*.18,y-s*.32]]);
  for (let i=-3;i<=3;i++) line(lit?'#cdb2cb':'#a887aa',[x+i*s*.16,y+s*.08],[x+i*s*.19,y+s*.20]);
}
function utilityWall(level,time) {
  if (level >= 2) { colonizedWall(level,time); return; }
  const p = palettes[level];
  side('#141419',3.95,2.43,-1.12,5.04,1.51);
  side(p.trim,3.94,2.55,-1.03,4.93,1.40);
  side(p.shadow,3.92,2.64,-.95,4.84,1.30);
  for (let i=0;i<7;i++) side(p.slat,3.91,2.73+i*.30,-.94,2.78+i*.30,1.30);
  side('#807562',3.88,3.53,.05,3.83,.19);
  worldText('SERVICE',point(3.90,1.64,3.75),p.light,56);
}
function desk(level,position=deskOffset(),packet=true) {
  const [x,y,z] = position;
  const light = ['#976e53','#5b6870','#7e6380','#926150','#6f5476'][level];
  const timber = (x1,y1,z1,x2,y2,z2,colors) => block(x1+x,y1+y,z1+z,x2+x,y2+y,z2+z,colors);
  const top = (color,x1,z1,x2,z2,at) => flat(color,x1+x,z1+z,x2+x,z2+z,at+y);
  timber(-1.16,-1.34,.82,-1.05,-.61,1.79,['#302626','#241e20','#4b3933']);
  timber(1.05,-1.34,.82,1.16,-.61,1.79,['#302626','#241e20','#4b3933']);
  timber(-1.24,-.76,.48,1.24,-.582,1.94,['#4c3334','#31262a',light]);
  for (let i=0;i<8;i++) top(i%2?'#6f4b40':'#7d5747',-1.23,.53+i*.17,1.23,.55+i*.17,-.578);
  top('#503b38',sheetPlane.left-.027,sheetPlane.near-.024,sheetPlane.right+.027,sheetPlane.far+.02,-.574);
  if (packet) {
    top(run.mode==='title'?'#c6ae8f':'#cdb791',sheetPlane.left,sheetPlane.near,sheetPlane.right,sheetPlane.far,-.57);
    for (let i=0;i<7;i++) top(i===0?'#7d5347':'#9d836d',-.48,1.62-i*.088,.44,1.638-i*.088,-.569);
  } else top('#bc8e6f',-.38,.85,.36,1.72,-.564);
  top('#df9d50',.67,.84,.708,1.50,-.558);
  top('#302826',.67,1.50,.708,1.57,-.557);
  if (level === 1) {
    const stroke = run.room.age-run.room.strokeAt;
    const drop = stroke < .35 ? Math.sin(stroke/.35*Math.PI)*.24 : 0;
    timber(.81,-.57,1.35,1.16,-.39,1.74,['#664f42','#3e3435','#8c6f5b']);
    limb([x+.99,y-.40,z+1.57],[x+.95,y+.32-drop,z+1.25],.034,.042,'#625559','#be9672');
    timber(.80,.28-drop,1.20,1.10,.36-drop,1.30,['#79604f','#50413f','#c39066']);
  } else {
    timber(-1.12,-.578,1.31,-.76,-.515,1.72,['#443133','#39232c','#7e5d56']);
    timber(-1.01,-.515,1.46,-.95,-.06,1.54,['#5e493f','#3c333a','#8f7263']);
    timber(-1.12,-.12,1.34,-.74,-.016,1.68,['#665044','#4d3c3c','#a87a60']);
    top(palettes[level].light,-1.035,1.43,-.84,1.59,-.016);
  }
}
function horse(progress,time,entry) {
  const side = entry === 'left' ? -1 : entry === 'right' ? 1 : 0;
  const start = side ? [side*3.58,-1.32,4.25] : [.14,-1.32,6.90];
  const end = [side*.82,-1.32,2.15];
  const floor = mixPoint(start,end,progress**1.28);
  const forward = direction(end[0]-start[0]+.18*Math.sin(progress*5),end[2]-start[2]);
  const ribs = offset(floor,forward,0,1.01+.059*Math.sin(time*7+progress*10));
  groundShadow(floor,.69,.44);
  for (const end of [-1,1]) for (const side of [-1,1]) {
    const shoulder = offset(ribs,forward,side*.25,-.13,end*.47);
    const [step,lift] = gait(time*.92 + (side===end ? .5 : 0),.52);
    const hoof = offset(floor,forward,side*.25,lift,end*.48+step);
    const joint = offset(mixPoint(shoulder,hoof,.50),forward,0,0,-end*.085);
    limb(shoulder,joint,.106,.066,'#302a33','#73716a');
    limb(joint,hoof,.071,.044,'#302a33','#5d625d');
  }
  limb(offset(ribs,forward,0,.05,-.69),offset(ribs,forward,0,.02,.48),.29,.33,'#38323c','#75726b');
  for (let i=0;i<4;i++) {
    const a = offset(ribs,forward,-.285,.155,-.27+i*.17);
    const b = offset(ribs,forward,-.33,-.15,-.36+i*.17);
    limb(a,b,.015,.019,'#928b7a');
  }
  const head = offset(ribs,forward,.10,.59-.19*progress**4,.78);
  limb(offset(ribs,forward,0,-.03,.42),head,.27,.13,'#3c3541','#706c68');
  const face = (color,points) => shape(color,points.map(([a,b])=>offset(head,forward,a,b,.035)));
  face('#23212a',[[-.25,.14],[-.27,.43],[-.13,.31],[.12,.31],[.24,.40],[.26,.14],[.19,-.18],[.12,-.43],[-.11,-.42],[-.21,-.16]]);
  face('#a69f8d',[[-.17,.24],[.15,.22],[.20,.13],[.13,-.17],[.085,-.36],[-.085,-.36],[-.14,-.13],[-.20,.12]]);
  face('#4e4750',[[-.13,.06],[-.05,.10],[-.07,-.016],[-.16,-.015]]);
  face('#4e4750',[[.05,.10],[.13,.05],[.16,-.02],[.065,-.017]]);
  face('#edcf99',[[-.126,.055],[-.073,.051],[-.083,.026],[-.134,.026]]);
  face('#edcf99',[[.078,.051],[.130,.054],[.137,.028],[.082,.027]]);
  face('#484049',[[-.09,-.28],[.09,-.28],[.073,-.35],[-.072,-.35]]);
}
function walker(progress,time,turn,proctor=false,floorY=-1.34) {
  const z = proctor ? mix(6.75,3.40,progress) : mix(6.88,2.13,progress**1.2);
  const forward = direction(Math.sin(turn),-Math.cos(turn));
  const floor = [proctor ? .24 : -.05+.18*Math.sin(progress*8),floorY,z];
  const torso = offset(floor,forward,0,.94 + Math.abs(Math.sin(time*4))*progress*.055);
  const shoulders = offset(torso,forward,.025,.52,.08);
  const head = offset(shoulders,forward,-.042,.29,.055);
  const edge = proctor ? '#6c6574' : '#7c665c';
  const coat = proctor ? '#383744' : '#453334';
  const skin = proctor ? '#a58f82' : '#8d7565';
  groundShadow(floor,.58,.46);
  for (const sign of [-1,1]) {
    const [step,lift] = gait(time*.76+(sign===1?.5:0),progress*.63);
    const foot = offset(floor,forward,sign*.14,lift,step);
    const hip = offset(torso,forward,sign*.17,-.13,.04);
    limb(hip,mixPoint(hip,foot,.52),.13,.088,coat,edge);
    limb(mixPoint(hip,foot,.52),foot,.089,.057,'#322729',edge);
    const shoulder = offset(shoulders,forward,sign*.33,-.06,0);
    const elbow = offset(shoulders,forward,sign*.41,-.36,progress*.17);
    const hand = offset(torso,forward,sign*.45,-.21,.14+progress*.25);
    limb(shoulder,elbow,.125,.087,coat,edge);
    limb(elbow,hand,.085,.052,coat,edge);
    limb(hand,offset(hand,forward,sign*.048,-.12,.07),.058,.034,skin,'#3d3133');
  }
  limb(offset(torso,forward,0,-.19,-.03),shoulders,.30,.38,coat,edge);
  limb(shoulders,head,.14,.23,skin,'#35292f');
  const face = (color,points) => shape(color,points.map(([a,b])=>offset(head,forward,a,b,.12)));
  if (Math.cos(turn) > -.12) {
    face(proctor?'#9b8a7b':'#756558',[[-.17,.12],[-.10,.19],[.09,.20],[.16,.13],[.16,-.12],[.055,-.21],[-.10,-.17]]);
    face('#2b2229',[[-.12,.056],[-.032,.043],[-.044,.003],[-.13,.015]]);
    face('#2b2229',[[.034,.048],[.121,.071],[.12,.014],[.043,.002]]);
    face('#382a2c',[[-.060,-.074],[.069,-.075],[.054,-.125],[-.054,-.116]]);
    if (proctor) {
      const p = screenPoint(offset(head,forward,-.084,.04,.132));
      const q = screenPoint(offset(head,forward,-.133,-.208,.132));
      if (p && q) {
        disk('#d5a771',p[0],p[1],Math.max(2,8/z),9);
        disk('#30313c',p[0],p[1],Math.max(1,4/z),9);
        line('#a67d55',p,q);
      }
    } else face('#dcb9a1',[[.068,.047],[.111,.048],[.105,.025],[.064,.019]]);
  }
  for (let i=0;i<5;i++) {
    const a = offset(torso,forward,(i-2)*.12,-.21,.15);
    const b = offset(a,forward,.03,-.13-(i%2)*.16,.04);
    limb(a,b,.033,.007,'#2a2427');
  }
}
function anglerLure(x,y,size,time) {
  const beat = Math.sin(time*3.7);
  return [x+(.56+.11*beat)*size,y-(.74+.09*beat)*size];
}
function angler(x,y,size,time,openness=1) {
  const s = size, beat = Math.sin(time*3.7), gape = .16+.12*openness;
  const shape = (color,points) => screenPoly(color,points.map(([a,b])=>[x+a*s,y+b*s]));
  shape('#1c3445',[[-.41,.05],[-.85,-.19],[-1.19,-.58+beat*.08],[-1.17,.45],
    [-.80,.24],[-.41,.37]]);
  shape('#4a6c7c',[[-.69,-.02],[-1.15,-.54+beat*.08],[-.95,-.01],[-1.17,.36],[-.80,.20]]);
  shape('#30586a',[[-.79,.11],[-.51,-.32],[-.10,-.48],[.32,-.42],[.74,-.19],[.85,.14],
    [.60,.42],[.06,.49],[-.53,.36]]);
  shape('#57878d',[[-.50,-.26],[-.05,-.42],[.30,-.35],[.58,-.16],[.33,-.22],[-.29,-.18]]);
  shape('#1b2738',[[.06,.01],[.44,-gape],[.75,-.10],[.81,.15],[.56,.31],[.24,.23]]);
  for (let i=0;i<6;i++) {
    const a=.28+i*.078;
    shape('#a9bdaf',[[a,-.09],[a+.057,-.10],[a+.018,.020+i%2*.031]]);
    shape('#839f9c',[[a,.23],[a+.05,.23],[a+.032,.144-i%2*.037]]);
  }
  disk('#e5c787',x+.53*s,y-.26*s,Math.max(2,s*.045),7);
  const end = anglerLure(x,y,s,time);
  line('#58797e',[x-.11*s,y-.40*s],[x+.22*s,y-.83*s],Math.max(1,s*.035));
  line('#82aaa0',[x+.22*s,y-.83*s],end,Math.max(1,s*.022));
  disk('#96dab34a',end[0],end[1],Math.max(4,s*.15),9);
  disk('#c3f5b6',end[0],end[1],Math.max(2,s*.056),8);
  return end;
}
function bloom(progress,time) {
  const origin = [mix(3.81,1.38,progress),mix(.10,-.24,progress),mix(3.84,2.04,progress)];
  const c = cameraPoint(origin);
  if (c[2]<.18) return;
  const [x,y]=project(c), s = (.43+.57*progress)*focal/c[2];
  for (let i=0;i<11;i++) {
    const a=i/11*Math.PI*2 + .12*Math.sin(time+i);
    line('#493f58',[x,y],[x+Math.cos(a)*s*1.05,y+Math.sin(a)*s*.83],Math.max(2,s*.065));
    disk(i%3?'#786192':'#b591ce',x+Math.cos(a)*s*.96,y+Math.sin(a)*s*.72,s*(.12+(i%3)*.03),7,0,.72);
  }
  disk('#74608d',x,y,s*.82,9,0,.79);
  disk('#261d35',x,y,s*.52,9,.21,.79);
  disk('#483456',x,y,s*.30,8,0,.78);
  for (let i=0;i<16;i++) {
    const a=i/16*Math.PI*2;
    const b=[x+Math.cos(a)*s*.50,y+Math.sin(a)*s*.37];
    const c=[x+Math.cos(a+.08)*s*.32,y+Math.sin(a+.08)*s*.25];
    line('#bf99c3',b,c,Math.max(1,s*.027));
  }
}
function parallax(progress,time) {
  const c = screenPoint([.25*Math.sin(time),mix(2.3,1.97,progress),mix(3.4,1.24,progress)]);
  if (!c) return;
  const [x,y] = c, r = (27+57*progress);
  disk('#e3b8dd30',x,y,r*1.17,12,time*.32);
  disk('#c599d0',x,y,r,12,time*.32);
  disk('#4a345d',x+4,y-2,r*.94,12,-time*.13);
  disk('#0c0b17',x+7,y+1,r*.83,12,time*.16);
  const crown = regularPoints(x+2,y,r*.66,8,-time*.34);
  crown.forEach(([a,b],i) => disk(i%2?'#9e7bac':'#e0afc4',a,b,2+i%2,4));
  disk('#e5b2bf',x-3,y,r*.12,5);
  disk('#1a1329',x+1,y,r*.076,4,time);
}
function dust(time,level,opening) {
  const w = canvas.width,h = canvas.height;
  if (level < 1) return;
  const color = ['#0000','#a2b4bf59','#d3a6e885','#cfa78059','#b6a2df68'][level];
  for (const [x,y,k] of stars.slice(0,level*10+7)) {
    const drift = reducedMotion ? 0 : time*(.020+k*.023);
    box(color,(x+.022*Math.sin(time+x*40))*w,((y+drift*(level===1?-1:1)+100)%1)*h,1+k*1.4,1+k);
  }
  if (opening > .05 && opening < .96 && !reducedMotion) {
    for (const [x,y,k] of stars.slice(25,69)) {
      const px = x*w+(x-.5)*opening*w*.51, py = (y-.60+opening*(1.7-k*.8))*h;
      screenPoly(k>.5?'#5c5264':'#252331',[[px,py],[px+4+k*8,py+2],[px+3,py+3+k*6]]);
    }
  }
}
function placeTargets(points=[]) {
  targets.forEach((button,i) => {
    const pos = points[i];
    button.hidden = !pos;
    if (!pos) return;
    button.style.left = 100*pos[0]/canvas.width+'%';
    button.style.top = 100*pos[1]/canvas.height+'%';
  });
}
function practicalPanel(title,y,color) {
  const w = canvas.width,h = canvas.height;
  const width = Math.min(w*.85,h*1.04), height = h*.19, x = (w-width)/2;
  box('#18151b',x-4,y-4,width+8,height+12);
  box('#605263',x,y,width,height);
  box('#272632',x+3,y+3,width-6,height-7);
  box('#1a1b24',x+7,y+9,width-14,height-17);
  for (const f of [.04,.96]) for (const yy of [y+5,y+height-7]) box('#b6a28b',x+width*f-1,yy,3,2);
  label(title,w*.5,y+14,color,Math.min(9,width*.076));
  return [x,width,height];
}
function shoes(trial) {
  const y = canvas.height*.555;
  const [x,w,h] = practicalPanel('EQUINE WARD',y,'#e6b181');
  const points = [];
  for (let i=0;i<3;i++) {
    const cx = x+w*(.19+i*.31), cy = y+h*.64, r = Math.min(w*.094,22);
    const on = trial.cue === i || (trial.pressedUntil > trial.time && trial.pressed === i);
    const points = regularPoints(cx,cy-r*.23,r,12,Math.PI/6);
    screenPoly(on?'#ffcd84':'#987b62',points);
    disk('#211c22',cx,cy-r*.47,r*.61,12,Math.PI/6);
    box('#211c22',cx-r*.48,cy-r*1.31,r*.97,r*.57);
    for (const side of [-1,1]) for (let j=0;j<3;j++) box('#2e2529',cx+side*r*(.71-j*.105)-1,cy-r*.17+j*r*.24,2,2);
  }
  for (let i=0;i<3;i++) points.push([x+w*(.19+i*.31),y+h*.63]);
  return points;
}
function beamFish(trial) {
  const t = trial.time;
  const f = ease(trial.score/trial.spec.goal);
  return [mix(.47+.24*Math.sin(t*.83),.82,f),mix(.60+.14*Math.cos(t*1.32),.79,f)];
}
function beamRadius() { return Math.min(canvas.height*.142,canvas.width*.25); }
function beamSize(trial) {
  return Math.min(canvas.width*.18,canvas.height*.16)*(1-.45*trial.score/trial.spec.goal);
}
function anglerInBeam(trial) {
  const [tx,ty] = beamFish(trial), [a,b] = trial.aim;
  const x = tx*canvas.width, y = ty*canvas.height;
  const lure = anglerLure(x,y,beamSize(trial),trial.time);
  return [[x,y],lure].some(([px,py]) => Math.hypot(px-a*canvas.width,py-b*canvas.height) < beamRadius()*.80);
}
function searchlight(trial) {
  const w = canvas.width,h = canvas.height;
  const [tx,ty] = beamFish(trial);
  const lure = angler(tx*w,ty*h,beamSize(trial),trial.time);
  const [x,y] = [trial.aim[0]*w,trial.aim[1]*h], r = beamRadius();
  const ring = regularPoints(x,y,r,14);
  screenPoly('#bbd9c928',[[w*.46,h],[x-r*.63,y+r*.51],[x+r*.63,y+r*.51],[w*.54,h]]);
  screenPoly(trial.lit?'#b8d8bb48':'#b6d5cd24',ring);
  ctx.beginPath();
  ctx.rect(0,0,w,h);
  ring.forEach(([a,b],i)=>i?ctx.lineTo(a,b):ctx.moveTo(a,b));
  ctx.closePath();
  ctx.fillStyle = '#070d19ca';
  ctx.fill('evenodd');
  for (let i=0;i<ring.length;i++) line(trial.lit?'#d9f9bb':'#7a9c99',ring[i],ring[(i+1)%ring.length]);
  disk('#a8d7a77d',lure[0],lure[1],5,8);
  disk('#e1f4b0',lure[0],lure[1],2.5,7);
  line('#cbdec1',[x-3,y],[x+3,y]);
  line('#cbdec1',[x,y-3],[x,y+3]);
}
function vents(trial) {
  const y = canvas.height*.50;
  const [x,w,h] = practicalPanel('SPORE MANIFOLD',y,'#d6b2e9');
  for (let i=0;i<3;i++) {
    const px = x+w*(.19+i*.31), py = y+h*.60, r = Math.min(w*.102,25);
    const open = trial.open & 1<<i;
    const edge = open?'#dca68a':'#83c3a4';
    disk('#746681',px,py,r,8);
    disk('#15151e',px,py,r*.80,8);
    disk(edge,px,py,r*.58,8);
    disk(open?'#a36370':'#455f5b',px,py,r*.41,8);
    label('ABC'[i],px,py+3,'#f3d8c7',Math.min(10,r*.9));
    box('#47324f',px-1,y+h*.76,3,h*.27);
    if (open) for (let j=0;j<9;j++) {
      const phase = (trial.time*.65+j*.13)%1;
      box('#c79cdd90',px+Math.sin(phase*8+j)*r*phase,py-phase*h*.53,1+j%2,2);
    }
  }
  const by = y+h+canvas.height*.085;
  return [0,1,2].map(i => [x+w*(.19+i*.31),by]);
}
function cloth(trial) {
  const x = canvas.width*.5,y = canvas.height*(trial.held?.78:.83), r=Math.min(canvas.width*.22,62);
  screenPoly('#24202a',[[x-r*1.6,canvas.height],[x-r*.9,y-r*.1],[x-r*.45,y],[x-r*.83,canvas.height]]);
  screenPoly('#2d222d',[[x+r*1.6,canvas.height],[x+r*.9,y-r*.1],[x+r*.45,y],[x+r*.83,canvas.height]]);
  screenPoly(trial.held?'#9b6664':'#7c5b5e',[[x-r*.93,y+r*.05],[x-r*.78,y-r*.31],[x+r*.63,y-r*.33],
    [x+r*.91,y-r*.08],[x+r*.55,y+r*.30],[x-r*.13,y+r*.41],[x-r*.67,y+r*.30]]);
  line('#bf8980',[x-r*.60,y-r*.24],[x+r*.48,y-r*.25],2);
  box('#31242b',x-r*.56,y+r*.17,r*1.12,4);
  box('#b9d1a8',x-r*.56,y+r*.17,r*1.12*trial.air,4);
  return [[x,y]];
}
function orrery(trial) {
  const w = canvas.width,h = canvas.height;
  const [tx,ty,tr] = orreryTarget, [mx,my,mr] = trial.moon;
  const x = tx*w,y = ty*h, sr = tr*h;
  const ready = moonMatches(trial);
  const radius = Math.min(h*.29,w*.45);
  disk('#0f121c',x,y,radius,24,Math.PI/24);
  disk('#71566c',x,y,radius*.95,24,Math.PI/24);
  disk('#201c2d',x,y,radius*.91,24,Math.PI/24);
  for (const [sx,sy,k] of stars.slice(0,40)) {
    const px=(sx-.5)*radius*1.8,py=(sy-.5)*radius*1.8;
    if (Math.hypot(px,py)<radius*.87) box(k>.6?'#aa8fac':'#665a78',x+px,y+py,1,1);
  }
  line('#664f67',[x-radius*.83,y],[x+radius*.83,y]);
  line('#664f67',[x,y-radius*.83],[x,y+radius*.83]);
  for (const [a,b] of regularPoints(x,y,radius*.81,16)) disk('#b28f9d',a,b,2,4);
  disk(ready?'#ffe9d8':'#c16c64',x,y,sr*1.16,14);
  disk(ready?'#d7c8ed':'#f2b68e',x,y,sr*1.03,14);
  disk('#221c35',mx*w,my*h,mr*h,14);
  if (!ready) {
    line('#fce1b8',[x-6,y],[x+6,y]);
    line('#fce1b8',[x,y-6],[x,y+6]);
    line('#b4aed5',[mx*w-4,my*h],[mx*w+4,my*h]);
    line('#b4aed5',[mx*w,my*h-4],[mx*w,my*h+4]);
  }
  return [[w*.27,h*.83],[w*.44,h*.83],[w*.68,h*.83]];
}
function practicalObjects() {
  const trial = run.trial;
  if (run.mode !== 'practical' || !trial || !focused()) { placeTargets(); return; }
  let points;
  switch (trial.spec.id) {
    case 'ward': points = shoes(trial); break;
    case 'beam': searchlight(trial); break;
    case 'vents': points = vents(trial); break;
    case 'breath': points = cloth(trial); break;
    case 'orrery': points = orrery(trial); break;
  }
  placeTargets(points);
}
function renderScene(time) {
  const level = run.course;
  const t = run.cinematic?.time ?? 0;
  const opening = ease((t-2.55)/3.65);
  sky(time,opening);
  if (level === 4 && t < 2.45) parallax(.15+.07*Math.sin(time*.9),time);
  roomShell(level,opening);
  if (level < 4) hall(level);
  windowView(level,time);
  if (level >= 3) peatPit(level,time);
  floodFloor(time);
  utilityWall(level,time);
  const trial = run.trial;
  if (run.threat || run.retreat) {
    const progress = run.threat ? clamp(run.threat.age/run.threat.limit) :
      clamp(run.retreat.progress * (run.retreat.until-run.elapsed)/.95);
    horse(progress,time,(run.threat ?? run.retreat).approach.view);
  } else if (trial?.spec.id === 'breath') {
    const phase = breathPhase(trial.time);
    const turn = phase < 1.95 ? 0 : phase < 2.75 ? Math.PI*ease((phase-1.95)/.8) :
      phase > 5.58 ? Math.PI*(1-ease((phase-5.58)/.82)) : Math.PI;
    walker(.29,trial.time,turn);
  } else if (run.mode === 'title' || (level===0 && run.courseAge<4.7 && run.mode==='running') || (t>0 && t<2.35)) {
    walker(t>0?ease(t/2.6)*.72:0,time,0,true);
  } else if (level === 3) {
    walker(.22+.085*Math.sin(time*.7),time,Math.sin(time)*.73,false,-2.79);
  }
  if (level === 1) swimmingAngler(time);
  if (level === 4) suspendedRoom(time);
  if (level >= 3) {
    const active = level === 3 ? run.room.station : 0;
    for (let i=bogStations.length-1;i>=0;i--) {
      if (i === active) continue;
      const [x,z] = bogStations[i];
      const y = level === 4 ? damagePhase()*(.50+.32*Math.sin(time*1.3+i)+i*.15) : 0;
      desk(level,[x,y,z],false);
    }
  }
  if (!run.room?.crossing) desk(level);
  if (level === 4) tetherClamps();
  floodFloor(time,true);
  livingRoots(time);
  dust(time,level,opening);
  if (t > 12.2) box('rgba(8,8,13,'+ease((t-12.2)/1.9)+')',0,0,canvas.width,canvas.height);
  practicalObjects();
  placeExamSheet();
}

title();
requestAnimationFrame(frame);
