/**
 * Seed script — populate the database with sample Dodge Club data.
 * Run: pnpm --filter @workspace/scripts run seed
 */
import { db, usersTable, eventsTable, postsTable, merchTable, attendanceTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱  Seeding Dodge Club database...");

  // ---- Admin user ----
  const existingAdmin = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, "admin@dodgeclub.com"),
  });

  let adminId: number;
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("dodgeball123", 10);
    const [admin] = await db.insert(usersTable).values({
      email: "admin@dodgeclub.com",
      passwordHash,
      name: "Dodge Club HQ",
      isAdmin: true,
    }).returning();
    adminId = admin.id;
    console.log("✅  Admin user created");
  } else {
    adminId = existingAdmin.id;
    console.log("⏭   Admin user already exists");
  }

  // ---- Sample member ----
  const existingMember = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, "sam@example.com"),
  });

  let memberId: number;
  if (!existingMember) {
    const passwordHash = await bcrypt.hash("dodgeball123", 10);
    const [member] = await db.insert(usersTable).values({
      email: "sam@example.com",
      passwordHash,
      name: "Sam Taylor",
      isAdmin: false,
    }).returning();
    memberId = member.id;
    console.log("✅  Sample member created");
  } else {
    memberId = existingMember.id;
    console.log("⏭   Sample member already exists");
  }

  // ---- Events ----
  const existingEvents = await db.select().from(eventsTable);
  let event1Id: number, event2Id: number, event3Id: number, event4Id: number;

  if (existingEvents.length === 0) {
    const events = await db.insert(eventsTable).values([
      {
        title: "Dodge Club Summer Slam",
        description: "The biggest Dodge Club event of the year. Teams from across the region battle it out for the coveted Dodge Club trophy. All skill levels welcome.",
        date: new Date("2026-08-15T19:00:00"),
        location: "Brixton Recreation Centre, London",
        ticketUrl: "https://example.com/tickets/summer-slam",
        attendeeCount: 124,
      },
      {
        title: "Friday Night Throwdown",
        description: "Weekly open-format dodgeball session. Whether you're a first-timer or a seasoned player, come join the fun. Drinks after!",
        date: new Date("2026-04-11T18:30:00"),
        location: "Hackney Sports Hall, London",
        ticketUrl: "https://example.com/tickets/friday-throwdown",
        attendeeCount: 48,
      },
      {
        title: "Charity Dodge-a-thon",
        description: "24 hours of non-stop dodgeball in aid of local youth sports charities. Sponsorship spots available. Join a team or sponsor a player.",
        date: new Date("2026-09-20T10:00:00"),
        location: "Wembley Arena, London",
        ticketUrl: "https://example.com/tickets/dodge-a-thon",
        attendeeCount: 0,
      },
      {
        title: "Dodge Club Autumn League — Opener",
        description: "Kicking off the Autumn League season. Register your team before the event and come ready to compete.",
        date: new Date("2025-10-05T18:00:00"),
        location: "Shoreditch Sports Barn, London",
        attendeeCount: 88,
      },
    ]).returning();
    event1Id = events[0].id;
    event2Id = events[1].id;
    event3Id = events[2].id;
    event4Id = events[3].id;
    console.log("✅  Events created");
  } else {
    event1Id = existingEvents[0].id;
    event2Id = existingEvents[1]?.id ?? existingEvents[0].id;
    event3Id = existingEvents[2]?.id ?? existingEvents[0].id;
    event4Id = existingEvents[3]?.id ?? existingEvents[0].id;
    console.log("⏭   Events already exist");
  }

  // ---- Attendance ----
  const existingAttendance = await db.query.attendanceTable.findMany({
    where: eq(attendanceTable.userId, memberId),
  });

  if (existingAttendance.length === 0) {
    await db.insert(attendanceTable).values([
      { userId: memberId, eventId: event4Id, earnedMedal: true },
    ]);
    console.log("✅  Attendance records created");
  } else {
    console.log("⏭   Attendance records already exist");
  }

  // ---- Posts ----
  const existingPosts = await db.select().from(postsTable);
  if (existingPosts.length === 0) {
    await db.insert(postsTable).values([
      {
        title: "Welcome to The Dodge Club App!",
        content: "We're incredibly excited to launch the official Dodge Club app. This is your home for all things dodgeball — events, merch, community updates, and more. Make sure you create your free account to access the Member Zone.",
        isMembersOnly: false,
        authorId: adminId,
      },
      {
        title: "Summer Slam 2025 — Tickets Now Live!",
        content: "The biggest event in the Dodge Club calendar is back! Summer Slam 2025 tickets are on sale now. Early bird pricing ends 1st July — grab yours before they're gone. We're expecting over 200 players this year.",
        isMembersOnly: false,
        authorId: adminId,
      },
      {
        title: "🔒 Member Update: New League Structure",
        content: "Hey members! We've been working hard on a brand new league structure for the Autumn 2025 season. This includes divisions, rankings, and proper playoffs. Full details coming next week — stay tuned. The league will feature Bronze, Silver, and Gold divisions with promotion/relegation.",
        isMembersOnly: true,
        authorId: adminId,
      },
      {
        title: "🔒 Exclusive: Merchandise Pre-Order Now Open",
        content: "Members get first access to our new 2025 collection. The new kit features a redesigned logo on a heavyweight premium tee, plus new hoodies, caps, and accessories. Orders ship in 6 weeks. Use code MEMBER10 for 10% off.",
        isMembersOnly: true,
        authorId: adminId,
      },
    ]);
    console.log("✅  Posts created");
  } else {
    console.log("⏭   Posts already exist");
  }

  // ---- Merch ----
  const existingMerch = await db.select().from(merchTable);
  if (existingMerch.length === 0) {
    await db.insert(merchTable).values([
      {
        name: "Dodge Club Classic Tee",
        description: "The go-to tee. Heavyweight 100% cotton with embroidered logo. Available in black and white.",
        price: "29.99",
        category: "apparel",
        inStock: true,
      },
      {
        name: "Dodge Club Hoodie",
        description: "Premium pullover hoodie with Dodge Club branding across the chest. Fleece-lined for warmth.",
        price: "54.99",
        category: "apparel",
        inStock: true,
      },
      {
        name: "Dodge Club Snapback",
        description: "Adjustable snapback cap with embroidered logo. One size fits all.",
        price: "24.99",
        category: "accessories",
        inStock: true,
      },
      {
        name: "Dodgeball (Official)",
        description: "Tournament-grade dodgeball used at all Dodge Club events. Foam rubber, regulation size.",
        price: "19.99",
        category: "equipment",
        inStock: true,
      },
      {
        name: "Dodge Club Tracksuit",
        description: "Full matching tracksuit with zip-up jacket and joggers. Lightweight and breathable.",
        price: "79.99",
        category: "apparel",
        inStock: false,
      },
      {
        name: "Water Bottle",
        description: "Double-walled stainless steel bottle with Dodge Club logo. 750ml capacity.",
        price: "22.99",
        category: "accessories",
        inStock: true,
      },
    ]);
    console.log("✅  Merch products created");
  } else {
    console.log("⏭   Merch products already exist");
  }

  console.log("\n🏆  Seed complete!");
  console.log("\nTest accounts:");
  console.log("  Admin: admin@dodgeclub.com / dodgeball123");
  console.log("  Member: sam@example.com / dodgeball123");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
