import Reveal from './Reveal'

interface ShowcaseItem {
  eyebrow: string
  title: string
  description: string
  image: string
  alt: string
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    eyebrow: 'Dashboard',
    title: 'One screen, every mission',
    description:
      'See backend health, mission counts by status, and recent activity the moment you sign in — no configuration needed.',
    image: '/screenshots/dashboard.png',
    alt: 'MissionOS dashboard with mission stats and backend status',
  },
  {
    eyebrow: 'Mission Details',
    title: 'Datasets, analysis, and explainability together',
    description:
      'Upload datasets, watch validation happen live, trigger AI analysis, and drill into fully expanded explainability cards — all from one mission workspace.',
    image: '/screenshots/mission-details.png',
    alt: 'MissionOS mission details page with datasets and AI analysis',
  },
  {
    eyebrow: 'Executive Dashboard',
    title: 'KPIs and charts, not raw JSON',
    description:
      'Business health, AI confidence, risk level, and dataset quality — plus waterfall, gauge, and donut charts built from the same analysis, in real time.',
    image: '/screenshots/executive-dashboard.png',
    alt: 'MissionOS executive dashboard with KPI cards and charts',
  },
  {
    eyebrow: 'AI Collaboration Center',
    title: 'Watch the agents work, not just their output',
    description:
      'The live pipeline, agent-by-agent confidence, consensus, and the evidence network connecting datasets to the final decision — all in one place.',
    image: '/screenshots/ai-collaboration-center.png',
    alt: 'MissionOS AI Collaboration Center showing the live pipeline and agent consensus',
  },
  {
    eyebrow: 'Scenario Simulator',
    title: 'Explore what-if, without touching the AI',
    description:
      'Adjust 14 business assumptions and see deterministic projections against the mission\'s real analysis — clearly labeled as a simulation, never a new prediction.',
    image: '/screenshots/scenario-simulator.png',
    alt: 'MissionOS Scenario Simulator with adjustable parameters and projected outcomes',
  },
  {
    eyebrow: 'Explainability',
    title: 'Why the AI recommended what it recommended',
    description:
      'Every recommendation traces back to its agent, its reasoning, its confidence, and the exact retrieved evidence that grounded it.',
    image: '/screenshots/explainability.png',
    alt: 'MissionOS Explainability cards showing agent reasoning and cited evidence',
  },
  {
    eyebrow: 'Data Library',
    title: 'Every dataset, quality-scored and searchable',
    description:
      'Storage usage, completeness, duplicate rates, and schema composition across every dataset connected to your missions.',
    image: '/screenshots/data-library.png',
    alt: 'MissionOS Data Library with dataset quality analytics',
  },
  {
    eyebrow: 'Executive Report',
    title: 'A report your board will actually read',
    description:
      'A print-ready report mirroring the dashboard section for section — cover page, KPIs, full analysis, evidence, and recommendations — generated from the exact same data.',
    image: '/screenshots/executive-report.png',
    alt: 'MissionOS Executive Report cover page and KPI overview',
  },
]

function ProductShowcase() {
  return (
    <section id="executive-dashboard" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary-600">
            MissionOS In Action
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            See MissionOS in action
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            Real screens from the real application — nothing here is a mockup.
          </p>
        </Reveal>

        <div className="mt-20 flex flex-col gap-24">
          {SHOWCASE_ITEMS.map((item, index) => (
            <Reveal key={item.title}>
              <div
                className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                  index % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
                }`}
              >
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary-600">
                    {item.eyebrow}
                  </span>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">{item.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-neutral-600">{item.description}</p>
                </div>
                <div className="relative">
                  <div
                    className="pointer-events-none absolute -inset-3 -z-10 rounded-3xl bg-gradient-to-br from-primary-500/10 to-violet-500/10 blur-xl"
                    aria-hidden="true"
                  />
                  <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-glow transition-transform duration-500 hover:scale-[1.015]">
                    <img
                      src={item.image}
                      alt={item.alt}
                      className="block w-full"
                      loading="lazy"
                      width={1280}
                      height={800}
                    />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ProductShowcase
