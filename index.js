import express from "express"
import { createClient } from "@supabase/supabase-js"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = process.env.PORT || 3000

app.use(express.static('public'))

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

app.get("/.well-known/assetlinks.json", (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.sendFile(path.join(__dirname, '.well-known', 'assetlinks.json'))
})

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Gliblio</title></head>
    <body>
        <h1>Gliblio</h1>
        <p>Download our app to view profiles!</p>
    </body>
    </html>
  `)
})

// Username route - redirect to app
app.get("/:username", async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim()
    
    // Filter system files
    const systemFiles = ['.env', 'favicon.ico', 'robots.txt', 'sitemap.xml', 'manifest.json', '.git']
    if (systemFiles.some(file => username.includes(file)) || 
        username.startsWith('.') || 
        username.includes('/') ||
        username.length < 2 ||
        username.length > 30) {
      return res.status(404).send('Not Found')
    }

    console.log(`🔗 Looking up: ${username}`)

    const { data: user, error } = await supabase
      .from("profiles")
      .select("username, id")
      .eq("username", username)
      .single()

    if (error || !user) {
      console.log(`🔗 User not found: ${username}`)
      return res.redirect(`gliblio://home?error=user_not_found&username=${username}`)
    }

    console.log(`🔗 Found user: ${user.username} -> ${user.id}`)
    return res.redirect(`gliblio://profile/${user.id}`)
    
  } catch (error) {
    console.error("🔗 Error:", error)
    res.redirect(`gliblio://home?error=server_error`)
  }
})

app.use("*", (req, res) => {
  res.redirect('gliblio://home')
})

app.listen(port, () => {
  console.log(`🔗 Gliblio server running on port ${port}`)
})
