/**
 * ==============================================================
 * lib/auth.js  —  Better Auth এর মূল setup
 * ==============================================================
 * এখানে Better Auth কে আমাদের আগের থেকে চলতে থাকা MongoDB client
 * এর সাথে যুক্ত করা হয়েছে (নতুন করে DB connect করতে হয়নি)।
 *
 * ⚠️ IMPORTANT: Better Auth শুধু ESM (import/export) সাপোর্ট করে,
 * require() দিয়ে চলবে না। তাই package.json এ যোগ করে দিন:
 *   "type": "module"
 * ==============================================================
 */

import dotenv from "dotenv";
dotenv.config();
// ✅ FIX: dotenv.config() এখানেই কল করা হলো কারণ ES modules এ import
// statement গুলো সবার আগে execute হয় — তাই createAdmin.js/server.js এ
// dotenv.config() লিখলেও, ততক্ষণে এই ফাইলটা (auth.js) already load
// হয়ে গিয়ে MongoClient তৈরি করে ফেলছিল process.env.MONGODB_URI
// undefined অবস্থায়। এখানে dotenv আলাদাভাবে load করায় এই সমস্যা আর হবে না।

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect(); // এখানে top-level await ব্যবহার করা হয়েছে, তাই ESM লাগবে

const db = client.db("bbb"); // আপনার আগের ডাটাবেজ নাম "bbb" ই রাখা হয়েছে

export const auth = betterAuth({
  // ---------------- Database ----------------
  database: mongodbAdapter(db, {
    client,
    // ⚠️ যদি আপনার MongoDB Atlas একটা standalone সার্ভার হয় (replica set না হয়)
    // তাহলে নিচের লাইনটা uncomment করুন, নাহলে transaction error আসবে।
    // MongoDB Atlas এর free/shared cluster গুলোতে সাধারণত replica set থাকে,
    // তাই এটা লাগার কথা না — কিন্তু error পেলে uncomment করে দেখুন।
    // transaction: false,
  }),

  // ---------------- Login পদ্ধতি ----------------
  // শুধু Email + Password দিয়ে লগইন (Admin এর জন্য এটাই যথেষ্ট)
  emailAndPassword: {
    enabled: true,
    // Admin panel এ কেউ যেন নিজে নিজে সাইন-আপ করে account বানাতে না পারে,
    // সেটার জন্য নিচে requireAdmin middleware এ role চেক করা হবে।
    minPasswordLength: 8,
  },

  // ---------------- Extra field: role ----------------
  // এই "role" field দিয়েই বোঝা যাবে কে admin আর কে সাধারণ user
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user", // ডিফল্ট ভাবে কেউ admin না, নিজে থেকে admin হতে পারবে না
        input: false, // "input:false" মানে সাইন-আপের সময় ইউজার নিজে role পাঠাতে পারবে না
      },
    },
  },

  // ---------------- Security settings ----------------
  // যেসব frontend origin থেকে auth request আসতে পারবে
  trustedOrigins: [
    process.env.FRONTEND_URL || "https://blood-bank-bangladesh-da.vercel.app",
  ],

  // সেশন কুকির মেয়াদ ও সেটিংস
  session: {
    expiresIn: 60 * 60 * 24 * 7, // ৭ দিন
    updateAge: 60 * 60 * 24, // প্রতি ২৪ ঘন্টায় সেশন রিফ্রেশ হবে
  },

  advanced: {
    // Production এ https থাকলে secure cookie চালু হবে
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});
