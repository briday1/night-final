import {createHash} from 'node:crypto';
import {cp,mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..',import.meta.url));
const dist = join(root,'dist');
const scripts = ['curriculum.js','proctor-art.js','game.js','scene.js'];
const pkg = JSON.parse(await readFile(join(root,'package.json'),'utf8'));

async function bundle() {
  let html = await readFile(join(root,'index.html'),'utf8');
  const hashes = [];
  for (const name of scripts) {
    const marker = '<script src="'+name+'"></script>';
    if (!html.includes(marker)) throw new Error('Missing script '+name);
    const code = (await readFile(join(root,name),'utf8')).replace(/<\/script/gi,'<\\/script');
    hashes.push("'sha256-"+createHash('sha256').update(code).digest('base64')+"'");
    html = html.replace(marker,() => '<script>'+code+'</script>');
  }
  return html.replace("script-src 'self'",'script-src '+hashes.join(' '));
}
async function web() {
  await writeFile(join(dist,'Night-Final.html'),await bundle());
  console.log('Created dist/Night-Final.html');
}
async function windows() {
  const {packager} = await import('@electron/packager');
  const appDir = await mkdtemp(join(tmpdir(),'night-final-package-'));
  try {
    await cp(join(root,'desktop.cjs'),join(appDir,'desktop.cjs'));
    await writeFile(join(appDir,'index.html'),await bundle());
    await writeFile(join(appDir,'package.json'),JSON.stringify({
      name:pkg.name,productName:pkg.productName,version:pkg.version,main:pkg.main,description:pkg.description
    },null,2)+'\n');
    const bundles = await packager({
      dir:appDir, name:'Night Final', executableName:'Night Final',
      platform:'win32', arch:'x64', electronVersion:pkg.devDependencies.electron,
      icon:join(root,'night-final.ico'), out:dist, overwrite:true, asar:true, prune:false
    });
    for (const bundle of bundles) console.log('Created '+bundle);
  } finally {
    await rm(appDir,{recursive:true,force:true});
  }
}

const task = process.argv[2];
if (task !== 'web' && task !== 'win') throw new Error('Use the web or win build target.');
await mkdir(dist,{recursive:true});
await (task === 'web' ? web() : windows());
