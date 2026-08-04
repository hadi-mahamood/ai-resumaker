import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment configurations
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase Client dynamically if credentials are provided in .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

if (supabaseUrl && supabaseServiceKey && supabaseUrl.trim() !== "" && supabaseServiceKey.trim() !== "") {
    try {
        supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                persistSession: false
            }
        });
        console.log("================================================================");
        console.log("  ✅ Supabase Cloud Database integration active!");
        console.log("================================================================");
    } catch (e) {
        console.error("Failed to initialize Supabase client: ", e);
    }
} else {
    console.log("================================================================");
    console.log("  ⚠️  Supabase configurations missing in .env.");
    console.log("  💾 Falling back to local file storage: profiles_db.json");
    console.log("================================================================");
}

// Resolve directory name in ES Module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares

// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect('https://' + req.headers.host + req.url);
        }
        next();
    });
}

const allowedOrigins = process.env.ALLOWED_ORIGINS || '*';
const corsOptions = {
    origin: allowedOrigins === '*' ? '*' : allowedOrigins.split(',').map(o => o.trim()),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Support larger payload sizes for profile syncs

// Serve static assets from the current directory
app.use(express.static(__dirname));

const PROFILES_FILE = path.join(__dirname, 'profiles_db.json');

/**
 * Helper: Read profiles JSON database
 */
function readDB() {
    try {
        if (!fs.existsSync(PROFILES_FILE)) {
            return { profiles: [], activeProfileId: null, resumeData: null };
        }
        const data = fs.readFileSync(PROFILES_FILE, 'utf8');
        return JSON.parse(data || '{"profiles":[], "activeProfileId":null, "resumeData":null}');
    } catch (e) {
        console.error("Failed to read profile database file: ", e);
        return { profiles: [], activeProfileId: null, resumeData: null };
    }
}

/**
 * Helper: Write profiles JSON database
 */
function writeDB(data) {
    try {
        fs.writeFileSync(PROFILES_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error("Failed to write profile database file: ", e);
    }
}

/* =========================================================================
   1. SECURE AI CHAT PROXY ENDPOINT
   ========================================================================= */
app.post('/api/ai/chat', async (req, res) => {
    const { prompt } = req.body;
    
    if (!prompt) {
        return res.status(400).json({ error: "Missing prompt parameter." });
    }

    // Prioritize server-side key, fallback to headers if provided by user custom config
    const apiKey = process.env.GEMINI_API_KEY || req.headers['x-api-key'];

    if (!apiKey || apiKey.trim() === "") {
        return res.status(401).json({ 
            error: "Gemini API key is not configured on the server. Please add your key to the backend .env configuration file." 
        });
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorMsg = await response.text();
            console.error("Google generative API error details: ", errorMsg);
            return res.status(response.status).json({ 
                error: `Generative language API request failed: ${response.statusText}`, 
                details: errorMsg 
            });
        }

        const data = await response.json();
        return res.json(data);
    } catch (error) {
        console.error("Exception during server API proxy operation: ", error);
        return res.status(500).json({ error: "Internal server error during AI operations.", details: error.message });
    }
});

// Expose public Supabase credentials for client-side authentication library
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || "",
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ""
    });
});

function getUserDBFile(userId) {
    const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(__dirname, `profiles_db_${safeId}.json`);
}

function readUserDB(userId) {
    const userFile = getUserDBFile(userId);
    try {
        if (!fs.existsSync(userFile)) {
            return { profiles: [], activeProfileId: 'default', resumeData: null };
        }
        const data = fs.readFileSync(userFile, 'utf8');
        return JSON.parse(data || '{"profiles":[], "activeProfileId":"default", "resumeData":null}');
    } catch (e) {
        console.error(`Failed to read user profile database file ${userFile}: `, e);
        return { profiles: [], activeProfileId: 'default', resumeData: null };
    }
}

