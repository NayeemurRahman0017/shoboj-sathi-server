
import express from 'express';
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

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

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("shobujsathi");
const eventsCollection = db.collection("events");
console.log("CREATE EVENT API CALLED");
app.post('/create-event', async (req, res) => {
  const data = req.body;
  console.log(data);
  const result = await eventsCollection.insertOne(data);
  console.log(result);
  res.send({ result });
});
app.get('/', (req, res) => {
  res.send({ message: 'Server is running fine!' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

