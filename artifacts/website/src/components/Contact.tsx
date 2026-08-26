import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SubmissionState = "idle" | "submitting" | "success" | "error";

export function Contact() {
  const [status, setStatus] = useState<SubmissionState>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
          website: formData.get("website"),
        }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to send your message.");
      }

      form.reset();
      setStatus("success");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to send your message.",
      );
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="py-24 bg-background scroll-mt-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-10">
            <p className="text-sm font-medium tracking-wide text-white/60 uppercase mb-3">
              Contact us
            </p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Let&apos;s start a conversation.
            </h2>
            <p className="text-lg text-muted-foreground">
              Have a question about RelateIQ+? Send us a message and our team
              will get back to you.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 space-y-5"
          >
            <div className="grid md:grid-cols-2 gap-5">
              <label className="space-y-2 text-sm font-medium">
                <span>Name</span>
                <Input
                  name="name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={100}
                  required
                  placeholder="Your name"
                  className="h-12 bg-black/20 border-white/10"
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Email</span>
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  placeholder="you@company.com"
                  className="h-12 bg-black/20 border-white/10"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium block">
              <span>Message</span>
              <Textarea
                name="message"
                minLength={10}
                maxLength={5000}
                required
                placeholder="How can we help?"
                className="min-h-36 resize-y bg-black/20 border-white/10"
              />
            </label>

            <label
              className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
              aria-hidden="true"
            >
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>

            <button
              type="submit"
              disabled={status === "submitting"}
              className="btn-halo btn-glass-light w-full px-8 py-4 rounded-full font-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "submitting" ? "Sending…" : "Send message"}
            </button>

            <div aria-live="polite" className="min-h-6 text-center text-sm">
              {status === "success" && (
                <p className="text-emerald-400">
                  Thanks—your message has been sent.
                </p>
              )}
              {status === "error" && (
                <p className="text-red-400">{error}</p>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
}