// Super Admin portal — mobile PWA
const DS = window.SpiceRouteDesignSystem_65036e || new Proxy({},{get:()=>(()=>null)}); // fallback if bundle not compiled yet
const {Button,IconButton,Badge,Tabs,Toast,Switch} = DS;
const SI=(d,s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const SIcons={
  shield:s=>SI(<><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></>,s),
  store:s=>SI(<><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></>,s),
  users:s=>SI(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,s),
  star:s=>SI(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,s),
};
const S_PENDING=[
  {name:'Lakshmi\u2019s Tiffins',type:'Kitchen',area:'Mylapore',applied:'2 days ago'},
  {name:'Chef Imran K.',type:'Instructor',area:'Biryani workshops',applied:'4 days ago'},
];
const S_KITCHENS={Pending:S_PENDING.filter(x=>x.type==='Kitchen'),Approved:[{name:'Anita\u2019s Kitchen',area:'T. Nagar',rating:4.8},{name:'Gurpreet\u2019s Rasoi',area:'Anna Nagar',rating:4.6},{name:'Meena\u2019s Snack Corner',area:'Adyar',rating:4.9}],Suspended:[{name:'Quick Bites Co.',area:'Velachery',reason:'Hygiene report pending'}]};
const S_USERS=[{name:'Priya S.',role:'Customer',orders:14},{name:'Arun M.',role:'Customer',orders:6},{name:'Anita R.',role:'Kitchen owner + instructor',orders:null}];
const S_CATS=['South Indian','North Indian','Snacks','Sweets','Healthy'];
function SHeader({title,right}){
  return <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px 10px',position:'sticky',top:0,zIndex:20,background:'rgba(255,248,240,.92)',backdropFilter:'blur(8px)'}}>
    <h1 style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:22,margin:0,flex:1}}>{title}</h1>{right}
  </div>;
}
function SuperApp(){
  const [tab,setTab]=React.useState('approvals');
  const [ktab,setKtab]=React.useState('Approved');
  const [pending,setPending]=React.useState(S_PENDING);
  const [featured,setFeatured]=React.useState({'Anita\u2019s Kitchen':true,'Gurpreet\u2019s Rasoi':true,'Meena\u2019s Snack Corner':false});
  const [toast,setToast]=React.useState(null);
  const ping=m=>{setToast(m);setTimeout(()=>setToast(null),2200)};
  const decide=(name,ok)=>{setPending(p=>p.filter(x=>x.name!==name));ping(name+(ok?' approved':' rejected'))};
  const tabs=[['approvals',SIcons.shield,'Approvals'],['kitchens',SIcons.store,'Kitchens'],['users',SIcons.users,'Users'],['featured',SIcons.star,'Curation']];
  let body;
  if(tab==='approvals')body=<div>
    <SHeader title="Approvals" right={<Badge tone={pending.length?'warn':'success'}>{pending.length} pending</Badge>}/>
    <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:10}}>
      {pending.length===0&&<div style={{font:'600 14px var(--font-body)',color:'var(--text-muted)',textAlign:'center',padding:32}}>All caught up. Queue is empty.</div>}
      {pending.map(p=><div key={p.name} style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:16,display:'flex',flexDirection:'column',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <h3 style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16,margin:0,flex:1}}>{p.name}</h3>
          <Badge tone={p.type==='Kitchen'?'brand':'info'}>{p.type}</Badge>
        </div>
        <div style={{font:'600 13px var(--font-body)',color:'var(--text-muted)'}}>{p.area} · applied {p.applied}</div>
        <div style={{display:'flex',gap:10}}>
          <Button size="sm" onClick={()=>decide(p.name,true)}>Approve</Button>
          <Button size="sm" variant="outline" onClick={()=>ping('Review requested')}>Review</Button>
          <Button size="sm" variant="danger" onClick={()=>decide(p.name,false)}>Reject</Button>
        </div>
      </div>)}
    </div>
  </div>;
  else if(tab==='kitchens')body=<div>
    <SHeader title="Kitchens"/>
    <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:12}}>
      <Tabs tabs={['Pending','Approved','Suspended']} active={ktab} onChange={setKtab}/>
      {S_KITCHENS[ktab].length===0&&<div style={{font:'600 14px var(--font-body)',color:'var(--text-muted)',textAlign:'center',padding:24}}>Nothing here.</div>}
      {S_KITCHENS[ktab].map(k=><div key={k.name} style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:14,display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#E8A33D,#C1440E)',flexShrink:0}}></div>
        <div style={{flex:1}}><div style={{font:'700 14px var(--font-body)'}}>{k.name}</div>
        <div style={{font:'600 12px var(--font-body)',color:'var(--text-muted)'}}>{k.area}{k.rating?' · ★ '+k.rating:''}{k.reason?' · '+k.reason:''}</div></div>
        {ktab==='Approved'&&<Button size="sm" variant="danger" onClick={()=>ping(k.name+' suspended')}>Suspend</Button>}
        {ktab==='Suspended'&&<Button size="sm" variant="secondary" onClick={()=>ping(k.name+' reinstated')}>Reinstate</Button>}
      </div>)}
    </div>
  </div>;
  else if(tab==='users')body=<div>
    <SHeader title="Users"/>
    <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:10}}>
      {S_USERS.map(u=><div key={u.name} style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:14,display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:40,height:40,borderRadius:'50%',background:'var(--surface-brand-soft)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontWeight:800,color:'var(--text-brand)'}}>{u.name[0]}</div>
        <div style={{flex:1}}><div style={{font:'700 14px var(--font-body)'}}>{u.name}</div>
        <div style={{font:'600 12px var(--font-body)',color:'var(--text-muted)'}}>{u.role}{u.orders!==null?' · '+u.orders+' orders':''}</div></div>
        <Button size="sm" variant="ghost" onClick={()=>ping('User detail omitted in kit')}>Manage</Button>
      </div>)}
    </div>
  </div>;
  else body=<div>
    <SHeader title="Categories & featured"/>
    <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:14}}>
      <div><div style={{font:'700 13px var(--font-body)',color:'var(--text-muted)',marginBottom:8}}>Cuisine categories</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{S_CATS.map(c=><span key={c} style={{background:'var(--surface-card)',border:'1.5px solid var(--border-subtle)',borderRadius:999,padding:'8px 16px',font:'700 13px var(--font-body)'}}>{c}</span>)}
        <Button size="sm" variant="secondary" onClick={()=>ping('Add category omitted in kit')}>+ Add</Button></div></div>
      <div><div style={{font:'700 13px var(--font-body)',color:'var(--text-muted)',marginBottom:8}}>Featured on home</div>
        <div style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',overflow:'hidden'}}>
          {Object.entries(featured).map(([name,on],i)=><div key={name} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 16px',borderTop:i?'1px solid var(--border-subtle)':'none'}}>
            <span style={{font:'700 14px var(--font-body)',flex:1}}>{name}</span>
            <Switch checked={on} onChange={v=>setFeatured(f=>({...f,[name]:v}))}/>
          </div>)}
        </div></div>
    </div>
  </div>;
  return <div style={{width:390,height:760,background:'var(--surface-page)',position:'relative',overflow:'hidden',display:'flex',flexDirection:'column',fontFamily:'var(--font-body)',color:'var(--text-body)'}}>
    <div style={{flex:1,overflowY:'auto'}}>{body}</div>
    {toast&&<div style={{position:'absolute',bottom:78,left:16,right:16,display:'flex',justifyContent:'center'}}><Toast tone="success">{toast}</Toast></div>}
    <div style={{display:'flex',borderTop:'1px solid var(--border-subtle)',background:'rgba(255,252,248,.96)',backdropFilter:'blur(8px)',padding:'8px 8px 10px'}}>
      {tabs.map(([id,icon,label])=><button key={id} onClick={()=>setTab(id)} style={{flex:1,border:'none',background:'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,color:tab===id?'var(--text-brand)':'var(--text-muted)',font:(tab===id?'800':'600')+' 11px var(--font-body)',padding:'4px 0'}}>{icon(22)}{label}</button>)}
    </div>
  </div>;
}
window.SuperApp=SuperApp;
