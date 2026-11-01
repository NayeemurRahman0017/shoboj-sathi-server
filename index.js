import express from 'express';
import 'dotenv/config';
import { MongoClient } from 'mongodb';
const app = express();
const port = 8000;




const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}



app.get('/', (req, res) => {
    res.send({message: 'Server is running fine!'});
});
await connectToMongoDB();
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});