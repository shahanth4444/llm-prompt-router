# LLM-Powered Prompt Router for Intent Classification


This Node.js service intelligently routes user requests to specialized AI personas by classifying the user's intent. It is designed to demonstrate key patterns in production AI systems, avoiding single monolithic prompts in favor of specialized expert system prompts.

## Architecture Diagram

```mermaid
graph TD
    A[User Message] --> B(classify_intent)
    B -->|LLM Call: System Prompt 'detect intent'| C{Intent Result}
    
    C -->|code| D[Code Expert Persona]
    C -->|data| E[Data Analyst Persona]
    C -->|writing| F[Writing Coach Persona]
    C -->|career| G[Career Advisor Persona]
    C -->|unclear| H[Ask Clarification]
    
    D --> I(route_and_respond)
    E --> I
    F --> I
    G --> I
    
    H --> J[Return Clarifying Question]
    
    I -->|Second LLM Call| K[Generate Final Details]
    K --> L[Return Final Response to User]
    J --> L
    
    B --> M[(route_log.jsonl)]
    I --> M
    H --> M
```

## Features & Requirements Met

1. **Configurable Expert Prompts**: Prompts are loaded from an external `prompts.json` file. Four personas are implemented: `code`, `data`, `writing`, and `career`.
2. **Robust Intent Classification**: `classify_intent` uses a lightweight prompt with `response_format: { type: "json_object" }` to reliably return a JSON object (e.g. `{ "intent": "code", "confidence": 0.95 }`).
3. **Smart Routing System**: `route_and_respond` selects the correct persona system prompt based on the label, executing a second generated response using the OpenAI API.
4. **Fallback Handling for 'Unclear' Intents**: When the router cannot boldly classify an intent (`unclear`), the system politely asks for clarification instead of guessing or routing to a default.
5. **Request Logging**: Every classification and final response is logged to `route_log.jsonl` in JSON Lines format to fulfill the observability constraint.
6. **Graceful Error Handling**: `classify_intent` handles malformed or non-JSON responses by defaulting gracefully to `intent: "unclear"` and `confidence: 0.0`. It does not crash.

## Getting Started

### Option 1: Using Node.js directly
1. Ensure you have Node.js 18+ installed.
2. Open your terminal and **make sure you are in the correct folder**:
   ```bash
   cd "d:\USER ACTIVITY SERVICE\prompt-router"
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the test mock demo (no API key needed):
   ```bash
   node test-mock.js
   ```

### Option 2: Using Docker (Recommended)
If you have Docker installed, you can run the mock test without installing Node.js directly:
1. Open your terminal in the correct folder:
   ```bash
   cd "d:\USER ACTIVITY SERVICE\prompt-router"
   ```
2. Build and run the mock test container:
   ```bash
   docker-compose run --rm prompt-router node test-mock.js
   ```

## Included Tests
The provided `index.js` includes a testing suite simulating 15 messages. If you add your OpenAI API Key to the `.env` file, running `npm start` (or `docker-compose up` if uncommented in config) will process all 15 sequentially and log them automatically to `route_log.jsonl`.
