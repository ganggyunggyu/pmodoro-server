import mongoose from 'mongoose';

export const mongoConnect = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  console.log(MONGO_URI);
  if (mongoose.connection.readyState === 1) {
    console.log('🔁 Already connected to MongoDB');
    return;
  }

  try {
    // await mongoose.connect(MONGO_URI as string);
    await mongoose.connect(
      'mongodb+srv://kkk819:12qwaszx@cluster0.uw5n95x.mongodb.net/pmodoro',
    );
    console.log('✅ MongoDB 연결 완료!');
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    process.exit(1);
  }
};
