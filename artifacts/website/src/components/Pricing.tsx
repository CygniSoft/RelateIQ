import { motion } from "framer-motion";
import { Check } from "lucide-react";

export function Pricing() {
  return (
    <section className="py-32 bg-background relative" id="pricing">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Invest in your network</h2>
          <p className="text-lg text-muted-foreground">Start for free. Upgrade when you're ready to scale your professional relationships.</p>
        </div>

        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-8 rounded-[2rem] bg-gradient-to-b from-white/10 to-white/5 border border-white/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-white text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                PRO
              </span>
            </div>
            
            <h3 className="text-2xl font-semibold mb-2">RelateIQ+ Pro</h3>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-bold">$9.99</span>
              <span className="text-muted-foreground">CAD / month</span>
            </div>
            <p className="text-sm text-muted-foreground mb-8">Or $99/year (save 17%)</p>

            <ul className="space-y-4 mb-8">
              {[
                "Unlimited business card scans",
                "AI-powered email drafting",
                "CRM sync integrations",
                "Priority support",
                "Advanced analytics"
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-white" />
                  <span className="text-white/80">{feature}</span>
                </li>
              ))}
            </ul>

            <button className="w-full py-4 rounded-xl bg-white text-black font-semibold text-lg hover:bg-white/90 transition-colors">
              Get Started
            </button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              3 free scans included before subscribing.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
