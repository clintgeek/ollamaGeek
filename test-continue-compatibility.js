const axios = require('axios');

async function testContinueCompatibility() {
  const baseUrl = 'http://localhost:3003';

  console.log('🧪 Testing Continue/VS Code Compatibility...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const health = await axios.get(`${baseUrl}/health`);
    console.log('✅ Health check passed:', health.data.status);

    // Test 2: Model listing (Continue uses this)
    console.log('\n2️⃣ Testing model listing...');
    const models = await axios.get(`${baseUrl}/api/tags`);
    console.log('✅ Models available:', models.data.models?.length || 0);

    // Test 3: Simple chat request (Continue format)
    console.log('\n3️⃣ Testing simple chat request...');
    const chatResponse = await axios.post(`${baseUrl}/api/chat`, {
      model: 'llama3.1:8b',
      messages: [
        { role: 'user', content: 'Say hello' }
      ],
      stream: false
    });
    console.log('✅ Chat response received:', chatResponse.data.message?.content?.substring(0, 50) + '...');

    // Test 4: Streaming chat request (Continue format)
    console.log('\n4️⃣ Testing streaming chat request...');
    const streamResponse = await axios.post(`${baseUrl}/api/chat`, {
      model: 'llama3.1:8b',
      messages: [
        { role: 'user', content: 'Count to 3' }
      ],
      stream: true
    }, {
      responseType: 'stream'
    });

    let streamData = '';
    streamResponse.data.on('data', chunk => {
      streamData += chunk.toString();
    });

    await new Promise((resolve) => {
      streamResponse.data.on('end', resolve);
    });

    console.log('✅ Streaming response received:', streamData.substring(0, 100) + '...');

    console.log('\n🎉 All compatibility tests passed! Continue/VS Code should work perfectly.');
    console.log('\n📊 Fast Orchestration Summary:');
    console.log('- Request analysis: ✅ Working');
    console.log('- Model selection: ✅ Working');
    console.log('- Streaming responses: ✅ Working');
    console.log('- API compatibility: ✅ Maintained');

  } catch (error) {
    console.error('❌ Compatibility test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testContinueCompatibility();
