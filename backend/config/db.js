import mongoose from "mongoose";
import dns from 'dns';

dns.setServers(["8.8.8.8", "1.1.1.1"]);

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("Mongo URI is not defined in environment variables.");
  }

  mongoose.set("strictQuery", true);
  
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000, // Increased to 5s for better connection reliability
  });

  console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};