const res = await fetch("https://queriosity-backend.neelpandeyofficial.workers.dev/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "test-ping@example.com", password: "test123456" })
});
const data = await res.text();
console.log("Status:", res.status);
console.log("Body:", data);
