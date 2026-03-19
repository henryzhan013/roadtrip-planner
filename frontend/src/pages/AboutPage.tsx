import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export function AboutPage() {
  const { showToast } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      showToast('Message sent! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', message: '' });
      setIsSubmitting(false);
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="about-page">
      <section className="about-hero">
        <h1>About Road Trip Planner</h1>
        <p className="about-tagline">
          Your AI-powered companion for planning unforgettable road trips
        </p>
      </section>

      <section className="about-content">
        <div className="about-section">
          <h2>Our Mission</h2>
          <p>
            We believe that the best adventures start with great planning. Road Trip Planner
            combines the power of AI with real-world data to help you create personalized
            itineraries that match your interests, budget, and schedule.
          </p>
        </div>

        <div className="about-section">
          <h2>What We Offer</h2>
          <div className="about-features">
            <div className="about-feature">
              <span className="about-feature-icon">🤖</span>
              <h3>AI-Powered Itineraries</h3>
              <p>Simply describe your dream trip and let our AI create a complete day-by-day plan.</p>
            </div>
            <div className="about-feature">
              <span className="about-feature-icon">📍</span>
              <h3>Real Places & Reviews</h3>
              <p>All recommendations come from verified locations with ratings and reviews.</p>
            </div>
            <div className="about-feature">
              <span className="about-feature-icon">🗺️</span>
              <h3>Interactive Maps</h3>
              <p>Visualize your entire route with driving directions and estimated times.</p>
            </div>
            <div className="about-feature">
              <span className="about-feature-icon">💾</span>
              <h3>Save & Share</h3>
              <p>Keep your favorite trips saved and share them with friends and family.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-section">
        <h2>Contact Us</h2>
        <p>Have questions or feedback? We'd love to hear from you!</p>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us what's on your mind..."
              rows={5}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </section>
    </div>
  );
}
