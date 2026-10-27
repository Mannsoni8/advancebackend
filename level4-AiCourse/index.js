import express, { text } from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
dotenv.config();

const app = express();
app.use(express.json());

const port = 5000;

// const ai = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY,
// });

// app.post("/ai", async (req, res) => {
//   try {
//     const { input } = req.body;

//     const stream = await ai.interactions.create({
//       model: "gemini-3.5-flash",
//       system_instruction:
//         "You are an assistant named Jarvis.",
//       input: input,
//       stream: true,
//     });

//     let aiResponse = "";

//     for await (const event of stream) {
//       if (
//         event.event_type === "step.delta" &&
//         event.delta.type === "text"
//       ) {
//         aiResponse += event.delta.text;
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       response: aiResponse,
//     });
//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// });

//with llm

// const llm = new ChatGoogleGenerativeAI({
//   model: "gemini-3.5-flash",
//   temperature: 0,
//   maxRetries: 2,
// });

// app.post("/ai",async (req,res) => {

//     const {input} = req.body;

//     const response = await llm.invoke(input)

//     return res.json({"ai:":response.content})

// })

//ChatGroq
const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0.7,
  maxTokens: 100,
  maxRetries: 2,
});

// app.post("/ai", async (req, res) => {
//   const { input } = req.body;

//   const response = await llm.invoke(
//     input[
//       ({
//         role: "system",
//         content:
//           "you are a assistant and your name is jarvis. If you don't know the answer then don't give incorrect answer",
//       },
//       {
//         role: "human",
//         content: input,
//       })
//     ],
//   );

//   return res.json({ "ai:": response.content });
// });

//lang Graph
const State = Annotation.Root({
  prompt: Annotation,
  aiMsg: Annotation,
});

const callLLm = async (state) => {
  console.log("state: ", state);
  const response = await llm.invoke([
    {
      role: "system",
      content:
        `you are a assistant and your name is jarvis. If you don't know the answer then don't give incorrect answer`,
    },
    {
      role: "human",
      content: state.prompt,
    },
  ]);
  return { aiMsg: response.content };
};

const graph = new StateGraph(State)
  .addNode("agent", callLLm)
  .addEdge("__start__", "agent")
  .addEdge("agent", "__end__")
  .compile();

app.post("/ai", async (req, res) => {
  try {
    const { input } = req.body;

    const response = await graph.invoke({
      prompt: input,
      aiMsg: "",
    });

    console.log(response);

    return res.json({
      success: true,
      ai: response.aiMsg,
    });
  } catch (error) {
    console.error("AI Error:", error);

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
