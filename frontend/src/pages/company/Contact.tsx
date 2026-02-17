import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Clock,
  HelpCircle,
  CalendarDays,
  Scale,
  Send,
  CheckCircle2,
  Sparkles,
  Info,
  Briefcase,
  Newspaper,
} from 'lucide-react';
import { Footer } from '../../components/layout/Footer';

const CONTACT_INFO = [
  { icon: Mail, label: 'Email', value: 'hello@edge.com', href: 'mailto:hello@edge.com' },
  { icon: Phone, label: 'Phone', value: '(555) 234-5678', href: 'tel:+15552345678' },
  { icon: MapPin, label: 'Office', value: 'Wilmington, DE', href: undefined },
  { icon: Clock, label: 'Support Hours', value: 'Mon–Fri 9am–6pm EST', href: undefined },
];

const QUICK_LINKS = [
  { icon: HelpCircle, label: 'Help Center', href: '/help' },
  { icon: CalendarDays, label: 'Schedule Demo', href: '/company/contact' },
  { icon: Scale, label: 'Legal', href: '/legal/terms' },
];

const ROLES = ['RIA / Advisor', 'Investor', 'Partner', 'Press', 'Other'];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Home</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6">
            <Link to="/company/about" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> About
            </Link>
            <Link to="/company/careers" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" /> Careers
            </Link>
            <Link to="/company/blog" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <Newspaper className="h-3.5 w-3.5" /> Blog
            </Link>
          </nav>
          <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 sm:hidden">
            Home <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-20">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Contact Us
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            Get in Touch
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Have questions about Edge? Want to schedule a demo? We'd love to hear from you.
          </p>
        </section>

        {/* Two-column layout */}
        <section className="grid lg:grid-cols-5 gap-10">
          {/* Contact Form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Message Sent!</h3>
                <p className="text-slate-600">
                  Thank you for reaching out. Our team will get back to you within one business day.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-6 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Send Us a Message</h2>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="Jane Doe"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="jane@company.com"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
                  <input
                    id="company"
                    type="text"
                    placeholder="Acme Advisors LLC"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                  <select
                    id="role"
                    required
                    defaultValue=""
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="" disabled>Select your role</option>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    placeholder="Tell us how we can help..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  <Send className="h-4 w-4" /> Send Message
                </button>
              </form>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Info */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-5">
              <h3 className="font-semibold text-slate-900">Contact Information</h3>
              {CONTACT_INFO.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                      <Icon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors">
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-slate-900">{item.value}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Links */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
              <h3 className="font-semibold text-slate-900">Quick Links</h3>
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="flex items-center gap-3 text-sm text-slate-700 hover:text-blue-600 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                    <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                  </Link>
                );
              })}
            </div>

            {/* Map Placeholder */}
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl p-8 border border-slate-200 text-center">
              <MapPin className="h-8 w-8 text-slate-400 mx-auto mb-3" />
              <p className="font-medium text-slate-700">Wilmington, DE</p>
              <p className="text-sm text-slate-500 mt-1">United States</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
