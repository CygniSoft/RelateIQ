import { motion } from "framer-motion";
import { Star } from "lucide-react";

export function Testimonials() {
  const testimonials = [
    {
      quote: "ConnectIQ completely changed how I network at CES. I sent 40 follow-ups before the flight home.",
      author: "Sarah J.",
      role: "VP of Sales, TechLogix"
    },
    {
      quote: "The AI intro emails are scarily good. It feels like I wrote them myself, but it takes zero effort.",
      author: "Marcus T.",
      role: "Founder, Zenith"
    },
    {
      quote: "I've tried a dozen card scanners. None of them actually complete the loop by sending the email. This is magic.",
      author: "Elena R.",
      role: "Managing Partner, Alpine Ventures"
    }
  ];

  return (
    <section className="py-32 bg-background relative border-t border-white/5 overflow-hidden" id="testimonials">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Trusted by top performers</h2>
          <p className="text-lg text-muted-foreground">Join thousands of professionals who have automated their follow-ups.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-white text-white" />
                ))}
              </div>
              <p className="text-lg leading-relaxed mb-8 text-white/80 font-light">"{t.quote}"</p>
              <div>
                <p className="font-semibold text-white">{t.author}</p>
                <p className="text-sm text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />
    </section>
  );
}
