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

// connect to Supabase with anon key + custom JWT (exactly like working test)
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
                <button onclick="listAllUsers()">List All Users</button>
                <button onclick="testConnection()">Test DB Connection</button>
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
            
            async function listAllUsers() {
                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML = '<div class="result info">Loading all users...</div>';
                
                try {
                    const response = await fetch('/debug/users');
                    const data = await response.json();
                    
                    if (data.success) {
                        let userList = data.users.map(user => 
                            '<li><strong>' + user.username + '</strong> (ID: ' + user.id + ')</li>'
                        ).join('');
                        
                        resultDiv.innerHTML = '<div class="result success">' +
                            '<h3>✅ FOUND ' + data.count + ' USERS</h3>' +
                            '<ul style="text-align: left;">' + userList + '</ul>' +
                        '</div>';
                    } else {
                        resultDiv.innerHTML = '<div class="result error">' +
                            '<h3>❌ ERROR LISTING USERS</h3>' +
                            '<p><strong>Error:</strong> ' + data.error + '</p>' +
                        '</div>';
                    }
                } catch (error) {
                    resultDiv.innerHTML = '<div class="result error">' +
                        '<h3>❌ NETWORK ERROR</h3>' +
                        '<p>' + error.message + '</p>' +
                    '</div>';
                }
            }
            
            async function testConnection() {
                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML = '<div class="result info">Testing database connection...</div>';
                
                try {
                    const response = await fetch('/debug/connection');
                    const data = await response.json();
                    
                    if (data.success) {
                        resultDiv.innerHTML = '<div class="result success">' +
                            '<h3>✅ CONNECTION SUCCESS</h3>' +
                            '<p><strong>Supabase URL:</strong> ' + (data.hasUrl ? 'CONFIGURED' : 'MISSING') + '</p>' +
                            '<p><strong>Anon Key:</strong> ' + (data.hasAnonKey ? 'CONFIGURED' : 'MISSING') + '</p>' +
                            '<p><strong>Custom Key:</strong> ' + (data.hasCustomKey ? 'CONFIGURED' : 'MISSING') + '</p>' +
                            '<p><strong>Table Access:</strong> ' + (data.tableAccess ? 'SUCCESS' : 'FAILED') + '</p>' +
                        '</div>';
                    } else {
                        resultDiv.innerHTML = '<div class="result error">' +
                            '<h3>❌ CONNECTION FAILED</h3>' +
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
        </script>
    </body>
    </html>
  `;
  
  res.send(html);
})

// Debug route: test connection
app.get("/debug/connection", async (req, res) => {
  try {
    console.log(`🔗 DEBUG: Testing connection`);
    console.log(`🔗 DEBUG: SUPABASE_URL exists: ${!!process.env.SUPABASE_URL}`);
    console.log(`🔗 DEBUG: SUPABASE_ANON_KEY exists: ${!!process.env.SUPABASE_ANON_KEY}`);
    console.log(`🔗 DEBUG: SUPABASE_READ_PROFILE_KEY exists: ${!!process.env.SUPABASE_READ_PROFILE_KEY}`);
    console.log(`🔗 DEBUG: SUPABASE_URL value: ${process.env.SUPABASE_URL?.substring(0, 30)}...`);
    
    // Test basic table access
    const { data, error } = await supabase
      .from("profiles")
      .select("count")
      .limit(1);
    
    console.log(`🔗 DEBUG: Table access test:`, { data, error });
    
    return res.json({
      success: true,
      hasUrl: !!process.env.SUPABASE_URL,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
      hasCustomKey: !!process.env.SUPABASE_READ_PROFILE_KEY,
      tableAccess: !error,
      error: error?.message,
      details: error
    });
    
  } catch (error) {
    console.error(`🔗 DEBUG: Connection test failed:`, error);
    return res.json({
      success: false,
      error: error.message,
      hasUrl: !!process.env.SUPABASE_URL,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
      hasCustomKey: !!process.env.SUPABASE_READ_PROFILE_KEY,
      tableAccess: false
    });
  }
});

// Debug route: list all users
app.get("/debug/users", async (req, res) => {
  try {
    console.log(`🔗 DEBUG: Listing all users`);
    
    const { data: users, error } = await supabase
      .from("profiles")
      .select("username, id")
      .limit(10);
    
    console.log(`🔗 DEBUG: Found ${users?.length || 0} users:`, users);
    
    return res.json({
      success: !error,
      users: users || [],
      error: error?.message,
      count: users?.length || 0
    });
    
  } catch (error) {
    console.error(`🔗 DEBUG: Error listing users:`, error);
    return res.json({
      success: false,
      error: error.message,
      users: []
    });
  }
});

// Test route: gliblio.com/test/username (returns JSON)
app.get("/test/:username", async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim();
    console.log(`🔗 WEB TEST: ========== TESTING USERNAME: ${username} ==========`);
    
    console.log(`🔗 WEB TEST: Environment check:`);
    console.log(`🔗 WEB TEST: - SUPABASE_URL: ${process.env.SUPABASE_URL ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`🔗 WEB TEST: - SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`🔗 WEB TEST: - SUPABASE_READ_PROFILE_KEY: ${process.env.SUPABASE_READ_PROFILE_KEY ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`🔗 WEB TEST: - URL starts with: ${process.env.SUPABASE_URL?.substring(0, 30)}...`);
    
    console.log(`🔗 WEB TEST: Executing query:`);
    console.log(`🔗 WEB TEST: - Table: profiles`);
    console.log(`🔗 WEB TEST: - Select: username, id`);
    console.log(`🔗 WEB TEST: - Where: username = '${username}'`);
    
    const { data: user, error } = await supabase
      .from("profiles")
      .select("username, id")
      .eq("username", username)
      .single();
    
    console.log(`🔗 WEB TEST: Raw database response:`);
    console.log(`🔗 WEB TEST: - User data:`, user);
    console.log(`🔗 WEB TEST: - Error:`, error);
    console.log(`🔗 WEB TEST: - Error code:`, error?.code);
    console.log(`🔗 WEB TEST: - Error message:`, error?.message);
    console.log(`🔗 WEB TEST: - Error details:`, error?.details);
    
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
    const userAgent = req.headers['user-agent'] || ''
    console.log(`🔗 WEB: Received request for username: ${username}`)
    console.log(`🔗 WEB: User-Agent: ${userAgent}`)
    
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
    
    // Check if this is from Android (for App Links verification)
    const isAndroidVerification = userAgent.includes('Android') && !userAgent.includes('Chrome')
    
    if (isAndroidVerification) {
      console.log(`🔗 WEB: Android App Links verification request - returning OK`)
      return res.send('OK')
    }
    
    console.log(`🔗 WEB: Looking up profile for username: ${username}`)

    const { data: user, error } = await supabase
      .from("profiles")
      .select("username, id")
      .eq("username", username)
      .single()

    console.log(`🔗 WEB: Supabase response:`, { data: user, error })

    if (error || !user) {
      console.log(`🔗 WEB: User not found, redirecting to app home`)
      return res.redirect(302, `gliblio://home?error=user_not_found&username=${username}`)
    }

    console.log(`🔗 WEB: SUCCESS! Found user: ${user.username} (ID: ${user.id})`)
    
    // Redirect to app with profile
    const redirectUrl = `gliblio://profile/${user.id}`
    console.log(`🔗 WEB: Redirecting to app: ${redirectUrl}`)
    return res.redirect(302, redirectUrl)
    
  } catch (error) {
    console.error("🔗 WEB: Server error:", error)
    res.redirect(302, `gliblio://home?error=server_error`)
  }
})

// Handle 404 for other routes - return OK for Android App Links
app.use("*", (req, res) => {
  console.log(`Unknown route: ${req.originalUrl}, returning OK for Android App Links`)
  res.send('OK')
})

app.listen(port, () => {
  console.log(`Gliblio Profile Redirect Server running on port ${port}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})
