import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import TopNav from '../components/TopNav'
import WebGLBackground from '../components/WebGLBackground'
import { agents } from '../data/agents'

const processes = [
  {
    title: 'Record-to-Report',
    body: 'Automate ledger close, consolidation, and financial statement generation with absolute precision and traceable data lineage.',
    svg: (
      <svg className="h-full w-full p-4" viewBox="0 0 100 100" fill="none">
        <circle className="anim-float text-primary-fixed-dim" cx="20" cy="50" r="4" fill="currentColor" style={{ animationDelay: '0s' }} />
        <circle className="anim-pulse-ring anim-float relative text-primary-fixed-dim" cx="50" cy="50" r="6" fill="currentColor" style={{ animationDelay: '0.5s' }} />
        <circle className="anim-float text-primary-fixed-dim" cx="80" cy="50" r="4" fill="currentColor" style={{ animationDelay: '1s' }} />
        <path className="anim-data-flow text-primary-fixed-dim/50" d="M 24 50 L 44 50" stroke="currentColor" strokeWidth="1.5" />
        <path className="anim-data-flow text-primary-fixed-dim/50" d="M 56 50 L 76 50" stroke="currentColor" strokeWidth="1.5" />
        <rect className="text-primary-fixed-dim/30" x="42" y="30" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect className="text-primary-fixed-dim/30" x="42" y="60" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path className="text-primary-fixed-dim/50" d="M 50 40 L 50 44" stroke="currentColor" strokeWidth="1.5" />
        <path className="text-primary-fixed-dim/50" d="M 50 56 L 50 60" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: 'Procure-to-Pay',
    body: 'Streamline vendor onboarding, complex invoice processing, and payment execution through intelligent matching agents.',
    svg: (
      <svg className="h-full w-full p-4" viewBox="0 0 100 100" fill="none">
        <path className="text-primary-fixed-dim/30" d="M 30 70 L 30 30 L 70 30" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle className="text-primary-fixed-dim" cx="30" cy="70" r="3" fill="currentColor" />
        <circle className="text-primary-fixed-dim" cx="30" cy="30" r="3" fill="currentColor" />
        <circle className="text-primary-fixed-dim" cx="70" cy="30" r="3" fill="currentColor" />
        <path className="anim-data-flow text-primary-fixed-dim/50" d="M 50 50 L 70 70" stroke="currentColor" strokeWidth="1.5" />
        <circle className="anim-spin-slow text-primary-fixed-dim" cx="50" cy="50" r="5" fill="none" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1.5" />
        <circle className="anim-pulse-ring relative text-primary-fixed-dim/20" cx="70" cy="70" r="6" fill="currentColor" />
        <circle className="text-primary-fixed-dim" cx="70" cy="70" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Order-to-Cash',
    body: 'Accelerate revenue recognition, autonomous billing generation, and smart collections with agent-driven follow-ups.',
    svg: (
      <svg className="h-full w-full p-4" viewBox="0 0 100 100" fill="none">
        <circle className="anim-spin-slow text-primary-fixed-dim/30" cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeDasharray="10 5" strokeWidth="1" />
        <circle className="text-primary-fixed-dim/20" cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <path className="text-primary-fixed-dim/60" d="M 50 15 L 50 25 M 85 50 L 75 50 M 50 85 L 50 75 M 15 50 L 25 50" stroke="currentColor" strokeWidth="2" />
        <circle className="anim-pulse-ring relative text-primary-fixed-dim" cx="50" cy="50" r="4" fill="currentColor" />
        <circle className="anim-float text-primary-fixed-dim" cx="30" cy="30" r="2" fill="currentColor" />
        <circle className="anim-float text-primary-fixed-dim" cx="70" cy="30" r="2" fill="currentColor" style={{ animationDelay: '1s' }} />
        <circle className="anim-float text-primary-fixed-dim" cx="70" cy="70" r="2" fill="currentColor" style={{ animationDelay: '0.5s' }} />
        <circle className="anim-float text-primary-fixed-dim" cx="30" cy="70" r="2" fill="currentColor" style={{ animationDelay: '1.5s' }} />
      </svg>
    ),
  },
]

export default function Landing() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <TopNav />
      <WebGLBackground />
      <section className="relative flex min-h-screen items-center justify-center bg-grid-pattern px-gutter pb-24 pt-32 md:pb-32 md:pt-48">
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/80 to-background" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="glass-panel mb-8 inline-flex items-center gap-2 rounded-full border border-primary-fixed-dim/30 px-3 py-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary-fixed-dim" />
            <span className="font-label-md text-label-md text-primary-fixed-dim">
              Nexus 2.0 Engine Live
            </span>
          </div>
          <h1 className="mb-6 text-[40px] font-bold leading-[48px] text-on-surface md:text-[64px] md:leading-[72px]">
            One platform. <br />
            <span className="bg-gradient-to-r from-primary-fixed to-primary-fixed-dim bg-clip-text text-transparent">
              Every finance process. Intelligent agents.
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            Define any finance workflow in natural language. Nexus autonomously
            assembles the optimal agent constellation, ingests your data, applies
            governed rules, and maintains human oversight.
          </p>
          <Link
            to="/architect"
            className="btn-primary-gradient inline-flex w-full items-center justify-center gap-2 rounded-lg px-8 py-4 font-label-md text-label-md text-on-primary-fixed sm:w-auto"
          >
            Enter the Platform
            <Icon name="arrow_forward" />
          </Link>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/5 bg-background px-gutter py-24">
        <div className="mx-auto max-w-[1440px] text-center">
          <h2 className="mb-16 font-headline-md text-headline-md text-on-surface">
            End-to-End{' '}
            <span className="bg-gradient-to-r from-primary-fixed to-primary-fixed-dim bg-clip-text text-transparent">
              Finance Orchestration
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-8 text-left md:grid-cols-3">
            {processes.map((p) => (
              <div
                key={p.title}
                className="glass-panel group relative rounded-xl border border-white/10 p-8 transition-colors hover:border-primary-fixed-dim/50"
              >
                <div className="mb-6 flex h-48 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-surface-container">
                  <div className="absolute inset-0" />
                  {p.svg}
                </div>
                <h3 className="mb-3 font-headline-sm text-headline-sm text-on-surface">
                  {p.title}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/5 bg-background px-gutter py-24">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-16 text-center">
            <h2 className="mb-4 font-headline-md text-headline-md text-on-surface">
              Meet the team
            </h2>
            <h3 className="mb-4 font-headline-sm text-headline-sm text-primary-fixed-dim">
              Core agents. Infinite workflows.
            </h3>
            <p className="mx-auto max-w-3xl font-body-md text-body-md text-on-surface-variant">
              A growing library of specialist agents powers every use case. Only
              the configuration changes.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="glass-panel flex flex-col gap-4 rounded-xl border border-primary-fixed-dim/20 bg-surface-bright p-6 transition-all hover:border-primary-fixed-dim/50"
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-surface-container">
                  <span className="material-symbols-outlined text-6xl text-primary-fixed-dim/50">
                    {agent.icon}
                  </span>
                </div>
                <div>
                  <h4 className="mb-2 font-headline-sm text-headline-sm text-on-surface">
                    {agent.name}
                  </h4>
                  <p className="font-body-md text-body-md text-sm text-on-surface-variant">
                    {agent.tagline}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 mt-auto w-full border-t border-white/5 bg-surface-container-lowest py-12">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-8 px-gutter md:grid-cols-2">
          <div className="flex flex-col items-center gap-4 md:flex-row md:gap-8">
            <span className="font-headline-sm text-headline-sm text-primary-fixed-dim">
              Nexus 2.0
            </span>
            <span className="font-body-md text-body-md text-on-surface-variant">
              © 2024 Nexus 2.0 AI Studio. All rights reserved.
            </span>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 md:justify-end">
            {['Privacy Policy', 'Terms of Service', 'Documentation', 'Support'].map(
              (label) => (
                <a
                  key={label}
                  href="#"
                  className="font-body-md text-body-md text-on-surface-variant transition-colors hover:text-primary-fixed-dim"
                >
                  {label}
                </a>
              ),
            )}
          </nav>
        </div>
      </footer>
    </div>
  )
}
