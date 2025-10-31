import { useState, useEffect } from 'react';
import { Heart, Baby, Calendar, BookOpen, Users, Sparkles, ArrowRight, CheckCircle, Activity, Bell, MessageCircle, Moon, Sun, Zap, Shield, TrendingUp, Award, Smile, Star } from 'lucide-react';
import './LandingPage.css';

function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    const tabInterval = setInterval(() => {
      setActiveTab(prev => (prev + 1) % 3);
    }, 4000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(tabInterval);
    };
  }, []);

  const parallaxOffset = scrollY * 0.5;

  // Animated orbiting icons data
  const orbitingIcons = [
    { Icon: Heart, delay: 0, color: '#ff6b9d' },
    { Icon: Calendar, delay: 1, color: '#87ceeb' },
    { Icon: Activity, delay: 2, color: '#ffc107' },
    { Icon: Bell, delay: 3, color: '#4ade80' },
    { Icon: BookOpen, delay: 4, color: '#a78bfa' },
    { Icon: Users, delay: 5, color: '#fb923c' },
  ];

  return (
    <div className="bb-container">
      <div 
        className="cursor-glow"
        style={{
          left: mousePosition.x,
          top: mousePosition.y,
        }} 
      />

      <section className="hero">
        <div className="hero-left">
          <nav className="nav">
            <div className="logo-container">
              <div className="logo-circle">
                <Baby size={28} />
              </div>
              <span className="logo-text">BabyBloom</span>
            </div>
            <button className="nav-button">Start Free Trial</button>
          </nav>

          <div className="hero-content">
            <div className="badge-group">
              <Sparkles size={20} />
              <span>Trusted by 100K+ mothers globally</span>
            </div>
            
            <h1 className="main-heading">
              Your Pregnancy,
              <br />
              <span className="heading-gradient">Beautifully Tracked</span>
            </h1>
            
            <p className="sub-heading">
              Experience the most intuitive pregnancy companion. Track your journey, connect with a supportive community, and celebrate every milestone with confidence.
            </p>

            <div className="cta-group">
              <button className="primary-cta">
                <span>Begin Your Journey</span>
                <ArrowRight size={20} />
              </button>
              <button className="secondary-cta">
                <span>Watch Demo</span>
                <div className="play-icon">▶</div>
              </button>
            </div>

            <div className="trust-indicators">
              <div className="trust-item">
                <Award size={20} />
                <span>App of the Year</span>
              </div>
              <div className="trust-item">
                <Shield size={20} />
                <span>HIPAA Compliant</span>
              </div>
              <div className="trust-item">
                <TrendingUp size={20} />
                <span>4.9★ Rating</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-right">
          {/* Animated Orbiting System */}
          <div className="orbit-container">
            {/* Central Core */}
            <div className="orbit-core">
              <div className="core-inner">
                <Baby size={64} className="core-icon" />
                <div className="pulse-ring"></div>
                <div className="pulse-ring pulse-ring-2"></div>
                <div className="pulse-ring pulse-ring-3"></div>
              </div>
            </div>

            {/* Orbiting Icons */}
            {orbitingIcons.map((item, index) => {
              const IconComponent = item.Icon;
              return (
                <div 
                  key={index}
                  className="orbit-path"
                  style={{ 
                    animationDelay: `${item.delay}s`,
                    transform: `rotate(${index * 60}deg)`
                  }}
                >
                  <div 
                    className="orbit-icon"
                    style={{ 
                      transform: `rotate(${-index * 60}deg)`,
                      animationDelay: `${item.delay * 0.5}s`
                    }}
                  >
                    <div className="orbit-icon-inner" style={{ background: item.color }}>
                      <IconComponent size={24} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Floating Feature Cards */}
            <div 
              className="feature-popup popup-1"
              style={{
                transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`,
              }}
            >
              <div className="popup-icon">
                <CheckCircle size={20} />
              </div>
              <div className="popup-content">
                <div className="popup-title">Milestone Reached!</div>
                <div className="popup-text">First heartbeat detected</div>
              </div>
            </div>

            <div 
              className="feature-popup popup-2"
              style={{
                transform: `translate(${-mousePosition.x * 0.008}px, ${mousePosition.y * 0.008}px)`,
              }}
            >
              <div className="popup-icon">
                <Star size={20} />
              </div>
              <div className="popup-content">
                <div className="popup-title">Daily Tip</div>
                <div className="popup-text">Stay hydrated today</div>
              </div>
            </div>

            <div 
              className="feature-popup popup-3"
              style={{
                transform: `translate(${mousePosition.x * 0.012}px, ${-mousePosition.y * 0.012}px)`,
              }}
            >
              <div className="popup-icon">
                <Smile size={20} />
              </div>
              <div className="popup-content">
                <div className="popup-title">Community</div>
                <div className="popup-text">5 new messages</div>
              </div>
            </div>

            <div 
              className="feature-popup popup-4"
              style={{
                transform: `translate(${-mousePosition.x * 0.015}px, ${-mousePosition.y * 0.01}px)`,
              }}
            >
              <div className="popup-icon">
                <Bell size={20} />
              </div>
              <div className="popup-content">
                <div className="popup-title">Reminder</div>
                <div className="popup-text">Time for vitamins</div>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="hero-decoration deco-1"></div>
          <div className="hero-decoration deco-2"></div>
          <div className="hero-decoration deco-3"></div>
        </div>
      </section>

      <section className="features-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Everything in One Place</h2>
            <p className="section-desc">Powerful features designed to support you through every stage</p>
          </div>

          <div className="tabs-container">
            <div className="tab-buttons">
              {['Track & Monitor', 'Learn & Grow', 'Connect & Share'].map((tab, idx) => (
                <button
                  key={idx}
                  className={`tab-button ${activeTab === idx ? 'active' : ''}`}
                  onClick={() => setActiveTab(idx)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="tab-content">
              {activeTab === 0 && (
                <div className="tab-panel">
                  <div className="tab-left">
                    <h3 className="tab-title">Comprehensive Health Tracking</h3>
                    <p className="tab-description">
                      Monitor every aspect of your pregnancy with intelligent tracking tools that adapt to your needs.
                    </p>
                    <ul className="feature-list">
                      <li className="feature-item">
                        <CheckCircle size={20} />
                        <span>Real-time symptom logging</span>
                      </li>
                      <li className="feature-item">
                        <CheckCircle size={20} />
                        <span>Contraction timer with patterns</span>
                      </li>
                      <li className="feature-item">
                        <CheckCircle size={20} />
                        <span>Kick counter and movement tracker</span>
                      </li>
                      <li className="feature-item">
                        <CheckCircle size={20} />
                        <span>Weight and vitals monitoring</span>
                      </li>
                    </ul>
                  </div>
                  <div className="tab-right">
                    <div className="mockup-card">
                      <Activity size={48} className="mockup-icon" />
                      <div className="mockup-text">Health Dashboard</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 1 && (
                <div className="tab-panel">
                  <div className="tab-left">
                    <h3 className="tab-title">Expert Knowledge at Your Fingertips</h3>
                    <p className="tab-description">
                      Access curated content from healthcare professionals, updated weekly as your baby grows.
                    </p>
                    <ul className="feature-list">
                      <li className="feature-item">
                        <CheckCircle size={20} />
                        <span>Trimester-specific guidance</span>
                      </li>
                      <li className="feature-item">
                        <CheckCircle size={20} />
                        <span>Nutrition and exercise plans</span>
                      </li>
                      <li className="feature-item">
                        <CheckCircle size={20} />
                        <span>Video tutorials and courses</span>
                      </li>
                      <li className="feature-item">
                        <CheckCircle size={20} />
                        <span>Preparation checklists</span>
                      </li>
                    </ul>
                  </div>
                  <div className="tab-right">
                    <div className="mockup-card">
                      <BookOpen size={48} className="mockup-icon" />
                      <div className="mockup-text">Learning Center</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 2 && (
                <div className="tab-panel">
                  <div className="tab-left">
                    <h3 className="tab-title">Join a Supportive Community</h3>
                    <p className="tab-description">
                      Connect with mothers worldwide. Share experiences, ask questions, and build lasting friendships.
                    </p>
                    <ul className="feature-list">
                      <li className="feature-item">
                        <CheckCircle size={20} />
                        <span>Due date groups and forums</span>
                      </li>
                      <li className="feature-item">
                        <CheckCircle size={20} />
                        <span>Private messaging and groups</span>
                      </li>
                      <li className="feature-item">
                        <CheckCircle size={20} />
                        <span>Expert Q&A sessions</span>
                      </li>
                      <li className="feature-item">
                        <CheckCircle size={20} />
                        <span>Safe and moderated environment</span>
                      </li>
                    </ul>
                  </div>
                  <div className="tab-right">
                    <div className="mockup-card">
                      <MessageCircle size={48} className="mockup-icon" />
                      <div className="mockup-text">Community Hub</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bento-section">
        <div className="section-container">
          <div className="bento-grid">
            <div className="bento-card bento-large">
              <div className="bento-icon">
                <Moon size={32} />
              </div>
              <h3 className="bento-title">Sleep Tracking</h3>
              <p className="bento-desc">Monitor rest patterns and get personalized sleep tips for better pregnancy rest.</p>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <Heart size={32} />
              </div>
              <h3 className="bento-title">Mood Journal</h3>
              <p className="bento-desc">Track emotional wellness throughout your journey.</p>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <Calendar size={32} />
              </div>
              <h3 className="bento-title">Appointment Manager</h3>
              <p className="bento-desc">Never miss a checkup with smart scheduling.</p>
            </div>

            <div className="bento-card">
              <div className="bento-icon">
                <Sun size={32} />
              </div>
              <h3 className="bento-title">Daily Wellness</h3>
              <p className="bento-desc">Personalized health tips delivered each morning.</p>
            </div>

            <div className="bento-card bento-wide">
              <div className="bento-icon">
                <Baby size={32} />
              </div>
              <h3 className="bento-title">Baby Development Timeline</h3>
              <p className="bento-desc">Watch your baby grow with beautiful 3D visualizations and detailed weekly updates on development milestones.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="testimonials-section">
        <div className="section-container">
          <h2 className="section-title">Loved by Mothers Everywhere</h2>
          <div className="testimonial-grid">
            {[
              { name: 'Emma S.', role: 'First-time Mom', text: 'This app made my pregnancy journey so much easier. The community support is incredible!' },
              { name: 'Priya M.', role: 'Mother of Two', text: 'Best pregnancy app I\'ve used. The tracking features are comprehensive yet simple to use.' },
              { name: 'Sofia R.', role: 'Expecting Mother', text: 'I love how personalized everything is. It feels like the app was made just for me.' },
            ].map((testimonial, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="stars">★★★★★</div>
                <p className="testimonial-text">"{testimonial.text}"</p>
                <div className="testimonial-author">
                  <div className="avatar">{testimonial.name[0]}</div>
                  <div>
                    <div className="author-name">{testimonial.name}</div>
                    <div className="author-role">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="cta-card">
          <h2 className="cta-heading">Ready to Start Your Journey?</h2>
          <p className="cta-subheading">Join thousands of mothers who trust BabyBloom every day</p>
          <button className="final-cta-button">
            <span>Get Started Free</span>
            <ArrowRight size={24} />
          </button>
          <p className="cta-note">Free forever • No credit card required • Cancel anytime</p>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <Baby size={28} />
              <span>BabyBloom</span>
            </div>
            <p className="footer-tagline">Supporting mothers through every moment of their pregnancy journey.</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4 className="footer-heading">Product</h4>
              <a href="#" className="footer-link">Features</a>
              <a href="#" className="footer-link">Pricing</a>
              <a href="#" className="footer-link">FAQ</a>
            </div>
            <div className="footer-column">
              <h4 className="footer-heading">Company</h4>
              <a href="#" className="footer-link">About Us</a>
              <a href="#" className="footer-link">Blog</a>
              <a href="#" className="footer-link">Careers</a>
            </div>
            <div className="footer-column">
              <h4 className="footer-heading">Support</h4>
              <a href="#" className="footer-link">Help Center</a>
              <a href="#" className="footer-link">Privacy Policy</a>
              <a href="#" className="footer-link">Terms of Service</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="copyright">© 2025 BabyBloom. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;