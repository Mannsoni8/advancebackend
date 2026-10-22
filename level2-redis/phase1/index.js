import dotenv from "dotenv";
import express from "express";
import connectedDB from "./src/lib/db.js";
import userModel from "./src/model/user.model.js";
dotenv.config();

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  return res.status(200).json({ message: "hello redis prac here" });
});

const port = process.env.PORT || 5000;

app.post("/create", async (req, res) => {
  const { name, email, password } = req.body;
  const user = await userModel.create({
    name,
    email,
    password,
  });
  return res.json(user);
});

app.get("/get", async (req, res) => {
  const user = await userModel.find({});
  return res.json(user);
});

app.listen(port, () => {
  connectedDB();
  console.log(`Server is running on port - ${port}`);
});
