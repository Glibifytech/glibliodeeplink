import express from "express"
import { createClient } from "@supabase/supabase-js"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = process.env.PORT || 3000

// Serve static files
app.use(express.static("public"))

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    global: {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_READ_PROFILE_KEY}`
      }
    }
  }
)

// Asset links for Android verification
app.get("/.well-known/assetlinks.json", (req, res) => {
  res.setHeader("Content-Type", "application/json")
  res.sendFile(path.join(__dirname, ".well-known", "assetlinks.json"))
})

/* HOME PAGE */
app.get("/", (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Gliblio Test</title></head>
    <body style="font-family:Arial;padding:40px;">
      <h2>🔗 Gliblio Deep Link Server Running</h2>
      <p>Try: <code>/test/username</code> or <code>/[username]</code></p>
    </body>
    </html>
  `
  res.send(html)
})

/* DEBUG: Check DB connection */
app.get("/debug/connection", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("count")
      .limit(1)

    res.json({
      success: true,
      tableAccess: !error,
      error: error?.message,
    })
  } catch (e) {
    res.json({ success: false, error: e.message })
  }
})

/* DEBUG: List users */
app.get("/debug/users", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, id")
      .limit(10)

    res.json({
      success: !error,
      users: data || [],
      error: error?.message
    })
  } catch (e) {
    res.json({ success: false, users: [], error: e.message })
  }
})

/* TEST ROUTE (JSON only) */
app.get("/test/:username", async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim()

    const { data: user, error } = await supabase
      .from("profiles")
      .select("username, id")
      .eq("username", username)
      .single()

    if (error || !user) {
      return res.json({
        success: false,
        error: "User not found",
        details: error
      })
    }

    return res.json({
      success: true,
      user,
      deepLink: `gliblio://profile/${user.id}`
    })
  } catch (e) {
    return res.json({ success: false, error: e.message })
  }
})

/* MAIN ROUTE: gliblio.com/:username  
   This is where App Link fix happens
*/
app.get("/:username", async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim()
    const userAgent = req.headers["user-agent"] || ""

    // Filter ignored/system files
    const systemFiles = [
      "favicon.ico", "robots.txt", "sitemap.xml", "manifest.json"
    ]

    if (systemFiles.includes(username)) {
      return res.status(404).send("Not found")
    }

    // Fetch profile
    const { data: user, error } = await supabase
      .from("profiles")
      .select("username, id")
      .eq("username", username)
      .single()

    if (error || !user) {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html><body>User not found.</body></html>
      `)
    }

    const deepLink = `gliblio://profile/${user.id}`

    /* ANDROID APP LINK DETECTION  
       We return HTTP 200 — no redirect  
       Android will open the app automatically.
    */
    const isAndroid =
      userAgent.includes("Android") ||
      userAgent.includes("Dalvik") ||
      userAgent.includes("okhttp")

    const isAppLinkVerifier =
      userAgent.includes("Google") ||
      userAgent.includes("Chrome/") && userAgent.includes("wv") ||
      req.headers["x-appengine-request-log-id"]

    if (isAndroid || isAppLinkVerifier) {
      console.log("✔ ANDROID App Link detected. Returning 200 OK.")
      return res.status(200).send("OK")
    }

    /* BROWSER FALLBACK  
       We cannot use 302 for browsers anymore,
       so use JavaScript redirect.
    */
    console.log("🌐 Browser fallback triggered")

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Opening App...</title>
        <script>
          window.location.href = "${deepLink}";
          setTimeout(() => {
            window.location.href = "https://gliblio.com/download";
          }, 2000);
        </script>
      </head>
      <body style="font-family:Arial;">
        Opening Gliblio App...
      </body>
      </html>
    `)

  } catch (e) {
    console.error("Fatal error:", e)
    return res.status(200).send("Server error.")
  }
})

/* Catch-all route */
app.use("*", (req, res) => {
  res.status(200).send("OK")
})

/* Start Server */
app.listen(port, () => {
  console.log(`✨ Gliblio Deep Link Server running on port ${port}`)
})
