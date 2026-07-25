const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const express = require("express");
const app = express();
app.use(cors());
app.use(express.json());
const port = 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");

app.get("/", (req, res) => {
  res.send("everything is okay!");
});

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("bbb");
    const allblood = db.collection("All-Blood");

    // Post data
    app.post("/all", async (req, res) => {
      const info = req.body;
      const result = await allblood.insertOne(info);
      res.send(result);
    });

    // get data
    app.get("/all", async (req, res) => {
      const result = await allblood.find().toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
