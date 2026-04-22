import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { blogPosts } from "@/data/blogPosts";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Post not found.</p>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    publisher: {
      "@type": "Organization",
      name: "Alley Cat",
      url: "https://alleycat-bowling.com",
    },
    mainEntityOfPage: `https://alleycat-bowling.com/blog/${post.slug}`,
  };

  const faqJsonLd = post.faqs && post.faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  } : null;

  return (
    <>
      <Helmet>
        <title>{post.title}</title>
        <meta name="description" content={post.metaDescription} />
        <meta name="keywords" content={post.keyword} />
        <link rel="canonical" href={`https://alleycat-bowling.com/blog/${post.slug}`} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://alleycat-bowling.com/blog/${post.slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        {faqJsonLd && (
          <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        )}
      </Helmet>

      <article className="min-h-screen pb-20">
        <header className="border-b border-border p-4 text-center">
          <p className="text-4xl mb-2">{post.heroEmoji}</p>
          <h1 className="text-xl text-primary">{post.title}</h1>
          <p className="text-xs text-muted-foreground mt-2">
            By Alley Cat Team
          </p>
        </header>

        <div className="max-w-2xl mx-auto p-4 space-y-6">
          <p className="text-sm text-foreground leading-relaxed border border-border p-3 bg-muted">
            {post.intro}
          </p>

          {post.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-sm text-primary border-b border-border pb-1 mb-2">
                {section.heading}
              </h2>
              <p
                className="text-sm text-foreground leading-relaxed whitespace-pre-line"
                dangerouslySetInnerHTML={{
                  __html: section.content.replace(
                    /\*\*(.+?)\*\*/g,
                    '<strong class="text-primary">$1</strong>'
                  ),
                }}
              />
            </section>
          ))}

          {post.faqs && post.faqs.length > 0 && (
            <section>
              <h2 className="text-sm text-primary border-b border-border pb-1 mb-2">
                Frequently Asked Questions
              </h2>
              <dl className="space-y-3">
                {post.faqs.map((faq, i) => (
                  <div key={i} className="border border-border p-3">
                    <dt className="text-sm text-primary mb-1">{faq.question}</dt>
                    <dd className="text-sm text-foreground leading-relaxed">
                      {faq.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <div className="border border-primary p-4 text-center bg-muted mt-8">
            <p className="text-sm text-foreground mb-3">{post.cta}</p>
            <Link
              to="/auth"
              className="inline-block border border-primary px-4 py-1 text-sm text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Sign Up Free →
            </Link>
          </div>

          <nav className="border-t border-border pt-4 mt-8">
            <p className="text-xs text-muted-foreground mb-2">More Articles:</p>
            <ul className="space-y-1">
              {blogPosts
                .filter((p) => p.slug !== post.slug)
                .map((p) => (
                  <li key={p.slug}>
                    <Link
                      to={`/blog/${p.slug}`}
                      className="text-xs text-primary underline"
                    >
                      {p.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        </div>
      </article>
    </>
  );
};

export default BlogPost;
