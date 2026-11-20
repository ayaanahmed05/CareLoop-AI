export const STAGES = ['Screening result', 'Patient notified', 'Acknowledged', 'Consultation', 'Referral', 'Appointment', 'Care completed', 'Verified closure'];
export type Gap = {
  key: string;
  title: string;
  reason: string;
  next: string;
  days: number;
  review: boolean;
  escalated: boolean;
};
export type CareCase = {
  id: string;
  name: string;
  screening: string;
  outcome: string;
  requirement: string;
  urgency: string;
  owner: string;
  stage: number;
  created: string;
  due: string;
  referral: string;
  provider: string;
  appointment: string;
  missed?: boolean;
  evidence: string;
  version: number;
  fhir_source?: {report_id:string;report_status:string;review_required:boolean;review_note?:string};
  handoff?: {provider:string;sent_at:string;status:string;responded_at?:string;nudges?:{at:string;by:string;note:string}[];owner?:string};
  patient_preferences?: {language:string;channel:string;consent:boolean};
  patient_replies?: {at:string;response:string;note:string;simulated:boolean}[];
  barriers: {
    label: string;
    category?: string;
    resolved: boolean;
    at: string;
    support?: {
      intervention: string;
      owner: string;
      started: string;
      status: 'In progress' | 'Verified';
      verified_at: string;
      verification: string;
      verified_by?: string;
    };
  }[];
  events: {
    at: string;
    stage: number | null;
    label: string;
    actor: string;
    note: string;
  }[];
  gaps: Gap[];
  drafts: {
    id: string;
    text: string;
    approved: boolean;
    discarded?: boolean;
  }[];
  chat: {
    question: string;
    facts: string[];
    suggestions: string[];
    source: string;
    draft: string;
  }[];
};
export const OWNERS = ['Maya Chen', 'Jordan Ellis', 'Dr. Alex Rivera'];
export async function api<T = any>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch('/api' + url, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Unable to complete the request. Refresh and try again.');
  }
  return response.json();
}
