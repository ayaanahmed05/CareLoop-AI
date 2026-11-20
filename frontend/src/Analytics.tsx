import { useMemo, useState, type ReactNode } from 'react';
import { CompletionChart, DistributionChart } from './charts/Renderers';
import { type CareCase, STAGES } from './types';
import './analytics.css';
const palette = ['#16545b', '#24807f', '#47a7a1', '#8cccc1', '#40749b', '#779ab7', '#9e8cae', '#c7a767'];
const day = 86_400_000;
const shortDate = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC'
});
const stageName = (stage: number) => String(STAGES[stage]);
const formatDays = (value: number) => value < 1 ? (value * 24).toFixed(1) + ' h' : value.toFixed(1) + ' d';
const stageIndices = STAGES.map((_, index) => index);
function records(cases: CareCase[], weeks: number) {
  const reached = stageIndices.map(() => 0);
  const distribution = stageIndices.map(() => 0);
  const durations = stageIndices.map(() => ({
    sum: 0,
    count: 0
  }));
  const barriers = new Map<string, number>();
  const end = (Math.floor(Date.now() / day) + 1) * day;
  const start = end - weeks * 7 * day;
  const trend = Array.from({
    length: weeks
  }, (_, i) => ({
    week: shortDate.format(start + i * 7 * day),
    count: 0
  }));
  for (const item of cases) {
    distribution[item.stage] += 1;
    const events = item.events.flatMap(event => {
      const at = Date.parse(event.at);
      return event.stage !== null && stageIndices.includes(event.stage) && Number.isFinite(at) ? [{
        at,
        stage: event.stage
      }] : [];
    }).sort((a, b) => a.at - b.at);
    const milestones = new Set([0, item.stage, ...events.map(event => event.stage)]);
    for (const index of milestones) reached[index] += 1;
    let previous = {
      stage: 0,
      at: Date.parse(item.created)
    };
    let countedCompletion = false;
    for (const event of events) {
      if (event.stage === previous.stage + 1 && event.at >= previous.at) {
        durations[previous.stage].sum += (event.at - previous.at) / day;
        durations[previous.stage].count += 1;
      }
      previous = event;
      if (event.stage === 6 && !countedCompletion) {
        countedCompletion = true;
        const bucket = Math.floor((event.at - start) / (7 * day));
        if (bucket >= 0 && bucket < weeks) trend[bucket].count += 1;
      }
    }
    const open = new Set(item.barriers.filter(b => !b.resolved).map(b => b.category || b.label));
    for (const label of open) barriers.set(label, (barriers.get(label) ?? 0) + 1);
  }
  return {
    reached,
    trend,
    durations,
    mix: distribution.map((value, i) => ({
      name: stageName(i),
      value,
      fill: palette[i]
    })).filter(s => s.value > 0),
    barriers: [...barriers.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  };
}
function Panel({
  title,
  detail,
  children,
  action
}: {
  title: string;
  detail: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return <section className="ca-panel">
      <div className="ca-header">
        <div>
          <h3>
            {title}
          </h3>
          <p>
            {detail}
          </p>
        </div>
        {action}
      </div>
      {children}
    </section>;
}
function Empty({
  children
}: {
  children: ReactNode;
}) {
  return <p className="ca-empty">
      {children}
    </p>;
}
function Measure({
  label,
  value,
  width,
  color
}: {
  label: string;
  value: string;
  width: number;
  color: string;
}) {
  return <li className="ca-measure">
      <div>
        <span>
          {label}
        </span>
        <strong>
          {value}
        </strong>
      </div>
      <div className="ca-track" aria-hidden="true">
        <i style={{
        width: Math.min(100, width) + '%',
        backgroundColor: color
      }} />
      </div>
    </li>;
}
export default function Analytics({
  cases
}: {
  cases: CareCase[];
}) {
  const [weeks, setWeeks] = useState(8);
  const data = useMemo(() => records(cases, weeks), [cases, weeks]);
  const intervals = data.durations.flatMap(({
    sum,
    count
  }, i) => count ? [{
    i,
    average: sum / count,
    count
  }] : []);
  const longest = Math.max(...intervals.map(s => s.average), 0.001);
  return <div className="care-analytics">
      <Panel title="Screening-to-care funnel" detail="Cases reaching each recorded milestone">
        {cases.length ? <ol className="ca-funnel">
          {[0, 2, 3, 5, 6, 7].map((i, n) => {
          const percent = Math.round(100 * data.reached[i] / cases.length);
          return <li key={i}>
            <div>
              <span>
                {stageName(i)}
              </span>
              <strong>{data.reached[i]} <small>· {percent}%</small></strong>
            </div>
            <div className="ca-track" aria-hidden="true">
              <i style={{
                width: percent + '%',
                backgroundColor: palette[n]
              }} />
            </div>
          </li>;
        })}
        </ol> : <Empty>No cases in this cohort.</Empty>}
      </Panel>
      <Panel title="Follow-up completion" detail="First completed care action per case, by week" action={<select aria-label="Completion trend period" value={weeks} onChange={e => setWeeks(Number(e.target.value))}>
        <option value={4}>4 weeks</option><option value={8}>8 weeks</option><option value={12}>12 weeks</option>
      </select>}>
        <p className="ca-total"><strong>
            {data.trend.reduce((sum, point) => sum + point.count, 0)}
          </strong> completed</p>
        <div className="ca-trend" aria-hidden="true">
          <CompletionChart points={data.trend} />
        </div>
        <table className="ca-sr">
          <caption>Completed follow-ups by week, UTC</caption>
          <tbody>
            {data.trend.map(p => <tr key={p.week}>
              <th>
                {p.week}
              </th>
              <td>
                {p.count}
              </td>
            </tr>)}
          </tbody>
        </table>
      </Panel>
      <Panel title="Case status distribution" detail="Current stage across all cases">
        {cases.length ? <div className="ca-mix">
          <div className="ca-donut" aria-hidden="true">
            <DistributionChart slices={data.mix} />
            <div>
              <strong>
                {cases.length}
              </strong>
              <small>cases</small>
            </div>
          </div>
          <ul className="ca-key">
            {data.mix.map(s => <li key={s.name}>
              <i style={{
              background: s.fill
            }} />
              <span>
                {s.name}
              </span>
              <b>
                {s.value}
              </b>
            </li>)}
          </ul>
        </div> : <Empty>No case stages recorded.</Empty>}
      </Panel>
      <Panel title="Barriers to care" detail="Cases with an unresolved patient-reported barrier">
        {data.barriers.length ? <ol className="ca-bars">
          {data.barriers.map(([label, count]) => <Measure key={label} label={label} value={String(count)} width={100 * count / data.barriers[0][1]} color="#5a9399" />)}
        </ol> : <Empty>No unresolved barriers reported.</Empty>}
      </Panel>
      <Panel title="Care recovery interventions" detail="Auditable support actions for patient-reported barriers; all demo data is fictional">
        {(() => {
          const all = cases.flatMap(c => c.barriers);
          const started = all.filter(b => b.support);
          const verified = started.filter(b => b.resolved && b.support?.status === 'Verified');
          return <div className="ca-bars"><ol className="ca-bars">
            <Measure label="Barriers reported" value={String(all.length)} width={100} color="#7899b2" />
            <Measure label="Support plans started" value={String(started.length)} width={all.length ? 100 * started.length / all.length : 0} color="#47a7a1" />
            <Measure label="Staff-attested resolutions" value={String(verified.length)} width={all.length ? 100 * verified.length / all.length : 0} color="#24807f" />
          </ol><p className="ca-empty">Fictional demo records only. Verification is a staff-entered note, not an independently checked provider record.</p></div>;
        })()}
      </Panel>
      <Panel title="Time between stages" detail="Average elapsed time for recorded adjacent stage transitions">
        {intervals.length ? <ol className="ca-bars ca-times">
          {intervals.map(({
          i,
          average,
          count
        }) => <Measure key={i} label={stageName(i) + ' → ' + stageName(i + 1)} value={formatDays(average) + ' · n=' + count} width={average / longest * 100} color="#7899b2" />)}
        </ol> : <Empty>No paired stage timestamps yet.</Empty>}
      </Panel>
    </div>;
}
