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
    eyebrow: 'Mission Creation',
    title: 'From idea to mission in three steps',
    description:
      'Define the business domain, priority, and problem statement through a guided wizard — review before you launch.',
    image: '/screenshots/mission-creation.png',
    alt: 'MissionOS mission creation wizard',
  },
  {
    eyebrow: 'Mission Details',
    title: 'Datasets, analysis, and history together',
    description:
      'Upload datasets, watch validation happen live, and trigger AI analysis — all from a single mission workspace.',
    image: '/screenshots/mission-details.png',
    alt: 'MissionOS mission details page with datasets and AI analysis',
  },
  {
    eyebrow: 'Executive Dashboard',
    title: 'KPIs and charts, not raw JSON',
    description:
      'Business health, AI confidence, risk level, and dataset quality — plus bar, pie, and donut charts built from the same analysis.',
    image: '/screenshots/executive-dashboard.png',
    alt: 'MissionOS executive dashboard with KPI cards and charts',
  },
  {
    eyebrow: 'Executive Report',
    title: 'A report your board will actually read',
    description:
      'Cover page, KPI dashboard, top risks and recommendations, and a phased roadmap — exported to HTML or PDF in one click.',
    image: '/screenshots/executive-report.png',
    alt: 'MissionOS executive PDF report cover and KPI dashboard',
  },
]

function ProductShowcase() {
  return (
    <section id="executive-dashboard" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary-600">
            Product Showcase
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
