import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

interface ExtractedCard {
  firstName: string;
  lastName: string;
  company: string;
  jobTitle: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Maximum decoded image size (~10 MB) to keep model calls bounded.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Lightweight in-memory per-IP rate limiter to guard a paid AI endpoint.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    requestLog.set(ip, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(ip, recent);
  return false;
}

router.post("/scan-card", async (req, res): Promise<void> => {
  if (isRateLimited(req.ip ?? "unknown")) {
    res
      .status(429)
      .json({ error: "Too many requests. Please wait a moment and try again." });
    return;
  }

  const { imageBase64 } = req.body ?? {};

  if (typeof imageBase64 !== "string" || imageBase64.trim() === "") {
    res.status(400).json({ error: "Missing 'imageBase64'" });
    return;
  }

  // Only accept image data URLs, or raw base64 (assumed JPEG from the client).
  if (imageBase64.startsWith("data:") && !imageBase64.startsWith("data:image/")) {
    res.status(400).json({ error: "Only image data is supported." });
    return;
  }

  const rawBase64 = imageBase64.startsWith("data:")
    ? imageBase64.slice(imageBase64.indexOf(",") + 1)
    : imageBase64;
  // base64 expands ~4/3; estimate decoded size to reject oversized payloads.
  const approxBytes = Math.floor((rawBase64.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    res
      .status(413)
      .json({ error: "Image is too large. Please use a smaller photo." });
    return;
  }

  const imageUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert at reading business cards. Extract the contact's details from the provided image. " +
            "Business cards may be horizontal or vertical, photographed at any angle or orientation, and may be in any language. " +
            "Read the card regardless of its orientation. " +
            "Respond ONLY with a JSON object using these exact keys: firstName, lastName, company, jobTitle, email, phone, website, linkedin. " +
            "All values must be strings. If a field is not present on the card, use an empty string. " +
            "Never invent or guess information that is not visible on the card. " +
            "For website, omit the leading http(s):// and www. For linkedin, include the profile path if shown.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the contact details from this business card.",
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      req.log.error({ content }, "Card extraction returned non-JSON");
      res
        .status(502)
        .json({ error: "Could not read the business card. Please try again." });
      return;
    }

    const result: ExtractedCard = {
      firstName: asString(parsed["firstName"]),
      lastName: asString(parsed["lastName"]),
      company: asString(parsed["company"]),
      jobTitle: asString(parsed["jobTitle"]),
      email: asString(parsed["email"]),
      phone: asString(parsed["phone"]),
      website: asString(parsed["website"]),
      linkedin: asString(parsed["linkedin"]),
    };

    req.log.info("Business card extracted successfully");
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to extract business card");
    res.status(500).json({ error: "Failed to read business card" });
  }
});

export default router;
