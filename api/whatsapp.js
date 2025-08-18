import twilio from "twilio";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const MessagingResponse = twilio.twiml.MessagingResponse;
    const twiml = new MessagingResponse();

    // Message user sent
    const incoming = req.body.Body;

    // Simple reply (later we connect AI here)
    let reply = "Hello 👋, you said: " + incoming;

    twiml.message(reply);

    res.writeHead(200, { "Content-Type": "text/xml" });
    res.end(twiml.toString());
  } else {
    res.status(200).json({ message: "WhatsApp bot is live 🚀" });
  }
}
