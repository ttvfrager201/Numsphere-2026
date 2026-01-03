"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import {
  ArrowRight,
  CheckCircle2,
  Phone,
  Shield,
  Zap,
  Clock,
  Star,
  Settings,
  Search,
  BarChart3,
  Mic,
  Smartphone,
  X,
  Check,
  User,
} from "lucide-react";

// Real Supabase auth hook
const useUser = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
};

export default function Home() {
  const [showPricing, setShowPricing] = useState(false);
  const { user, loading } = useUser();

  const plans = [
    {
      id: 1,
      name: "Starter",
      price: 29.99,
      description: "Perfect for getting started",
      features: [
        "400 minutes/month",
        "1 phone number",
        "Coming soon: calling & flows",
      ],
      popular: false,
      link: "/pricing",
    },
    {
      id: 2,
      name: "Professional",
      price: 69.99,
      description: "For growing businesses",
      features: [
        "1,500 minutes/month",
        "3 phone numbers",
        "Coming soon: calling & flows",
      ],
      popular: true,
      link: "/pricing",
    },
    {
      id: 3,
      name: "Business",
      price: 149.99,
      description: "For established businesses",
      features: [
        "3,500 minutes/month",
        "7 phone numbers",
        "Coming soon: calling & flows",
      ],
      popular: false,
      link: "/pricing",
    },
    {
      id: 4,
      name: "Enterprise",
      price: 349.99,
      description: "For large organizations",
      features: [
        "10,000 minutes/month",
        "15 phone numbers",
        "Coming soon: calling & flows",
      ],
      popular: false,
      link: "/pricing",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(2deg);
          }
          50% {
            transform: translateY(-10px) rotate(2deg);
          }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
        
        .animation-delay-600 {
          animation-delay: 0.6s;
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-12">
              {/* Logo */}
              <a
                href="/"
                className="flex items-center gap-3 hover:scale-105 transition-transform"
              >
                <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <Phone className="w-5 h-5 text-white" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
                </div>
                <span className="text-2xl font-black text-gray-900">
                  Numsphere*
                </span>
              </a>

              {/* Nav Links */}
              <div className="hidden md:flex items-center gap-1">
                <a
                  href="#features"
                  className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-full transition-all"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-full transition-all"
                >
                  How it works
                </a>
                <button
                  onClick={() => setShowPricing(true)}
                  className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-100 rounded-full transition-all"
                >
                  Pricing
                </button>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {loading ? (
                <div className="flex items-center gap-4">
                  <div className="w-24 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
              ) : user ? (
                <>
                  <a
                    href="/dashboard"
                    className="px-6 py-3 text-gray-700 font-bold hover:bg-gray-100 rounded-full transition-all"
                  >
                    Dashboard
                  </a>
                  <button className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold hover:scale-110 transition-transform shadow-lg">
                    {user.email?.[0].toUpperCase() || "U"}
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/sign-in"
                    className="px-6 py-3 text-gray-700 font-bold hover:bg-gray-100 rounded-full transition-all"
                  >
                    Log in
                  </a>
                  <a
                    href="/sign-up"
                    className="px-6 py-3 bg-gray-900 text-white rounded-full font-bold hover:bg-gray-800 transition-all hover:scale-105 shadow-lg"
                  >
                    Sign up free
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 pt-32 pb-32 overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          ></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-left">
              <h1 className="text-6xl md:text-8xl font-black text-white mb-8 leading-[0.95] tracking-tight">
                A phone system
                <span className="block">built for you.</span>
              </h1>
              <p className="text-xl md:text-2xl text-indigo-50 mb-12 max-w-2xl leading-relaxed font-medium">
                Join 50K+ businesses using Numsphere for their calling. One
                system to help you share everything you create, curate and sell
                from your calls, texts, and communications.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <a
                  href="/sign-up"
                  className="inline-flex items-center justify-center px-8 py-4 text-gray-900 bg-white rounded-full hover:bg-gray-100 transition-all text-lg font-black shadow-2xl hover:scale-105"
                >
                  Get started for free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </a>
                <button
                  onClick={() => setShowPricing(true)}
                  className="inline-flex items-center justify-center px-8 py-4 text-white border-3 border-white/30 rounded-full hover:bg-white/10 transition-all text-lg font-black"
                >
                  View pricing
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-white font-bold">
                <div className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Free forever
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  No credit card
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Easy setup
                </div>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-white rounded-3xl p-6 shadow-2xl border-4 border-gray-900 transform rotate-2 hover:rotate-0 transition-all hover:scale-105 animate-float">
                    <div className="aspect-square bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl mb-4 flex items-center justify-center">
                      <Phone className="w-12 h-12 text-white animate-pulse-slow" />
                    </div>
                    <p className="font-black text-gray-900 text-lg">
                      Sales Team
                    </p>
                    <p className="text-sm text-gray-600 font-semibold">
                      Global reach
                    </p>
                  </div>
                  <div className="bg-white rounded-3xl p-6 shadow-2xl border-4 border-gray-900 transform -rotate-2 hover:rotate-0 transition-all hover:scale-105 animate-float animation-delay-200">
                    <div className="aspect-square bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl mb-4 flex items-center justify-center">
                      <Shield className="w-12 h-12 text-white animate-pulse-slow" />
                    </div>
                    <p className="font-black text-gray-900 text-lg">Support</p>
                    <p className="text-sm text-gray-600 font-semibold">
                      24/7 available
                    </p>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="bg-white rounded-3xl p-6 shadow-2xl border-4 border-gray-900 transform -rotate-1 hover:rotate-0 transition-all hover:scale-105 animate-float animation-delay-400">
                    <div className="aspect-square bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl mb-4 flex items-center justify-center">
                      <Zap className="w-12 h-12 text-white animate-pulse-slow" />
                    </div>
                    <p className="font-black text-gray-900 text-lg">
                      Analytics
                    </p>
                    <p className="text-sm text-gray-600 font-semibold">
                      Real-time data
                    </p>
                  </div>
                  <div className="bg-white rounded-3xl p-6 shadow-2xl border-4 border-gray-900 transform rotate-1 hover:rotate-0 transition-all hover:scale-105 animate-float animation-delay-600">
                    <div className="aspect-square bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mb-4 flex items-center justify-center">
                      <Clock className="w-12 h-12 text-white animate-pulse-slow" />
                    </div>
                    <p className="font-black text-gray-900 text-lg">
                      Automation
                    </p>
                    <p className="text-sm text-gray-600 font-semibold">
                      Smart routing
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
              Everything you need
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              From instant number provisioning to advanced analytics, we've
              built the complete communication stack.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Search className="w-10 h-10" />,
                title: "Instant Numbers",
                description:
                  "Find and purchase phone numbers from 60+ countries in seconds.",
                color: "from-indigo-500 to-purple-500",
              },
              {
                icon: <Settings className="w-10 h-10" />,
                title: "Visual Flows",
                description:
                  "Build sophisticated call routing with drag-and-drop interface.",
                color: "from-purple-500 to-pink-500",
              },
              {
                icon: <BarChart3 className="w-10 h-10" />,
                title: "Analytics",
                description:
                  "Monitor call quality and optimize your strategy with insights.",
                color: "from-pink-500 to-rose-500",
              },
              {
                icon: <Mic className="w-10 h-10" />,
                title: "HD Voice",
                description:
                  "Crystal-clear calls with advanced noise cancellation.",
                color: "from-emerald-500 to-teal-500",
              },
              {
                icon: <Smartphone className="w-10 h-10" />,
                title: "Multi-device",
                description:
                  "Take calls on desktop, mobile, or web. Everywhere.",
                color: "from-amber-500 to-orange-500",
              },
              {
                icon: <Shield className="w-10 h-10" />,
                title: "Enterprise Security",
                description:
                  "End-to-end encryption and SOC 2 Type II certification.",
                color: "from-blue-500 to-indigo-500",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-8 bg-white rounded-3xl border-4 border-gray-900 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div
                  className={`inline-block p-4 bg-gradient-to-br ${feature.color} rounded-2xl mb-6 text-white group-hover:scale-110 transition-transform duration-300`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-black mb-4 text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed font-medium text-lg">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black mb-4">
              Trusted worldwide
            </h2>
            <p className="text-gray-300 text-xl font-medium">
              Join thousands of companies using Numsphere
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { value: "10M+", label: "Calls Processed" },
              { value: "50K+", label: "Active Users" },
              { value: "99.9%", label: "Uptime SLA" },
              { value: "60+", label: "Countries" },
            ].map((stat, i) => (
              <div key={i} className="group">
                <div className="text-5xl md:text-7xl font-black mb-2 group-hover:scale-110 transition-transform duration-300 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-gray-300 text-xl font-bold">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
              Get started in minutes
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              Our streamlined setup gets you up and running faster than any
              other platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Choose your number",
                description:
                  "Search and select from thousands of available numbers in your area.",
              },
              {
                step: "02",
                title: "Configure call flows",
                description:
                  "Set up intelligent routing and forwarding with our visual editor.",
              },
              {
                step: "03",
                title: "Start calling",
                description:
                  "Make and receive calls instantly. Your phone system is ready.",
              },
            ].map((step, index) => (
              <div key={index} className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-black mx-auto mb-6 group-hover:scale-110 transition-transform shadow-2xl border-4 border-gray-900">
                  {step.step}
                </div>
                <h3 className="text-3xl font-black mb-4 text-gray-900">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed font-medium text-lg">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-7xl font-black mb-4 text-gray-900">
              What customers say
            </h2>
            <p className="text-xl text-gray-600 font-medium">
              Real feedback from real businesses
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote:
                  "Numsphere completely transformed our customer service. Setup took 5 minutes and call quality is incredible.",
                author: "Sarah Chen",
                role: "CEO at TechFlow",
              },
              {
                quote:
                  "The global numbers feature helped us expand to 12 countries without any technical complexity.",
                author: "Michael Rodriguez",
                role: "Operations Director",
              },
              {
                quote:
                  "Best VoIP platform we've used. The analytics help us optimize our sales process every day.",
                author: "Emily Johnson",
                role: "Sales Manager",
              },
            ].map((testimonial, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-3xl border-4 border-gray-900 hover:shadow-2xl transition-all hover:-translate-y-2"
              >
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-6 h-6 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed text-lg font-medium">
                  "{testimonial.quote}"
                </p>
                <div>
                  <div className="font-black text-gray-900 text-lg">
                    {testimonial.author}
                  </div>
                  <div className="text-gray-600 font-semibold">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl md:text-7xl font-black mb-6">
            Ready to transform your communications?
          </h2>
          <p className="text-xl text-indigo-100 mb-12 font-medium">
            Join thousands of businesses using Numsphere to deliver exceptional
            experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/sign-up"
              className="inline-flex items-center px-8 py-4 text-gray-900 bg-white rounded-full hover:bg-gray-100 transition-all text-lg font-black shadow-2xl hover:scale-105"
            >
              Start your free trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
            <button
              onClick={() => setShowPricing(true)}
              className="inline-flex items-center px-8 py-4 text-white border-3 border-white/30 rounded-full hover:bg-white/10 transition-all text-lg font-black"
            >
              View pricing
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-gray-900"></div>
              </div>
              <p className="text-3xl font-black">Numsphere*</p>
            </div>
            <p className="text-gray-400 font-medium">
              © 2025 Numsphere. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Pricing Modal */}
      {showPricing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-7xl w-full max-h-[90vh] overflow-hidden border-4 border-gray-900 shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b-4 border-gray-900 p-6 flex items-center justify-between flex-shrink-0 z-10">
              <div>
                <h2 className="text-4xl font-black text-gray-900">
                  Pick your plan. Make it yours.
                </h2>
                <p className="text-gray-600 font-semibold mt-2">
                  Simple pricing with powerful features, cancel anytime.
                </p>
              </div>
              <button
                onClick={() => setShowPricing(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1">

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pb-8">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`rounded-3xl p-8 border-4 border-gray-900 hover:shadow-2xl transition-all hover:-translate-y-1 flex flex-col ${
                      plan.popular
                        ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white relative"
                        : "bg-white"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-black border-2 border-gray-900 whitespace-nowrap">
                          Recommended
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3
                        className={`text-3xl font-black mb-2 ${plan.popular ? "text-white" : "text-gray-900"}`}
                      >
                        {plan.name}
                      </h3>
                      <p
                        className={`text-sm font-medium ${plan.popular ? "text-indigo-100" : "text-gray-600"}`}
                      >
                        {plan.description}
                      </p>
                    </div>

                    <div className="mb-6">
                      <div
                        className={`text-5xl font-black ${plan.popular ? "text-white" : "text-gray-900"}`}
                      >
                        ${plan.price.toFixed(2)}
                      </div>
                      <div
                        className={`text-sm font-bold ${plan.popular ? "text-indigo-100" : "text-gray-600"}`}
                      >
                        /month
                      </div>
                    </div>

                    <a
                      href={plan.link || "/pricing"}
                      className={`block w-full py-3 rounded-full font-black text-center transition-all hover:scale-105 mb-6 ${
                        plan.popular
                          ? "bg-white text-gray-900 hover:bg-gray-100"
                          : "bg-gray-900 text-white hover:bg-gray-800"
                      }`}
                    >
                      Get Started
                    </a>

                    <div className="space-y-3 flex-1">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <Check
                            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.popular ? "text-white" : "text-gray-900"}`}
                          />
                          <span
                            className={`text-sm font-medium ${plan.popular ? "text-indigo-50" : "text-gray-700"}`}
                          >
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
