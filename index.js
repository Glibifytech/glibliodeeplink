import express from "express"
import { createClient } from "@supabase/supabase-js"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = process.env.PORT || 3000

// Serve static files from public directory
app.use(express.static('public'))

// connect to Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Serve assetlinks.json for domain verification
app.get("/.well-known/assetlinks.json", (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.sendFile(path.join(__dirname, '.well-known', 'assetlinks.json'))
})

// Route: gliblio.com (home page) - invisible redirect
app.get("/", (req, res) => {
  console.log('Home page request, redirecting to app')
  return res.redirect(302, 'gliblio://home')
})

// Route: gliblio.com/username
app.get("/:username", async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim()
    
    // Filter out system files and invalid requests
    const systemFiles = ['.env', 'favicon.ico', 'robots.txt', 'sitemap.xml', 'manifest.json', '.git']
    const isSystemFile = systemFiles.some(file => username.includes(file)) || 
                        username.startsWith('.') || 
                        username.includes('/') ||
                        username.length < 2 ||
                        username.length > 30
    
    if (isSystemFile) {
      console.log(`Ignoring system file request: ${username}`)
      return res.status(404).send('Not Found')
    }
    
    console.log(`Looking up profile for username: ${username}`)

    const { data: user, error } = await supabase
      .from("profiles")
      .select("username, id")
      .eq("username", username)
      .single()

    console.log(`Supabase response:`, { data: user, error })

    if (error) {
      console.error(`Supabase error details:`, error)
      if (error.code === 'PGRST301') {
        console.log(`RLS policy blocking access - user might exist but not accessible`)
      }
      return res.redirect(302, `gliblio://home?error=user_not_found&username=${username}`)
    }

    if (!user) {
      console.log(`User not found: ${username}`)
      return res.redirect(302, `gliblio://home?error=user_not_found&username=${username}`)
    }

    console.log(`Found user: ${user.username} (ID: ${user.id}), redirecting to app`)
    
    // Direct HTTP redirect - no HTML page, just redirect immediately
    const redirectUrl = `gliblio://profile/${user.id}`
    console.log(`Redirecting directly to: ${redirectUrl}`)
    return res.redirect(302, redirectUrl)
    
  } catch (error) {
    console.error("Server error:", error)
    // Redirect to app with error instead of JSON response
    res.redirect(302, `gliblio://home?error=server_error`)
  }
})

// Handle 404 for other routes - invisible redirect to app
app.use("*", (req, res) => {
  console.log(`Unknown route: ${req.originalUrl}, redirecting to app home`)
  res.redirect(302, 'gliblio://home')
})

app.listen(port, () => {
  console.log(`Gliblio Profile Redirect Server running on port ${port}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})