import express from "express"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = process.env.PORT || 3000

app.use(express.static('public'))

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

app.get("/:username", (req, res) => {
  const username = req.params.username.toLowerCase().trim()
  
  const systemFiles = ['.env', 'favicon.ico', 'robots.txt', 'sitemap.xml', 'manifest.json', '.git']
  if (systemFiles.some(file => username.includes(file)) || 
      username.startsWith('.') || 
      username.includes('/') ||
      username.length < 2 ||
      username.length > 30) {
    return res.status(404).send('Not Found')
  }

  console.log(`🔗 Username request: ${username} - returning OK for Android App Links`)
  res.send('OK')
})

app.use("*", (req, res) => {
  res.send('OK')
})

app.listen(port, () => {
  console.log(`🔗 Gliblio server running on port ${port}`)
})
