#!/usr/bin/env node

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Testing Supabase connection...");
console.log("URL:", supabaseUrl ? "SET" : "NOT SET");
console.log("Key:", supabaseServiceRoleKey ? "SET" : "NOT SET");

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Environment variables not set");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

async function testConnection() {
  try {
    console.log("Testing basic connection...");
    const { data, error } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .limit(1);

    if (error) {
      console.error("Connection failed:", error);
      return;
    }

    console.log("Connection successful!");
    console.log("Tables found:", data?.length || 0);
  } catch (err) {
    console.error("Error:", err);
  }
}

testConnection();
