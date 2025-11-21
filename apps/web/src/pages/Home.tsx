import { Link } from 'react-router-dom';
import { Heart, Shield, Users, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">
          Empowering Change, <span className="text-blue-600">One Pledge at a Time</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          CareForAll connects generous donors with meaningful causes. Join our community and make a difference today with secure, transparent giving.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/register" className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl">
            Get Started
          </Link>
          <Link to="/login" className="bg-white text-slate-900 border border-slate-200 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition">
            Sign In
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { icon: Heart, title: "Meaningful Causes", desc: "Support verified campaigns that make a real impact." },
          { icon: Shield, title: "Secure Payments", desc: "Bank-grade security for all your transactions." },
          { icon: Zap, title: "Real-time Updates", desc: "Get instant notifications on campaign progress." },
          { icon: Users, title: "Community Chat", desc: "Connect with other donors and organizers." }
        ].map((feature, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
            <feature.icon className="w-10 h-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.desc}</p>
          </div>
        ))}
      </section>

      {/* Stats Section */}
      <section className="bg-slate-900 text-white rounded-2xl p-12 text-center">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="text-4xl font-bold text-blue-400 mb-2">$2M+</div>
            <div className="text-slate-400">Funds Raised</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-400 mb-2">50k+</div>
            <div className="text-slate-400">Donors</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-blue-400 mb-2">1000+</div>
            <div className="text-slate-400">Campaigns Funded</div>
          </div>
        </div>
      </section>
    </div>
  );
}
