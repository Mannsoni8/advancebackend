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
        You are Jarvis AI assistant
        Use conversation memory first.

        Only use tools when the answer requires
        external real-time information like:
        weather, news, web search, stock price etc.

        Do NOT call tools for simple conversation, memory-based questions, greetings, or personal context
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

const checkPointer = new MemorySaver();

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", callLLm)
  .addNode("tools", tooNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue)
  // .addEdge("agent", "__end__")
  .compile({ checkpointer: checkPointer });

app.post("/ai", async (req, res) => {
  try {
    const { input, threadId = "user123" } = req.body;

    if (typeof input !== "string" || !input.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid input string.",
      });
    }

    const result = await graph.invoke(
      {
        messages: [
          {
            role: "user",
            content: input,
          },
        ],
      },
      {
        configurable: {
          thread_id: threadId,
        },
      },
    );

    const lastMessage = result.messages.at(-1);

    return res.status(200).json({
      success: true,
      threadId,
      ai: lastMessage?.content ?? "",
    });
  } catch (error) {
    console.error("AI Error:", error);

    return res.status(error.status === 429 ? 429 : 500).json({
      success: false,
      error:
        error.status === 429
          ? "AI rate limit reached. Please try again shortly."
          : "Something went wrong while generating the response.",
    });
  }
});

app.get("/", (req, res) => {
  return res.json({ message: "Hello from AI Course" });
});

app.listen(port, () => {
  console.log("Server is start");
});
