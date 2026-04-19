import Link from 'next/link';

const steps = [
  { number: '01', title: 'Create a Quest', description: 'Organizers post bounties with clear acceptance criteria and lock XLM rewards in a trustless smart contract.' },
  { number: '02', title: 'Complete the Work', description: 'Ambassadors browse active quests, submit their deliverables, and build an on-chain reputation.' },
  { number: '03', title: 'Get Paid Instantly', description: 'Once approved, XLM rewards are sent directly to the ambassador\u2019s Stellar wallet. No middlemen.' },
];

const organizerBenefits = ['Post bounties to a global talent pool', 'Pay only for approved work', 'Full on-chain transparency', 'No middleman fees'];
const ambassadorBenefits = ['Earn XLM for your skills', 'Work from anywhere in the world', 'Instant payments on approval', 'Build your on-chain reputation'];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <svg className="h-7 w-7 text-indigo-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            <span className="text-xl font-bold text-gray-900">Quest<span className="text-indigo-600">@</span>Stellar</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Sign In</Link>
            <Link href="/register" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-grid">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Orbitals */}
          <div className="orbital" style={{ width: 500, height: 500, top: -120, right: -160, opacity: 0.4 }} />
          <div className="orbital-reverse" style={{ width: 340, height: 340, bottom: -80, left: -100, opacity: 0.3 }} />
          <div className="orbital" style={{ width: 220, height: 220, top: '40%', left: '60%', opacity: 0.2 }} />
          <div className="absolute inset-0 bg-stars opacity-40" />

          {/* Particles */}
          <div className="particle" style={{ top: '20%', left: '15%' }} />
          <div className="particle" style={{ top: '60%', left: '75%' }} />
          <div className="particle" style={{ top: '30%', left: '85%' }} />
          <div className="particle" style={{ top: '70%', left: '25%' }} />
          <div className="particle" style={{ top: '45%', left: '55%' }} />

          {/* Pulse rings */}
          <div className="pulse-ring" style={{ width: 200, height: 200, top: '15%', right: '10%' }} />
          <div className="pulse-ring" style={{ width: 300, height: 300, bottom: '10%', left: '5%', animationDelay: '2s' }} />

          {/* Floating currency symbols */}
          <span className="currency-float" style={{ top: '25%', left: '8%' }}>💲</span>
          <span className="currency-float" style={{ top: '55%', right: '12%' }}>₹</span>
          <span className="currency-float" style={{ top: '35%', right: '25%' }}>€</span>
          <span className="currency-float" style={{ top: '65%', left: '20%' }}>£</span>
          <span className="currency-float" style={{ top: '15%', left: '70%' }}>¥</span>
          <span className="currency-float" style={{ top: '75%', right: '8%' }}>💲</span>
          <span className="currency-float" style={{ top: '45%', left: '5%' }}>₿</span>
          <span className="currency-float" style={{ top: '80%', left: '45%' }}>✦</span>

          {/* Ribbons */}
          <div className="ribbon bg-indigo-400" style={{ top: '20%', left: '-50px', transform: 'rotate(-15deg)' }} />
          <div className="ribbon bg-cyan-400" style={{ bottom: '25%', right: '-30px', transform: 'rotate(10deg)', animationDelay: '3s' }} />
          <div className="ribbon bg-emerald-400" style={{ top: '60%', left: '10%', transform: 'rotate(-5deg)', animationDelay: '5s' }} />

          {/* Glow blobs */}
          <div className="glow-blob" style={{ width: 300, height: 300, top: '-10%', right: '15%', background: 'rgba(79,70,229,0.08)' }} />
          <div className="glow-blob" style={{ width: 250, height: 250, bottom: '5%', left: '10%', background: 'rgba(6,182,212,0.06)', animationDelay: '3s' }} />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center sm:py-36 lg:py-44">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Built on Stellar &middot; Powered by Soroban
            </span>
          </div>
          <div className="gradient-line mx-auto mt-6 max-w-xs" />
          <h1 className="animate-slide-up animate-slide-up-delay-1 mt-8 text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            The Decentralized Bounty<br /><span className="text-indigo-600">Marketplace on Stellar</span>
          </h1>
          <p className="animate-slide-up animate-slide-up-delay-2 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl">
            Create quests, complete challenges, and earn XLM rewards — all secured by Soroban smart contracts with instant on-chain payments.
          </p>
          <div className="animate-slide-up animate-slide-up-delay-3 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md">
              Start as Organizer
            </Link>
            <Link href="/register" className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 hover:bg-gray-50">
              Join as Ambassador
            </Link>
          </div>
        </div>
      </section>

      {/* ── Ticker tape ── */}
      <div className="overflow-hidden border-y border-gray-100 bg-white py-3">
        <div className="ticker-tape flex gap-12 whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-12 text-sm text-gray-400">
              <span>💲 XLM Payments</span><span>✦ Soroban Smart Contracts</span><span>🌐 Global Talent</span>
              <span>⚡ Instant Settlement</span><span>🔒 Trustless Escrow</span><span>📊 On-Chain Reputation</span>
              <span>💎 Decentralized</span><span>🚀 Stellar Network</span><span>₿ Crypto Native</span>
              <span>💲 XLM Payments</span><span>✦ Soroban Smart Contracts</span><span>🌐 Global Talent</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dashboard Preview ── */}
      <section className="relative overflow-hidden border-b border-gray-100 bg-white px-6 py-24 sm:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="currency-float" style={{ top: '10%', left: '5%', fontSize: '32px' }}>💰</span>
          <span className="currency-float" style={{ top: '70%', right: '8%', fontSize: '28px' }}>💲</span>
          <span className="currency-float" style={{ top: '30%', right: '3%', fontSize: '24px' }}>₹</span>
          <div className="glow-blob" style={{ width: 200, height: 200, top: '20%', left: '50%', background: 'rgba(79,70,229,0.05)' }} />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">See It in Action</h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-500">Real dashboards. Real earnings. Real on-chain data.</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 items-start">
            {/* Ambassador Dashboard Mockup */}
            <div className="mockup-frame p-0">
              <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                <div className="flex gap-1.5"><div className="h-3 w-3 rounded-full bg-red-400" /><div className="h-3 w-3 rounded-full bg-amber-400" /><div className="h-3 w-3 rounded-full bg-emerald-400" /></div>
                <span className="ml-2 text-xs text-gray-400">Ambassador Dashboard</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2"><span className="text-lg">👋</span><span className="font-semibold text-gray-900">Welcome back</span></div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Active Quests', value: '3', color: 'border-l-indigo-500' },
                    { label: 'Submissions', value: '6', color: 'border-l-cyan-500' },
                    { label: 'XLM Balance', value: '22,007', color: 'border-l-amber-500' },
                    { label: 'Approved', value: '6', color: 'border-l-emerald-500' },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-lg border border-gray-100 border-l-4 ${s.color} bg-white p-3`}>
                      <p className="text-[10px] text-gray-400">{s.label}</p>
                      <p className="text-lg font-bold text-gray-900">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Weekly Activity</p>
                  <div className="flex items-end gap-1.5 h-16">
                    {[60, 30, 45, 80, 50, 20, 70].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-indigo-500/20 relative" style={{ height: '100%' }}>
                        <div className="absolute bottom-0 w-full rounded-t bg-indigo-500" style={{ height: `${h}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Dashboard Mockup */}
            <div className="mockup-frame-2 p-0 lg:mt-12">
              <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                <div className="flex gap-1.5"><div className="h-3 w-3 rounded-full bg-red-400" /><div className="h-3 w-3 rounded-full bg-amber-400" /><div className="h-3 w-3 rounded-full bg-emerald-400" /></div>
                <span className="ml-2 text-xs text-gray-400">Earnings &amp; Reputation</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'XLM Balance', value: '22,007' },
                    { label: 'Total Earned', value: '13,258' },
                    { label: 'Approved', value: '6' },
                    { label: 'Pending', value: '0' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-gray-100 bg-white p-3">
                      <p className="text-[10px] text-gray-400">{s.label}</p>
                      <p className="text-lg font-bold text-gray-900">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Reputation</p>
                  <div className="h-3 w-full rounded-full bg-gray-100">
                    <div className="h-3 rounded-full bg-indigo-500" style={{ width: '60%' }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">6 approved · Experienced</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-2">Earning History</p>
                  <div className="space-y-2">
                    {[{ quest: 'podde lathi', amount: '+195 XLM' }, { quest: 'zfsdfdsfsdfsdfsdf', amount: '+8,996 XLM' }].map((e) => (
                      <div key={e.quest} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <span className="text-xs text-gray-600">{e.quest}</span>
                        <span className="text-xs font-semibold text-emerald-600">{e.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative border-t border-gray-100 bg-[#fafafa] bg-grid px-6 py-24 sm:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="currency-float" style={{ top: '20%', right: '5%' }}>💲</span>
          <span className="currency-float" style={{ bottom: '15%', left: '8%' }}>€</span>
          <div className="ribbon bg-indigo-300" style={{ top: '50%', right: '-20px', transform: 'rotate(8deg)', animationDelay: '2s' }} />
        </div>
        <div className="relative mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">How It Works</h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-500">Three simple steps from quest creation to payment.</p>
          </div>
          <div className="relative mt-20">
            <div aria-hidden="true" className="absolute left-8 top-0 hidden h-full w-px bg-gradient-to-b from-indigo-200 via-indigo-100 to-transparent lg:left-1/2 lg:block" />
            <div className="flex flex-col gap-16">
              {steps.map((step, i) => (
                <div key={step.number} className={`animate-slide-up ${i === 1 ? 'animate-slide-up-delay-1' : i === 2 ? 'animate-slide-up-delay-2' : ''} relative flex items-start gap-6 lg:gap-12`}>
                  <div className="relative z-10 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-indigo-200 bg-white text-xl font-bold text-indigo-600 shadow-sm">{step.number}</div>
                  <div className="pt-3">
                    <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                    <p className="mt-2 max-w-md text-gray-500 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="relative border-t border-gray-100 bg-white px-6 py-24 sm:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="currency-float" style={{ top: '15%', left: '3%' }}>₹</span>
          <span className="currency-float" style={{ bottom: '20%', right: '5%' }}>£</span>
          <div className="glow-blob" style={{ width: 200, height: 200, bottom: '10%', right: '20%', background: 'rgba(16,185,129,0.04)', animationDelay: '2s' }} />
        </div>
        <div className="relative mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Built for Both Sides</h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-500">Whether you&apos;re posting bounties or completing them, Quest@Stellar has you covered.</p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {[{ icon: '🎯', title: 'For Organizers', items: organizerBenefits, bg: 'bg-indigo-50' }, { icon: '🚀', title: 'For Ambassadors', items: ambassadorBenefits, bg: 'bg-cyan-50' }].map((side) => (
              <div key={side.title} className="card-hover rounded-xl p-8 transition-all duration-300 hover:scale-[1.02]">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${side.bg} text-lg`}>{side.icon}</span>
                  <h3 className="text-xl font-semibold text-gray-900">{side.title}</h3>
                </div>
                <ul className="mt-6 space-y-4">
                  {side.items.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      <span className="text-gray-600">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats with currency graphics ── */}
      <section className="relative border-t border-gray-100 bg-[#fafafa] px-6 py-20 overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="currency-float" style={{ top: '10%', left: '15%', fontSize: '40px' }}>💲</span>
          <span className="currency-float" style={{ top: '60%', right: '10%', fontSize: '36px' }}>₹</span>
          <span className="currency-float" style={{ bottom: '10%', left: '40%', fontSize: '32px' }}>€</span>
          <div className="ribbon bg-amber-300" style={{ top: '30%', left: '-40px', transform: 'rotate(-12deg)', animationDelay: '1s' }} />
          <div className="ribbon bg-indigo-300" style={{ bottom: '20%', right: '-30px', transform: 'rotate(8deg)', animationDelay: '4s' }} />
        </div>
        <div className="relative mx-auto max-w-5xl">
          <div className="stagger-children grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { value: 'Stellar', label: 'Built on', icon: '⭐' },
              { value: 'Soroban', label: 'Powered by', icon: '⚡' },
              { value: 'Instant XLM', label: 'Payments', icon: '💲' },
              { value: 'Decentralized', label: 'Architecture', icon: '🌐' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <span className="text-2xl">{s.icon}</span>
                <p className="mt-2 text-2xl font-bold text-indigo-600 sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative border-t border-gray-100 bg-white bg-grid px-6 py-24 text-center sm:py-32 overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="pulse-ring" style={{ width: 250, height: 250, top: '20%', left: '10%' }} />
          <div className="pulse-ring" style={{ width: 180, height: 180, bottom: '15%', right: '15%', animationDelay: '2s' }} />
          <span className="currency-float" style={{ top: '25%', right: '8%', fontSize: '28px' }}>💎</span>
          <span className="currency-float" style={{ bottom: '20%', left: '12%', fontSize: '24px' }}>✦</span>
        </div>
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Ready to get started?</h2>
          <p className="mx-auto mt-4 max-w-lg text-gray-500">Join the decentralized bounty economy. Whether you&apos;re an organizer looking for talent or an ambassador ready to earn — there&apos;s a quest waiting for you.</p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md">Start as Organizer</Link>
            <Link href="/register" className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 hover:bg-gray-50">Join as Ambassador</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            <span className="text-sm font-semibold text-gray-900">Quest<span className="text-indigo-600">@</span>Stellar</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/login" className="hover:text-gray-900 transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-gray-900 transition-colors">Register</Link>
          </div>
          <p className="text-xs text-gray-400">Built on Stellar &middot; Powered by Soroban Smart Contracts</p>
        </div>
      </footer>
    </div>
  );
}
