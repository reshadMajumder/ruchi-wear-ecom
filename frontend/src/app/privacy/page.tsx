'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

import { fetchPolicyTerms } from '@/lib/policy-api';

export default function PrivacyPage() {
  const [policy, setPolicy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicyTerms()
      .then((data) => {
        setPolicy(data.policy_html || null);
        setLoading(false);
      })
      .catch((err) => {
        setError('Could not load privacy policy.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-100">
          <h1 className="text-4xl font-black text-gray-900 mb-8 text-left uppercase tracking-tight">PRIVACY POLICY</h1>
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : error ? (
            <div className="text-center py-12 text-destructive font-bold">{error}</div>
          ) : policy ? (
            <div className="prose prose-blue max-w-none text-gray-600 space-y-8 text-left" dangerouslySetInnerHTML={{ __html: policy }} />
          ) : (
            <div className="text-center py-12 text-gray-400">No privacy policy found.</div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
