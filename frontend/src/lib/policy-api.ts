import { BASE_URL } from './constants';

export async function fetchPolicyTerms() {
  const res = await fetch(`${BASE_URL}/api/policy-infos/policy-terms/`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load policy & terms');
  return res.json();
}

export async function fetchFaqs() {
  const res = await fetch(`${BASE_URL}/api/policy-infos/faqs/`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load FAQs');
  return res.json();
}
