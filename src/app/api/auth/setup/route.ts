import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession, hasAdminUser } from "@/lib/auth/session";
import { setupSchema } from "@/lib/utils/validators";

export async function POST(request: NextRequest) {
  try {
    // Only allow setup if no admin user exists
    const adminExists = await hasAdminUser();
    if (adminExists) {
      return NextResponse.json(
        { error: "Admin user already exists" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = setupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, username, password, displayName } = parsed.data;
    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        email,
        username,
        passwordHash,
        displayName,
        role: "admin",
      })
      .returning();

    // Create session for the new admin
    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
