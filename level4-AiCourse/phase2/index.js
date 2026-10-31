import express from "express";
import dotenv from "dotenv";
// import { GoogleGenAI } from "@google/genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";

dotenv.config();

const app = express();
app.use(express.json());

const port = 5000;

//ChatGroq
const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
  maxTokens: 1024,
  maxRetries: 2,
});

app.post("/ai", async (req, res) => {
  try {
    const { input } = req.body;
    const responce = await llm.invoke({
      messages: [
        {
          role: "user",
          content: input,
        },
      ],
    });
    console.log(responce.messages);
  } catch (error) {
    console.error("AI Error:", error);
  }
});

app.get("/", (req, res) => {
  return res.json({ message: "Hello from AI Course" });
});

app.listen(port, () => {
  console.log("Server is start");
});
