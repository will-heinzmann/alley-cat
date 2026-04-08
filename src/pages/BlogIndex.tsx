import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { blogPosts } from "@/data/blogPosts";

const BlogIndex = () => (
  <>
    <Helmet>
      <title>Bowling Tips & Guides — Alley Cat Blog</title>
      <meta name="description" content="Bowling tips, guides, and resources from Alley Cat. Learn about handicaps, score tracking, finding alleys near you, and more." />
      <link rel="canonical" href="https://alley-cat.lovable.app/blog" />
    </Helmet>

    <div className="min-h-screen pb-20">
      <header className="border-b border-border p-4 text-center">
        <h1 className="text-xl text-primary">🎳 Alley Cat Blog</h1>
        <p className="text-xs text-muted-foreground mt-1">Bowling tips, guides & resources</p>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="block border border-border p-3 hover:border-primary transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{post.heroEmoji}</span>
              <div>
                <h2 className="text-sm text-primary">{post.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">{post.metaDescription}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </>
);

export default BlogIndex;
