const IntentRecognizer = require('./src/services/intentRecognizer');
const ApproachMapper = require('./src/services/approachMapper');

async function testIntentRecognition() {
  const intentRecognizer = new IntentRecognizer();
  const approachMapper = new ApproachMapper();

  const testPrompts = [
    "what is 2 + 2?",
    "hello there",
    "create a file called test.txt",
    "create a hello world node app in a nodeGeek directory",
    "calculate the value of 15 * 3 and put it in result.txt"
  ];

  for (const prompt of testPrompts) {
    console.log(`\n🧠 Testing: "${prompt}"`);
    console.log('─'.repeat(50));

    try {
      // Recognize intent
      const intentResult = await intentRecognizer.recognizeIntent(prompt);
      console.log('🎯 Intent Result:', intentResult);

      // Map to approach
      const mappedApproach = approachMapper.mapIntentToApproach(intentResult);
      console.log('🗺️ Mapped Approach:', mappedApproach);

      // Generate response
      const response = approachMapper.generateResponse(prompt, intentResult, mappedApproach);
      console.log('📤 Response:', response);

    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

testIntentRecognition().catch(console.error);
