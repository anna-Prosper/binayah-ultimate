import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectMongo } from "@/lib/mongo";
import AuthUser from "@/lib/AuthUser";
import { ADMIN_EMAIL_MAP } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json() as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const fixedUserId = ADMIN_EMAIL_MAP[normalizedEmail];

    if (!fixedUserId) {
      return NextResponse.json(
        { error: "NOT_WHITELISTED", email: normalizedEmail },
        { status: 403 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    await connectMongo();

    // Upsert: allow re-setting password if already exists
    const passwordHash = await bcrypt.hash(password, 12);
    await AuthUser.findOneAndUpdate(
      { email: normalizedEmail },
      { email: normalizedEmail, passwordHash, fixedUserId, emailNotifications: true },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true, fixedUserId });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Signup failed. Try again." }, { status: 500 });
  }
}
