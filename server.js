import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment configurations
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve directory name in ES Module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors());
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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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

/* =========================================================================
   2. DATABASE PERSISTENCE ENDPOINTS
   ========================================================================= */

// Retrieve all user profiles
app.get('/api/profiles', (req, res) => {
    const db = readDB();
    res.json(db);
});

// Update/Save user profiles
app.post('/api/profiles', (req, res) => {
    const { profiles, activeProfileId, resumeData } = req.body;
    const db = readDB();

    if (profiles !== undefined) db.profiles = profiles;
    if (activeProfileId !== undefined) db.activeProfileId = activeProfileId;
    if (resumeData !== undefined) db.resumeData = resumeData;

    writeDB(db);
    res.json({ success: true, message: "Profiles and resume data synchronized on the server." });
});

// Start the Express Server
app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`  ResuMake AI Backend Web Server is running at:`);
    console.log(`  🚀 http://localhost:${PORT}`);
    console.log(`================================================================`);
});
