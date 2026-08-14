/**
 * ==============================================================
 * middleware/requireAdmin.js
 * ==============================================================
 * এই middleware যেকোনো route এর আগে বসালে, সেই route এ ঢুকতে হলে
 * ইউজারকে অবশ্যই লগইন করা থাকতে হবে এবং role === "admin" হতে হবে।
 *
 * ব্যবহার:
 *   app.get("/admin/donors", requireAdmin, async (req, res) => {...});
 * ==============================================================
 */

import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";

export async function requireAdmin(req, res, next) {
  try {
    // Better Auth এর session কুকি থেকে বর্তমান ইউজার বের করা হচ্ছে
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    // লগইন করা না থাকলে
    if (!session || !session.user) {
      return res.status(401).json({ error: "লগইন করা নেই। আগে লগইন করুন।" });
    }

    // লগইন আছে কিন্তু admin না হলে
    if (session.user.role !== "admin") {
      return res.status(403).json({ error: "এই কাজের অনুমতি আপনার নেই।" });
    }

    // পরের route handler গুলোতে ইউজারের তথ্য পাঠিয়ে দেওয়া হলো
    req.user = session.user;
    next();
  } catch (err) {
    console.error("Auth check error:", err);
    res.status(500).json({ error: "সেশন যাচাই করতে সমস্যা হয়েছে" });
  }
}
