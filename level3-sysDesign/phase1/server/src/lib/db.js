import mongoose from "mongoose";

const connectedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database is Connected");
  } catch (error) {
    console.log("Error in onnecting db:- ", error);
  }
};

export default connectedDB;
