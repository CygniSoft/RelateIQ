import { motion } from "framer-motion";
import { ScanLine, Mail, Zap } from "lucide-react";

export function Features() {
  const features = [
    {
      icon: <ScanLine className="w-6 h-6" />,
      title: "Scan in seconds",
      description: "Point your camera at any business card. Our AI instantly extracts names, titles, companies, and contact info with perfect accuracy."
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Contextual intros",
      description: "The AI drafts a personalized, warm intro email based on the context of your meeting and their company details."
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Send before you leave",
      description: "Review, tweak, and hit send. The follow-up is in their inbox before the conversation even ends."
    }
  ];

  return (
    <section className="py-32 bg-background relative" id="features">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">The magic is in the workflow</h2>
          <p className="text-lg text-muted-foreground">Designed for the ambitious professional. We reduced the time from handshake to follow-up to less than 15 seconds.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6 text-white">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
