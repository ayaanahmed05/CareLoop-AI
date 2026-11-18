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
  barriers: {
    label: string;
    category?: string;
    resolved: boolean;
    at: string;
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
