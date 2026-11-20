import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock3, FileCheck2, GitPullRequest, HeartPulse, MessagesSquare, Radio, Search, ShieldCheck, SlidersHorizontal, TriangleAlert, UsersRound, Waypoints } from 'lucide-react';
import { STAGES, type CareCase } from './types';
export const initials = (s: string) => s.split(' ').map(n => n[0]).slice(-2).join('');
const shortDate = (date: string) => new Date(date).toLocaleDateString(undefined, {
  month: 'short',
  day: 'numeric'
});
const overdue = (c: CareCase) => c.gaps.some(g => g.key === 'overdue');
const pending = (c: CareCase) => c.drafts.filter(d => !d.approved && !d.discarded).length;
const attention = (c: CareCase) => c.gaps.some(g => g.review || g.escalated) || pending(c) > 0;
const waiting = (c: CareCase) => c.stage === 4 && ['Sent', 'Accepted'].includes(c.referral);
const routes = ['All cases', 'Overdue', 'Awaiting acknowledgement', 'Pending referrals', 'Needs attention', 'Open barriers', 'Verified closure', 'Pending approvals'];
function filtered(c: CareCase, f: string) {
  return [true, overdue(c), c.stage < 2, waiting(c), attention(c), c.barriers.some(b => !b.resolved), c.stage === 7, pending(c) > 0][routes.indexOf(f)] ?? true;
}
function HeroArt() {
  const steps = [{
    x: 95,
    y: 105,
    icon: HeartPulse
  }, {
    x: 200,
    y: 65,
    icon: GitPullRequest
  }, {
    x: 305,
    y: 93,
    icon: ShieldCheck
  }];
  return <svg aria-hidden="true" className="hero-art" viewBox="0 0 430 170">
      <defs>
        <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#8cdbd4" opacity=".28" />
        </pattern>
      </defs>
      <rect width="430" height="170" fill="url(#dots)" />
      {Array.from({
      length: 11
    }, (_, i) => <path key={i} d={`M-30 ${152 + i * 5} C 55 ${154 + i * 4},45 ${75 + i * 4},100 ${85 + i * 4} S 169 ${25 + i * 4},214 ${46 + i * 4} S 272 ${117 + i * 4},319 ${65 + i * 4} S 398 ${68 + i * 4},466 ${-25 + i * 5}`} fill="none" stroke="#71d5c9" opacity={i === 5 ? .9 : .23} strokeWidth={i === 5 ? 2 : .9} />)}
      {steps.map(({
      x,
      y,
      icon: I
    }) => <g key={x}>
        <circle cx={x} cy={y} r="26" fill="none" stroke="#6bb9ad" opacity=".4" />
        <circle cx={x} cy={y} r="19" fill="#185b59" stroke="#84d9bd" />
        <I x={x - 10} y={y - 10} width={20} height={20} color="#d8ffec" strokeWidth={1.5} />
      </g>)}
    </svg>;
}
export function Banner() {
  return <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><span className="pulse" />CARELOOP AI 2.0 · SYNTHETIC DEMO</div>
        <h1>Coordination overview</h1>
        <p>From stalled screenings to supported recovery — with accountable care handoffs.</p>
      </div>
      <HeroArt />
    </section>;
}
function MiniBars({
  cases,
  test,
  color
}: {
  cases: CareCase[];
  test: (c: CareCase) => boolean;
  color: string;
}) {
  const bins = Array.from({
    length: 12
  }, (_, i) => cases.filter(c => test(c) && Math.min(11, Math.floor((Date.now() - Date.parse(c.created)) / 86400000 / 3)) === 11 - i).length);
  return <div className="mini-bars" aria-label="Cases grouped by screening date" title="Cases grouped by screening date">
      {bins.map((n, i) => <i key={i} style={{
      height: 3 + 22 * n / Math.max(1, ...bins),
      background: color,
      opacity: n ? .8 : .2
    }} />)}
    </div>;
}
export function Metrics({
  cases
}: {
  cases: CareCase[];
}) {
  let closed = cases.filter(c => c.stage === 7).length;
  const metrics = [{
    label: 'Active cases',
    test: (c: CareCase) => c.stage < 7,
    icon: UsersRound,
    color: '#168178',
    tint: '#e1f4ef',
    filter: 'Active',
    foot: 'Open care journeys'
  }, {
    label: 'Awaiting acknowledgement',
    test: (c: CareCase) => c.stage < 2,
    icon: MessagesSquare,
    color: '#447cad',
    tint: '#eaf2fb',
    filter: routes[2],
    foot: 'Patient response pending'
  }, {
    label: 'Overdue follow-ups',
    test: overdue,
    icon: Clock3,
    color: '#bf6a28',
    tint: '#fff0de',
    filter: 'Overdue',
    foot: 'Past follow-up target'
  }, {
    label: 'Verified closure rate',
    test: (c: CareCase) => c.stage === 7,
    icon: ShieldCheck,
    color: '#3b8b71',
    tint: '#e6f4ea',
    filter: 'Verified closure',
    foot: closed + ' of ' + cases.length + ' screened cases'
  }];
  return <div className="metrics">
      {metrics.map(({
      label,
      test,
      icon: I,
      color,
      tint,
      filter,
      foot
    }, i) => <Link to={'/worklist?filter=' + encodeURIComponent(filter)} key={label} className="metric">
        <div className="metric-head">
          <span style={{
          background: tint,
          color
        }}>
            <I size={17} />
          </span>
          {label}
        </div>
        <div className="metric-num">
          <strong>
            {i === 3 ? Math.round(closed * 100 / (cases.length || 1)) + '%' : cases.filter(test).length}
          </strong>
          <MiniBars cases={cases} test={test} color={color} />
        </div>
        <small>
          {foot}
        </small>
      </Link>)}
    </div>;
}
function Avatar({
  c
}: {
  c: CareCase;
}) {
  return <span className={'avatar tone-' + parseInt(c.id.slice(-2), 16) % 5}>
      {initials(c.name)}
    </span>;
}
export function Worklist({
  cases,
  compact = false
}: {
  cases: CareCase[];
  compact?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const [local, setLocal] = useState('All cases');
  const f = compact ? local : params.get('filter') || 'All cases';
  const [q, setQ] = useState(''),
    [stage, setStage] = useState(''),
    [sort, setSort] = useState('Case ID'),
    [more, setMore] = useState(false),
    [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [q, f, stage, sort]);
  const size = compact ? 5 : 10;
  const rows = cases.filter(c => (f === 'Active' ? c.stage < 7 : filtered(c, f)) && (!stage || String(c.stage) === stage) && (c.name + ' ' + c.id + ' ' + c.owner + ' ' + c.screening).toLowerCase().includes(q.toLowerCase())).sort((a, b) => sort === 'Name' ? a.name.localeCompare(b.name) : sort === 'Due date' ? a.due.localeCompare(b.due) : a.id.localeCompare(b.id));
  const current = Math.min(page, Math.max(0, Math.ceil(rows.length / size) - 1));
  return <section className="panel work">
      <div className="panel-head">
        <div>
          <div className="kicker">CASE MANAGEMENT</div>
          <h2>Patient worklist <em>
              {cases.length}
            </em></h2>
        </div>
        {compact && <Link className="textlink" to="/worklist">View all <ArrowRight size={14} /></Link>}
      </div>
      <div className="work-controls">
        <label className="search">
          <Search size={16} />
          <input placeholder="Search patients or case ID" aria-label="Search patients" value={q} onChange={e => setQ(e.target.value)} />
        </label>
        <button className={'outline ' + (more ? 'chosen' : '')} onClick={() => setMore(!more)} aria-expanded={more}><SlidersHorizontal size={15} />Filters</button>
      </div>
      {(more || !compact) && <div className="filters">
        <label>Queue<select value={f} onChange={e => compact ? setLocal(e.target.value) : setParams({
          filter: e.target.value
        })}>
            {['Active', ...routes].map(x => <option key={x}>
              {x}
            </option>)}
          </select></label>
        <label>Stage<select value={stage} onChange={e => setStage(e.target.value)}>
            <option value="">All stages</option>
            {STAGES.map((s, i) => <option key={s} value={i}>
              {s}
            </option>)}
          </select></label>
        <label>Sort by<select value={sort} onChange={e => setSort(e.target.value)}>
            {['Case ID', 'Name', 'Due date'].map(x => <option key={x}>
              {x}
            </option>)}
          </select></label>
      </div>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Care stage</th>
              {!compact && <th>Care owner</th>}
              <th>Follow-up</th>
              <th aria-label="Open case" />
            </tr>
          </thead>
          <tbody>
            {rows.slice(current * size, (current + 1) * size).map(c => <tr key={c.id}>
              <td>
                <Link to={'/cases/' + c.id} className="person">
                  <Avatar c={c} />
                  <span>
                    <b>
                      {c.name}
                    </b>
                    <small>
                      {c.id}
                    </small>
                  </span>
                </Link>
              </td>
              <td>
                <span className={'pill stage-' + c.stage}>
                  <i />
                  {STAGES[c.stage]}
                </span>
              </td>
              {!compact && <td>
                {c.owner || 'Unassigned'}
              </td>}
              <td className={overdue(c) ? 'late' : ''}>
                {c.stage === 7 ? 'Verified' : shortDate(c.due)}
                {overdue(c) && <small>Overdue</small>}
              </td>
              <td>
                <Link aria-label={'Open ' + c.name} to={'/cases/' + c.id}>
                  <ChevronRight size={15} />
                </Link>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!rows.length && <p className="empty">No cases match these filters.</p>}
      <div className="pager">
        <small>{rows.length ? current * size + 1 : 0}–{Math.min((current + 1) * size, rows.length)} of {rows.length} cases</small>
        <div>
          <button disabled={current === 0} aria-label="Previous page" onClick={() => setPage(current - 1)}>
            <ChevronLeft size={16} />
          </button>
          <button disabled={(current + 1) * size >= rows.length} aria-label="Next page" onClick={() => setPage(current + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>;
}
export function Monitor({
  cases
}: {
  cases: CareCase[];
}) {
  const groups = [{
    key: 'Overdue',
    label: 'Overdue follow-ups',
    icon: Clock3,
    color: 'amber'
  }, {
    key: 'Needs attention',
    label: 'Human review required',
    icon: TriangleAlert,
    color: 'red'
  }, {
    key: 'Pending referrals',
    label: 'Pending referrals',
    icon: GitPullRequest,
    color: 'blue'
  }, {
    key: 'Open barriers',
    label: 'Unresolved barriers',
    icon: Waypoints,
    color: 'violet'
  }, {
    key: 'Pending approvals',
    label: 'Draft approvals',
    icon: FileCheck2,
    color: 'teal'
  }];
  return <section className="panel monitor">
      <div className="panel-head">
        <div>
          <div className="kicker">OPERATIONAL SIGNALS</div>
          <h2>Care gap monitor</h2>
        </div>
        <Radio size={20} color="#178478" />
      </div>
      <div className="monitor-list">
        {groups.map(({
        key,
        label,
        icon: I,
        color
      }) => <Link key={key} to={'/worklist?filter=' + encodeURIComponent(key)}>
          <span className={'signal-icon ' + color}>
            <I size={17} />
          </span>
          <b>
            {label}
          </b>
          <strong>
            {cases.filter(c => filtered(c, key)).length}
          </strong>
          <ChevronRight size={13} />
        </Link>)}
      </div>
      <Link className="monitor-foot" to="/gaps">Review care gaps <ArrowRight size={14} /></Link>
    </section>;
}
export function Recent({
  cases
}: {
  cases: CareCase[];
}) {
  const [interactions, setInteractions] = useState(false);
  const events = cases.flatMap(c => c.events.map(e => ({
    c,
    e
  }))).filter(({e}) => !interactions || [1,2].includes(e.stage ?? -1) || e.label === "Patient reported barrier").sort((a, b) => b.e.at.localeCompare(a.e.at)).slice(0, 4);
  return <section className="panel recent">
      <div className="kicker">AUDIT TRAIL</div>
      <header className="activity-head"><h2>Recent activity</h2><select value={interactions?"patient":"all"} aria-label="Activity type" onChange={e=>setInteractions(e.target.value==="patient")}><option value="all">All activity</option><option value="patient">Patient interactions</option></select></header>
      <div>
        {events.map(({
        c,
        e
      }, i) => <Link key={i} to={'/cases/' + c.id}>
          <span className="tiny-dot" />
          <span>
            <b>
              {e.label}
            </b>
            <small>{c.name} · {e.actor}</small>
          </span>
          <time>
            {shortDate(e.at)}
          </time>
        </Link>)}
      </div>
    </section>;
}
export function Gaps({
  cases
}: {
  cases: CareCase[];
}) {
  const [q, setQ] = useState(''),
    [mode, setMode] = useState('All');
  const all = cases.flatMap(c => c.gaps.map(g => ({
    c,
    g
  }))).filter(({
    c,
    g
  }) => (mode === 'All' || (mode === 'Escalated' ? g.escalated : g.review)) && (c.name + ' ' + g.title + ' ' + c.id).toLowerCase().includes(q.toLowerCase())).sort((a, b) => Number(b.g.escalated) - Number(a.g.escalated) || b.g.days - a.g.days);
  return <>
      <PageTitle title="Care gaps" sub="Review stalled journeys and route unresolved work to the care team." />
      <div className="panel gap-panel">
        <div className="work-controls">
          <label className="search">
            <Search size={16} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search alerts or patients" aria-label="Search alerts" />
          </label>
          <select aria-label="Alert status" value={mode} onChange={e => setMode(e.target.value)}>
            {['All', 'Human review', 'Escalated'].map(x => <option key={x}>
              {x}
            </option>)}
          </select>
        </div>
        {all.map(({
        c,
        g
      }) => <Link className="gap-row" key={c.id + g.key} to={'/cases/' + c.id}>
          <span className={'signal-icon ' + (g.review ? 'amber' : 'teal')}>
            <Waypoints size={18} />
          </span>
          <div>
            <b>{g.title} {g.escalated && <em>Escalated</em>}</b>
            <p>{g.reason} {g.next}</p>
            <small>{c.name} · {c.id} · {c.owner || 'Unassigned'} · {g.days}d unresolved{g.review ? ' · Human review' : ''}</small>
          </div>
          <ChevronRight size={17} />
        </Link>)}
        {!all.length && <p className="empty">No matching alerts.</p>}
      </div>
    </>;
}
export function PageTitle({
  title,
  sub
}: {
  title: string;
  sub: string;
}) {
  return <div className="page-title">
      <div className="kicker">CARE OPERATIONS</div>
      <h1>
        {title}
      </h1>
      <p>
        {sub}
      </p>
    </div>;
}
