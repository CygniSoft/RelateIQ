import { motion } from "framer-motion";

export function BottomCTA() {
  return (
    <section className="py-32 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.08)_0,rgba(0,0,0,0)_60%)] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-bold mb-8"
          >
            Your network is your net worth.<br className="hidden md:block" /> Start investing.
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto font-light"
          >
            Join thousands of professionals securing better deals with faster follow-ups.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="https://apps.apple.com/us/app/relateiq/id6783434262"
              className="btn-halo btn-glass-light w-full sm:w-auto px-8 py-4 rounded-full font-medium flex items-center justify-center gap-2"
            >
              Download on the App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.cygnisoft.relateiq"
              className="btn-halo btn-glass-dark w-full sm:w-auto px-8 py-4 rounded-full font-medium flex items-center justify-center gap-2"
            >
              Get it on Google Play
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
