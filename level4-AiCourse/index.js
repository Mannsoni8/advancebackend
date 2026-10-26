import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = 5000;

app.get("/", (req, res) => {
  return res.json({ message: "Hello from AI Course" });
});

app.listen(port, () => {
  console.log("Server is start");
});
