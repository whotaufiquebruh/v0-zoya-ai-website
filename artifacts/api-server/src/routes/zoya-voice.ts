import { Router } from "express";
import multer from "multer";
import { ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL, ELEVENLABS_VOICE_SETTINGS } from "../lib/zoya-ai";

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

    // nova-3 = latest + most accurate; language=multi handles Hinglish naturally
    const params = new URLSearchParams({
      model: "nova-3",
      language: "multi",
      smart_format: "true",
      punctuate: "true",
      filler_words: "false",
      no_delay: "true",
      utterance_end_ms: "1000",
    });

    const response = await fetch(
      `https://api.deepgram.com/v1/listen?${params.toString()}`,
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

    const data = (await response.json()) as {
      results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
    };
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

    // Clean text for TTS — remove emojis and markdown that would be spoken aloud
    const cleanText = text
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
      .replace(/[\u2600-\u27FF]/g, "")
      .replace(/[*_`#]/g, "")
      .trim()
      .slice(0, 400); // keep short for speed

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: ELEVENLABS_MODEL,
          voice_settings: ELEVENLABS_VOICE_SETTINGS,
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
