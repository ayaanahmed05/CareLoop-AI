"""Transparent operational metrics for synthetic case records; never claims clinical efficacy."""
from statistics import median
from .workflow import gaps, moment


def summarize(cases):
    n = len(cases)
    finished = [c for c in cases if c['stage'] == 7]
    active = [c for c in cases if c['stage'] != 7]
    allbarriers = [b for c in cases for b in c['barriers']]
    begun = [b for b in allbarriers if b.get('support')]
    attested = [b for b in begun if b['resolved'] and b['support'].get('status') == 'Verified']
    times = [max(0, (moment(next(e['at'] for e in reversed(c['events']) if e['stage']==7))-moment(c['created'])).total_seconds()/86400)
        for c in finished if any(e['stage']==7 for e in c['events'])]
    waiting = [(c, gaps(c)) for c in active]
    escalated = sum(bool(c.get('escalations')) for c in active)
    with_open = sum(bool(gs) for _,gs in waiting)
    refer = sum(c['referral'] in ('Accepted','Direct testing') for c in cases)
    by_language = {}
    for c in cases:
        lang = c.get('patient_preferences',{}).get('language','not supplied')
        d = by_language.setdefault(lang, {'cases':0,'closed':0})
        d['cases']+=1
        d['closed']+=int(c['stage']==7)
    return dict(
        disclaimer='All records and outcomes are synthetic, descriptive workflow demonstrations; no measured patient benefit or independent completion verification.',
        cohort={'total_screenings':n,'active':len(active),'staff_attested_closed':len(finished),
                'attested_closure_rate':round(len(finished)/n*100,1) if n else 0,
                'median_days_screening_to_attested_closure':round(median(times),1) if times else None},
        follow_up={'cases_with_open_gaps':with_open,'cases_with_escalations':escalated,
                   'referrals_accepted_or_direct_testing':refer,'missed_visits_recorded':sum(bool(c.get('missed')) for c in cases)},
        recovery={'barriers_reported':len(allbarriers),'interventions_started':len(begun),'staff_attested_resolved':len(attested),
                  'unresolved_barriers':len(allbarriers)-sum(bool(b['resolved']) for b in allbarriers)},
        equity={'by_preferred_language':by_language,'caution':'Language grouping is descriptive; sample size and consent are insufficient for fairness claims.'},
        measurement_notes=['Denominator: every currently stored actionable synthetic screening, including open cases.',
            'Closure: staff-entered clinician verification, not independent EHR evidence.',
            'No control cohort, randomized comparison, outcome improvement estimate or inferential statistics.'])
