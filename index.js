const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const express = require("express");
const app = express();
app.use(cors());
app.use(express.json());
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ============================================
// ✅ NEW: connection cache করার জন্য variable
// আগে ছিল: let allblood; (শুধু collection রাখার জন্য)
// এখন: allbloodPromise রাখছি (connect() এর Promise টা)
// কারণ: Vercel-এ প্রতি request-এ নতুন serverless
// instance হতে পারে, তাই connection টা "ready" কিনা
// সেটা প্রতিবার await করে নিশ্চিত হতে হবে।
// ============================================
let allbloodPromise;

// ============================================
// ✅ NEW: getCollection() ফাংশন — আগে ছিল না
// আগে: run() ফাংশন একবার call হতো, allblood variable-এ
// collection সেট হতো — কিন্তু connect() শেষ হওয়ার আগেই
// যদি request আসে (race condition), তাহলে allblood
// তখনো undefined থাকতো → undefined.find() কল হতো →
// সার্ভার crash করে 500 error দিতো। এটাই আপনার bug ছিল।
//
// এখন: এই ফাংশন call হলে —
// - যদি আগে থেকে connect করা না থাকে, তাহলে client.connect()
//   কল করে এবং সেটা শেষ না হওয়া পর্যন্ত অপেক্ষা করে (await)
// - collection রেডি হওয়ার পরই সেটা return করে
// - পরের বার call হলে আগের promise-ই reuse করে (নতুন করে
//   connect করে না, connection বারবার খোলা লাগে না)
// ============================================
function getCollection() {
  if (!allbloodPromise) {
    allbloodPromise = client.connect().then(() => {
      console.log("Connected to MongoDB!");
      return client.db("bbb").collection("All-Blood");
    });
  }
  return allbloodPromise;
}

// এই route অপরিবর্তিত আছে
app.get("/", (req, res) => {
  res.send("everything is okay!");
});

// ============================================
// Post data (data insert করার route)
// ✅ বদলেছে:
// - const allblood = await getCollection(); যোগ করা হয়েছে
//   (আগে সরাসরি বাইরের allblood variable ব্যবহার হতো,
//    যেটা undefined থাকার ঝুঁকি ছিল)
// - try/catch যোগ করা হয়েছে, যাতে কোনো error হলে
//   সেটা console-এ এবং response-এ দেখা যায় (আগে কোনো
//   error handling ছিল না, তাই silent crash হতো)
// ============================================
app.post("/all", async (req, res) => {
  try {
    const allblood = await getCollection(); // ✅ NEW: connection নিশ্চিত করে নিচ্ছে
    const info = req.body;
    const result = await allblood.insertOne(info);
    res.send(result);
  } catch (err) {
    console.error(err); // ✅ NEW: server log-এ exact error দেখাবে
    res.status(500).send({ error: err.message }); // ✅ NEW: client-ও error message পাবে
  }
});

// ============================================
// Get data (data fetch করার route) — যেটা /all পেজে
// 500 error দিচ্ছিল, এটাই মূল fix
// ✅ বদলেছে: উপরের POST route-এর মতোই getCollection()
// এবং try/catch যোগ করা হয়েছে
// ============================================
app.get("/all", async (req, res) => {
  try {
    const allblood = await getCollection(); // ✅ NEW
    const result = await allblood.find().toArray();
    res.send(result);
  } catch (err) {
    console.error(err); // ✅ NEW
    res.status(500).send({ error: err.message }); // ✅ NEW
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

module.exports = app;
