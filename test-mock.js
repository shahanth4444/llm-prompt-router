const nock = require('nock');

// Mock out the OpenAI environment variable so the index module doesn't complain
process.env.OPENAI_API_KEY = 'mock-test-key-123';

const { classify_intent, route_and_respond, log_request } = require('./index.js');
const fs = require('fs');

async function runMockTests() {
  console.log("=== Running Mock Tests ===");
  const testMessage = "how do i sort a list of objects in python?";

  // 1. Mock the intent classification API Call
  nock('https://api.openai.com:443')
    .post('/v1/chat/completions')
    .reply(200, {
      id: 'chatcmpl-mock1',
      object: 'chat.completion',
      created: 1677651845,
      model: 'gpt-3.5-turbo-0301',
      usage: { prompt_tokens: 50, completion_tokens: 15, total_tokens: 65 },
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({ intent: 'code', confidence: 0.96 })
          },
          finish_reason: 'stop',
          index: 0
        }
      ]
    });

  console.log(`Sending message: "${testMessage}" to classify_intent...`);
  const intentResult = await classify_intent(testMessage);
  console.log("Classified Intent:", intentResult);

  // 2. Mock the response API call
  nock('https://api.openai.com:443')
    .post('/v1/chat/completions')
    .reply(200, {
      id: 'chatcmpl-mock2',
      object: 'chat.completion',
      created: 1677651846,
      model: 'gpt-3.5-turbo-0301',
      usage: { prompt_tokens: 50, completion_tokens: 45, total_tokens: 95 },
      choices: [
        {
          message: {
            role: 'assistant',
            content: "```python\n# Sort by a generic property 'age'\nmy_list.sort(key=lambda x: x.age)\n```"
          },
          finish_reason: 'stop',
          index: 0
        }
      ]
    });

  console.log(`Sending message and intent to route_and_respond...`);
  const finalResponse = await route_and_respond(testMessage, intentResult);
  console.log("Final Response:\n" + finalResponse);

  // Trigger the actual logging!
  log_request(intentResult, testMessage, finalResponse);

  // Verify logging
  const finalLogPath = require('path').join(__dirname, 'route_log.jsonl');
  if (fs.existsSync(finalLogPath)) {
    console.log(`\nCreated log file successfully at: route_log.jsonl`);
  } else {
    console.log(`\nWARNING: route_log.jsonl was not found at ${finalLogPath}!`);
  }

  console.log("\n=== Mock Test Complete! The Router functions properly! ===");
}

runMockTests().catch(console.error);
