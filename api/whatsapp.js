import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Twilio setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

// Gemini setup
const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Webhook for WhatsApp
app.post("/api/whatsapp", async (req, res) => {
  const incomingMsg = req.body.Body;
  const from = req.body.From;

  console.log("User:", incomingMsg);

  try {
    // Send message to Gemini
    const result = await model.generateContent(incomingMsg);
    const aiReply = result.response.text();

    // Reply via Twilio
    await twilioClient.messages.create({
      from: "whatsapp:" + process.env.TWILIO_PHONE,
      to: from,
      body: aiReply
    });

    res.send("OK");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Error");
  }
});

export default app;
