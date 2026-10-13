import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { Seo, breadcrumbSchema } from "@/components/seo/Seo";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { seoGuides } from "@/content/seoGuides";
import { seoPages } from "@/content/seoPages";

export default function ResourcesHub() {
  return (
    <>
      <Seo
        title="China to Ghana Shipping Guides & Resources | Amoliga Elite"
        description="Practical guides for importers shipping from China to Ghana: how the process works, how CBM is calculated, sea vs air freight and shipping marks explained."
        path="/resources"
        jsonLd={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Shipping Guides", path: "/resources" },
        ])}
      />
      <SeoPageLayout>
        <main>
          <section className="border-b border-border bg-muted/30 px-4 py-14">
            <div className="mx-auto max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <BookOpen className="h-4 w-4" />
                Shipping Guides
              </div>
              <h1 className="font-display mb-4 text-3xl font-bold md:text-4xl">
                China to Ghana Shipping Guides for Importers
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Everything we get asked most often about importing from China into Ghana — written for first-time
                importers and growing businesses alike.
              </p>
            </div>
          </section>

          <section className="px-4 py-12">
            <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
              {seoGuides.map((guide) => (
                <Link
                  key={guide.slug}
                  to={guide.slug}
                  className="shadow-card hover:shadow-card-hover flex flex-col rounded-2xl border border-border/50 bg-card p-6 transition-all"
                >
                  <h2 className="font-display mb-2 text-lg font-semibold">{guide.h1}</h2>
                  <p className="mb-4 flex-1 text-sm text-muted-foreground">{guide.summary}</p>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {guide.readingTime}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-muted/30 px-4 py-12">
            <div className="mx-auto max-w-4xl">
              <h2 className="font-display mb-6 text-2xl font-semibold">Our shipping services</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {seoPages.map((page) => (
                  <li key={page.slug}>
                    <Link
                      to={page.slug}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-card p-4 text-sm font-medium transition-colors hover:border-accent"
                    >
                      {page.h1}
                      <ArrowRight className="h-4 w-4 flex-shrink-0 text-accent" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </main>
      </SeoPageLayout>
    </>
  );
}
