import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Seo, breadcrumbSchema, SITE_URL, SITE_NAME } from "@/components/seo/Seo";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { seoPageBySlug, seoPages } from "@/content/seoPages";
import NotFound from "@/pages/NotFound";

export default function ServiceLandingPage() {
  const { pathname } = useLocation();
  const page = seoPageBySlug(pathname);

  if (!page) return <NotFound />;

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.serviceName,
    serviceType: page.serviceName,
    description: page.description,
    url: `${SITE_URL}${page.slug}`,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      email: "aeflogistics@gmail.com",
      telephone: "+233307001743",
      address: { "@type": "PostalAddress", addressCountry: "GH" },
    },
    areaServed: [
      { "@type": "Country", name: "Ghana" },
      { "@type": "Country", name: "China" },
    ],
  };

  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: page.h1, path: page.slug },
  ]);

  const relatedPages = page.related
    .map((slug) => seoPages.find((p) => p.slug === slug))
    .filter((p): p is (typeof seoPages)[number] => Boolean(p));

  return (
    <>
      <Seo
        title={page.title}
        description={page.description}
        path={page.slug}
        jsonLd={[serviceSchema, breadcrumbs]}
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
                <span className="text-foreground">{page.h1}</span>
              </nav>
              <h1 className="font-display mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">{page.h1}</h1>
              <p className="text-lg text-muted-foreground">{page.intro}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={page.cta.to}>
                  <Button variant="hero" size="lg">
                    {page.cta.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/china-warehouse-addresses">
                  <Button variant="outline" size="lg">
                    Get the Right Warehouse Address
                  </Button>
                </Link>
                <a href="tel:+233307001743">
                  <Button variant="outline" size="lg">
                    Call +233 30 700 1743
                  </Button>
                </a>
              </div>
            </div>
          </section>

          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl space-y-10">
              {page.sections.map((section) => (
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
                {page.faqs.map((faq) => (
                  <div key={faq.q} className="rounded-2xl border border-border/50 bg-card p-5">
                    <h3 className="font-semibold">{faq.q}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {relatedPages.length > 0 && (
            <section className="px-4 py-12">
              <div className="mx-auto max-w-3xl">
                <h2 className="font-display mb-4 text-xl font-semibold">Related services</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {relatedPages.map((related) => (
                    <li key={related.slug}>
                      <Link
                        to={related.slug}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-card p-4 text-sm font-medium transition-colors hover:border-accent"
                      >
                        {related.h1}
                        <ArrowRight className="h-4 w-4 flex-shrink-0 text-accent" />
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-muted-foreground">
                  New to importing?{" "}
                  <Link to="/resources" className="text-accent underline">
                    Read our China to Ghana shipping guides
                  </Link>
                  .
                </p>
              </div>
            </section>
          )}
        </main>
      </SeoPageLayout>
    </>
  );
}
