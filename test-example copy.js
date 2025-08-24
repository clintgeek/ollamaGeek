const axios = require('axios');

// Test configuration
const API_BASE = 'http://localhost:3003';
const TEST_MODEL = 'codellama:13b-instruct-q4_K_M';

// Test functions
async function testHealth() {
  try {
    console.log('🏥 Testing health endpoint...');
    const response = await axios.get(`${API_BASE}/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testModelListing() {
  try {
    console.log('\n📋 Testing model listing...');
    const response = await axios.get(`${API_BASE}/api/tags`);
    console.log('✅ Models available:', response.data.models?.length || 0);
    response.data.models?.forEach(model => {
      console.log(`   - ${model.name} (${model.size})`);
    });
    return true;
  } catch (error) {
    console.error('❌ Model listing failed:', error.message);
    return false;
  }
}

async function testGenerate() {
  try {
    console.log('\n🚀 Testing generate endpoint...');
    const response = await axios.post(`${API_BASE}/api/generate`, {
      model: TEST_MODEL,
      prompt: 'Write a simple JavaScript function that calculates the factorial of a number.',
      stream: false
    });
    console.log('✅ Generate response received');
    console.log('📝 Response length:', response.data.response?.length || 0);
    console.log('🧠 Model used:', response.data.model);
    console.log('⏱️  Evaluation count:', response.data.eval_count);
    return true;
  } catch (error) {
    console.error('❌ Generate test failed:', error.message);
    return false;
  }
}

async function testChat() {
  try {
    console.log('\n💬 Testing chat endpoint...');
    const response = await axios.post(`${API_BASE}/api/chat`, {
      model: TEST_MODEL,
      messages: [
        {
          role: 'user',
          content: 'Explain what a REST API is in simple terms.'
        }
      ],
      stream: false
    });
    console.log('✅ Chat response received');
    console.log('📝 Response length:', response.data.message?.content?.length || 0);
    console.log('🧠 Model used:', response.data.model);
    return true;
  } catch (error) {
    console.error('❌ Chat test failed:', error.message);
    return false;
  }
}

async function testEmbeddings() {
  try {
    console.log('\n🔍 Testing embeddings endpoint...');
    const response = await axios.post(`${API_BASE}/api/embeddings`, {
      model: 'nomic-embed-text:latest',
      prompt: 'This is a test sentence for embeddings.'
    });
    console.log('✅ Embeddings response received');
    console.log('📊 Embedding dimensions:', response.data.embedding?.length || 0);
    return true;
  } catch (error) {
    console.error('❌ Embeddings test failed:', error.message);
    return false;
  }
}

async function testOrchestration() {
  try {
    console.log('\n🎭 Testing orchestration endpoint...');
    const response = await axios.post(`${API_BASE}/api/orchestrate`, {
      action: 'analyze_request',
      data: {
        prompt: 'Write a Python function to sort a list of numbers.',
        model: TEST_MODEL
      }
    });
    console.log('✅ Orchestration analysis received');
    console.log('📊 Content analysis:', response.data.contentAnalysis);
    console.log('🧠 Recommended model:', response.data.recommendedModel?.name);
    return true;
  } catch (error) {
    console.error('❌ Orchestration test failed:', error.message);
    return false;
  }
}

async function testModelSelection() {
  try {
    console.log('\n🎯 Testing intelligent model selection...');

    // Test coding task
    const codingResponse = await axios.post(`${API_BASE}/api/generate`, {
      prompt: 'Create a React component for a todo list',
      stream: false
    });
    console.log('✅ Coding task - Model used:', codingResponse.data.model);

    // Test general task
    const generalResponse = await axios.post(`${API_BASE}/api/generate`, {
      prompt: 'Explain the benefits of renewable energy sources',
      stream: false
    });
    console.log('✅ General task - Model used:', generalResponse.data.model);

    return true;
  } catch (error) {
    console.error('❌ Model selection test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 OllamaGeek API Wrapper Test Suite');
  console.log('=====================================\n');

  const tests = [
    { name: 'Health Check', fn: testHealth },
    { name: 'Model Listing', fn: testModelListing },
    { name: 'Generate Endpoint', fn: testGenerate },
    { name: 'Chat Endpoint', fn: testChat },
    { name: 'Embeddings Endpoint', fn: testEmbeddings },
    { name: 'Orchestration Endpoint', fn: testOrchestration },
    { name: 'Model Selection', fn: testModelSelection }
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) passed++;
    } catch (error) {
      console.error(`❌ ${test.name} test error:`, error.message);
    }
  }

  console.log('\n📊 Test Results');
  console.log('================');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! The API wrapper is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the logs and configuration.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testHealth,
  testModelListing,
  testGenerate,
  testChat,
  testEmbeddings,
  testOrchestration,
  testModelSelection,
  runTests
};
