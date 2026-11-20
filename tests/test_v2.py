"""Integration tests for patient simulation, FHIR adapter, evidence, escalation and impact.
All cases are fictional. Tests never contact external services.
"""
import json
import unittest
from copy import deepcopy
from datetime import timedelta
import tests.test_workflow as workflow
from backend.workflow import now

BUNDLE = {"resourceType":"Bundle","type":"collection","entry":[
 {"resource":{"resourceType":"Patient","id":"demo-p-200","name":[{"given":["Demo"],"family":"FHIR"}]}},
 {"resource":{"resourceType":"DiagnosticReport","id":"demo-report-200","status":"final","issued":"2026-11-19T11:00:00Z",
   "subject":{"reference":"Patient/demo-p-200"},"code":{"text":"Synthetic colorectal screening"}}}
]}

class V2Tests(unittest.TestCase):
    setUp=workflow.CareLoopTests.setUp
    tearDown=workflow.CareLoopTests.tearDown
    role=workflow.CareLoopTests.role
    intake=workflow.CareLoopTests.intake
    act=workflow.CareLoopTests.act
    def test_patient_reply_consent_permissions_and_barrier(self):
        self.intake()
        self.role('coordinator')
        self.act('notify','Clinician approved fictional notification')
        url=f'/api/cases/{self.case["id"]}/patient-reply'
        data={'response':'acknowledge','language':'ar','channel':'sms','consent':False,'note':'Thank you','version':self.case['version']}
        self.assertEqual(self.client.post(url,json=data).status_code,422)
        self.role('viewer')
        self.assertEqual(self.client.post(url,json={**data,'consent':True}).status_code,403)
        self.role('coordinator')
        got=self.client.post(url,json={**data,'consent':True})
        self.assertEqual(got.status_code,200,got.text)
        self.case=got.json()
        self.assertEqual(self.case['stage'],2)
        self.assertEqual(self.case['patient_preferences']['language'],'ar')
        self.assertEqual(self.case['patient_replies'][0]['response'],'acknowledge')
        old=data['version']
        self.assertEqual(self.client.post(url,json={**data,'version':old}).status_code,409)
        got=self.client.post(url,json={**data,'version':self.case['version'],'consent':True,'response':'report_barrier',
                                    'note':'Need an interpreter'})
        self.assertEqual(got.status_code,200,got.text)
        self.case=got.json()
        self.assertTrue(any(b['category']=='Language' for b in self.case['barriers']))
        self.assertNotEqual(self.case['stage'],7)
        self.assertEqual(self.client.post(url,json={**data,'version':self.case['version'],'consent':True,'response':'report_barrier',
                                    'note':'Need an interpreter'}).status_code,422)

    def test_fhir_synthetic_dedup_amendment_review_export(self):
        payload={'bundle':BUNDLE,'follow_up':'Clinician-directed specialty review','urgency':'Priority',
                 'owner':'Maya Chen','due_days':12,'confirm_synthetic':'SYNTHETIC-DEMO'}
        url='/api/fhir/import'
        a=self.client.post(url,json=payload)
        self.assertEqual(a.status_code,200,a.text)
        case=a.json()['case']
        self.assertEqual(a.json()['status'],'created')
        self.assertEqual(case['stage'],0)
        self.assertEqual(self.client.post(url,json=payload).json()['status'],'duplicate')
        amendment=deepcopy(payload)
        amendment['bundle']['entry'][1]['resource'].update(status='amended',issued='2026-11-20T11:00:00Z')
        amended=self.client.post(url,json=amendment)
        self.assertEqual(amended.status_code,200,amended.text)
        c=amended.json()['case']
        self.assertTrue(c['fhir_source']['review_required'])
        self.assertEqual(c['requirement'],payload['follow_up'])
        self.assertTrue(any(g['key']=='fhir-review' for g in c['gaps']))
        self.case=c
        self.act('review_fhir','Clinician reviewed amended fictional report and retained plan.')
        self.assertFalse(self.case['fhir_source']['review_required'])
        exported=self.client.get('/api/cases/'+case['id']+'/fhir/export')
        self.assertEqual(exported.status_code,200)
        self.assertEqual(exported.json()['entry'][0]['resource']['resourceType'],'Task')
        self.role('coordinator')
        self.assertEqual(self.client.post(url,json=payload).status_code,403)
        self.role('clinician')
        invalid=deepcopy(payload)
        invalid['bundle']['entry'][0]['resource']['name'][0]['given']=['Real']
        self.assertEqual(self.client.post(url,json=invalid).status_code,422)

    def test_handoff_nudge_and_escalation_idempotency(self):
        self.intake()
        self.act('notify','Notification')
        self.act('acknowledge','Confirmed')
        self.act('consult','Clinician plan')
        self.act('refer','Demo referral clinic')
        self.role('coordinator')
        self.act('handoff_nudge','Called receiving office and requested confirmation')
        self.assertEqual(len(self.case['handoff']['nudges']),1)
        self.act('handoff_nudge','Repeat follow-up too soon',422)
        self.act('accept')
        self.assertEqual(self.case['handoff']['status'],'Accepted')
        dry=self.client.post('/api/escalations/run',json={'dry_run':True})
        self.assertEqual(dry.status_code,200,dry.text)
        self.assertTrue(dry.json()['dry_run'])
        before=self.client.get('/api/escalations').json()['queue']
        real=self.client.post('/api/escalations/run',json={'dry_run':False})
        self.assertEqual(real.status_code,200,real.text)
        self.assertEqual(real.json()['count'],len(before))
        self.assertEqual(self.client.post('/api/escalations/run',json={'dry_run':False}).json()['count'],0)
        self.role('viewer')
        self.assertEqual(self.client.post('/api/escalations/run',json={'dry_run':False}).status_code,403)

    def test_demo_reset_is_explicit_and_role_limited(self):
        self.role('viewer')
        self.assertEqual(self.client.post('/api/demo/reset',json={'confirmation':'RESET-SYNTHETIC-DEMO'}).status_code,403)
        self.role('clinician')
        self.assertEqual(self.client.post('/api/demo/reset',json={'confirmation':'no'}).status_code,422)
        result=self.client.post('/api/demo/reset',json={'confirmation':'RESET-SYNTHETIC-DEMO'})
        self.assertEqual(result.status_code,200,result.text)
        self.assertEqual(len(self.client.get('/api/cases').json()),30)

    def test_fhir_cancelled_report_requires_review(self):
        bundle=deepcopy(BUNDLE)
        bundle['entry'][1]['resource'].update(id='demo-cancelled-report',status='cancelled')
        payload={'bundle':bundle,'follow_up':'Review cancelled source with clinician',
                 'urgency':'Routine','owner':'Maya Chen','due_days':10,'confirm_synthetic':'SYNTHETIC-DEMO'}
        result=self.client.post('/api/fhir/import',json=payload)
        self.assertEqual(result.status_code,200,result.text)
        case=result.json()['case']
        self.assertTrue(case['fhir_source']['review_required'])
        self.assertTrue(any(g['key']=='fhir-review' for g in case['gaps']))
        self.case=case
        self.act('notify', 'No progression without clinician review',422)
        self.act('review_fhir', 'Clinician examined the cancelled synthetic report.')
        self.assertFalse(self.case['fhir_source']['review_required'])

    def test_operational_metrics_are_explicitly_synthetic(self):
        r=self.client.get('/api/impact')
        self.assertEqual(r.status_code,200,r.text)
        payload=r.json()
        self.assertIn('synthetic',payload['disclaimer'].lower())
        self.assertGreaterEqual(payload['cohort']['total_screenings'],30)
        self.assertIn('staff_attested_resolved',payload['recovery'])
        self.assertIn('measurement_notes',payload)

if __name__=='__main__':unittest.main()
