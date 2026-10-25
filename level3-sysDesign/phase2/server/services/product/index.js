import dotenv from "dotenv"
import express from "express";
dotenv.config();
const app = express();

app.use(express.json());

const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  return res.status(200).json({ message: "Hello from auth service" });
});

app.listen(port, () => {
  console.log(`Server is running on port - ${port}`);
});
