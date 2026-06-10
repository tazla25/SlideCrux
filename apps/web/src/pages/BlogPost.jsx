import { useParams, Navigate, Link } from 'react-router-dom';
import { blogPosts } from '../data/blog-posts';
import { useEffect } from 'react';

// Simple markdown parser for blog posts
function parseMarkdown(md) {
  if (!md) return { __html: '' };
  
  let html = md
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
    // Lists
    .replace(/^\s*\n\*/gm, '<ul>\n*')
    .replace(/^(\*.+)\s*\n([^\*])/gm, '$1\n</ul>\n\n$2')
    .replace(/^\*(.+)/gm, '<li>$1</li>')
    // Ordered Lists
    .replace(/^\s*\n\d\./gm, '<ol>\n1.')
    .replace(/^(\d\..+)\s*\n([^\d\.])/gm, '$1\n</ol>\n\n$2')
    .replace(/^\d\.(.+)/gm, '<li>$1</li>')
    // Paragraphs
    .replace(/^\s*(\n)?(.+)/gim, function(m) {
      return /<(\/)?(h\d|ul|ol|li|blockquote|pre|img)/.test(m) ? m : '<p>'+m+'</p>';
    });
    
  return { __html: html };
}

export default function BlogPost() {
  const { slug } = useParams();
  const post = blogPosts.find(p => p.slug === slug);

  useEffect(() => {
    if (post) {
      document.title = `${post.title} — SlideCrux Blog`;
      
      // Update meta description
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = post.description;
    }
  }, [post]);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <div className="landing-page" style={{ paddingTop: '5rem', minHeight: '100vh', paddingBottom: '5rem' }}>
      <div className="dashboard-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem' }}>
        
        <div style={{ marginBottom: '2rem' }}>
          <Link to="/blog" className="btn-back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Blog
          </Link>
        </div>

        <article className="blog-post" style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '3rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <div style={{ color: 'var(--color-primary)', fontWeight: 600, marginBottom: '1rem' }}>
            {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          
          <div 
            className="markdown-content" 
            dangerouslySetInnerHTML={parseMarkdown(post.content)}
            style={{ lineHeight: 1.7, color: 'var(--color-text-primary)' }}
          />

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
            {post.tags.map(tag => (
              <span key={tag} style={{ 
                fontSize: '0.85rem', 
                padding: '0.25rem 0.75rem', 
                backgroundColor: 'rgba(255,255,255,0.05)', 
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)'
              }}>
                #{tag}
              </span>
            ))}
          </div>
        </article>

        <div style={{ marginTop: '4rem', textAlign: 'center', padding: '3rem', backgroundColor: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary)' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Ready to create presentations in seconds?</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>
            Join thousands of professionals using SlideCrux to turn videos into beautiful slide decks.
          </p>
          <Link to="/register" className="btn btn-primary btn-lg pulse-hover">
            Try SlideCrux Free →
          </Link>
        </div>

      </div>
    </div>
  );
}
