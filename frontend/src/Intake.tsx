import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardPlus } from 'lucide-react';
import { api, OWNERS, type CareCase } from './types';
import { Button } from './components/ui/button';
export default function Intake({
  role,
  refresh
}: {
  role: string;
  refresh: () => Promise<void>;
}) {
  const navigate = useNavigate(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const c = await api<CareCase>('/cases', 'POST', fields);
      await refresh();
      navigate('/cases/' + c.id);
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }
  return <>
      <Link className="cp-back" to="/worklist"><ArrowLeft size={15} />Patient worklist</Link>
      <div className="page-title">
        <h1>Register screening</h1>
        <p>Enter a fictional screening result and its clinician-approved follow-up plan.</p>
      </div>
      {role !== 'clinician' ? <p>Choose the clinician demo role to register an actionable result.</p> : <form className="panel intake" onSubmit={submit}>
        {[['name', 'Patient name'], ['screening', 'Screening type'], ['outcome', 'Screening outcome'], ['requirement', 'Required follow-up']].map(([key, label]) => <label key={key}>
          {label}
          <input required maxLength={key === 'name' ? 100 : 500} name={key} />
        </label>)}
        <label>Screening date<input type="date" name="screened" required /></label>
        <label>Follow-up target<input type="date" name="target" required /></label>
        <label>Clinician-assigned urgency<select name="urgency">
            {['Routine', 'Priority', 'Urgent'].map(p => <option key={p}>
              {p}
            </option>)}
          </select></label>
        <label>Care owner<select name="owner">
            {OWNERS.map(o => <option key={o}>
              {o}
            </option>)}
            <option value="">Unassigned</option>
          </select></label>
        {error && <p role="alert">
          {error}
        </p>}
        <Button disabled={busy}>
          <ClipboardPlus size={15} />
          {busy ? 'Registering…' : 'Register case'}
        </Button>
      </form>}
    </>;
}
