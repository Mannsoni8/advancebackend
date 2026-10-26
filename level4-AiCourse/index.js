import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
dotenv.config();

const app = express();
app.use(express.json());

const port = 5000;
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.post("/ai", async (req, res) => {
  try {
    const { input } = req.body;

    const stream = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input,
      stream: true,
    });

    let aiResponse = "";

    for await (const event of stream) {
      if (event.event_type === "step.delta" && event.delta.type === "text") {
        aiResponse += event.delta.text;
      }
    }

    return res.status(200).json({
      success: true,
      response: aiResponse,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/", (req, res) => {
  return res.json({ message: "Hello from AI Course" });
});

app.listen(port, () => {
  console.log("Server is start");
});
