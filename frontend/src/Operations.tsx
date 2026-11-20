import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {BellRing, RefreshCw, ShieldAlert, Workflow, RotateCcw} from 'lucide-react';
import {api} from './types';
import './v2.css';
type Item={case_id:string;patient:string;gap:string;title:string;owner:string;days:number;reason:string;priority:string};
type Data={queue:Item[];mode:string};
export default function Operations({role,refresh}:{role:string;refresh:()=>Promise<unknown>}){
 const [data,setData]=useState<Data|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 async function load(){try{setData(await api<Data>('/escalations'));}catch(e){setError(String(e));}}
 useEffect(()=>{void load();},[]);
 async function reset(){if(role!=='clinician')return;const confirm=window.prompt('This permanently resets all fictional demo cases. Type RESET-SYNTHETIC-DEMO to continue:');
 if(confirm!=='RESET-SYNTHETIC-DEMO')return;setBusy(true);setError('');try{
  await api('/demo/reset','POST',{confirmation:confirm});await refresh();await load();setNotice('Reset complete: 30 fictional journeys restored. No real patient data involved.');
 }catch(e){setError(String(e));}finally{setBusy(false);}}
 async function simulate(dry_run:boolean){setBusy(true);setError('');setNotice('');try{const result=await api<{count:number;message:string}>('/escalations/run','POST',{dry_run});setNotice(`${result.count} ${dry_run?'eligible escalation(s) identified':'audited escalation(s) created'}. ${result.message}`);await refresh();await load();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 return <div className="v2-page"><div className="v2-heading"><div><span className="v2-kicker">CARE INTELLIGENCE · OPERATIONS</span><h1><Workflow/> Escalation command center</h1><p>Deterministic, auditable policy-driven queue for unresolved follow-ups and stalled handoffs.</p></div><span className="v2-tag">In-app simulation</span></div>
 <div className="v2-actions"><button className="v2-outline" onClick={()=>void load()}><RefreshCw size={16}/> Refresh</button><button className="v2-outline" disabled={busy} onClick={()=>void simulate(true)}>Preview policy run</button><button className="v2-primary" disabled={busy||role==='viewer'} onClick={()=>void simulate(false)}><BellRing size={16}/> Record escalations</button>{role==='clinician'&&<button className="v2-outline" disabled={busy} onClick={()=>void reset()}><RotateCcw size={16}/> Reset fictional demo</button>}</div>
 {notice&&<div role="status" className="v2-success">{notice}</div>}{error&&<div role="alert" className="v2-error">{error}</div>}
 <div className="v2-panel"><div className="v2-flex v2-between"><h2><ShieldAlert/> Escalation candidates</h2><span className="v2-count">{data?.queue.length??'…'} pending</span></div><p className="v2-muted">Queue rules: clinician-review gaps or unresolved administrative gaps outstanding for 2+ days. A repeated run is idempotent unless new care gaps appear. No scheduled jobs or notifications are dispatched.</p>
 <div className="v2-table-wrap"><table className="v2-table"><thead><tr><th>Patient</th><th>Care gap</th><th>Owner</th><th>Age</th><th>Route</th></tr></thead><tbody>{(data?.queue||[]).map((item,i)=><tr key={item.case_id+item.gap+i}><td><Link to={'/cases/'+item.case_id}>{item.patient}<small>{item.case_id}</small></Link></td><td><b>{item.title}</b><small>{item.reason}</small></td><td>{item.owner}</td><td>{item.days}d</td><td><span className={'v2-badge '+(item.priority==='Clinician review'?'v2-warn':'')}>{item.priority}</span></td></tr>)}{data?.queue.length===0&&<tr><td colSpan={5}>No care gaps match the current escalation policy.</td></tr>}</tbody></table></div>
 </div></div>;
}
