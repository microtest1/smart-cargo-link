import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Check, Clock } from "lucide-react";
import { Seo, breadcrumbSchema, SITE_URL, SITE_NAME } from "@/components/seo/Seo";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { seoGuideBySlug } from "@/content/seoGuides";
import { seoPages } from "@/content/seoPages";
import { seoGuides } from "@/content/seoGuides";
import NotFound from "@/pages/NotFound";

export default function GuidePage() {
  const { pathname } = useLocation();
  const guide = seoGuideBySlug(pathname);

  if (!guide) return <NotFound />;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.h1,
    description: guide.description,
    datePublished: guide.datePublished,
    dateModified: guide.datePublished,
    mainEntityOfPage: `${SITE_URL}${guide.slug}`,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Shipping Guides", path: "/resources" },
    { name: guide.h1, path: guide.slug },
  ]);

  const relatedLinks = guide.related.map((slug) => {
    const service = seoPages.find((p) => p.slug === slug);
    const other = seoGuides.find((g) => g.slug === slug);
    return service ? { slug, label: service.h1 } : other ? { slug, label: other.h1 } : null;
  });

  return (
    <>
      <Seo
        title={guide.title}
        description={guide.description}
        path={guide.slug}
        type="article"
        jsonLd={[articleSchema, breadcrumbs]}
      />
      <SeoPageLayout>
        <main>
          <section className="border-b border-border bg-muted/30 px-4 py-14">
            <div className="mx-auto max-w-3xl">
              <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
                <Link to="/" className="hover:text-accent">
                  Home
                </Link>
                <span className="mx-2">/</span>
                <Link to="/resources" className="hover:text-accent">
                  Shipping Guides
                </Link>
              </nav>
              <h1 className="font-display mb-4 text-3xl font-bold md:text-4xl">{guide.h1}</h1>
              <p className="text-lg text-muted-foreground">{guide.summary}</p>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> {guide.readingTime}
              </p>
            </div>
          </section>

          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl space-y-10">
              {guide.sections.map((section) => (
                <article key={section.h2}>
                  <h2 className="font-display mb-3 text-2xl font-semibold">{section.h2}</h2>
                  {section.paragraphs?.map((p) => (
                    <p key={p} className="mb-3 leading-relaxed text-muted-foreground">
                      {p}
                    </p>
                  ))}
                  {section.list && (
                    <ul className="mt-3 space-y-2">
                      {section.list.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="bg-muted/30 px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="font-display mb-6 text-2xl font-semibold">Frequently asked questions</h2>
              <div className="space-y-5">
                {guide.faqs.map((faq) => (
                  <div key={faq.q} className="rounded-2xl border border-border/50 bg-card p-5">
                    <h3 className="font-semibold">{faq.q}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="font-display mb-4 text-xl font-semibold">Keep reading</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {relatedLinks.map(
                  (link) =>
                    link && (
                      <li key={link.slug}>
                        <Link
                          to={link.slug}
                          className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-card p-4 text-sm font-medium transition-colors hover:border-accent"
                        >
                          {link.label}
                          <ArrowRight className="h-4 w-4 flex-shrink-0 text-accent" />
                        </Link>
                      </li>
                    ),
                )}
              </ul>
            </div>
          </section>
        </main>
      </SeoPageLayout>
    </>
  );
}
