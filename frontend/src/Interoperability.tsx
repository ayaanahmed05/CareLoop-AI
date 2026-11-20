import {useState, type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {Braces, CheckCircle2, FileJson2, LockKeyhole, UploadCloud} from 'lucide-react';
import {api, OWNERS, type CareCase} from './types';
import './v2.css';
const example = {
 resourceType:'Bundle',type:'collection',entry:[
  {resource:{resourceType:'Patient',id:'demo-patient-101',name:[{given:['Demo'],family:'Patient'}]}},
  {resource:{resourceType:'Observation',id:'demo-observation-101',status:'final',code:{text:'Synthetic flagged screening'},valueString:'Mock value — no diagnostic interpretation'}},
  {resource:{resourceType:'DiagnosticReport',id:'demo-report-101',status:'final',subject:{reference:'Patient/demo-patient-101'},code:{text:'Colorectal screening'},issued:'2026-11-19T11:00:00Z',result:[{reference:'Observation/demo-observation-101'}]}}
 ]
};
type Outcome={status:string;case:CareCase};
export default function Interoperability({role,refresh}:{role:string;refresh:()=>Promise<unknown>}){
 const [raw,setRaw]=useState(JSON.stringify(example,null,2));const [followUp,setFollowUp]=useState('Clinician-requested gastroenterology consultation');
 const [owner,setOwner]=useState(OWNERS[0]),[urgency,setUrgency]=useState('Priority'),[days,setDays]=useState(14);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<Outcome|null>(null);
 const [exportText,setExportText]=useState('');
 async function handle(e:FormEvent){e.preventDefault();setError('');setResult(null);setBusy(true);try{
  const data=await api<Outcome>('/fhir/import','POST',{bundle:JSON.parse(raw),follow_up:followUp,urgency,owner,due_days:days,confirm_synthetic:'SYNTHETIC-DEMO'});
  setResult(data);await refresh();
 }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 async function exportCase(){if(!result)return;try{const data=await api(`/cases/${result.case.id}/fhir/export`);setExportText(JSON.stringify(data,null,2));}catch(e){setError(String(e));}}
 return <div className="v2-page"><div className="v2-heading"><div><span className="v2-kicker">INTEROPERABILITY · SYNTHETIC FHIR R4</span><h1><Braces/> Data exchange sandbox</h1><p>Import a fictional FHIR bundle with a clinician-approved care plan, detect duplicates and flag amended results for review.</p></div><span className="v2-tag">No EHR connection</span></div>
 <div className="v2-grid"><div className="v2-panel"><h2><UploadCloud/> Synthetic bundle import</h2><p className="v2-muted">Only demo-prefixed FHIR identifiers and names beginning “Demo” or “Synthetic” are accepted. Do not paste real patient data.</p>
 <form className="v2-form" onSubmit={handle}>
 <label className="v2-label">FHIR Bundle JSON<textarea className="v2-code" rows={14} spellCheck={false} value={raw} onChange={e=>setRaw(e.target.value)}/></label>
 <div className="v2-two"><label className="v2-label">Clinician-assigned priority<select value={urgency} onChange={e=>setUrgency(e.target.value)}>{['Routine','Priority','Urgent'].map(r=><option key={r}>{r}</option>)}</select></label><label className="v2-label">Target (days)<input type="number" min={1} max={90} value={days} onChange={e=>setDays(Number(e.target.value))}/></label></div>
 <label className="v2-label">Care owner<select value={owner} onChange={e=>setOwner(e.target.value)}>{OWNERS.map(o=><option key={o}>{o}</option>)}</select></label>
 <label className="v2-label">Clinician-approved next care step<input required minLength={5} maxLength={500} value={followUp} onChange={e=>setFollowUp(e.target.value)}/></label>
 <button type="submit" className="v2-primary" disabled={busy||role!=='clinician'}>{busy?'Importing…':'Import fictional screening'}</button>
 {role!=='clinician'&&<p className="v2-muted">Switch to the clinician demo role to import.</p>}
 </form>{error&&<p className="v2-error" role="alert">{error}</p>}
 {result&&<div className="v2-result"><CheckCircle2/><div><b>{result.status.replace(/_/g,' ')} · {result.case.id}</b><p>The report was {result.status==='duplicate'?'matched to its existing case':'processed in the local demo database'}.</p><Link to={'/cases/'+result.case.id}>Open case record</Link> · <button onClick={exportCase}>View FHIR export</button></div></div>}
 {exportText&&<pre className="v2-pre">{exportText}</pre>}</div>
 <aside className="v2-side"><div className="v2-panel"><h3><FileJson2/> Try these three scenarios</h3><div className="v2-list"><div className="v2-listitem"><b>1. Create</b><small>Import the example bundle with the clinician role.</small></div><div className="v2-listitem"><b>2. Duplicate</b><small>Import the same JSON again. The importer returns the existing record without creating a duplicate.</small></div><div className="v2-listitem"><b>3. Amended</b><small>Change report.status to "amended" and its issued date. Import again: the case is flagged for clinician review without changing the care plan.</small></div></div></div>
 <div className="v2-panel"><h3><LockKeyhole/> Clinical boundary</h3><p>FHIR exchange is a synthetic, limited-format adapter. It is not a certified EHR integration. CareLoop does not interpret observations or determine medical urgency. Cancellation/amendment requires human review.</p></div></aside></div></div>;
}
