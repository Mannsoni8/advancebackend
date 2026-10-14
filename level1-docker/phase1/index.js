require("dotenv").config();
const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  return res.status(200).json({ message: "hello docker prac here" });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on port - ${port}`);
});
