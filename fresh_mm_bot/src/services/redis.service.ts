import Redis from 'ioredis';
import { IPlayer } from '../models/player.schema';

require('dotenv').config();

if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not defined');

const redis = new Redis(process.env.REDIS_URL);

export const getFromRedis = async (key: string): Promise<string | null> => {
    return await redis.get(key);
};

export const setToRedis = async (key: string, value: string): Promise<void> => {
    await redis.set(key, value);
};

export const addToSortedSet = async (key: string, rating: number, value: IPlayer) => {
    await redis.zadd(key, rating, JSON.stringify(value));
};

export const getFromSortedSet = async (
    key: string,
    start: number,
    stop: number
): Promise<any[]> => {
    return await redis.zrange(key, start, stop);
};

export const getFromSortedSetDesc = async (
    key: string,
    start: number,
    stop: number
): Promise<(string | null)[]> => {
    return await redis.zrevrange(key, start, stop);
};
