import express from "express";
import dotenv from "dotenv";
// import { GoogleGenAI } from "@google/genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

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

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001", // 768 dimensions
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: "Document title",
});

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  url: process.env.QDRANT_URL,
  collectionName: "langchainjs-testing",
});

const upload = async () => {
  const pdfPath = "./knowledge.pdf";
  const buffer = fs.readFileSync(pdfPath);
  const pdfResult = new PDFParse({ data: buffer });
  const result = await pdfResult.getText();
  const text = result.text;
  const splitletter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100,
  });
  const docs = await splitletter.createDocuments([text]);

  await vectorStore.addDocuments(docs);

  // console.log("Text", result.text);
  //console.log(docs);
  //console.log("PDFRES: ", pdfResult);
};

app.post("/ai", async (req, res) => {
  const { input } = req.body;

  const docs = await vectorStore.similaritySearch(input, 5);
  const context = docs.map((d) => d.pageContent).join("/n");

  const responce = await llm.invoke([
    new SystemMessage(`You are a RAG AI assistant.
     
    STRICT RULES:
    - Answer ONLY from context
    - Do not use outside knowledge
    - If answer not found say:
      "I don't know from uploaded PDF".
    
    Context:${context}  
        `),
       new HumanMessage(input),
  ]);
  // console.log(responce.messages);

  return res.status(200).json({ai:responce.content});
});

app.get("/", (req, res) => {
  return res.json({ message: "Hello from AI Course" });
});

app.listen(port, () => {
  console.log("Server is start");
});
