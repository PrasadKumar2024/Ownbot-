import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize app
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Validate environment variables on startup
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE',
  'GEMINI_API_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize services
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-pro",
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_ONLY_HIGH"
    }
  ]
});

// Webhook endpoint
app.post("/api/whatsapp", async (req, res) => {
  const { Body: incomingMsg, From: sender } = req.body;

  try {
    // Generate AI response
    const result = await model.generateContent({
      contents: [{ 
        role: "user",
        parts: [{ text: incomingMsg }]
      }]
    });
    
    const response = await result.response;
    const aiReply = response.text();

    // Send WhatsApp reply
    await twilioClient.messages.create({
      body: aiReply,
      from: `whatsapp:${process.env.TWILIO_PHONE}`,
      to: sender
    });

    return res.status(200).send("OK");
    
  } catch (error) {
    console.error("API Error:", error);
    
    // User-friendly error response
    await twilioClient.messages.create({
      body: "Sorry, I'm having trouble processing your request. Please try again later.",
      from: `whatsapp:${process.env.TWILIO_PHONE}`,
      to: sender
    });

    return res.status(500).json({ 
      error: "Processing failed",
      details: error.message 
    });
  }
});

export default app;
