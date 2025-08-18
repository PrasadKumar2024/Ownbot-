import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
// import { GoogleGenerativeAI } from "@google/generative-ai"; // REMOVE THIS LINE

// Initialize app
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Validate environment variables on startup
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE',
  'HUGGINGFACE_API_KEY' // UPDATE THIS LINE
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

// REPLACE THESE LINES WITH THE NEW FUNCTION
async function getHuggingFaceReply(prompt) {
    const response = await fetch(
        "https://api-inference.huggingface.co/models/google/flan-t5-small",
        {
            headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
            method: "POST",
            body: JSON.stringify({ inputs: prompt }),
        }
    );
    const result = await response.json();
    return result[0].generated_text;
}

// Webhook endpoint
app.post("/api/whatsapp", async (req, res) => {
  const { Body: incomingMsg, From: sender } = req.body;

  try {
    // Generate AI response using Hugging Face
    const aiReply = await getHuggingFaceReply(incomingMsg);
    
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
