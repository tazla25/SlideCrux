import { Link } from 'react-router-dom';
import { blogPosts } from '../data/blog-posts';
import { useEffect } from 'react';

export default function Blog() {
  useEffect(() => {
    document.title = "SlideCrux Blog — AI Presentation Tips";
  }, []);

  return (
    <div className="landing-page" style={{ paddingTop: '5rem', minHeight: '100vh', paddingBottom: '5rem' }}>
      <div className="dashboard-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1.5rem' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(to right, var(--color-primary), var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SlideCrux Blog
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Tips, tricks, and strategies for creating better presentations faster using AI and video.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {blogPosts.map(post => (
            <Link to={`/blog/${post.slug}`} key={post.slug} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="feature-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', cursor: 'pointer' }}
                   onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                   onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                
                <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', lineHeight: 1.4 }}>{post.title}</h3>
                
                <p style={{ color: 'var(--color-text-secondary)', flex: 1, marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  {post.description}
                </p>
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {post.tags.map(tag => (
                    <span key={tag} style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.2rem 0.5rem', 
                      backgroundColor: 'rgba(255,255,255,0.1)', 
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
        
      </div>
    </div>
  );
}
