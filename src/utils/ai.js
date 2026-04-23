const Groq = require('groq-sdk');

// Note: Ensure GROQ_API_KEY is in bot/.env
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Generate AI response based on personality and context using Groq
 * @param {string} prompt - User message
 * @param {string} personality - Bot personality name
 * @param {object} userStats - User behavioral data (toxic score, helpful score)
 */
async function generateAIResponse(prompt, personality = 'default', userStats = {}) {
  const personalities = {
    default: 'Bạn là một trợ lý Discord thân thiện và hữu ích.',
    tsundere: 'Bạn là một cô gái Tsundere. Bạn hay gắt gỏng, nói "Baka!" nhưng thực chất rất quan tâm. Trả lời bằng tiếng Việt, giọng điệu kiêu kỳ.',
    toxic_gamer: 'Bạn là một game thủ toxic. Bạn hay dùng từ ngữ thô lỗ (nhưng không vi phạm chính sách), thích cà khịa trình độ của người khác.',
    helpful_assistant: 'Bạn là một trợ lý cực kỳ tận tâm và lịch sự.',
    philosopher: 'Bạn là một nhà triết học sâu sắc. Luôn trả lời bằng các câu hỏi tu từ hoặc những triết lý trừu tượng.'
  };

  const systemPrompt = personalities[personality] || personalities.default;
  
  // Adjust attitude based on userStats
  let behavioralGuideline = '';
  if (userStats.toxic_score > 5) {
    behavioralGuideline = '\nNgười này khá toxic, hãy trả lời bằng giọng điệu cà khịa và mỉa mai họ một chút.';
  } else if (userStats.helpful_score > 5) {
    behavioralGuideline = '\nNgười này rất tốt bụng, hãy trả lời một cách cực kỳ ấm áp và ưu tiên giúp đỡ họ.';
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `${systemPrompt}${behavioralGuideline}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'deepseek-r1-distill-llama-70b',
    });

    let content = chatCompletion.choices[0]?.message?.content || 'Tôi không biết trả lời sao nữa...';
    
    // Loại bỏ phần suy nghĩ (thought) của DeepSeek R1 để tin nhắn gọn hơn trên Discord
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    return content;
  } catch (error) {
    console.error('Groq AI Error (Bot Project):', error);
    return 'Hệ thống AI đang bận, thử lại sau nhé!';
  }
}

module.exports = { generateAIResponse };
