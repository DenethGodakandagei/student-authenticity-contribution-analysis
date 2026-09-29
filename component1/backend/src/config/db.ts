import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';
const LOCAL_MONGO_URI = process.env.LOCAL_MONGO_URI || 'mongodb://localhost:27017/student-tracker';

export const connectDB = async (): Promise<void> => {
  if (!MONGO_URI) {
    throw new Error('Fatal: MONGO_URI is not defined in backend/.env. MongoDB connection is mandatory.');
  }
  
  try {
    console.log('Connecting to MongoDB Cloud (Atlas)...');
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000
    });
    console.log('Mongoose: Successfully connected to MongoDB Cloud Atlas!');
  } catch (error: any) {
    console.error('Mongoose: MongoDB Cloud Atlas connection failed:', error.message);
    throw new Error('Mongoose: MongoDB connection failed. Database access is required.');
  }
};
