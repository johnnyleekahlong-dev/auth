import mongoose from "mongoose";

export const dbConnect = async (uri: string) => {
  try {
    const conn = await mongoose.connect(uri);
    console.log(`DB: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(error.message);
  }
};
