import { v4 as uuidv4 } from 'uuid';
import Conversation from '../models/Conversation.js';
import openAiConfig from '../config/openAiConfig.js';

export const chat = async (req, res) => {
  try {
    let { messages, maxTokens, temperature, conversationId } = req.body;
    // let conversationId = req.session.conversationId;

    const userId = req.session.userId || 'anonymous';

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI non configurato sul server'
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array richiesto'
      });
    }

    console.log('🤖 OpenAI Chat Request:', {
      messagesCount: messages.length,
      maxTokens: maxTokens || openAiConfig.maxTokens,
      model: openAiConfig.model
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: openAiConfig.model,
        messages,
        max_tokens: maxTokens || openAiConfig.maxTokens,
        temperature: temperature || 0.8,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API Error:', response.status, errorText);
      throw new Error(`OpenAI Chat Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.usage) {
      console.log('📊 Token Usage:', {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens
      });
    }

    if (!conversationId) {
      conversationId = uuidv4();
      // req.session.conversationId = conversationId;
    }

    await Conversation.findOneAndUpdate(
      { userId, conversationId },
      { $push: { messages: { role: 'user', content: messages[messages.length - 1].content } } },
      { upsert: true, new: true }
    );

    await Conversation.findOneAndUpdate(
      { userId, conversationId },
      { $push: { messages: { role: 'assistant', content: data.choices[0].message.content } } }
    );

    if (data.choices[0].message.content === "LEAD_GENERATION_START" || data.choices[0].message.content === "<strong>LEAD_GENERATION_END</strong>") {
      await Conversation.findOneAndUpdate(
        { userId, conversationId },
        { leadGenerated: true }
      );
    }

    res.status(200).json({
      success: true,
      conversationId,
      choices: data.choices,
      usage: data.usage || null
    });


  } catch (error) {
    console.error('❌ Errore OpenAI Chat:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }

};
