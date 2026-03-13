require('dotenv').config();
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-instantiation"
});
const promptsPath = path.join(__dirname, 'prompts.json');
const logPath = path.join(__dirname, 'route_log.jsonl');

let prompts = {};
try {
  prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
} catch (e) {
  console.error("Failed to load prompts.json");
  process.exit(1);
}

/**
 * Classify the intent of the user message.
 * Extracts intent and confidence as JSON.
 */
async function classify_intent(message) {
  const systemMessage = `Your task is to classify the user's intent. Based on the user message below, choose one of the following labels: code, data, writing, career, unclear. Respond with a single JSON object containing two keys: 'intent' (the label you chose) and 'confidence' (a float from 0.0 to 1.0, representing your certainty). Do not provide any other text or explanation.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: message }
      ],
      temperature: 0.0
    });

    const content = response.choices[0].message.content.trim();
    
    // Attempt to parse JSON
    const parsed = JSON.parse(content);
    if (parsed.intent && typeof parsed.confidence === 'number') {
      return {
        intent: parsed.intent,
        confidence: parsed.confidence
      };
    } else {
      throw new Error("Missing correct fields");
    }
  } catch (error) {
    // Graceful error handling for parsing or network
    return {
      intent: "unclear",
      confidence: 0.0
    };
  }
}

/**
 * Route and generate response based on intent.
 */
async function route_and_respond(message, intentObj) {
  const intentLabel = intentObj.intent;
  
  if (intentLabel === "unclear" || !prompts[intentLabel]) {
    return "I'm not quite sure how to help with that. Are you asking for help with coding, data analysis, writing, or career advice?";
  }

  const systemPrompt = prompts[intentLabel];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    return "Sorry, I encountered an error while trying to respond.";
  }
}

/**
 * Log the route and request details to JSON Lines map.
 */
function log_request(intentObj, message, response) {
  const logEntry = {
    intent: intentObj.intent,
    confidence: intentObj.confidence,
    user_message: message,
    final_response: response
  };
  fs.appendFileSync(logPath, JSON.stringify(logEntry) + "\n");
}

/**
 * Process a single message end-to-end and log.
 */
async function processMessage(message) {
  console.log(`\nUser: "${message}"`);
  const intentObj = await classify_intent(message);
  console.log(`Classified: ${intentObj.intent} (${intentObj.confidence})`);
  const response = await route_and_respond(message, intentObj);
  console.log(`Response: ${response}`);
  log_request(intentObj, message, response);
}

/**
 * Run tests via the provided messages.
 */
async function run() {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key-for-instantiation') {
    console.error("ERROR: Please set your OPENAI_API_KEY in the .env file before running!");
    process.exit(1);
  }

  const testMessages = [
    "how do i sort a list of objects in python?",
    "explain this sql query for me",
    "This paragraph sounds awkward, can you help me fix it?",
    "I'm preparing for a job interview, any tips?",
    "what's the average of these numbers: 12, 45, 23, 67, 34",
    "Help me make this better.",
    "I need to write a function that takes a user id and returns their profile, but also i need help with my resume.",
    "hey",
    "Can you write me a poem about clouds?",
    "Rewrite this sentence to be more professional.",
    "I'm not sure what to do with my career.",
    "what is a pivot table",
    "fxi thsi bug pls: for i in range(10) print(i)",
    "How do I structure a cover letter?",
    "My boss says my writing is too verbose."
  ];

  for (const msg of testMessages) {
    await processMessage(msg);
  }
}

if (require.main === module) {
  run().catch(console.error);
}

module.exports = {
  classify_intent,
  route_and_respond
};
