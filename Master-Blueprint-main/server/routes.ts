import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { query } from "./db";
import { sendOtp } from "./email";

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY,
      name VARCHAR NOT NULL,
      email VARCHAR UNIQUE NOT NULL,
      major VARCHAR DEFAULT '',
      bio VARCHAR DEFAULT '',
      budget INT DEFAULT 800,
      gender VARCHAR DEFAULT 'nonbinary',
      gender_pref VARCHAR DEFAULT 'mixed',
      cleanliness INT DEFAULT 3,
      noise INT DEFAULT 3,
      lease_type VARCHAR DEFAULT 'full_year',
      zone VARCHAR DEFAULT 'campustown',
      landlord VARCHAR DEFAULT 'other',
      stays_thanksgiving BOOLEAN DEFAULT FALSE,
      stays_spring_break BOOLEAN DEFAULT FALSE,
      avatar_color VARCHAR DEFAULT '#005F73',
      college VARCHAR DEFAULT '',
      organizations TEXT[] DEFAULT '{}'
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS friendships (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
      friend_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, friend_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS vouches (
      id SERIAL PRIMARY KEY,
      voucher_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
      vouchee_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
      message TEXT DEFAULT '',
      UNIQUE(voucher_id, vouchee_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS listings (
      id VARCHAR PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      building_name VARCHAR NOT NULL,
      address VARCHAR DEFAULT '',
      category VARCHAR DEFAULT 'semester_takeover',
      lease_type VARCHAR DEFAULT 'full_year',
      price_per_month INT DEFAULT 0,
      landlord VARCHAR DEFAULT 'other',
      zone VARCHAR DEFAULT 'campustown',
      available_during_breaks BOOLEAN DEFAULT FALSE,
      break_types TEXT[] DEFAULT '{}',
      description TEXT DEFAULT '',
      event_name VARCHAR DEFAULT '',
      start_date VARCHAR DEFAULT '',
      end_date VARCHAR DEFAULT '',
      leased BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS break_posts (
      id VARCHAR PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      break_type VARCHAR NOT NULL,
      role VARCHAR NOT NULL,
      price_per_week INT DEFAULT 0,
      zone VARCHAR DEFAULT 'campustown',
      description TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS leased BOOLEAN DEFAULT FALSE
  `).catch(() => {});

  await query(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      email VARCHAR PRIMARY KEY,
      code VARCHAR(6) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INT DEFAULT 0
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR NOT NULL,
      rating VARCHAR NOT NULL,
      issue_category VARCHAR DEFAULT '',
      issue_detail TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS stats (
      key VARCHAR PRIMARY KEY,
      value INT DEFAULT 0
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id VARCHAR PRIMARY KEY,
      participant1_id VARCHAR NOT NULL,
      participant2_id VARCHAR NOT NULL,
      listing_id VARCHAR DEFAULT '',
      listing_building VARCHAR DEFAULT '',
      listing_price INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR PRIMARY KEY,
      conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id VARCHAR NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    INSERT INTO stats (key, value) VALUES ('successful_subleases', 0)
    ON CONFLICT (key) DO NOTHING
  `);
  await query(`
    INSERT INTO stats (key, value) VALUES ('total_matches', 0)
    ON CONFLICT (key) DO NOTHING
  `);

  console.log("Database initialized");
}

function randomCode(): string {
  return "123456";
}

export async function registerRoutes(app: Express): Promise<Server> {
  await initDb();

  // ─── AUTH / OTP ───────────────────────────────────────────────────────────────

  app.post("/api/auth/send-otp", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || !email.endsWith("@illinois.edu")) {
        return res.status(400).json({ error: "Must be a valid UIUC email." });
      }

      const code = randomCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await query(
        `INSERT INTO otp_codes (email, code, expires_at, attempts)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (email) DO UPDATE SET
           code = EXCLUDED.code,
           expires_at = EXCLUDED.expires_at,
           attempts = 0`,
        [email, code, expiresAt]
      );

      await sendOtp(email, code);
      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/auth/send-otp", err);
      return res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ error: "email and code are required" });
      }

      const [row] = await query<{
        code: string; expires_at: string; attempts: number
      }>("SELECT * FROM otp_codes WHERE email = $1", [email]);

      if (!row) {
        return res.status(404).json({ error: "No verification code found. Please request a new one." });
      }

      if (row.attempts >= 5) {
        await query("DELETE FROM otp_codes WHERE email = $1", [email]);
        return res.status(429).json({ error: "Too many attempts. Please request a new code." });
      }

      if (new Date(row.expires_at) < new Date()) {
        await query("DELETE FROM otp_codes WHERE email = $1", [email]);
        return res.status(410).json({ error: "Code expired. Please request a new one." });
      }

      if (row.code !== code.trim()) {
        await query("UPDATE otp_codes SET attempts = attempts + 1 WHERE email = $1", [email]);
        const remaining = 5 - (row.attempts + 1);
        return res.status(401).json({ error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` });
      }

      await query("DELETE FROM otp_codes WHERE email = $1", [email]);
      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/auth/verify-otp", err);
      return res.status(500).json({ error: "Failed to verify code" });
    }
  });

  // ─── USERS ───────────────────────────────────────────────────────────────────

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const {
        id, name, email, major = "", bio = "", budget = 800,
        gender = "nonbinary", genderPref = "mixed", cleanliness = 3,
        noise = 3, leaseType = "full_year", zone = "campustown",
        landlords = ["other"], staysThanksgiving = false, staysSpringBreak = false,
        avatarColor = "#005F73", college = "", organizations = [],
      } = req.body;

      if (!id || !name || !email) {
        return res.status(400).json({ error: "id, name, and email are required" });
      }
      if (!email.endsWith(".edu")) {
        return res.status(400).json({ error: "Must use a .edu email address" });
      }

      const landlordJson = JSON.stringify(Array.isArray(landlords) ? landlords : [landlords]);
      await query(
        `INSERT INTO users (id, name, email, major, bio, budget, gender, gender_pref,
          cleanliness, noise, lease_type, zone, landlord, stays_thanksgiving,
          stays_spring_break, avatar_color, college, organizations)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name, major = EXCLUDED.major, bio = EXCLUDED.bio,
           budget = EXCLUDED.budget, gender = EXCLUDED.gender,
           gender_pref = EXCLUDED.gender_pref, cleanliness = EXCLUDED.cleanliness,
           noise = EXCLUDED.noise, lease_type = EXCLUDED.lease_type,
           zone = EXCLUDED.zone, landlord = EXCLUDED.landlord,
           stays_thanksgiving = EXCLUDED.stays_thanksgiving,
           stays_spring_break = EXCLUDED.stays_spring_break,
           avatar_color = EXCLUDED.avatar_color, college = EXCLUDED.college,
           organizations = EXCLUDED.organizations`,
        [id, name, email, major, bio, budget, gender, genderPref, cleanliness,
          noise, leaseType, zone, landlordJson, staysThanksgiving, staysSpringBreak,
          avatarColor, college, organizations]
      );

      const [user] = await query("SELECT * FROM users WHERE email = $1", [email]);
      return res.json(user);
    } catch (err) {
      console.error("POST /api/users", err);
      return res.status(500).json({ error: "Failed to save user" });
    }
  });

  app.get("/api/users/by-email/:email", async (req: Request, res: Response) => {
    try {
      const [user] = await query("SELECT * FROM users WHERE email = $1", [req.params.email]);
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json(user);
    } catch (err) {
      console.error("GET /api/users/by-email", err);
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // ─── FRIENDS ─────────────────────────────────────────────────────────────────

  app.get("/api/friends/:email", async (req: Request, res: Response) => {
    try {
      const rows = await query<{
        email: string; name: string; avatar_color: string; major: string;
        college: string; organizations: string[];
      }>(
        `SELECT u2.email, u2.name, u2.avatar_color, u2.major, u2.college, u2.organizations
         FROM friendships fr
         JOIN users u1 ON fr.user_id = u1.id AND u1.email = $1
         JOIN users u2 ON fr.friend_id = u2.id`,
        [req.params.email]
      );
      return res.json(rows);
    } catch (err) {
      console.error("GET /api/friends", err);
      return res.status(500).json({ error: "Failed to fetch friends" });
    }
  });

  app.post("/api/friends", async (req: Request, res: Response) => {
    try {
      const { userEmail, friendEmail } = req.body;
      if (!userEmail || !friendEmail) {
        return res.status(400).json({ error: "userEmail and friendEmail are required" });
      }
      if (userEmail === friendEmail) {
        return res.status(400).json({ error: "Cannot friend yourself" });
      }

      const [user] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [userEmail]);
      const [friend] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [friendEmail]);

      if (!user) return res.status(404).json({ error: "Your account not found — complete onboarding first" });
      if (!friend) return res.status(404).json({ error: "That @illinois.edu email is not registered on PopMatch yet" });

      await query(
        `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [user.id, friend.id]
      );
      await query(
        `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [friend.id, user.id]
      );

      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/friends", err);
      return res.status(500).json({ error: "Failed to add friend" });
    }
  });

  app.delete("/api/friends", async (req: Request, res: Response) => {
    try {
      const { userEmail, friendEmail } = req.body;
      const [user] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [userEmail]);
      const [friend] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [friendEmail]);
      if (!user || !friend) return res.status(404).json({ error: "User not found" });

      await query("DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2", [user.id, friend.id]);
      await query("DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2", [friend.id, user.id]);
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/friends", err);
      return res.status(500).json({ error: "Failed to remove friend" });
    }
  });

  // ─── VOUCHES ─────────────────────────────────────────────────────────────────

  app.post("/api/vouches", async (req: Request, res: Response) => {
    try {
      const { voucherEmail, voucheeEmail, message = "" } = req.body;
      if (!voucherEmail || !voucheeEmail) {
        return res.status(400).json({ error: "voucherEmail and voucheeEmail are required" });
      }

      const [voucher] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [voucherEmail]);
      const [vouchee] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [voucheeEmail]);
      if (!voucher || !vouchee) return res.status(404).json({ error: "User not found" });

      await query(
        `INSERT INTO vouches (voucher_id, vouchee_id, message) VALUES ($1, $2, $3)
         ON CONFLICT (voucher_id, vouchee_id) DO UPDATE SET message = EXCLUDED.message`,
        [voucher.id, vouchee.id, message]
      );
      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/vouches", err);
      return res.status(500).json({ error: "Failed to vouch" });
    }
  });

  app.delete("/api/vouches", async (req: Request, res: Response) => {
    try {
      const { voucherEmail, voucheeEmail } = req.body;
      const [voucher] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [voucherEmail]);
      const [vouchee] = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [voucheeEmail]);
      if (!voucher || !vouchee) return res.status(404).json({ error: "User not found" });

      await query("DELETE FROM vouches WHERE voucher_id = $1 AND vouchee_id = $2", [voucher.id, vouchee.id]);
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/vouches", err);
      return res.status(500).json({ error: "Failed to remove vouch" });
    }
  });

  // ─── TRUST INFO ───────────────────────────────────────────────────────────────

  app.get("/api/trust/:viewerEmail/:targetEmail", async (req: Request, res: Response) => {
    try {
      const { viewerEmail, targetEmail } = req.params;

      if (viewerEmail === targetEmail) {
        return res.json({ degree: 1, mutualFriends: [], vouchedBy: [], sharedOrgs: [] });
      }

      const [viewer] = await query<{ id: string; organizations: string[] }>(
        "SELECT id, organizations FROM users WHERE email = $1", [viewerEmail]
      );
      const [target] = await query<{ id: string; organizations: string[] }>(
        "SELECT id, organizations FROM users WHERE email = $1", [targetEmail]
      );

      if (!viewer || !target) {
        return res.json({ degree: null, mutualFriends: [], vouchedBy: [], sharedOrgs: [] });
      }

      const isDirect = await query<{ id: string }>(
        "SELECT fr.id FROM friendships fr WHERE fr.user_id = $1 AND fr.friend_id = $2",
        [viewer.id, target.id]
      );

      if (isDirect.length > 0) {
        const vouchedBy = await query<{ name: string; email: string }>(
          `SELECT u.name, u.email FROM vouches v
           JOIN users u ON v.voucher_id = u.id WHERE v.vouchee_id = $1`,
          [target.id]
        );
        const sharedOrgs = (viewer.organizations || []).filter(
          (org: string) => (target.organizations || []).includes(org)
        );
        return res.json({ degree: 1, mutualFriends: [], vouchedBy, sharedOrgs });
      }

      const mutualFriends = await query<{ name: string; email: string; avatar_color: string }>(
        `SELECT u.name, u.email, u.avatar_color
         FROM users u
         WHERE u.id IN (SELECT friend_id FROM friendships WHERE user_id = $1)
           AND u.id IN (SELECT friend_id FROM friendships WHERE user_id = $2)`,
        [viewer.id, target.id]
      );

      const vouchedBy = mutualFriends.length > 0
        ? await query<{ name: string; email: string }>(
            `SELECT u.name, u.email FROM vouches v
             JOIN users u ON v.voucher_id = u.id
             WHERE v.vouchee_id = $1
               AND v.voucher_id IN (SELECT friend_id FROM friendships WHERE user_id = $2)`,
            [target.id, viewer.id]
          )
        : [];

      const sharedOrgs = (viewer.organizations || []).filter(
        (org: string) => (target.organizations || []).includes(org)
      );

      const degree = mutualFriends.length > 0 ? 2 : null;
      return res.json({ degree, mutualFriends, vouchedBy, sharedOrgs });
    } catch (err) {
      console.error("GET /api/trust", err);
      return res.status(500).json({ error: "Failed to compute trust" });
    }
  });

  // ─── LISTINGS ────────────────────────────────────────────────────────────────

  app.get("/api/listings", async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      const sql = category
        ? `SELECT l.*, u.name as user_name, u.avatar_color as user_avatar
           FROM listings l LEFT JOIN users u ON l.user_id = u.id
           WHERE l.category = $1 AND l.leased = FALSE ORDER BY l.created_at DESC`
        : `SELECT l.*, u.name as user_name, u.avatar_color as user_avatar
           FROM listings l LEFT JOIN users u ON l.user_id = u.id
           WHERE l.leased = FALSE ORDER BY l.created_at DESC`;
      const params = category ? [category] : [];
      const rows = await query(sql, params);
      return res.json(rows);
    } catch (err) {
      console.error("GET /api/listings", err);
      return res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  app.post("/api/listings", async (req: Request, res: Response) => {
    try {
      const {
        id, userId, buildingName, address = "", category = "semester_takeover",
        leaseType = "full_year", pricePerMonth = 0, landlords = ["other"],
        zone = "campustown", availableDuringBreaks = false, breakTypes = [],
        description = "", eventName = "", startDate = "", endDate = "",
      } = req.body;

      if (!id || !userId || !buildingName) {
        return res.status(400).json({ error: "id, userId, and buildingName are required" });
      }

      const landlordJson = JSON.stringify(Array.isArray(landlords) ? landlords : [landlords]);
      await query(
        `INSERT INTO listings (id, user_id, building_name, address, category, lease_type,
          price_per_month, landlord, zone, available_during_breaks, break_types,
          description, event_name, start_date, end_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO NOTHING`,
        [id, userId, buildingName, address, category, leaseType, pricePerMonth,
          landlordJson, zone, availableDuringBreaks, breakTypes, description,
          eventName, startDate, endDate]
      );
      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/listings", err);
      return res.status(500).json({ error: "Failed to save listing" });
    }
  });

  app.delete("/api/listings/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await query("UPDATE listings SET leased = TRUE WHERE id = $1", [id]);
      return res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/listings/:id", err);
      return res.status(500).json({ error: "Failed to mark listing as leased" });
    }
  });

  // ─── STATS ───────────────────────────────────────────────────────────────────

  app.post("/api/stats/increment", async (req: Request, res: Response) => {
    try {
      const { key } = req.body;
      if (!key) return res.status(400).json({ error: "key is required" });
      await query(
        `INSERT INTO stats (key, value) VALUES ($1, 1)
         ON CONFLICT (key) DO UPDATE SET value = stats.value + 1`,
        [key]
      );
      const [row] = await query<{ value: number }>("SELECT value FROM stats WHERE key = $1", [key]);
      return res.json({ key, value: row?.value ?? 1 });
    } catch (err) {
      console.error("POST /api/stats/increment", err);
      return res.status(500).json({ error: "Failed to increment stat" });
    }
  });

  // ─── FEEDBACK ────────────────────────────────────────────────────────────────

  app.post("/api/feedback", async (req: Request, res: Response) => {
    try {
      const { userEmail, rating, issueCategory = "", issueDetail = "" } = req.body;
      if (!userEmail || !rating) {
        return res.status(400).json({ error: "userEmail and rating are required" });
      }
      await query(
        `INSERT INTO feedback (user_email, rating, issue_category, issue_detail)
         VALUES ($1, $2, $3, $4)`,
        [userEmail, rating, issueCategory, issueDetail]
      );
      return res.json({ success: true });
    } catch (err) {
      console.error("POST /api/feedback", err);
      return res.status(500).json({ error: "Failed to save feedback" });
    }
  });

  app.get("/api/feedback/summary", async (_req: Request, res: Response) => {
    try {
      const totals = await query<{ rating: string; count: string }>(
        `SELECT rating, COUNT(*) as count FROM feedback GROUP BY rating ORDER BY count DESC`
      );
      const topIssues = await query<{ issue_category: string; count: string }>(
        `SELECT issue_category, COUNT(*) as count
         FROM feedback WHERE rating = 'rescue' AND issue_category != ''
         GROUP BY issue_category ORDER BY count DESC LIMIT 5`
      );
      const recent = await query<{
        user_email: string; rating: string; issue_category: string;
        issue_detail: string; created_at: string
      }>(
        `SELECT user_email, rating, issue_category, issue_detail, created_at
         FROM feedback ORDER BY created_at DESC LIMIT 10`
      );
      const totalCount = totals.reduce((acc, r) => acc + parseInt(r.count), 0);
      return res.json({ totals, totalCount, topIssues, recent });
    } catch (err) {
      console.error("GET /api/feedback/summary", err);
      return res.status(500).json({ error: "Failed to fetch feedback summary" });
    }
  });

  // ─── ADMIN ───────────────────────────────────────────────────────────────────

  app.get("/api/admin/stats", async (_req: Request, res: Response) => {
    try {
      const [userCount] = await query<{ count: string }>("SELECT COUNT(*) as count FROM users");
      const [listingCount] = await query<{ count: string }>(
        "SELECT COUNT(*) as count FROM listings WHERE leased = FALSE"
      );
      const [leasedCount] = await query<{ count: string }>(
        "SELECT COUNT(*) as count FROM listings WHERE leased = TRUE"
      );
      const statsRows = await query<{ key: string; value: number }>("SELECT * FROM stats");
      const feedbackSummary = await query<{ rating: string; count: string }>(
        `SELECT rating, COUNT(*) as count FROM feedback GROUP BY rating`
      );
      const topIssues = await query<{ issue_category: string; count: string }>(
        `SELECT issue_category, COUNT(*) as count
         FROM feedback WHERE rating = 'rescue' AND issue_category != ''
         GROUP BY issue_category ORDER BY count DESC LIMIT 5`
      );
      const recentFeedback = await query<{
        user_email: string; rating: string; issue_category: string;
        issue_detail: string; created_at: string
      }>(
        `SELECT user_email, rating, issue_category, issue_detail, created_at
         FROM feedback ORDER BY created_at DESC LIMIT 10`
      );

      const stats = Object.fromEntries(statsRows.map(r => [r.key, r.value]));
      const totalFeedback = feedbackSummary.reduce((acc, r) => acc + parseInt(r.count), 0);

      return res.json({
        users: parseInt(userCount?.count ?? "0"),
        activeListings: parseInt(listingCount?.count ?? "0"),
        leasedListings: parseInt(leasedCount?.count ?? "0"),
        stats,
        feedback: { totals: feedbackSummary, totalCount: totalFeedback, topIssues, recent: recentFeedback },
      });
    } catch (err) {
      console.error("GET /api/admin/stats", err);
      return res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  // ─── CONVERSATIONS & MESSAGES ────────────────────────────────────────────────

  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { participant1Id, participant2Id, listingId = "", listingBuilding = "", listingPrice = 0 } = req.body;
      if (!participant1Id || !participant2Id) {
        return res.status(400).json({ error: "participant1Id and participant2Id are required" });
      }

      const existing = await query<{ id: string }>(
        `SELECT id FROM conversations
         WHERE ((participant1_id = $1 AND participant2_id = $2)
            OR (participant1_id = $2 AND participant2_id = $1))
           AND listing_id = $3`,
        [participant1Id, participant2Id, listingId]
      );

      if (existing.length > 0) {
        const [conv] = await query("SELECT * FROM conversations WHERE id = $1", [existing[0].id]);
        return res.json(conv);
      }

      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      await query(
        `INSERT INTO conversations (id, participant1_id, participant2_id, listing_id, listing_building, listing_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, participant1Id, participant2Id, listingId, listingBuilding, listingPrice]
      );

      const [conv] = await query("SELECT * FROM conversations WHERE id = $1", [id]);
      return res.json(conv);
    } catch (err) {
      console.error("POST /api/conversations", err);
      return res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const rows = await query(
        `SELECT c.*,
          u1.name as participant1_name, u1.avatar_color as participant1_avatar,
          u2.name as participant2_name, u2.avatar_color as participant2_avatar,
          (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
         FROM conversations c
         LEFT JOIN users u1 ON c.participant1_id = u1.id
         LEFT JOIN users u2 ON c.participant2_id = u2.id
         WHERE c.participant1_id = $1 OR c.participant2_id = $1
         ORDER BY COALESCE(
           (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1),
           c.created_at
         ) DESC`,
        [userId]
      );
      return res.json(rows);
    } catch (err) {
      console.error("GET /api/conversations/:userId", err);
      return res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/messages", async (req: Request, res: Response) => {
    try {
      const { conversationId, senderId, content } = req.body;
      if (!conversationId || !senderId || !content) {
        return res.status(400).json({ error: "conversationId, senderId, and content are required" });
      }

      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      await query(
        `INSERT INTO messages (id, conversation_id, sender_id, content)
         VALUES ($1, $2, $3, $4)`,
        [id, conversationId, senderId, content]
      );

      const [msg] = await query("SELECT * FROM messages WHERE id = $1", [id]);
      return res.json(msg);
    } catch (err) {
      console.error("POST /api/messages", err);
      return res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/messages/:conversationId", async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      const rows = await query(
        `SELECT m.*, u.name as sender_name, u.avatar_color as sender_avatar
         FROM messages m
         LEFT JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = $1
         ORDER BY m.created_at ASC`,
        [conversationId]
      );
      return res.json(rows);
    } catch (err) {
      console.error("GET /api/messages/:conversationId", err);
      return res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
