import { Router } from "express";
import multer from "multer";
import { ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL } from "../lib/zoya-ai";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/voice/stt", upload.single("audio"), async (req, res) => {
  try {
    const apiKey = process.env["DEEPGRAM_API_KEY"];
    if (!apiKey) {
      res.status(503).json({ error: "Deepgram not configured" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No audio" });
      return;
    }

    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&language=en-IN&smart_format=true&punctuate=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": req.file.mimetype || "audio/webm",
        },
        body: req.file.buffer,
      }
    );

    if (!response.ok) {
      const err = await response.text();
      req.log.error({ err }, "Deepgram error");
      res.json({ error: "STT failed", transcript: "" });
      return;
    }

    const data = (await response.json()) as { results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> } };
    const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    res.json({ transcript });
  } catch (err) {
    req.log.error({ err }, "STT route error");
    res.json({ error: "Internal error", transcript: "" });
  }
});

router.post("/voice/tts", async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text?.trim()) {
      res.status(400).json({ error: "Text required" });
      return;
    }

    const apiKey = process.env["ELEVENLABS_API_KEY"];
    if (!apiKey) {
      res.status(503).json({ error: "ElevenLabs not configured" });
      return;
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: text.slice(0, 500),
          model_id: ELEVENLABS_MODEL,
          voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      req.log.error({ err }, "ElevenLabs error");
      res.status(502).json({ error: "TTS failed" });
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    req.log.error({ err }, "TTS route error");
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
