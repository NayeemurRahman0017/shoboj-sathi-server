
import express from 'express';
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET;

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
const joinsCollection = db.collection("event_joins");


try {
  await joinsCollection.createIndex(
    { eventId: 1, userEmail: 1 },
    { unique: true }
  );
} catch (error) {
  console.log("Join index note:", error.message);
}



function getLocalDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidEventId(id) {
  return ObjectId.isValid(id);
}


async function attachJoinCounts(events) {
  if (!events.length) return [];

  const ids = events.map((event) => String(event._id));

  const counts = await joinsCollection
    .aggregate([
      { $match: { eventId: { $in: ids } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ])
    .toArray();

  const countMap = new Map(counts.map((item) => [item._id, item.count]));

  return events.map((event) => ({
    ...event,
    _id: String(event._id),
    joinCount: countMap.get(String(event._id)) || 0,
  }));
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).send({
      success: false,
      message: "Unauthorized. Please log in.",
    });
  }

  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).send({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
}


function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization || "";

  if (header.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
    } catch {
      req.user = null;
    }
  }

  next();
}




app.get('/events', async (req, res) => {
  try {
    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 0;

    let cursor = eventsCollection
      .find({ date: { $gte: getLocalDateString() } })
      .sort({ date: 1, createdAt: -1 });

    if (limit > 0) {
      cursor = cursor.limit(limit);
    }

    const events = await cursor.toArray();
    const result = await attachJoinCounts(events);

    res.status(200).send({
      success: true,
      events: result,
    });
  } catch (error) {
    console.error("Get Events Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load events",
    });
  }
});


app.get('/events/mine', authenticate, async (req, res) => {
  try {
    const events = await eventsCollection
      .find({ userEmail: req.user.email })
      .sort({ date: 1, createdAt: -1 })
      .toArray();

    const result = await attachJoinCounts(events);

    res.status(200).send({
      success: true,
      events: result,
    });
  } catch (error) {
    console.error("My Events Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load your events",
    });
  }
});


app.get('/events/joined', authenticate, async (req, res) => {
  try {
    const joins = await joinsCollection
      .find({ userEmail: req.user.email })
      .toArray();

    const ids = joins
      .map((join) => join.eventId)
      .filter((id) => isValidEventId(id))
      .map((id) => new ObjectId(id));

    const events = ids.length
      ? await eventsCollection.find({ _id: { $in: ids } }).toArray()
      : [];

    events.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const result = await attachJoinCounts(events);

    res.status(200).send({
      success: true,
      events: result,
    });
  } catch (error) {
    console.error("Joined Events Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load joined events",
    });
  }
});


app.get('/events/:id', optionalAuthenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidEventId(id)) {
      return res.status(404).send({
        success: false,
        message: "Event not found",
      });
    }

    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });

    if (!event) {
      return res.status(404).send({
        success: false,
        message: "Event not found",
      });
    }

    const [detailed] = await attachJoinCounts([event]);

    let joined = false;

    if (req.user) {
      const join = await joinsCollection.findOne({
        eventId: String(event._id),
        userEmail: req.user.email,
      });

      joined = !!join;
    }

    res.status(200).send({
      success: true,
      event: { ...detailed, joined },
    });
  } catch (error) {
    console.error("Get Event Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to load the event",
    });
  }
});

app.post('/create-event', authenticate, async (req, res) => {
  try {
    const { title, description, category, image, location, date } = req.body;

    if (!title || !description || !category || !location || !date) {
      return res.status(400).send({
        success: false,
        message: "Please fill in all required fields",
      });
    }

    if (date <= getLocalDateString()) {
      return res.status(400).send({
        success: false,
        message: "Event date must be a future date",
      });
    }

    const result = await eventsCollection.insertOne({
      title: String(title).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      image: String(image || "").trim(),
      location: String(location).trim(),
      date: String(date).trim(),
      userEmail: req.user.email,
      creatorName: req.user.name || "",
      createdAt: new Date(),
    });

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


app.put('/events/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidEventId(id)) {
      return res.status(404).send({
        success: false,
        message: "Event not found",
      });
    }

    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });

    if (!event) {
      return res.status(404).send({
        success: false,
        message: "Event not found",
      });
    }

    if (event.userEmail !== req.user.email) {
      return res.status(403).send({
        success: false,
        message: "You can only update your own events",
      });
    }

    const { title, description, category, image, location, date } = req.body;

    if (!title || !description || !category || !location || !date) {
      return res.status(400).send({
        success: false,
        message: "Please fill in all required fields",
      });
    }

    if (date <= getLocalDateString()) {
      return res.status(400).send({
        success: false,
        message: "Event date must be a future date",
      });
    }

    await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          title: String(title).trim(),
          description: String(description).trim(),
          category: String(category).trim(),
          image: String(image || "").trim(),
          location: String(location).trim(),
          date: String(date).trim(),
          updatedAt: new Date(),
        },
      }
    );

    res.status(200).send({
      success: true,
      message: "Event updated successfully!",
    });
  } catch (error) {
    console.error("Update Event Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to update event",
    });
  }
});


app.delete('/events/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidEventId(id)) {
      return res.status(404).send({
        success: false,
        message: "Event not found",
      });
    }

    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });

    if (!event) {
      return res.status(404).send({
        success: false,
        message: "Event not found",
      });
    }

    if (event.userEmail !== req.user.email) {
      return res.status(403).send({
        success: false,
        message: "You can only delete your own events",
      });
    }

    await eventsCollection.deleteOne({ _id: new ObjectId(id) });
    await joinsCollection.deleteMany({ eventId: String(id) });

    res.status(200).send({
      success: true,
      message: "Event deleted successfully!",
    });
  } catch (error) {
    console.error("Delete Event Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to delete event",
    });
  }
});


app.post('/events/:id/join', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidEventId(id)) {
      return res.status(404).send({
        success: false,
        message: "Event not found",
      });
    }

    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });

    if (!event) {
      return res.status(404).send({
        success: false,
        message: "Event not found",
      });
    }

    if (event.date <= getLocalDateString()) {
      return res.status(400).send({
        success: false,
        message: "This event has already ended",
      });
    }

    const result = await joinsCollection.updateOne(
      { eventId: String(id), userEmail: req.user.email },
      {
        $setOnInsert: {
          eventId: String(id),
          eventTitle: event.title,
          eventDate: event.date,
          userEmail: req.user.email,
          userName: req.user.name || "",
          joinedAt: new Date(),
        },
      },
      { upsert: true }
    );

    if (result.upsertedCount === 0) {
      return res.status(409).send({
        success: false,
        message: "You have already joined this event",
      });
    }

    res.status(201).send({
      success: true,
      message: "You have joined the event!",
    });
  } catch (error) {
    console.error("Join Event Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to join the event",
    });
  }
});


app.delete('/events/:id/join', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await joinsCollection.deleteOne({
      eventId: String(id),
      userEmail: req.user.email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "You have not joined this event",
      });
    }

    res.status(200).send({
      success: true,
      message: "You have left the event",
    });
  } catch (error) {
    console.error("Leave Event Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to leave the event",
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
export default app;
