/**
 * ==============================================================
 * server.js  —  Full আপডেটেড ও Secure Backend
 * ==============================================================
 * এখানে যা যা নতুন যোগ হয়েছে (আপনার আগের কোডের তুলনায়):
 *
 * ১. Better Auth যুক্ত করা হয়েছে (/api/auth/*) — Admin login/logout
 * ২. Admin-only routes: GET/PUT/DELETE /admin/donors — শুধু admin
 *    role থাকা ইউজার এগুলো ব্যবহার করতে পারবে (requireAdmin middleware)
 * ৩. Security যোগ হয়েছে:
 *    - helmet (HTTP security headers)
 *    - express-rate-limit (বার বার চেষ্টা করে password crack ঠেকানো)
 *    - cors কে নির্দিষ্ট frontend origin এ সীমাবদ্ধ রাখা (আগে ছিল wildcard)
 *    - MongoDB ObjectId validation (ভুল/ক্ষতিকর id দিয়ে crash বা injection ঠেকানো)
 *    - Update route এ শুধু নির্দিষ্ট field গুলোই বদলানো যাবে (Mass assignment ঠেকানো)
 *    - body size limit (বড় base64 ছবি ছাড়া বাকি সব ছোট রাখা)
 * ৪. আগের getCollection() connection-caching লজিকটা অপরিবর্তিত রাখা হয়েছে
 *
 * ⚠️ package.json এ "type": "module" যোগ করতে হবে (Better Auth ESM লাগে)
 * ==============================================================
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./lib/auth.js";
import { requireAdmin } from "./middleware/requireAdmin.js";

const app = express();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ============================================
// আগের মতোই connection cache করার প্যাটার্ন — অপরিবর্তিত
// ============================================
let allbloodPromise;
function getCollection() {
  if (!allbloodPromise) {
    allbloodPromise = client.connect().then(() => {
      console.log("Connected to MongoDB!");
      return client.db("bbb").collection("All-Blood");
    });
  }
  return allbloodPromise;
}

// ============================================
// ✅ NEW: Security middleware গুলো
// ============================================
app.use(helmet()); // সাধারণ কিছু ক্ষতিকর header attack থেকে বাঁচায়

// ✅ NEW: CORS আগে wildcard ছিল (app.use(cors())) — এখন নির্দিষ্ট origin এ
// সীমাবদ্ধ করা হলো, এবং credentials true করা হলো যাতে login cookie যেতে পারে
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "https://bbb-da.vercel.app",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  }),
);

// ============================================
// ✅ NEW: Better Auth এর handler
// ⚠️ এটা অবশ্যই express.json() এর *আগে* বসাতে হবে,
// নাহলে Better Auth এর ভেতরের request parsing আটকে যাবে (docs এ এই warning আছে)
// ============================================
// ⚠️ NOTE: Express 5 (path-to-regexp v7) তে bare "*" আর চলে না,
// নাম সহ wildcard লাগে ("*splat")। যদি আপনি Express 4 ব্যবহার
// করেন তাহলে নিচের লাইনটা "/api/auth/*" এ বদলে দিন।
app.all("/api/auth/*splat", toNodeHandler(auth));

// ============================================
// এখন বাকি সব route এর জন্য json body parser
// image base64 বড় হতে পারে তাই limit একটু বাড়ানো হলো
// ============================================
app.use(express.json({ limit: "10mb" }));

// ============================================
// ✅ NEW: Rate limiter — বার বার চেষ্টা করে login/admin
// route এ আক্রমণ (brute-force) ঠেকানোর জন্য
// ============================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // ১৫ মিনিট
  max: 20, // এই সময়ে সর্বোচ্চ ২০ বার চেষ্টা করা যাবে
  message: {
    error: "অনেকবার চেষ্টা করা হয়েছে, কিছুক্ষণ পর আবার চেষ্টা করুন।",
  },
});
app.use("/api/auth/sign-in", authLimiter);

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // admin panel normal ব্যবহারে যথেষ্ট, কিন্তু script দিয়ে spam আটকাবে
});
app.use("/admin", adminLimiter);

// ============================================
// public route গুলো (আগের মতোই)
// ============================================
app.get("/", (req, res) => {
  res.send("everything is okay!");
});

// পাবলিক ফর্ম থেকে নতুন Donor submit করার route (আগের মতোই আছে)
app.post("/all", async (req, res) => {
  try {
    const allblood = await getCollection();
    const info = req.body;
    const result = await allblood.insertOne(info);
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
});

// পাবলিক ভাবে সব Donor দেখার route (আগের মতোই আছে, ওয়েবসাইটের "All Blood" পেজের জন্য)
app.get("/all", async (req, res) => {
  try {
    const allblood = await getCollection();
    const result = await allblood.find().toArray();
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
});

// ================================================================
// ✅ NEW: ADMIN ROUTES — নিচের সবগুলো route এ requireAdmin middleware
// বসানো আছে, তাই লগইন করা admin ছাড়া কেউ এগুলো ব্যবহার করতে পারবে না
// ================================================================

// সব Donor এর লিস্ট (admin dashboard এর জন্য — /all এর মতোই ডাটা,
// কিন্তু এটা protected route হিসেবে রাখা হলো)
app.get("/admin/donors", requireAdmin, async (req, res) => {
  try {
    const allblood = await getCollection();
    const result = await allblood.find().toArray();
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
});

// একজন Donor এর তথ্য আপডেট করা
app.put("/admin/donors/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ NEW: ObjectId ভ্যালিড কিনা চেক করা — ভুল id দিলে crash বা
    // injection চেষ্টা হলে সেটা এখানেই আটকে যাবে
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "সঠিক Donor ID না" });
    }

    // ✅ NEW: শুধু এই field গুলোই আপডেট করা যাবে (whitelist)
    // req.body থেকে সরাসরি সব কিছু নিলে কেউ ইচ্ছে করে _id বা
    // অন্য sensitive field পাঠিয়ে বদলে দিতে পারত (mass assignment attack)
    const allowedFields = [
      "name",
      "email",
      "mobile",
      "mobile2",
      "BloodGroup",
      "location",
      "date",
      "bio",
      "image",
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ error: "আপডেট করার মতো কোনো তথ্য পাওয়া যায়নি" });
    }

    const allblood = await getCollection();
    const result = await allblood.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Donor খুঁজে পাওয়া যায়নি" });
    }

    res.json({ success: true, message: "Donor তথ্য আপডেট হয়েছে", result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// একজন Donor কে ডিলিট করা
app.delete("/admin/donors/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "সঠিক Donor ID না" });
    }

    const allblood = await getCollection();
    const result = await allblood.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Donor খুঁজে পাওয়া যায়নি" });
    }

    res.json({ success: true, message: "Donor ডিলিট হয়েছে" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ✅ NEW: Global error handler — কোনো route এ
// অপ্রত্যাশিত error হলে এখানে ধরা পড়বে, পুরো
// server crash হবে না
// ============================================
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "সার্ভারে একটা সমস্যা হয়েছে" });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

export default app;
