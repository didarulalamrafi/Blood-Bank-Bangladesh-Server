/**
 * ==============================================================
 * scripts/createAdmin.js
 * ==============================================================
 * এই স্ক্রিপ্টটা শুধু একবার চালাতে হবে — এটা প্রথম Admin account
 * তৈরি করে দেয়। এরপর ওই email/password দিয়ে admin panel এ লগইন
 * করা যাবে।
 *
 * কেন আলাদা স্ক্রিপ্ট লাগলো?
 * সাধারণ sign-up route দিয়ে account বানালে role হয় "user" (দেখুন
 * lib/auth.js এ role.input = false)। তাই এই account কে ম্যানুয়ালি
 * "admin" বানিয়ে দেওয়া হচ্ছে সরাসরি database এ গিয়ে।
 *
 * চালানোর নিয়ম (টার্মিনালে):
 *   node scripts/createAdmin.js "আপনার Name" "admin@example.com" "StrongPassword123"
 * ==============================================================
 */

import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";
import { auth } from "../lib/auth.js";

const [, , name, email, password] = process.argv;

if (!name || !email || !password) {
  console.log(
    '❌ ব্যবহারের নিয়ম: node scripts/createAdmin.js "Name" "email@example.com" "Password123"',
  );
  process.exit(1);
}

if (password.length < 8) {
  console.log("❌ Password কমপক্ষে ৮ ক্যারেক্টার হতে হবে");
  process.exit(1);
}

async function main() {
  // ধাপ ১: Better Auth দিয়ে সাধারণ একটা account তৈরি করা (role হবে "user")
  const result = await auth.api.signUpEmail({
    body: { name, email, password },
  });

  if (!result?.user?.id) {
    console.log("❌ Account তৈরি করা যায়নি। হয়তো এই email আগে থেকেই আছে।");
    process.exit(1);
  }

  // ধাপ ২: সরাসরি MongoDB এ গিয়ে role কে "admin" বানিয়ে দেওয়া
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db("bbb");

  // Better Auth ডিফল্ট ভাবে "user" নামের collection এ ইউজার রাখে
  await db.collection("user").updateOne({ email }, { $set: { role: "admin" } });

  console.log("✅ Admin account সফলভাবে তৈরি হয়েছে!");
  console.log(`   Email: ${email}`);
  console.log("   এখন এই email/password দিয়ে Admin Panel এ লগইন করতে পারবেন।");

  await client.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ সমস্যা হয়েছে:", err.message);
  process.exit(1);
});

// # Backend folder এ গিয়ে এই কমান্ড চালান:
// node scripts/createAdmin.js "আপনার নাম" "admin@bloodbank.com" "StrongPassword123"
