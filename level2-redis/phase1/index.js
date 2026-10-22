import dotenv from "dotenv";
import express from "express";
import connectedDB from "./src/lib/db.js";
dotenv.config();

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  return res.status(200).json({ message: "hello docker prac here" });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  connectedDB();
  console.log(`Server is running on port - ${port}`);
});
