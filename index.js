
import express from 'express';
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 8000;

const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
    throw err;
  }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db("shobujshathi");
const eventsCollection = db.collection("events");

// Create Event API
app.post('/create-event', async (req, res) => {
  try {
    console.log("CREATE EVENT API CALLED");

    const data = req.body;

    console.log(data);

    const result = await eventsCollection.insertOne({
      ...data,
      createdAt: new Date(),
    });

    console.log(result);

    res.status(201).send({
      success: true,
      message: "Event created successfully!",
      result,
    });

  } catch (error) {
    console.error("Create Event Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to create event",
    });
  }
});

// Server Check
app.get('/', (req, res) => {
  res.send({
    message: 'Server is running fine!',
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});