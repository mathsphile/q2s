'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail, validatePassword } from '@/lib/validation';

type UserRole = 'organizer' | 'ambassador';

const ROLE_DASHBOARDS: Record<string, string> = {
  organizer: '/organizer',
  ambassador: '/ambassador',
};

export default function RegisterPage() {
  const { register, user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<'choose' | 'form'>('choose');
  const [role, setRole] = useState<UserRole | ''>('');

  useEffect(() => {
    if (user) router.replace(ROLE_DASHBOARDS[user.role] ?? '/');
  }, [user, router]);

  if (user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-[#fafafa] bg-grid">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="h-8 w-8 text-indigo-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900">Create Account</h1>
          <p className="mt-2 text-center text-gray-500">Join the Quest@Stellar marketplace</p>

          {step === 'choose' && (
            <div className="mt-8 flex flex-col gap-4">
              <button
                onClick={() => { setRole('ambassador'); setStep('form'); }}
                className="flex items-center gap-4 rounded-xl border border-gray-200 p-5 text-left transition-all duration-200 hover:border-cyan-300 hover:bg-cyan-50 hover:shadow-sm"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-50 text-2xl">🚀</span>
                <div>
                  <p className="font-semibold text-gray-900">Ambassador</p>
                  <p className="text-sm text-gray-500">Complete quests and earn XLM rewards</p>
                </div>
                <svg className="ml-auto h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>

              <button
                onClick={() => { setRole('organizer'); setStep('form'); }}
                className="flex items-center gap-4 rounded-xl border border-gray-200 p-5 text-left transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-2xl">🎯</span>
                <div>
                  <p className="font-semibold text-gray-900">Organizer</p>
                  <p className="text-sm text-gray-500">Create quests and fund bounties for your org</p>
                </div>
                <svg className="ml-auto h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>

              <p className="mt-4 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-800 transition-colors">Sign in</Link>
              </p>
            </div>
          )}

          {step === 'form' && role === 'ambassador' && (
            <AmbassadorForm register={register} onBack={() => setStep('choose')} />
          )}

          {step === 'form' && role === 'organizer' && (
            <OrganizerForm register={register} onBack={() => setStep('choose')} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ambassador Form ────────────────────────────────────────────────────

function AmbassadorForm({ register, onBack }: {
  register: (email: string, password: string, role: 'ambassador', extra?: Record<string, string>) => Promise<void>;
  onBack: () => void;
}) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = 'Name is required';
    const emailR = validateEmail(form.email);
    if (!emailR.valid) e.email = emailR.error!;
    const passR = validatePassword(form.password);
    if (!passR.valid) e.password = passR.error!;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.email, form.password, 'ambassador', { full_name: form.full_name });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors self-start">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back
      </button>

      <div className="flex items-center gap-3 rounded-lg bg-cyan-50 p-3">
        <span className="text-xl">🚀</span>
        <div>
          <p className="text-sm font-semibold text-gray-900">Ambassador Registration</p>
          <p className="text-xs text-gray-500">Complete quests and earn XLM</p>
        </div>
      </div>

      {serverError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>
      )}

      <Input label="Full Name" placeholder="John Doe" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} error={errors.full_name} />
      <Input label="Email" type="email" placeholder="you@example.com" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
      <Input label="Password" type="password" placeholder="Min. 8 characters" autoComplete="new-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />

      <Button type="submit" variant="secondary" size="lg" loading={loading} className="mt-2 w-full">
        Create Ambassador Account
      </Button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login/ambassador" className="font-medium text-indigo-600 hover:text-indigo-800 transition-colors">Sign in</Link>
      </p>
    </form>
  );
}

// ── Organizer Form ─────────────────────────────────────────────────────

const ORG_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

function OrganizerForm({ register, onBack }: {
  register: (email: string, password: string, role: 'organizer', extra?: Record<string, string>) => Promise<void>;
  onBack: () => void;
}) {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    org_name: '', org_size: '', country: '', state_province: '', phone: '', website: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    const emailR = validateEmail(form.email);
    if (!emailR.valid) e.email = emailR.error!;
    const passR = validatePassword(form.password);
    if (!passR.valid) e.password = passR.error!;
    if (!form.org_name.trim()) e.org_name = 'Organization name is required';
    if (!form.country.trim()) e.country = 'Country is required';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const { email, password, ...extra } = form;
      await register(email, password, 'organizer', extra);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors self-start">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back
      </button>

      <div className="flex items-center gap-3 rounded-lg bg-indigo-50 p-3">
        <span className="text-xl">🎯</span>
        <div>
          <p className="text-sm font-semibold text-gray-900">Organizer Registration</p>
          <p className="text-xs text-gray-500">Create quests and fund bounties</p>
        </div>
      </div>

      {serverError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>
      )}

      {/* Personal Info */}
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-2">Personal Information</p>
      <Input label="Full Name *" placeholder="Jane Smith" required value={form.full_name} onChange={(e) => update('full_name', e.target.value)} error={errors.full_name} />
      <Input label="Email *" type="email" placeholder="jane@company.com" autoComplete="email" required value={form.email} onChange={(e) => update('email', e.target.value)} error={errors.email} />
      <Input label="Password *" type="password" placeholder="Min. 8 characters" autoComplete="new-password" required value={form.password} onChange={(e) => update('password', e.target.value)} error={errors.password} />
      <Input label="Phone *" type="tel" placeholder="+1 (555) 123-4567" value={form.phone} onChange={(e) => update('phone', e.target.value)} error={errors.phone} />

      {/* Organization Info */}
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-2">Organization Details</p>
      <Input label="Organization Name *" placeholder="Acme Corp" required value={form.org_name} onChange={(e) => update('org_name', e.target.value)} error={errors.org_name} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="org_size" className="text-sm font-medium text-gray-900">Team Size</label>
        <select
          id="org_size"
          value={form.org_size}
          onChange={(e) => update('org_size', e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 transition-colors duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Select size</option>
          {ORG_SIZES.map((s) => <option key={s} value={s}>{s} people</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Country *" placeholder="United States" required value={form.country} onChange={(e) => update('country', e.target.value)} error={errors.country} />
        <Input label="State / Province" placeholder="California" value={form.state_province} onChange={(e) => update('state_province', e.target.value)} />
      </div>

      <Input label="Website" type="url" placeholder="https://company.com" value={form.website} onChange={(e) => update('website', e.target.value)} />

      <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-2 w-full">
        Create Organizer Account
      </Button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login/organizer" className="font-medium text-indigo-600 hover:text-indigo-800 transition-colors">Sign in</Link>
      </p>
    </form>
  );
}
