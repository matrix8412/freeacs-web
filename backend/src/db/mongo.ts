import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function connectMongo() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(config.MONGO_URI, {
    dbName: config.APP_DB_NAME,
    serverSelectionTimeoutMS: 5000
  });

  logger.info({ db: config.APP_DB_NAME }, 'Connected to MongoDB');
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}

