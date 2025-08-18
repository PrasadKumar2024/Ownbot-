import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Load environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Webhook for incoming WhatsApp messages
app.post("/whatsapp", async (req, res) => {
  const incomingMsg = req.body.Body;
  const from = req.body.From;

  console.log("User:", incomingMsg);

  try {
    // Send user message to Gemini
    const result = await model.generateContent(incomingMsg);
    const aiReply = result.response.text();

    // Send AI reply back via Twilio
    await twilioClient.messages.create({
      from: "whatsapp:" + process.env.TWILIO_PHONE,
      to: from,
      body: aiReply
    });

    res.send("OK");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Error processing message");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
