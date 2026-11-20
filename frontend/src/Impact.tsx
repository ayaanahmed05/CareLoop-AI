import {useEffect,useState} from 'react';
import {Activity,ChartColumnIncreasing,Info,TrendingUp} from 'lucide-react';
import {api} from './types';
import './v2.css';
type ImpactData={disclaimer:string;cohort:{total_screenings:number;active:number;staff_attested_closed:number;attested_closure_rate:number;median_days_screening_to_attested_closure:number|null};follow_up:{cases_with_open_gaps:number;cases_with_escalations:number;referrals_accepted_or_direct_testing:number;missed_visits_recorded:number};recovery:{barriers_reported:number;interventions_started:number;staff_attested_resolved:number;unresolved_barriers:number};equity:{by_preferred_language:Record<string,{cases:number;closed:number}>;caution:string};measurement_notes:string[]};
export default function Impact({refreshKey}:{refreshKey?:number}){
 const [data,setData]=useState<ImpactData|null>(null),[error,setError]=useState('');
 useEffect(()=>{api<ImpactData>('/impact').then(setData).catch(e=>setError(String(e)));},[refreshKey]);
 if(!data)return <div className="v2-page">{error?<p role="alert">{error}</p>:'Loading impact metrics…'}</div>;
 const stats=[['Screenings in cohort',data.cohort.total_screenings],['Staff-attested closures',data.cohort.staff_attested_closed],['Open care gaps',data.follow_up.cases_with_open_gaps],['Recovery interventions',data.recovery.interventions_started]];
 const bar=data.recovery.barriers_reported||1;
 return <div className="v2-page"><div className="v2-heading"><div><span className="v2-kicker">EVIDENCE · DATA PROVENANCE</span><h1><ChartColumnIncreasing/> Impact & measurement</h1><p>Operational counts generated from live synthetic records in the local SQLite database.</p></div><span className="v2-tag">Fictional demo only</span></div>
 <div className="v2-stat-grid">{stats.map(([label,val])=><div className="v2-panel v2-stat" key={label}><span>{label}</span><b>{val}</b></div>)}</div>
 <div className="v2-grid"><section className="v2-panel"><h2><TrendingUp/> Screening-to-care outcomes</h2><p className="v2-muted">Descriptive metrics: these figures do not measure clinical effectiveness or represent a real-world improvement.</p>
 <div className="v2-impact-big">{data.cohort.attested_closure_rate}% <span>staff-attested closure rate</span></div>
 <div className="v2-progress"><span style={{width:data.cohort.attested_closure_rate+'%'}}/></div>
 <p className="v2-muted">{data.cohort.staff_attested_closed} of {data.cohort.total_screenings} recorded screening cases. Open and censored cases remain in the denominator.</p>
 <div className="v2-info-grid"><div><b>{data.cohort.median_days_screening_to_attested_closure??'—'} days</b><small>Median screening to attested closure</small></div><div><b>{data.follow_up.referrals_accepted_or_direct_testing}</b><small>Accepted referrals or direct testing paths</small></div><div><b>{data.follow_up.cases_with_escalations}</b><small>Cases with escalations</small></div><div><b>{data.follow_up.missed_visits_recorded}</b><small>Missed visits noted</small></div></div></section>
 <aside className="v2-side"><div className="v2-panel"><h3><Activity/> Care recovery funnel</h3>{[
 ['Reported',data.recovery.barriers_reported],['Intervention started',data.recovery.interventions_started],['Staff-attested resolved',data.recovery.staff_attested_resolved]
 ].map(([label,count])=><div className="v2-funnel" key={label}><div><span>{label}</span><b>{count}</b></div><div className="v2-progress"><span style={{width:(Number(count)/bar*100)+'%'}}/></div></div>)}<p className="v2-muted">Confirmation means staff-entered note, not independently verified patient/provider documentation.</p></div>
 <div className="v2-panel"><h3><Info/> Language participation</h3><div className="v2-list">{Object.entries(data.equity.by_preferred_language).map(([language,stats])=><div className="v2-listitem" key={language}><b>{language==='ar'?'Arabic':language==='en'?'English':language}</b><small>{stats.cases} case(s), {stats.closed} staff-attested closure(s)</small></div>)}</div><p className="v2-muted">{data.equity.caution}</p></div></aside></div>
 <div className="v2-panel"><h3>Measurement assumptions & limitations</h3><div className="v2-list">{data.measurement_notes.map(t=><p key={t}>• {t}</p>)}<p><strong>Safety statement:</strong> No diagnosis, autonomous clinical triage, patient delivery, or live provider verification is performed.</p></div></div>
 </div>;
}
