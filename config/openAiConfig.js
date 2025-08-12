/* ==================== CONFIGURAZIONE ==================== */
// OpenAI configuration
import dotenv from 'dotenv';
dotenv.config();
const openAiConfig = {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    maxTokens: 1200
};
export default openAiConfig;