import express, { response, text } from "express";
import dotenv from "dotenv";
// import { GoogleGenAI } from "@google/genai";
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  StateGraph,
  // Annotation,
  MessagesAnnotation,
  MemorySaver,
} from "@langchain/langgraph";
import { TavilySearch } from "@langchain/tavily";
import { ChatGroq } from "@langchain/groq";
import { ToolNode } from "@langchain/langgraph/prebuilt";
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

//tavily - tool
const tool = new TavilySearch({
  maxResults: 2,
  topic: "general",
});

const checkPointer = new MemorySaver();
const tools = [tool];
const tooNode = new ToolNode(tools);

//ChatGroq
const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
  maxTokens: 1024,
  maxRetries: 2,
}).bindTools(tools);

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

//customState
// const State = Annotation.Root({
//   prompt: Annotation,
//   aiMsg: Annotation,
// });

const callLLm = async (state) => {
  console.log("state: ", state);
  const response = await llm.invoke([
    {
      role: "system",
      content: `
      You are Jarvis, a concise AI assistant.

        Rules:
         - Answer directly and briefly.
         - Use simple, natural language.
         - Avoid unnecessary introductions, conclusions, and fillers.
         - Do not repeat information.
         - Use bullet points only when necessary.
         - Use tables only when explicitly requested.
         - For weather queries, give only:
           temperature, condition, and chance of rain if available.
         - For web searches, summarize only the most relevant findings.
         - Never add a long explanation unless the user asks for details.
         - If you don't know something, say so instead of inventing facts.
      `,
    },
    ...state.messages,
  ]);

  return { messages: [response] };
};

const shouldContinue = async (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage?.tool_calls?.length > 0) {
    return "tools";
  } else {
    return "__end__";
  }
};

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", callLLm)
  .addNode("tools", tooNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue)
  // .addEdge("agent", "__end__")
  .compile({ checkPointer: checkPointer });

app.post("/ai", async (req, res) => {
  try {
    const { input } = req.body;

    if (typeof input !== "string" || !input.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid input string.",
      });
    }

    const result = await graph.invoke(
      {
        messages: [{ role: "user", content: input }],
      },
      { configurable: { thread_id: "user123" } },
    );

    const lastMessage = result.messages.at(-1);

    return res.status(200).json({
      success: true,
      ai: lastMessage?.content ?? "",
    });
  } catch (error) {
    console.error("AI Error:", error);

    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: "AI rate limit reached. Please try again shortly.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Something went wrong while generating the response.",
    });
  }
});
app.get("/", (req, res) => {
  return res.json({ message: "Hello from AI Course" });
});

app.listen(port, () => {
  console.log("Server is start");
});
