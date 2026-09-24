// Attendance backend: zero dependencies. Run: node server.js  ->  http://localhost:3000
const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3000,DB=path.join(__dirname,'data.json'),PAGE=path.join(__dirname,'attendance_updated.html');
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
const now=()=>new Date().toISOString();
const seed={state:{sess:{},reqs:[],audit:[],th:75,n:0,updated:0},nid:3,notices:[
 {id:1,title:'Mid-semester exams start next Monday',body:'Timetables are on the department boards.',ts:now()},
 {id:2,title:'Attendance below the threshold needs HOD approval',body:'Check the Low attendance tab before exam forms open.',ts:now()},
 {id:3,title:'Faculty: mark attendance before the end of each session',body:'Earlier days need a correction request.',ts:now()}]};
let db=seed;try{db={...seed,...JSON.parse(fs.readFileSync(DB,'utf8'))}}catch(e){}
const persist=()=>{fs.writeFileSync(DB+'.tmp',JSON.stringify(db));fs.renameSync(DB+'.tmp',DB)};
const send=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json',...CORS});res.end(JSON.stringify(obj))};
const readBody=req=>new Promise((ok,no)=>{let d='',n=0;req.on('data',c=>{n+=c.length;if(n>5e6){no(new Error('Body too large'));req.destroy()}else d+=c});
 req.on('end',()=>{try{ok(d?JSON.parse(d):{})}catch(e){no(new Error('Invalid JSON'))}})});
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://x'),p=u.pathname,m=req.method;
 if(m==='OPTIONS'){res.writeHead(204,CORS);return res.end()}
 try{
  if(m==='GET'&&(p==='/'||p==='/index.html')){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(fs.readFileSync(PAGE))}
  if(p==='/api/health')return send(res,200,{ok:true,updated:db.state.updated,time:now()});
  if(p==='/api/state'&&m==='GET')return send(res,200,db.state);
  if(p==='/api/state'&&m==='PUT'){const b=await readBody(req);
   if(!b||typeof b.sess!=='object'||!b.sess||Array.isArray(b.sess)||!Array.isArray(b.reqs)||!Array.isArray(b.audit)||!(b.th>=50&&b.th<=90)||typeof b.n!=='number')return send(res,400,{error:'Invalid state shape'});
   db.state={sess:b.sess,reqs:b.reqs,audit:b.audit.slice(0,2000),th:b.th,n:b.n,updated:Date.now()};persist();return send(res,200,{ok:true,updated:db.state.updated})}
  if(p==='/api/notices'&&m==='GET'){const l=Math.min(50,+u.searchParams.get('limit')||10);return send(res,200,db.notices.slice().reverse().slice(0,l))}
  if(p==='/api/notices'&&m==='POST'){const b=await readBody(req),t=String(b.title||'').trim();
   if(!t||t.length>120)return send(res,400,{error:'Title is required (max 120 characters)'});
   const n={id:++db.nid,title:t,body:String(b.body||'').slice(0,300),ts:now()};db.notices.push(n);persist();return send(res,201,n)}
  const d=p.match(/^\/api\/notices\/(\d+)$/);
  if(d&&m==='DELETE'){const i=db.notices.findIndex(n=>n.id===+d[1]);if(i<0)return send(res,404,{error:'Not found'});db.notices.splice(i,1);persist();return send(res,200,{ok:true})}
  send(res,404,{error:'Not found'});
 }catch(e){send(res,400,{error:e.message})}
}).listen(PORT,()=>console.log('Attendance server running at http://localhost:'+PORT));
