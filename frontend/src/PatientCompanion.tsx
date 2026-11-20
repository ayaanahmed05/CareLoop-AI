import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, HeartHandshake, Languages, MessageCircle, ShieldCheck } from 'lucide-react';
import { api, type CareCase } from './types';
import './v2.css';
type Props = {cases: CareCase[]; role:string; refresh:()=>Promise<unknown>};
type Reply = 'acknowledge'|'report_barrier'|'request_callback'|'confirm_appointment';
const words = {
 en: {title:'Patient companion',disclaimer:'Simulated patient experience — no messages are delivered and no care is arranged.',
  hello:'Your next care step', next:'Your care team recommends', help:'What do you need help with?',
  acknowledge:'I received my result', report_barrier:'I have an access barrier', request_callback:'Please call me',confirm_appointment:'I can attend my appointment',
  note:'Tell your care team what you need',send:'Record fictional patient response', consent:'I consent to this simulated communication and acknowledge no real communication occurs.', success:'Patient simulation recorded in the care-team audit trail.'},
 ar: {title:'رفيق المريض',disclaimer:'تجربة مريض افتراضية — لا يتم إرسال رسائل أو حجز رعاية حقيقية.',
  hello:'خطوتك التالية في الرعاية',next:'يوصي فريق الرعاية بما يلي',help:'كيف يمكننا مساعدتك؟',
  acknowledge:'لقد استلمت النتيجة',report_barrier:'لدي عائق يمنعني من الوصول للرعاية',request_callback:'يرجى الاتصال بي',confirm_appointment:'يمكنني حضور الموعد',
  note:'أخبر فريق الرعاية ما الذي تحتاجه',send:'تسجيل رد المريض الافتراضي',consent:'أوافق على هذه المحاكاة وأفهم أنه لا يتم إجراء أي اتصال حقيقي.',success:'تم تسجيل رد المريض الافتراضي في سجل الرعاية.'},
};
export default function PatientCompanion({cases,role,refresh}:Props){
 const {id} = useParams();const [caseId,setCaseId]=useState(id||'CL-2401');
 const c=cases.find(c=>c.id===(id||caseId))||cases[0];
 const [lang,setLang]=useState<'en'|'ar'>('en');const [channel,setChannel]=useState('portal');
 const [response,setResponse]=useState<Reply>('request_callback'); const [note,setNote]=useState('');
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{setConsent(false);setMessage('');setError('');setNote('');},[c?.id]);
 const t=words[lang];
 const options:Reply[] = ['acknowledge','report_barrier','request_callback','confirm_appointment'];
 const active=options.filter(opt=>opt!=='acknowledge'||c?.stage===1).filter(opt=>opt!=='confirm_appointment'||(c?.stage===5 && !!c?.appointment));
 useEffect(()=>{if(!active.includes(response))setResponse('request_callback');},[c?.id,c?.stage]);
 async function send(e:FormEvent){e.preventDefault();if(!c || busy)return; setBusy(true);setError('');setMessage('');try{
  await api(`/cases/${c.id}/patient-reply`,'POST',{response,language:lang,channel,consent,note,version:c.version});
  await refresh();setMessage(t.success);setConsent(false);setNote('');
 }catch(e){setError(e instanceof Error?e.message:String(e));await refresh();}finally{setBusy(false);}}
 if(!c)return <p>No demo cases found.</p>;
 return <div className="v2-page"><div className="v2-back"><Link to={`/cases/${c.id}`}><ArrowLeft size={15}/> Back to care team case</Link></div>
 <div className="v2-heading"><div><span className="v2-kicker">CARELOOP 2.0 · ACCESSIBILITY DEMO</span><h1><HeartHandshake/> {t.title}</h1><p>{t.disclaimer}</p></div><span className="v2-tag">Synthetic only</span></div>
 {!id&&<div className="v2-panel"><label className="v2-label">Choose a fictional patient to simulate <select value={c.id} onChange={e=>setCaseId(e.target.value)}>{cases.map(item=><option value={item.id} key={item.id}>{item.id} · {item.name}</option>)}</select></label></div>}
 <div className="v2-grid">
  <div className="v2-panel v2-companion" dir={lang==='ar'?'rtl':'ltr'}>
   <div className="v2-flex"><div className="v2-round"><HeartHandshake/></div><div><b>CareLoop AI</b><small>{c.id} · Northlake Health (fictional)</small></div></div>
   <div className="v2-line"/><p className="v2-eyebrow">{t.hello}</p><h2>{c.name}</h2><p className="v2-helper">{c.screening}</p>
   <div className="v2-message"><b>{t.next}</b><p>{c.requirement}</p><small>Care urgency determined by clinician: {c.urgency}</small></div>
   <div className="v2-message secondary"><b>Appointment</b><p>{c.appointment ? new Date(c.appointment).toLocaleString(): 'No appointment has been booked yet'}</p></div>
   <div className="v2-divider"/><h3>{t.help}</h3>
   <form onSubmit={send} className="v2-form">
    <label className="v2-label">Language <select value={lang} onChange={e=>setLang(e.target.value as 'en'|'ar')}><option value="en">English</option><option value="ar">العربية · Arabic</option></select></label>
    <label className="v2-label">Preferred channel <select value={channel} onChange={e=>setChannel(e.target.value)}>{['portal','sms','email','phone'].map(v=><option value={v} key={v}>{v}</option>)}</select></label>
    <div className="v2-options">{active.map(r=><button type="button" key={r} aria-pressed={response===r} className={response===r?'selected':''} onClick={()=>setResponse(r)}>{t[r]}</button>)}</div>
    <label className="v2-label">{t.note}<textarea maxLength={160} placeholder={response==='report_barrier'?'For example: I need an interpreter':'Optional simulated reply'} value={note} onChange={e=>setNote(e.target.value)} rows={3}/></label>
    <label className="v2-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>{t.consent}</label>
    <button className="v2-primary" type="submit" disabled={!consent||busy||role==='viewer'||c.stage===7}>{busy?'Saving…':t.send}</button>
   </form>{message&&<p role="status" className="v2-success"><BadgeCheck size={16}/>{message}</p>}{error&&<p role="alert" className="v2-error">{error}</p>}
  </div>
  <aside className="v2-side"><div className="v2-panel"><h3><MessageCircle/> Recorded patient replies</h3><p className="v2-muted">In-app demonstration only. Patient responses are entered by a staff tester, not authenticated patients.</p>
   {(c.patient_replies||[]).length ? <div className="v2-list">{[...(c.patient_replies||[])].reverse().map((r,i)=><div className="v2-listitem" key={i}><b>{r.response.replace(/_/g,' ')}</b><small>{r.note||'No additional note'}</small></div>)}</div>:<p className="v2-muted">No simulated responses yet.</p>}</div>
   <div className="v2-panel"><h3><Languages/> Inclusive by design</h3><p>English and Arabic are available in this prototype. Clinical content is still clinician-authored; translated static interface text has not undergone professional clinical validation.</p><h3><ShieldCheck/> Patient safety</h3><p>Neither acknowledging a result nor confirming an appointment marks treatment complete. Only authorized clinicians can approve case closure.</p></div>
  </aside>
 </div></div>;
}
