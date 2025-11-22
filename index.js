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

// Route: gliblio.com (home page) - show test UI
app.get("/", (req, res) => {
  console.log('🔗 WEB: Home page request - showing test UI')
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Gliblio Deep Link Tester</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .container { text-align: center; }
            input { padding: 10px; font-size: 16px; width: 200px; margin: 10px; }
            button { padding: 10px 20px; font-size: 16px; background: #007bff; color: white; border: none; cursor: pointer; }
            button:hover { background: #0056b3; }
            .result { margin: 20px 0; padding: 15px; border-radius: 5px; }
            .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔗 Gliblio Deep Link Tester</h1>
            <p>Test username lookup and deep link generation</p>
            
            <div>
                <input type="text" id="username" placeholder="Enter username" value="gabbymoney">
                <br>
                <button onclick="testUsername()">Test Username</button>
                <button onclick="testDeepLink()">Test Deep Link</button>
            </div>
            
            <div id="result"></div>
        </div>
        
        <script>
            async function testUsername() {
                const username = document.getElementById('username').value.trim();
                const resultDiv = document.getElementById('result');
                
                if (!username) {
                    resultDiv.innerHTML = '<div class="result error">Please enter a username</div>';
                    return;
                }
                
                resultDiv.innerHTML = '<div class="result info">Testing username: ' + username + '...</div>';
                
                try {
                    const response = await fetch('/test/' + username);
                    const data = await response.json();
                    
                    if (data.success) {
                        resultDiv.innerHTML = '<div class="result success">' +
                            '<h3>✅ SUCCESS!</h3>' +
                            '<p><strong>Username:</strong> ' + data.user.username + '</p>' +
                            '<p><strong>User ID:</strong> ' + data.user.id + '</p>' +
                            '<p><strong>Deep Link:</strong> gliblio://profile/' + data.user.id + '</p>' +
                        '</div>';
                    } else {
                        resultDiv.innerHTML = '<div class="result error">' +
                            '<h3>❌ ERROR</h3>' +
                            '<p><strong>Error:</strong> ' + data.error + '</p>' +
                            '<p><strong>Details:</strong> ' + JSON.stringify(data.details) + '</p>' +
                        '</div>';
                    }
                } catch (error) {
                    resultDiv.innerHTML = '<div class="result error">' +
                        '<h3>❌ NETWORK ERROR</h3>' +
                        '<p>' + error.message + '</p>' +
                    '</div>';
                }
            }
            
            function testDeepLink() {
                const username = document.getElementById('username').value.trim();
                if (!username) {
                    alert('Please enter a username');
                    return;
                }
                
                // This will trigger the actual deep link flow
                window.location.href = '/' + username;
            }
        </script>
    </body>
    </html>
  `;
  
  res.send(html);
})

// Test route: gliblio.com/test/username (returns JSON)
app.get("/test/:username", async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim();
    console.log(`🔗 WEB TEST: Testing username: ${username}`);
    
    console.log(`🔗 WEB TEST: Supabase URL: ${process.env.SUPABASE_URL ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`🔗 WEB TEST: Supabase ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'CONFIGURED' : 'MISSING'}`);
    
    const { data: user, error } = await supabase
      .from("user_profiles")
      .select("username, id")
      .eq("username", username)
      .single();
    
    console.log(`🔗 WEB TEST: Database response:`, { user, error });
    
    if (error) {
      return res.json({
        success: false,
        error: error.message,
        details: error,
        username: username
      });
    }
    
    if (!user) {
      return res.json({
        success: false,
        error: 'User not found',
        details: 'No user found with this username',
        username: username
      });
    }
    
    return res.json({
      success: true,
      user: user,
      deepLink: `gliblio://profile/${user.id}`
    });
    
  } catch (error) {
    console.error(`🔗 WEB TEST: Error:`, error);
    return res.json({
      success: false,
      error: error.message,
      details: error,
      username: req.params.username
    });
  }
});

// Route: gliblio.com/username
app.get("/:username", async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim()
    console.log(`🔗 WEB: Received request for username: ${username}`)
    console.log(`🔗 WEB: Request headers:`, req.headers)
    
    // Filter out system files and invalid requests
    const systemFiles = ['.env', 'favicon.ico', 'robots.txt', 'sitemap.xml', 'manifest.json', '.git']
    const isSystemFile = systemFiles.some(file => username.includes(file)) || 
                        username.startsWith('.') || 
                        username.includes('/') ||
                        username.length < 2 ||
                        username.length > 30
    
    if (isSystemFile) {
      console.log(`🔗 WEB: Ignoring system file request: ${username}`)
      return res.status(404).send('Not Found')
    }
    
    console.log(`🔗 WEB: Looking up profile for username: ${username}`)
    console.log(`🔗 WEB: Supabase URL configured: ${process.env.SUPABASE_URL ? 'YES' : 'NO'}`)
    console.log(`🔗 WEB: Supabase ANON_KEY configured: ${process.env.SUPABASE_ANON_KEY ? 'YES' : 'NO'}`)

    const { data: user, error } = await supabase
      .from("user_profiles")
      .select("username, id")
      .eq("username", username)
      .single()

    console.log(`🔗 WEB: Supabase response:`, { data: user, error })
    console.log(`🔗 WEB: Error details:`, error)

    if (error) {
      console.error(`🔗 WEB: Supabase error details:`, error)
      console.error(`🔗 WEB: Error code: ${error.code}`)
      console.error(`🔗 WEB: Error message: ${error.message}`)
      if (error.code === 'PGRST301') {
        console.log(`🔗 WEB: RLS policy blocking access - user might exist but not accessible`)
      }
      console.log(`🔗 WEB: Redirecting to home with error for username: ${username}`)
      return res.redirect(302, `gliblio://home?error=user_not_found&username=${username}`)
    }

    if (!user) {
      console.log(`🔗 WEB: User not found in database: ${username}`)
      console.log(`🔗 WEB: Redirecting to home with user_not_found error`)
      return res.redirect(302, `gliblio://home?error=user_not_found&username=${username}`)
    }

    console.log(`🔗 WEB: SUCCESS! Found user: ${user.username} (ID: ${user.id})`)
    
    // Direct HTTP redirect - no HTML page, just redirect immediately
    const redirectUrl = `gliblio://profile/${user.id}`
    console.log(`🔗 WEB: Redirecting to app: ${redirectUrl}`)
    return res.redirect(302, redirectUrl)
    
  } catch (error) {
    console.error("🔗 WEB: Server error:", error)
    console.error("🔗 WEB: Error stack:", error.stack)
    // Redirect to app with error instead of JSON response
    console.log(`🔗 WEB: Redirecting to home with server_error`)
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
