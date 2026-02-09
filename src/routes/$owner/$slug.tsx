import { createFileRoute } from '@tanstack/react-router'
import { SkillDetailPage } from '../../components/SkillDetailPage'
import { buildSkillMeta, fetchSkillMeta } from '../../lib/og'

export const Route = createFileRoute('/$owner/$slug')({
  loader: async ({ params }) => {
    const skillMetadata = await fetchSkillMeta(params.slug)
    return {
      owner: skillMetadata?.owner ?? params.owner,
      displayName: skillMetadata?.displayName ?? null,
      summary: skillMetadata?.summary ?? null,
      version: skillMetadata?.version ?? null,
    }
  },
  head: ({ params, loaderData }) => {
    const meta = buildSkillMeta({
      slug: params.slug,
      owner: loaderData?.owner ?? params.owner,
      displayName: loaderData?.displayName,
      summary: loaderData?.summary,
      version: loaderData?.version ?? null,
    })
    return {
      links: [
        {
          rel: 'canonical',
          href: meta.url,
        },
      ],
      meta: [
        { title: meta.title },
        { name: 'description', content: meta.description },
        { property: 'og:title', content: meta.title },
        { property: 'og:description', content: meta.description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: meta.url },
        { property: 'og:image', content: meta.image },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: meta.title },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: meta.title },
        { name: 'twitter:description', content: meta.description },
        { name: 'twitter:image', content: meta.image },
        { name: 'twitter:image:alt', content: meta.title },
      ],
    }
  },
  component: OwnerSkill,
})

function OwnerSkill() {
  const { owner, slug } = Route.useParams()
  return <SkillDetailPage slug={slug} canonicalOwner={owner} />
}