function writeUserDB(userId, data) {
    const userFile = getUserDBFile(userId);
    try {
        fs.writeFileSync(userFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error(`Failed to write user profile database file ${userFile}: `, e);
    }
}

/**
 * Helper: Resolve authenticated Supabase user from headers JWT (supports Real Supabase & Mock Sessions)
 */
async function getAuthenticatedUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    
    const token = authHeader.split(' ')[1];
    
    // 1. Try real Supabase JWT check if client is active
    if (supabase) {
        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (!error && user) return user;
        } catch (e) {
            console.error("JWT Verification exception: ", e);
        }
    }
    
    // 2. Fallback: Parse mock JWT tokens (e.g. mock-jwt-token-for-test@example.com)
    if (token && token.startsWith('mock-jwt-token-for-')) {
        const email = token.replace('mock-jwt-token-for-', '');
        const userId = 'mock-uuid-' + Buffer.from(email).toString('base64');
        return {
            id: userId,
            email: email,
            isMock: true
        };
    }
    
    return null;
}

/* =========================================================================
   2. DATABASE PERSISTENCE ENDPOINTS
   ========================================================================= */

// Retrieve all user profiles
app.get('/api/profiles', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    
    if (user) {
        if (!user.isMock && supabase) {
            try {
                // Fetch from Supabase PostgreSQL table 'resumake_users'
                const { data, error } = await supabase
                    .from('resumake_users')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) {
                    console.error("Supabase SELECT profiles failed: ", error);
                    return res.status(500).json({ error: "Failed to load profiles from cloud database." });
                }

                if (data) {
                    return res.json({
                        profiles: data.profiles || [],
                        activeProfileId: data.active_profile_id || 'default',
                        resumeData: data.resume_data || null
                    });
                } else {
                    return res.json({ profiles: [], activeProfileId: 'default', resumeData: null });
                }
            } catch (e) {
                console.error("Supabase profiles query exception: ", e);
                return res.status(500).json({ error: "Internal server error querying cloud database." });
            }
        } else {
            // Mock Auth multi-user mode: load from user-specific local file
            const db = readUserDB(user.id);
            return res.json(db);
        }
    } else {
        // Guest mode fallback: Local global file DB
        const db = readDB();
        return res.json(db);
    }
});

// Update/Save user profiles
app.post('/api/profiles', async (req, res) => {
    const { profiles, activeProfileId, resumeData } = req.body;
    const user = await getAuthenticatedUser(req);

    if (user) {
        if (!user.isMock && supabase) {
            try {
                // Upsert into Supabase PostgreSQL table 'resumake_users'
                const { error } = await supabase
                    .from('resumake_users')
                    .upsert({
                        user_id: user.id,
                        profiles: profiles || [],
                        active_profile_id: activeProfileId || 'default',
                        resume_data: resumeData || null,
                        updated_at: new Date().toISOString()
                    });

                if (error) {
                    console.error("Supabase UPSERT profiles failed: ", error);
                    return res.status(500).json({ error: "Failed to save profiles to cloud database." });
                }

                return res.json({ success: true, message: "Profiles and resume data synchronized on the cloud database." });
            } catch (e) {
                console.error("Supabase profiles save exception: ", e);
                return res.status(500).json({ error: "Internal server error writing to cloud database." });
            }
        } else {
            // Mock Auth multi-user mode: save to user-specific local file
            const db = readUserDB(user.id);
            if (profiles !== undefined) db.profiles = profiles;
            if (activeProfileId !== undefined) db.activeProfileId = activeProfileId;
            if (resumeData !== undefined) db.resumeData = resumeData;
            writeUserDB(user.id, db);
            return res.json({ success: true, message: "Profiles and resume data synchronized on user-specific mock file." });
        }
    } else {
        // Guest mode fallback: Local global file DB
        const db = readDB();
        if (profiles !== undefined) db.profiles = profiles;
        if (activeProfileId !== undefined) db.activeProfileId = activeProfileId;
        if (resumeData !== undefined) db.resumeData = resumeData;
        writeDB(db);
        return res.json({ success: true, message: "Profiles and resume data synchronized on the local server." });
    }
});

// Start the Express Server
app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`  ResuMake AI Backend Web Server is running at:`);
    console.log(`  🚀 http://localhost:${PORT}`);
    console.log(`================================================================`);
});
