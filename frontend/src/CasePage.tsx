import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCheck, CircleDot, ClipboardList, Clock3, FileCheck2, Flag, GitBranch, History, MessageSquare, Send, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { api, OWNERS, STAGES, type CareCase, type Gap } from './types';
import './case.css';
type Props = {
  c: CareCase;
  refresh: () => void;
  role: string;
};
type Command = {
  label: string;
  field?: string;
  placeholder?: string;
  options?: string[];
  date?: boolean;
};
const commands: Record<string, Command> = {
  assign: {
    label: 'Assign care owner',
    field: 'Responsible coordinator',
    options: OWNERS
  },
  urgency: {
    label: 'Update clinical urgency',
    field: 'Clinician-assigned urgency',
    options: ['Routine', 'Priority', 'Urgent']
  },
  notify: {
    label: 'Record patient notification',
    field: 'Communication note',
    placeholder: 'How was the result communicated?'
  },
  acknowledge: {
    label: 'Record acknowledgement',
    field: 'Acknowledgement note',
    placeholder: 'Record how the patient confirmed receipt.'
  },
  consult: {
    label: 'Record consultation',
    field: 'Consultation note',
    placeholder: 'Record the clinician-approved next step.'
  },
  refer: {
    label: 'Send provider referral',
    field: 'Receiving provider',
    placeholder: 'Provider or clinic name'
  },
  accept: {
    label: 'Record referral acceptance'
  },
  reject: {
    label: 'Record referral rejection',
    field: 'Reason for rejection'
  },
  schedule: {
    label: 'Schedule appointment',
    field: 'Appointment date and local time',
    date: true
  },
  miss: {
    label: 'Record missed appointment',
    field: 'Attendance note'
  },
  complete: {
    label: 'Record completed care',
    field: 'Completion evidence',
    placeholder: 'Enter a fictional visit or report reference.'
  },
  close: {
    label: 'Verify and close case',
    field: 'Clinician verification note',
    placeholder: 'Describe the evidence reviewed and confirm follow-up completion.'
  },
  barrier: {
    label: 'Add reported barrier',
    field: 'Patient-reported barrier',
    placeholder: 'For example, transportation to the clinic'
  },
  resolve_barrier: {
    label: 'Resolve reported barrier',
    field: 'Barrier addressed'
  },
  escalate: {
    label: 'Escalate care gap',
    field: 'Care gap'
  },
  approve: {
    label: 'Approve message draft',
    field: 'Message draft'
  },
  note: {
    label: 'Add coordination note',
    field: 'Coordination note'
  },
  skip_referral: {
    label: 'Approve direct appointment pathway',
    field: 'Clinician rationale'
  },
  review_fhir: {label:'Confirm review of amended FHIR report',field:'Clinician review note',placeholder:'Describe the review and decision (12+ characters)'},
  handoff_nudge: {label:'Document provider follow-up',field:'Provider contact note',placeholder:'Record the fictional receiving office follow-up'},
  reopen: {
    label: 'Reopen case',
    field: 'Reason for reopening'
  }
};
const prompts = ['Why is follow-up delayed?', 'Summarize the journey', 'What barriers were reported?', 'Draft a patient message'];
const stamp = (value: string, detailed = false) => {
  if (!value) return 'Unrecorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, detailed ? {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  } : {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};
const meta = (label: string, value: ReactNode) => <div key={label}>
      <dt>
        {label}
      </dt>
      <dd>
        {value}
      </dd>
    </div>;
function allowed(c: CareCase, role: string) {
  if (role === 'viewer') return [];
  const clinician = role === 'clinician';
  if (c.stage === 7) return clinician ? ['reopen'] : [];
  const actions: string[] = [];
  const referral = c.referral;
  if (!c.owner) actions.push('assign');
  if (c.stage === 0) actions.push('notify');
  if (c.stage === 1) actions.push('acknowledge');
  if (c.stage === 2) actions.push('consult');
  if (c.stage === 3 || c.stage === 4 && referral === 'Rejected') actions.push('refer');
  if (c.stage === 3 && clinician) actions.push('skip_referral');
  if (c.stage === 4 && referral === 'Sent') actions.push('accept', 'reject', 'handoff_nudge');
  if (c.stage === 4 && ['Accepted', 'Direct testing'].includes(referral)) actions.push('schedule');
  if (c.stage === 5) {
    if (!c.missed) actions.push('complete');
    if (!c.missed && c.appointment && new Date(c.appointment).getTime() <= Date.now()) actions.push('miss');
    actions.push('schedule');
  }
  if (c.stage === 6 && clinician && c.owner && c.evidence && !c.barriers.some(b => !b.resolved) && !c.drafts.some(d => !d.approved && !d.discarded)) actions.push('close');
  actions.push('barrier', 'note');
  if (c.owner) actions.push('assign');
  if (clinician) {actions.push('urgency');if (c.fhir_source?.review_required) actions.push('review_fhir');}
  return actions;
}
function gapAction(gap: Gap, options: string[]) {
  const key = gap.key.toLowerCase();
  const pairs: [RegExp, string][] = [[/barrier/, 'resolve_barrier'], [/owner/, 'assign'], [/ack/, 'acknowledge'], [/schedule|miss|appointment|visit/, 'schedule'], [/reject/, 'refer'], [/handoff|accept|referral/, 'accept'], [/evidence/, 'complete']];
  return pairs.find(([p, k]) => p.test(key) && options.includes(k))?.[1] || options[0];
}
export default function CasePage(props: Props) {
  return <CaseWorkspace key={props.c.id} {...props} />;
}
function CaseWorkspace({
  c,
  refresh,
  role
}: Props) {
  const options = allowed(c, role);
  const [tab, setTab] = useState<'journey' | 'audit'>('journey');
  const [kind, setKind] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [barrierProof, setBarrierProof] = useState<Record<string, string>>({});
  const [chatError, setChatError] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const actionSelect = useRef<HTMLSelectElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const action = options.includes(kind) ? kind : options[0] || 'note';
  const command = commands[action];
  const choices = action === 'resolve_barrier' ? c.barriers.filter(b => !b.resolved).map(b => b.label) : command.options;
  const chosen = choices ? choices.includes(value) ? value : choices[0] || '' : value;
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [c.chat.length]);
  function select(k: string) {
    setKind(k);
    setValue('');
    setError('');
    setNotice('');
  }
  function jump(k: string, initial = '') {
    select(k);
    setValue(initial);
    formRef.current?.scrollIntoView({
      block: 'center',
      behavior: 'smooth'
    });
    actionSelect.current?.focus({
      preventScroll: true
    });
  }
  async function record(k: string, v: string) {
    if (busy || chatBusy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/cases/' + c.id + '/actions', 'POST', {
        kind: k,
        value: v.trim(),
        version: c.version
      });
      await refresh();
      setKind('');
      setValue('');
      setNotice(k === 'approve' ? 'Message approval recorded.' : k === 'escalate' ? 'Escalation recorded for clinician review.' : 'Workflow action saved to the audit timeline.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this action.');
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void record(action, command.date ? new Date(chosen).toISOString() : chosen);
  }
  async function ask(q: string) {
    if (!q.trim() || busy || chatBusy) return;
    setChatError('');
    setChatBusy(true);
    try {
      await api('/cases/' + c.id + '/copilot', 'POST', {
        question: q.trim(),
        version: c.version
      });
      await refresh();
      setQuestion('');
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'Could not retrieve a response.');
      await refresh();
    } finally {
      setChatBusy(false);
    }
  }
  const initials = c.name.trim().split(/\s+/).map(s => s[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('');
  const lastReopen = c.events.map(e => e.label).lastIndexOf('Case reopened for consultation');
  const currentEvents = lastReopen < 0 ? c.events : c.events.filter((e, i) => i >= lastReopen || e.stage !== null && e.stage < 3);
  return <article className="case-page">
      <Link className="cp-back" to="/"><ArrowLeft size={15} /> Coordination overview</Link>
      <div className="v2-case-action"><Link to={'/patient/'+c.id}>Simulate patient response →</Link><Link to="/operations">Escalation queue →</Link><Link to="/fhir">FHIR demo →</Link></div>
      <header className="cp-identity">
        <div className="cp-avatar" aria-hidden="true">
          {initials}
        </div>
        <div>
          <h1>
            {c.name}
          </h1>
          <p className="cp-idline">{c.id} · {c.screening}</p>
        </div>
        <span className={'cp-badge ' + (c.stage === 7 ? 'green' : c.urgency !== 'Routine' ? 'warm' : '')}>
          <CircleDot size={12} />
          {c.stage === 7 ? 'Verified closure' : c.urgency + ' urgency'}
        </span>
        {options.length > 0 && <button className="cp-btn primary cp-jump" onClick={() => jump(options[0])}><ClipboardList size={16} /> Record action</button>}
      </header>
      <div className="cp-grid">
        <div className="cp-stack">
          <section className="cp-card cp-pad">
            <div className="cp-heading">
              <ClipboardList />
              <h2>Case overview</h2>
            </div>
            <dl className="cp-meta">
              {meta('Screening result', c.outcome)}
              {meta('Screened on', stamp(c.created))}
              {meta('Care owner', c.owner || 'Unassigned')}
              {meta('Follow-up target', stamp(c.due))}
              {meta('FHIR source', c.fhir_source ? c.fhir_source.report_status + (c.fhir_source.review_required ? ' · clinician review required' : ' · reviewed') : 'Not an FHIR import')}
              {meta('Handoff owner', c.handoff?.owner || c.owner || 'Unassigned')}
              {meta('Referral status', [c.referral, c.provider].filter(Boolean).join(' · ') || 'No referral recorded')}
              {meta(c.stage >= 6 ? 'Recorded appointment' : 'Appointment', c.appointment ? stamp(c.appointment, true) + (c.missed ? ' · Missed' : '') : 'No appointment on record')}
            </dl>
            <div className="cp-panelnote">
              <strong>Requested follow-up</strong>
              {c.requirement}
            </div>
          </section>
          <section className="cp-card cp-pad">
            <div className="cp-tabs" aria-label="Case history views">
              <button aria-pressed={tab === 'journey'} onClick={() => setTab('journey')}><Workflow size={15} /> Care journey</button>
              <button aria-pressed={tab === 'audit'} onClick={() => setTab('audit')}><History size={15} /> Audit timeline</button>
            </div>
            {tab === 'journey' ? <ol className="cp-timeline">
              {STAGES.map((s, i) => {
              const entries = currentEvents.filter(e => e.stage === i);
              const latest = entries[entries.length - 1];
              return <li key={s} className={c.stage === i ? 'is-current' : latest ? 'is-done' : ''}>
                <span className="cp-dot">
                  {latest ? <Check size={14} /> : i + 1}
                </span>
                <div>
                  <h3>
                    {s}
                    {c.stage === i && <span className="cp-current">Current</span>}
                  </h3>
                  <small>
                    {latest ? [stamp(latest.at, true), latest.actor].join(' · ') : 'Pending'}
                  </small>
                  {latest && <p className="cp-step-note">
                    {latest.label}
                    {latest.note ? ' · ' + latest.note : ''}
                  </p>}
                </div>
              </li>;
            })}
            </ol> : <ol className="cp-log">
              {[...c.events].reverse().map((e, i) => <li key={i}>
                <span className="cp-dot">
                  <Clock3 size={12} />
                </span>
                <div>
                  <h3>
                    {e.label}
                  </h3>
                  <small>{stamp(e.at, true)} · {e.actor}</small>
                  {e.note && <p>
                    {e.note}
                  </p>}
                </div>
              </li>)}
            </ol>}
          </section>
          <section className="cp-card cp-pad" ref={formRef}>
            <div className="cp-heading">
              <GitBranch />
              <h2>Record a workflow action</h2>
            </div>
            {options.length > 0 ? <form className="cp-form" onSubmit={submit}>
              <label>Action<select ref={actionSelect} value={action} onChange={e => select(e.target.value)}>
                  {options.map(k => <option key={k} value={k}>
                    {commands[k].label}
                  </option>)}
                </select></label>
              {command.field && <label>
                {command.field}
                {choices ? <select value={chosen} onChange={e => setValue(e.target.value)}>
                  {choices.map(v => <option key={v}>
                    {v}
                  </option>)}
                </select> : command.date ? <input required type="datetime-local" value={value} onChange={e => setValue(e.target.value)} /> : <textarea required maxLength={action === 'barrier' ? 80 : 500} minLength={action === 'complete' ? 5 : 1} placeholder={command.placeholder} value={value} onChange={e => setValue(e.target.value)} />}
              </label>}
              <div className="cp-action-footer">
                <button disabled={busy || chatBusy} className="cp-btn primary" type="submit">
                  {busy ? 'Saving…' : command.label}
                  <ArrowRight size={15} />
                </button>
              </div>
            </form> : <p className="cp-empty">
              {role === 'viewer' ? 'Your role has read access to this case.' : 'This case has verified closure.'}
            </p>}
            {error && <div role="alert" className="cp-error">
              {error}
            </div>}
            {notice && <div role="status" className="cp-success">
              {notice}
            </div>}
          </section>
        </div>
        <aside className="cp-stack">
          <section className="cp-card">
            <div className="cp-rail-heading">
              <span className="cp-spark">
                <Sparkles size={19} />
              </span>
              <div>
                <h2>Coordination copilot</h2>
                <small>Case context · {c.id}</small>
              </div>
            </div>
            <div className="cp-pad">
              {c.chat.length > 0 ? <div className="cp-chat" role="log" aria-label="Copilot conversation" ref={chatRef}>
                {c.chat.map((m, i) => <div key={i} className="cp-exchange">
                  <div className="cp-chat-entry question">
                    {m.question}
                  </div>
                  <div className="cp-chat-entry">
                    <strong>Recorded facts</strong>
                    {m.facts.map((f, j) => <p key={j}>
                      {f}
                    </p>)}
                    {m.suggestions.length > 0 && <>
                      <strong>Suggested next steps</strong>
                      {m.suggestions.map((s, j) => <p key={j}>
                        {s}
                      </p>)}
                    </>}
                    {m.draft && <>
                      <strong>Message draft</strong>
                      <p>
                        {m.draft}
                      </p>
                    </>}
                    <small>{m.source} · {c.id}</small>
                  </div>
                </div>)}
              </div> : <p className="cp-empty">Ask about this patient's care journey, access barriers, or next steps.</p>}
              {role !== 'viewer' && <>
                <div className="cp-prompts">
                  {prompts.map(q => <button disabled={busy || chatBusy} key={q} onClick={() => void ask(q)}>
                    {q}
                  </button>)}
                </div>
                <form className="cp-ask" onSubmit={e => {
                e.preventDefault();
                void ask(question);
              }}>
                  <input aria-label="Question for the coordination copilot" maxLength={500} placeholder="Ask about this case…" value={question} onChange={e => setQuestion(e.target.value)} />
                  <button className="cp-btn primary" disabled={busy || chatBusy || !question.trim()} aria-label="Send question">
                    <Send size={16} />
                  </button>
                </form>
              </>}
              {chatBusy && <small role="status">Checking case records…</small>}
              {chatError && <div role="alert" className="cp-error">
                {chatError}
              </div>}
            </div>
          </section>
          <section className="cp-card cp-pad">
            <div className="cp-heading">
              <Flag />
              <h2>Outstanding care gaps</h2>
            </div>
            {c.gaps.length === 0 && <p className="cp-empty">No open care gaps.</p>}
            {c.gaps.map(g => <div className="cp-gap" key={g.key}>
              <h3>
                {g.title}
              </h3>
              <small>{g.days}d unresolved · {c.owner || 'Unassigned'}{g.review ? ' · Human review required' : ''}</small>
              <p>
                {g.reason}
              </p>
              <p className="cp-next"><strong>Next step</strong> {g.next}</p>
              <div className="cp-row">
                {g.key.startsWith('barrier:') ? <a className="cp-link" href="#care-support">Open care plan <ArrowRight size={13} /></a> : options.length > 0 && <button className="cp-link" onClick={() => jump(gapAction(g, options))}>Address gap <ArrowRight size={13} /></button>}
                {g.escalated ? <span className="cp-badge warm">Escalated</span> : role !== 'viewer' && <button disabled={busy || chatBusy} className="cp-link" onClick={() => void record('escalate', g.key)}>Escalate</button>}
              </div>
            </div>)}
          </section>
          <section className="cp-card cp-pad" id="care-support">
            <div className="cp-heading">
              <CalendarDays />
              <h2>Care recovery plans</h2>
            </div>
            {c.barriers.length === 0 ? <p className="cp-empty">No barriers recorded.</p> : c.barriers.map((b, i) => <div className="cp-barrier" key={i}>
              <h3>
                {b.label}
              </h3>
              {b.category && <small>Assisted category · {b.category}</small>}
              <small>{b.resolved ? 'Resolved' : 'Open'} · Reported {stamp(b.at)}</small>
              {b.support ? <div className="cp-support-plan">
                <strong>Action: {b.support.intervention}</strong>
                <small>Owner: {b.support.owner} · {b.support.status}</small>
                {b.support.verification && <p><strong>Verification:</strong> {b.support.verification}</p>}
                {!b.resolved && role !== 'viewer' && <div className="cp-support-verify">
                  <label htmlFor={'proof-' + i}>Confirmation from patient or provider</label>
                  <textarea id={'proof-' + i} rows={2} maxLength={500} placeholder="E.g. Patient confirmed transport is arranged; reference to navigator follow-up." value={barrierProof[b.label] || ''} onChange={e => setBarrierProof(previous => ({ ...previous, [b.label]: e.target.value }))}/>
                  <button className="cp-btn primary" disabled={busy || chatBusy || (barrierProof[b.label] || '').trim().length < 12} onClick={() => void record('resolve_barrier', JSON.stringify({label: b.label, verification: barrierProof[b.label]}))}><Check size={14}/> Verify barrier resolved</button>
                </div>}
              </div> : !b.resolved && role !== 'viewer' && <div className="cp-support-plan">
                <p><strong>Recommended next action:</strong> {c.gaps.find(g => g.key === 'barrier:' + b.label)?.next || 'Arrange care navigator review'}</p>
                <button className="cp-btn" disabled={busy || chatBusy} onClick={() => void record('start_support', JSON.stringify({label: b.label, intervention: c.gaps.find(g => g.key === 'barrier:' + b.label)?.next || 'Arrange a care navigator call to identify support needs'}))}>Start support plan <ArrowRight size={13}/></button>
              </div>}
            </div>)}
          </section>
          {c.drafts.length > 0 && <section className="cp-card cp-pad">
            <div className="cp-heading">
              <MessageSquare />
              <h2>Message approvals</h2>
            </div>
            {c.drafts.map(d => <div key={d.id} className="cp-draft">
              <p>
                {d.text}
              </p>
              <small>
                {d.approved ? 'Approved by clinician' : d.discarded ? 'Discarded by clinician' : 'AI-assisted draft · Awaiting clinician approval'}
              </small>
              {!d.approved && !d.discarded && role === 'clinician' && c.stage !== 7 && <div className="cp-row">
                <button className="cp-btn" disabled={busy || chatBusy} onClick={() => void record('approve', d.id)}><CheckCheck size={14} /> Approve draft</button>
                <button className="cp-link" disabled={busy || chatBusy} onClick={() => void record('discard', d.id)}>Discard</button>
              </div>}
            </div>)}
          </section>}
          <section className="cp-card cp-pad">
            <div className="cp-heading">
              <FileCheck2 />
              <h2>Completion evidence</h2>
            </div>
            <p className={c.evidence ? '' : 'cp-empty'}>
              {c.evidence || 'No completion evidence on record.'}
            </p>
            {c.stage === 7 && <p className="cp-proof"><ShieldCheck size={15} /> Clinician-verified closure</p>}
          </section>
        </aside>
      </div>
    </article>;
}
