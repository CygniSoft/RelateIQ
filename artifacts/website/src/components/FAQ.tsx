import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQ() {
  const faqs = [
    {
      question: "How accurate is the business card scanner?",
      answer: "Our AI-powered OCR engine boasts a 99.8% accuracy rate, even with unusual card layouts, dark backgrounds, or stylized fonts."
    },
    {
      question: "Does it work offline?",
      answer: "You can scan and save cards offline. The AI email generation requires an internet connection and will process automatically once you're back online."
    },
    {
      question: "Can I customize the generated emails?",
      answer: "Yes. The AI drafts the email based on the context you provide, but you have full control to edit, tweak, or rewrite before sending."
    },
    {
      question: "What happens after my 3 free scans?",
      answer: "To continue using the premium features like AI email drafting and unlimited scans, you can upgrade to RelateIQ+ Pro for $9.99/mo or $99/year."
    },
    {
      question: "Does it integrate with my CRM?",
      answer: "Pro users can sync their contacts directly to Salesforce, HubSpot, and other major CRMs through our native integrations."
    }
  ];

  return (
    <section className="py-32 bg-background relative border-t border-white/5" id="faq">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Common questions</h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <AccordionItem value={`item-${i}`} className="border-white/10">
                  <AccordionTrigger className="text-left text-lg hover:no-underline hover:text-white/80 py-6">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
