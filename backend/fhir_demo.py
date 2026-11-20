"""FHIR R4-inspired import/export adapter for rigorously synthetic demonstration bundles.
It does not connect to an EHR, interpret lab results, or automate clinical triage.
"""
import hashlib
import json
from datetime import timedelta
from .workflow import check, now, stamp
from .settings import OWNERS, STAGES


def read_bundle(bundle):
    check(isinstance(bundle, dict) and bundle.get('resourceType') == 'Bundle', 'Expected FHIR R4 Bundle')
    entries = [e.get('resource', {}) for e in bundle.get('entry', []) if isinstance(e, dict)]
    patients = [r for r in entries if r.get('resourceType') == 'Patient']
    reports = [r for r in entries if r.get('resourceType') == 'DiagnosticReport']
    check(len(patients) == 1 and len(reports) == 1, 'The demo importer requires exactly one Patient and one DiagnosticReport')
    p, report = patients[0], reports[0]
    check(str(p.get('id', '')).startswith('demo-') and str(report.get('id', '')).startswith('demo-'), 'Only explicitly synthetic demo resource IDs are accepted')
    reportid = str(report['id'])
    check(report.get('subject', {}).get('reference') == 'Patient/' + p['id'], 'DiagnosticReport subject must match the Patient resource')
    check(report.get('status') in ('final', 'amended', 'corrected', 'cancelled', 'entered-in-error'), 'Unsupported DiagnosticReport status')
    names = p.get('name', [])
    check(isinstance(names, list) and bool(names), 'Synthetic patient needs a name')
    name = names[0]
    full = (' '.join(name.get('given', [])) + ' ' + name.get('family', '')).strip()
    check(full.startswith('Demo ') or full.startswith('Synthetic '), 'Synthetic demo patient name must begin with Demo or Synthetic')
    check(len(full) <= 100, 'Patient name too long')
    code = report.get('code', {}).get('text') or 'Clinician-reviewed diagnostic report'
    check(isinstance(code, str) and len(code) <= 100, 'Invalid report description')
    return p, report, full, code


def import_case(bundle, care_plan):
    p, report, full, code = read_bundle(bundle)
    check(care_plan['confirm_synthetic'] == 'SYNTHETIC-DEMO', 'Confirm this is fictional data only')
    check(care_plan['urgency'] in ('Routine', 'Priority', 'Urgent'), 'Clinician must assign an allowed priority')
    check(care_plan['owner'] in OWNERS, 'Select a listed care owner')
    check(1 <= care_plan['due_days'] <= 90, 'Choose a 1–90 day clinician-directed target')
    check(5 <= len(care_plan['follow_up'].strip()) <= 500, 'Enter a clinician-approved follow-up instruction')
    reportid = report['id']
    uid = hashlib.sha256(reportid.encode('utf8')).hexdigest()[:12].upper()
    t = stamp()
    evidence = ', '.join([x.get('reference','') for x in report.get('result', []) if isinstance(x, dict)])
    case = dict(
        id='FHIR-' + uid, name=full, screening=code, outcome='Synthetic report received; clinical interpretation not performed by CareLoop',
        requirement=care_plan['follow_up'].strip(), urgency=care_plan['urgency'], owner=care_plan['owner'],
        stage=0, created=t, due=(now() + timedelta(days=care_plan['due_days'])).isoformat(),
        referral='Not sent', provider='', ref_at='', appointment='', missed=False, evidence='', version=1,
        barriers=[], escalations=[], drafts=[], chat=[], patient_replies=[],
        fhir_source=dict(report_id=reportid, report_status=report['status'], report_issued=report.get('issued',''), fingerprint=hashlib.sha256(json.dumps(report,sort_keys=True).encode()).hexdigest(), observation_refs=evidence, review_required=report['status'] != 'final'),
        events=[dict(at=t, stage=0, label='Synthetic FHIR report imported', actor='Clinician demo import',
                     note='Report '+reportid+'; review and follow-up specified by clinician')]
    )
    return case


def export_bundle(c):
    """Illustrative FHIR R4-like resource mapping; not a validator-certified integration."""
    task = dict(resourceType='Task', id='task-' + c['id'].lower(), status=('completed' if c['stage']==7 else 'in-progress'),
                intent='order', description='Track clinician-defined screening follow-up',
                for_={'reference': 'Patient/demo-' + c['id'].lower()},
                note=[dict(text='SYNTHETIC DEMONSTRATION: no external clinical system was contacted.')])
    task['for'] = task.pop('for_')
    service = dict(resourceType='ServiceRequest', id='request-'+c['id'].lower(), status='active' if c['stage']<7 else 'completed',
        intent='plan', subject={'reference':'Patient/demo-'+c['id'].lower()}, code={'text':c['requirement']})
    entries = [dict(resource=task), dict(resource=service)]
    if c.get('appointment'):
        entries.append(dict(resource=dict(resourceType='Appointment',id='appointment-'+c['id'].lower(), status='booked' if c['stage']<6 else 'fulfilled',
                start=c['appointment'],description='Synthetic appointment: staff-entered; not provider-confirmed')))
    return dict(resourceType='Bundle', type='collection', meta={'tag':[{'code':'synthetic-demo'}]}, entry=entries)
