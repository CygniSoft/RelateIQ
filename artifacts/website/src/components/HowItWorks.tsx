import { motion } from "framer-motion";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Scan the Card",
      description: "Open ConnectIQ and point your camera. Our specialized OCR engine reads the card instantly, even in low-light networking events.",
    },
    {
      number: "02",
      title: "AI Extraction",
      description: "No more manual entry. The AI parses the name, role, company, and contact details with near-perfect accuracy and creates a contact.",
    },
    {
      number: "03",
      title: "Send the Intro",
      description: "A contextual, warm introduction email is generated immediately. Review it, tap send, and put your phone away.",
    }
  ];

  return (
    <section className="py-32 bg-background relative border-t border-white/5" id="how-it-works">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-24">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for speed.</h2>
          <p className="text-lg text-muted-foreground">The entire process takes less time than exchanging pleasantries.</p>
        </div>

        <div className="max-w-5xl mx-auto relative">
          {/* Connecting line */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 -translate-y-1/2 hidden md:block" />

          <div className="grid md:grid-cols-3 gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
                className="relative z-10 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-black border border-white/20 flex items-center justify-center text-xl font-bold text-white mb-8 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  {step.number}
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white/90">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
