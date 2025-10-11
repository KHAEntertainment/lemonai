async function checkLlmApiAvailability(baseUrl, apiKey='', model, platformName='') {
  if (!baseUrl) {
    return { status: false, message: 'Base URL is required.' };
  }
  
  // Handle Gemini separately as it uses a different API structure
  const isGemini = platformName && platformName.toLowerCase().includes('gemini');
  
  let api_url, requestBody, headers;
  
  if (isGemini) {
    // Gemini uses a different endpoint structure
    const testModel = model || 'gemini-1.5-flash';
    api_url = `${baseUrl}/v1beta/models/${testModel}:generateContent?key=${apiKey}`;
    requestBody = {
      contents: [{
        parts: [{ text: "hello" }]
      }],
      generationConfig: {
        maxOutputTokens: 5
      }
    };
    headers = {
      'Content-Type': 'application/json'
    };
  } else {
    // Standard OpenAI-compatible endpoint
    api_url = baseUrl + '/chat/completions';
    requestBody = {
      model: model,
      messages: [{
        role: "user",
        content: "hello"
      }],
      max_tokens: 5
    };
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(api_url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (response.ok) { // HTTP status code in the 200-299 range
      const data = await response.json();
      // Further check the response data, e.g., whether expected fields or error info exist
      // Different LLM API responses may vary, adjust as needed
      
      if (isGemini) {
        // Gemini response structure: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
        if (data && data.candidates && data.candidates.length > 0) {
          return { status: true, message: 'LLM API call succeeded.' };
        } else {
          return { status: false, message: 'LLM API call succeeded, but Gemini response data is not as expected.' };
        }
      } else {
        // OpenAI-compatible response structure
        if (data && data.choices && data.choices.length > 0) {
          return { status: true, message: 'LLM API call succeeded.' };
        } else {
          return { status: false, message: 'LLM API call succeeded, but response data is not as expected.' };
        }
      }
    } else {
      const errorText = await response.text();
      return { status: false, message: `LLM API call failed, HTTP status: ${response.status}, error: ${errorText}` };
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return { status: false, message: `LLM API call timed out: ${error.message}` };
    } else {
      return { status: false, message: `Network or other error occurred during LLM API call: ${error.message}` };
    }
  }
}

module.exports = exports = checkLlmApiAvailability;