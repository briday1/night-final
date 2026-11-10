'use strict';

const {app,BrowserWindow,Menu} = require('electron');
const path = require('node:path');

const smoke = process.argv.includes('--smoke-test');
const debug = process.argv.includes('--debug-exam');
let window;

async function launch() {
  Menu.setApplicationMenu(null);
  window = new BrowserWindow({
    show:false, width:1280, height:800, minWidth:640, minHeight:400,
    title:'Night Final', backgroundColor:'#08090b', autoHideMenuBar:true,
    webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,spellcheck:false}
  });
  window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  window.webContents.on('will-navigate',event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_page,_permission,callback) => callback(false));
  window.webContents.on('before-input-event',(event,input) => {
    if (input.type !== 'keyDown' || input.key !== 'F11' || input.isAutoRepeat) return;
    event.preventDefault();
    window.setFullScreen(!window.isFullScreen());
  });
  window.on('closed',() => { window = null; });

  await window.loadFile(path.join(__dirname,'index.html'),{query:debug ? {debug:'1'} : {}});
  if (smoke) {
    const ready = await window.webContents.executeJavaScript(
      "document.title === 'Night Final' && !!document.getElementById('begin')"
    );
    app.exit(ready ? 0 : 1);
  } else window.show();
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance',() => {
    if (window?.isMinimized()) window.restore();
    window?.focus();
  });
  app.whenReady().then(launch).catch(error => { console.error(error); app.exit(1); });
  app.on('window-all-closed',() => app.quit());
}
