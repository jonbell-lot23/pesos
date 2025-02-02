"use server";

// import { prisma } from "@/lib/prisma";
import pool from "@/lib/dbPool";
import { validateRSSFeed } from "@/app/actions";

interface ValidateRSSFeedSuccess {
  success: true;
  feedUrl?: string;
  title: string;
  postCount: number;
}

interface ValidateRSSFeedError {
  success: false;
  error: string;
}

type ValidateRSSFeedResult = ValidateRSSFeedSuccess | ValidateRSSFeedError;

export async function getUserSources(userId: string) {
  const queryText = `
    SELECT s.id, s.url
    FROM "public"."pesos_Sources" s
    JOIN "public"."pesos_UserSources" us ON s.id = us."sourceId"
    WHERE us."userId" = $1;
  `;
  try {
    const { rows } = await pool.query(queryText, [userId]);
    return rows; // [{ id, url }, ...]
  } catch (error) {
    console.error("Error in getUserSources:", error);
    throw error;
  }
}

interface AddSourceSuccess {
  success: true;
  source: {
    id: number;
    url: string;
  };
}

interface AddSourceError {
  success: false;
  error: string;
}

type AddSourceResult = AddSourceSuccess | AddSourceError;

export async function addUserSource(userId: string, url: string) {
  let source;

  // First, check if the source already exists based on its URL.
  const selectQuery = `SELECT id, url FROM "public"."pesos_Sources" WHERE url = $1;`;
  try {
    const result = await pool.query(selectQuery, [url]);
    if (result.rows.length > 0) {
      source = result.rows[0];
    } else {
      // If not, insert a new source (adjust columns as needed)
      const insertQuery = `
        INSERT INTO "public"."pesos_Sources" (url)
        VALUES ($1)
        RETURNING *;
      `;
      const insertResult = await pool.query(insertQuery, [url]);
      source = insertResult.rows[0];
    }
  } catch (error: any) {
    console.error(
      "Error in addUserSource while fetching/inserting source:",
      error
    );
    return { success: false, error: error.message };
  }

  // Now create the join-record between the user and the source.
  const joinQuery = `
    INSERT INTO "public"."pesos_UserSources" ("userId", "sourceId")
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING;
  `;
  try {
    await pool.query(joinQuery, [userId, source.id]);
  } catch (error: any) {
    console.error(
      "Error in addUserSource while linking user and source:",
      error
    );
    return { success: false, error: error.message };
  }

  return { success: true, source };
}
