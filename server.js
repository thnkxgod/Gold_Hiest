const http=require('http'),fs=require('fs'),path=require('path'),os=require('os');
const {WebSocketServer}=require('ws');
const FILE=path.join(__dirname,process.argv[2]||'gold-heist.html'),PORT=8765;
const ip=()=>{for(const l of Object.values(os.networkInterfaces()))for(const a of l||[])if(a.family==='IPv4'&&!a.internal)return a.address;return'localhost';};
const srv=http.createServer((req,res)=>{
  if(req.url==='/info'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({url:`http://${ip()}:${PORT}`}));}
  else if(req.url==='/'||req.url.startsWith('/?')||req.url==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});fs.createReadStream(FILE).pipe(res);}
  else{res.writeHead(404);res.end();}
});
const wss=new WebSocketServer({server:srv});
let host=null,next=1;const guests=new Map();
const toHost=o=>{if(host&&host.readyState===1)host.send(JSON.stringify(o));};
wss.on('connection',(ws,req)=>{
  if(req.url.startsWith('/host')){
    if(host&&host.readyState===1){ws.send(JSON.stringify({t:'err',msg:'A host is already running on this server.'}));ws.close();return;}
    host=ws;
    ws.on('message',d=>{let m;try{m=JSON.parse(d);}catch(e){return;}
      if(m.kick!=null){const g=guests.get(m.kick);if(g)g.close();}
      else if(m.cid!=null){const g=guests.get(m.cid);if(g&&g.readyState===1)g.send(m.data);}});
    ws.on('close',()=>{for(const g of guests.values())g.close();guests.clear();host=null;});
  }else{
    if(!host||host.readyState!==1){ws.send(JSON.stringify({t:'nohost'}));ws.close();return;}
    const cid=next++;guests.set(cid,ws);toHost({ev:'open',cid});
    ws.on('message',d=>toHost({ev:'msg',cid,data:d.toString()}));
    ws.on('close',()=>{guests.delete(cid);toHost({ev:'close',cid});});
  }
});
srv.listen(PORT,'0.0.0.0',()=>console.log(`Gold Heist: http://${ip()}:${PORT}`));