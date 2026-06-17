import "dotenv/config";
import { supabaseAdmin } from "../supabase";
import { readFileSync } from "fs";
import { join } from "path";

async function migrate() {
  const sqlPath = join(import.meta.dir, "../../supabase-schema.sql");
  const sql = readFileSync(sqlPath, "utf8");

  const { error } = await supabaseAdmin.rpc("exec_sql", { sql });

  if (error) {
    console.error("Migration failed:", error.message);
    console.log("\nPlease run supabase-schema.sql manually in Supabase SQL Editor.\n");
    process.exit(1);
  }

  console.log("Migration completed successfully");
  process.exit(0);
}

migrate();
