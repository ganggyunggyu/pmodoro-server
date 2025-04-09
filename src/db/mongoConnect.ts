import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const mongoConnect = async () => {
  const { MONGO_URI } = process.env;

  if (mongoose.connection.readyState === 1) {
    console.log('🔁 Already connected to MongoDB');
    return;
  }

  try {
    await mongoose.connect(MONGO_URI as string);
    console.log('MONGO DB 연결');
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    process.exit(1);
  }
};
