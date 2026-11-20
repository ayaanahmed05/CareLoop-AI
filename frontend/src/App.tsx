import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ChartNoAxesCombined, Check, ChevronDown, ChevronRight, ClipboardList, HeartPulse, LayoutDashboard, Link2, Menu, Waypoints, HeartHandshake, Braces, BellRing, TrendingUp } from 'lucide-react';
import { api, type CareCase } from './types';
import CasePage from './CasePage';
import Analytics from './Analytics';
import PatientCompanion from './PatientCompanion';
import Interoperability from './Interoperability';
import Operations from './Operations';
import Impact from './Impact';
import Intake from './Intake';
import { Button } from './components/ui/button';
import { Banner, Metrics, Worklist, Monitor, Recent, Gaps, PageTitle, initials } from './Workspace';
const nav = [{
  to: '/',
  label: 'Overview',
  icon: LayoutDashboard
}, {
  to: '/worklist',
  label: 'Patient worklist',
  icon: ClipboardList
}, {
  to: '/gaps',
  label: 'Care gaps',
  icon: Waypoints
}, {
  to: '/analytics',
  label: 'Analytics',
  icon: ChartNoAxesCombined
}, {to:'/patient',label:'Patient companion',icon:HeartHandshake}, {to:'/fhir',label:'FHIR sandbox',icon:Braces}, {to:'/operations',label:'Escalation center',icon:BellRing}, {to:'/impact',label:'Impact metrics',icon:TrendingUp}];
function Patient({
  cases,
  role,
  refresh
}: {
  cases: CareCase[];
  role: string;
  refresh: () => void;
}) {
  const {
    id
  } = useParams();
  const c = cases.find(c => c.id === id);
  return c ? <CasePage key={id} c={c} role={role} refresh={refresh} /> : <p>Case not found. <Link to="/worklist">Return to worklist</Link></p>;
}
export default function App() {
  const qc = useQueryClient();
  const user = useQuery({
    queryKey: ['session'],
    queryFn: () => api<{
      role: string;
      name: string;
    }>('/session')
  });
  const records = useQuery({
    queryKey: ['cases'],
    queryFn: () => api<CareCase[]>('/cases'),
    enabled: !!user.data,
    refetchInterval: 60000
  });
  const cases = records.data || [];
  const [menu, setMenu] = useState(false),
    [mobile, setMobile] = useState(false),
    [err, setErr] = useState('');
  const loc = useLocation();
  useEffect(() => {
    setMobile(false);
    setMenu(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  const role = user.data?.role || 'coordinator';
  const title = nav.find(n => n.to === loc.pathname)?.label || 'Patient case';
  async function switchRole(role: string) {
    try {
      const u = await api('/session', 'POST', {
        role
      });
      qc.setQueryData(['session'], u);
      setMenu(false);
      setErr('');
    } catch (e) {
      setErr(String(e));
    }
  }
  return <div className="shell">
      {mobile && <button className="scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
      <aside className={'sidebar ' + (mobile ? 'open' : '')}>
        <Link to="/" className="brand"><span className="mark">
            <Link2 strokeWidth={2.7} size={27} />
          </span>CareLoop<span className="ai">AI</span></Link>
        <div className="side-label">WORKSPACE</div>
        <nav>
          {nav.map(({
          to,
          label,
          icon: I
        }) => <NavLink end={to === '/'} key={to} to={to}>
            <I size={18} />
            {label}
            {to === '/gaps' && <em>
              {cases.filter(c => c.gaps.length).length}
            </em>}
          </NavLink>)}
        </nav>
        <div className="side-bottom">
          <div className="org-icon">
            <HeartPulse size={18} />
          </div>
          <div>
            <b>Northlake Health</b>
            <small>Coordination team</small>
          </div>
        </div>
      </aside>
      <div className="maincol">
        <header className="topbar">
          <button className="mob-menu" onClick={() => setMobile(true)} aria-label="Open navigation">
            <Menu size={22} />
          </button>
          <span className="crumb">Workspace <ChevronRight size={12} /> <b>
              {title}
            </b></span>
          <div className="top-actions">
            <span className="live"><i />Fictional demo data</span>
            <span className="separator" />
            <button className="profile" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Choose demo role">
              <span>
                {initials(user.data?.name || 'Maya Chen')}
              </span>
              <ChevronDown size={14} />
            </button>
          </div>
          {menu && <div className="role-menu">
            <b>Demo workspace role</b>
            {['coordinator', 'clinician', 'viewer'].map(r => <button key={r} onClick={() => switchRole(r)}>
              {r}
              {role === r && <Check size={14} />}
            </button>)}
            {err && <small>
              {err}
            </small>}
          </div>}
        </header>
        <main>
          {records.isError || user.isError ? <section className="panel empty">
            <h2>Workspace unavailable</h2>
            <p>
              {(records.error || user.error)?.message}
            </p>
            <Button onClick={() => {
            void user.refetch();
            void records.refetch();
          }}>Retry connection</Button>
          </section> : !records.data ? <p className="empty">Loading care workspace…</p> : <Routes>
            <Route path="/" element={<div className="page-enter">
              <div className="date-line">
                <span><span className="pulse" />Operations workspace</span>
                <span>
                  <CalendarDays size={14} />
                  {new Date().toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
                </span>
              </div>
              <Banner />
              <Metrics cases={cases} />
              <div className="dash-grid">
                <Worklist cases={cases} compact />
                <Monitor cases={cases} />
              </div>
              <Recent cases={cases} />
              <details className="dashboard-analytics">
                <summary><ChartNoAxesCombined size={17}/> Operational analytics <ChevronDown size={14}/></summary>
                <Analytics cases={cases}/>
              </details>
            </div>} />
            <Route path="/worklist" element={<>
              <PageTitle title="Patient worklist" sub="Find a case, review its next step, and record follow-up." />
              {role === 'clinician' && <Button asChild className="intake-link">
                <Link to="/intake">Register screening</Link>
              </Button>}
              <Worklist cases={cases} />
            </>} />
            <Route path="/patient" element={<PatientCompanion cases={cases} role={role} refresh={() => qc.invalidateQueries({queryKey:['cases']})} />} />
            <Route path="/patient/:id" element={<PatientCompanion cases={cases} role={role} refresh={() => qc.invalidateQueries({queryKey:['cases']})} />} />
            <Route path="/fhir" element={<Interoperability role={role} refresh={() => qc.invalidateQueries({queryKey:['cases']})} />} />
            <Route path="/operations" element={<Operations role={role} refresh={() => qc.invalidateQueries({queryKey:['cases']})} />} />
            <Route path="/impact" element={<Impact refreshKey={cases.reduce((n,c)=>n+c.version,0)} />} />
            <Route path="/intake" element={<Intake role={role} refresh={() => qc.invalidateQueries({
            queryKey: ['cases']
          })} />} />
            <Route path="/gaps" element={<Gaps cases={cases} />} />
            <Route path="/analytics" element={<>
              <PageTitle title="Coordination analytics" sub="Follow screening outcomes, handoff timing, and access barriers across the workspace." />
              <Analytics cases={cases} />
            </>} />
            <Route path="/cases/:id" element={<Patient cases={cases} role={role} refresh={() => qc.invalidateQueries({
            queryKey: ['cases']
          })} />} />
            <Route path="*" element={<Link to="/">Return to overview</Link>} />
          </Routes>}
        </main>
      </div>
    </div>;
}
