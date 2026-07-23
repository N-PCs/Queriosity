// Test debug endpoint and signup
async function test() {
  const base = "https://queriosity-backend.neelpandeyofficial.workers.dev";
  
  // Test debug - check env vars
  console.log("=== Testing Debug (env vars) ===");
  try {
    const res = await fetch(`${base}/auth/debug`);
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch error:", err.message);
  }

  // Test signup
  console.log("\n=== Testing Signup ===");
  try {
    const res = await fetch(`${base}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test-debug3@example.com", password: "Test123456" }),
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

test();
