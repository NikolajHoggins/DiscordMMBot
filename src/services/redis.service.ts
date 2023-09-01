import Redis from 'ioredis';

require('dotenv').config();

if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not defined');

const redis = new Redis(process.env.REDIS_URL);

export const getFromRedis = async (key: string): Promise<string | null> => {
    return await redis.get(key);
};

export const setToRedis = async (key: string, value: string): Promise<void> => {
    await redis.set(key, value);
};
