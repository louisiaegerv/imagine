import { Composer } from "@/components/composer"
import { JobResults } from "@/components/job-results"
import { PageHeader } from "@/components/page-header"

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string; ratio?: string }>
}) {
  // The library's "Reuse settings" action links here with these filled in.
  const { prompt, ratio } = await searchParams

  return (
    <>
      <PageHeader title="Generate" />
      <div className="mx-auto grid w-full max-w-6xl gap-8 p-4 md:p-6 lg:grid-cols-[360px_1fr]">
        <div className="lg:sticky lg:top-18 lg:self-start">
          <Composer
            key={`${prompt}|${ratio}`}
            initialPrompt={prompt}
            initialRatio={ratio}
          />
        </div>
        <JobResults />
      </div>
    </>
  )
}
