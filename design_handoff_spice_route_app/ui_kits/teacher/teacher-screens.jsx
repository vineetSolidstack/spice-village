// Workshop Instructor (Teacher) portal — mobile PWA
const DS = window.SpiceRouteDesignSystem_65036e || new Proxy({},{get:()=>(()=>null)}); // fallback if bundle not compiled yet
const {Button,IconButton,Input,Badge,Tabs,Toast} = DS;
const money=v=>'\u20B9'+v;
const TI=(d,s=20)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const TIcons={
  dash:s=>TI(<><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></>,s),
  chef:s=>TI(<><path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/></>,s),
  users:s=>TI(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,s),
  edit:s=>TI(<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>,s),
  plus:s=>TI(<><path d="M5 12h14"/><path d="M12 5v14"/></>,s),
  cal:s=>TI(<><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></>,s),
};
const T_WORKSHOPS=[
  {id:'w1',title:'Master the dosa flip',price:499,dur:'2 hrs',status:'Live',sessions:[{when:'Sat 25 Jul · 10 am',cap:8,booked:5},{when:'Sun 26 Jul · 10 am',cap:8,booked:8},{when:'Sat 1 Aug · 4 pm',cap:8,booked:2}]},
  {id:'w4',title:'Chutney chemistry',price:349,dur:'90 min',status:'Draft',sessions:[{when:'Sun 9 Aug · 11 am',cap:10,booked:0}]},
];
const T_BOOKINGS=[
  {name:'Priya S.',ppl:2,pay:'Paid online',session:'Sat 25 Jul · 10 am'},
  {name:'Arun M.',ppl:1,pay:'Pay at venue',session:'Sat 25 Jul · 10 am'},
  {name:'Kavya R.',ppl:2,pay:'Paid online',session:'Sun 26 Jul · 10 am'},
];
function THeader({title,right}){
  return <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px 10px',position:'sticky',top:0,zIndex:20,background:'rgba(255,248,240,.92)',backdropFilter:'blur(8px)'}}>
    <h1 style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:22,margin:0,flex:1}}>{title}</h1>{right}
  </div>;
}
function TeacherApp(){
  const [tab,setTab]=React.useState('dash');
  const [toast,setToast]=React.useState(null);
  const ping=m=>{setToast(m);setTimeout(()=>setToast(null),2200)};
  const totalBooked=T_WORKSHOPS.flatMap(w=>w.sessions).reduce((a,s)=>a+s.booked,0);
  const tabs=[['dash',TIcons.dash,'Dashboard'],['classes',TIcons.chef,'Workshops'],['bookings',TIcons.users,'Bookings']];
  let body;
  if(tab==='dash')body=<div>
    <THeader title="Chef Anita R." right={<Badge tone="success">Verified</Badge>}/>
    <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',gap:10}}>
        {[['Live workshops',T_WORKSHOPS.filter(w=>w.status==='Live').length],['Seats booked',totalBooked],['This month',money(7485)]].map(([l,v])=>
        <div key={l} style={{flex:1,background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:14}}>
          <div style={{fontFamily:'var(--font-display)',fontWeight:800,fontSize:22}}>{v}</div>
          <div style={{font:'600 11px var(--font-body)',color:'var(--text-muted)'}}>{l}</div>
        </div>)}
      </div>
      <div style={{background:'var(--surface-accent-soft)',borderRadius:'var(--radius-md)',padding:'10px 14px',font:'700 13px var(--font-body)',color:'var(--turmeric-600)',display:'flex',gap:8,alignItems:'center'}}>{TIcons.cal(16)} Next session: Sat 25 Jul · 10 am · 5/8 booked</div>
      <div style={{font:'700 13px var(--font-body)',color:'var(--text-muted)'}}>Recent bookings</div>
      {T_BOOKINGS.slice(0,2).map(b=><div key={b.name} style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:14,display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:40,height:40,borderRadius:'50%',background:'var(--surface-brand-soft)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontWeight:800,color:'var(--text-brand)'}}>{b.name[0]}</div>
        <div style={{flex:1}}><div style={{font:'700 14px var(--font-body)'}}>{b.name} · {b.ppl}p</div>
        <div style={{font:'600 12px var(--font-body)',color:'var(--text-muted)'}}>{b.session}</div></div>
        <Badge tone={b.pay==='Paid online'?'success':'warn'}>{b.pay}</Badge>
      </div>)}
    </div>
  </div>;
  else if(tab==='classes')body=<div>
    <THeader title="Workshops" right={<Button size="sm" icon={TIcons.plus(16)} onClick={()=>ping('Create workshop — form omitted in kit')}>New</Button>}/>
    <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:12}}>
      {T_WORKSHOPS.map(w=><div key={w.id} style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:16,display:'flex',flexDirection:'column',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <h3 style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:17,margin:0,flex:1}}>{w.title}</h3>
          <Badge tone={w.status==='Live'?'success':'neutral'}>{w.status}</Badge>
          <IconButton label="Edit" size={32} onClick={()=>ping('Edit '+w.title)}>{TIcons.edit(15)}</IconButton>
        </div>
        <div style={{font:'600 13px var(--font-body)',color:'var(--text-muted)'}}>{money(w.price)}/person · {w.dur}</div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {w.sessions.map(s=><div key={s.when} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--surface-sunken)',borderRadius:10,padding:'8px 12px'}}>
            <span style={{font:'600 13px var(--font-body)'}}>{s.when}</span>
            <span style={{font:'700 12px var(--font-body)',color:s.booked>=s.cap?'var(--status-danger)':'var(--text-brand)'}}>{s.booked>=s.cap?'Full':s.booked+'/'+s.cap+' booked'}</span>
          </div>)}
        </div>
      </div>)}
    </div>
  </div>;
  else body=<div>
    <THeader title="Bookings"/>
    <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:10}}>
      {T_BOOKINGS.map(b=><div key={b.name+b.session} style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-card)',padding:14,display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:40,height:40,borderRadius:'50%',background:'var(--surface-brand-soft)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontWeight:800,color:'var(--text-brand)'}}>{b.name[0]}</div>
        <div style={{flex:1}}><div style={{font:'700 14px var(--font-body)'}}>{b.name} · {b.ppl} {b.ppl>1?'people':'person'}</div>
        <div style={{font:'600 12px var(--font-body)',color:'var(--text-muted)'}}>{b.session}</div></div>
        <Badge tone={b.pay==='Paid online'?'success':'warn'}>{b.pay}</Badge>
      </div>)}
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
window.TeacherApp=TeacherApp;
