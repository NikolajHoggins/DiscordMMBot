import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
// export const collections: { players?: mongoDB.Collection } = {};

const PLAYERS_COLLECTION = 'players';

export async function connectToDatabase() {
    dotenv.config();
    const connectionString = process.env.DB_CONN_STRING;
    if (!connectionString) throw new Error('no connection string');

    mongoose.set('strictQuery', false);
    await mongoose.connect(`${connectionString}/${process.env.DB_NAME}`);

    // const playersCollection: mongoDB.Collection = db.collection(PLAYERS_COLLECTION);

    // collections.players = playersCollection;

    // console.log(
    //     `Successfully connected to database: ${db.databaseName} and collection: ${playersCollection.collectionName}`
    // );
}
