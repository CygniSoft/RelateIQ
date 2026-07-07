import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Testimonials } from "@/components/Testimonials";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { BottomCTA } from "@/components/BottomCTA";

import logoMark from "../assets/logo-mark.png";

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 py-4 px-6 backdrop-blur-md bg-background/50 border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoMark} alt="ConnectIQ Logo" className="w-8 h-8 rounded" />
          <span className="text-xl font-bold tracking-tight">ConnectIQ</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </div>
        <div>
          <a href="#" className="px-5 py-2.5 bg-white text-black rounded-full text-sm font-medium hover:bg-white/90 transition-colors">
            Download
          </a>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="py-12 border-t border-white/10 bg-background">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={logoMark} alt="ConnectIQ Logo" className="w-6 h-6 rounded" />
          <span className="font-semibold tracking-tight text-white/80">ConnectIQ</span>
        </div>
        <p className="text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} ConnectIQ (RelateIQ+). All rights reserved.
        </p>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-white/30 selection:text-white">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Testimonials />
      <Pricing />
      <FAQ />
      <BottomCTA />
      <Footer />
    </div>
  );
}
