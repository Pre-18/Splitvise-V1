import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function runTest() {
  console.log("🚀 Starting Agentic Auth Verification Flow\n");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Cleanup before test
    await prisma.user.deleteMany({ where: { email: "alice@example.com" } });
    
    // 2. Test Boundary (Unauthenticated Dashboard Access)
    console.log("1️⃣  Testing Boundary: GET http://localhost:3000/dashboard");
    const dashRes = await fetch("http://localhost:3000/dashboard", { redirect: "manual" });
    
    if (dashRes.status === 307 || dashRes.status === 302) {
      console.log(`✅ Success: Middleware intercepted unauthenticated access and returned ${dashRes.status} Redirect.`);
      console.log(`➡️  Redirect Location: ${dashRes.headers.get('location')}`);
    } else {
      console.error(`❌ Failed: Expected redirect, got ${dashRes.status}`);
    }

    // 3. Test Registration
    console.log("\n2️⃣  Testing Registration: POST /api/auth/register");
    const regRes = await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice", email: "alice@example.com", password: "password123" })
    });
    
    if (regRes.status === 201) {
      console.log(`✅ Success: User registered successfully (HTTP 201).`);
      const body = await regRes.json();
      console.log(`➡️  Response: ${JSON.stringify(body)}`);
    } else {
      console.error(`❌ Failed: Registration failed with ${regRes.status}`);
      console.error(await regRes.text());
      return;
    }

    // 4. Verify Password Hashing in Database
    console.log("\n3️⃣  Verifying Hashing Strategy in Neon Database");
    const dbUser = await prisma.user.findUnique({ where: { email: "alice@example.com" } });
    if (dbUser) {
      console.log(`✅ Success: Found user in database.`);
      console.log(`➡️  Plaintext password: "password123"`);
      console.log(`➡️  Database passwordHash: "${dbUser.passwordHash}"`);
      if (dbUser.passwordHash.startsWith("$2a$")) {
        console.log(`✅ Success: Hash is fully obfuscated using bcrypt.`);
      } else {
        console.error(`❌ Failed: Hash does not appear to be bcrypt.`);
      }
    } else {
      console.error(`❌ Failed: User not found in database.`);
    }

  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    await prisma.$disconnect();
    console.log("\n🏁 Verification Complete.");
    process.exit(0);
  }
}

runTest();
