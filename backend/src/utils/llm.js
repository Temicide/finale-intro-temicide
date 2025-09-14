// Parse Gemini JSON output, handling markdown/code block wrappers
function parseGeminiJson(raw) {
  // Remove markdown code block markers and trim
  let cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  // Try to find the first JSON object in the string
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (err) {
      // If parsing fails, return the raw string
      return { error: 'Failed to parse JSON', raw };
    }
  }
  return { error: 'No JSON found', raw };
}
// Suggest meal utility
async function suggestMeal({ allergies, dislikes, goal, additional_preferences }) {
  if (!goal) {
    throw new Error('Goal is required.');
  }
  let prompt = `Suggest a meal for the following:\n`;
  if (allergies && allergies.length) prompt += `Allergies: ${allergies.join(', ')}\n`;
  if (dislikes && dislikes.length) prompt += `Dislikes: ${dislikes.join(', ')}\n`;
  prompt += `Goal: ${goal}\n`;
  if (additional_preferences) prompt += `Additional preferences: ${additional_preferences}\n`;
  prompt += `Please provide a meal suggestion with ingredients and a short preparation method.`;
  prompt += `Please Generate Output in this specific JSON format: {
      "meal_suggestion": {
        "name": "name of the dish",
        "description": "general description of what the dish is and how it fits the goal",
        "ingredients": [
          "list of ingredients"
        ],
        "instructions": [
          "list of preparation steps"
        ],
        "nutritional_info": {
          "calories": estimated calories values, in kcal,
          "protein": estimated grams of protein,
          "carbohydrates": estimated grams of carbohydrates,
          "fat": estimated grams of fat
        }
      }
    }`;
  return await queryLLM(prompt);
}


const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env manually
function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2].trim();
      }
    });
  }
}

loadEnv();


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_HOST = 'generativelanguage.googleapis.com';
const GEMINI_API_PATH = `/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;


// LLM rate limiter
const aiRateLimitWindowMs = 1000; // 1s
const aiRateLimitMax = 5;
const aiRateLimitMap = new Map();

function llmRateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  let entry = aiRateLimitMap.get(ip);
  if (!entry || now - entry.start > aiRateLimitWindowMs) {
    entry = { count: 1, start: now };
  } else {
    entry.count++;
  }
  aiRateLimitMap.set(ip, entry);
  if (entry.count > aiRateLimitMax) {
    return res.status(429).json({ error: 'Too many AI queries, please try again later.' });
  }
  next();
}

async function queryLLM(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not found in environment variables.');
  }
  const postData = JSON.stringify({
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  });

  const options = {
    hostname: GEMINI_API_HOST,
    path: GEMINI_API_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0].text) {
            resolve(result.candidates[0].content.parts[0].text);
          } else {
            console.log('Unexpected Gemini response:', result);
            reject(new Error('Invalid response from Gemini API'));
          }
        } catch (err) {
          reject(new Error('Failed to parse Gemini response: ' + err.message));
        }
      });
    });
    req.on('error', err => reject(new Error('Failed to query Gemini: ' + err.message)));
    req.write(postData);
    req.end();
  });
}

async function handleLLMQuery(req, res) {
  let prompt;
  try {
    prompt = req.body.prompt;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Malformed Prompt' });
  }
  try {
    const response = await queryLLM(prompt);
    res.json({ result: response });
  } catch (err) {
    res.status(500).json({ error: 'LLM query failed.' });
    console.log(err);
  }
}

module.exports = { queryLLM, llmRateLimiter, handleLLMQuery, suggestMeal, parseGeminiJson };
