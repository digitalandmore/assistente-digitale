import { v4 as uuidv4 } from 'uuid';
import Conversation from '../models/Conversation.js';
import openAiConfig from '../config/openAiConfig.js';
import ArchivedConversation from '../models/ArchiviedConversation.js';
import Counter from '../models/counter.js'
async function getNextSeq(name) {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true } // crea il counter se non esiste
  );
  return counter.seq;
}
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
    }

    let chatDoc = await Conversation.findOne({ userId, conversationId });

    if (!chatDoc) {
      const seq = await getNextSeq('conversation');
      chatDoc = new Conversation({
        conversationId,
        userId,
        progressiveNumber: seq,
        messages: [],
        nome_completo: req.body.nome_completo || '',
        source: "web"
      });
      await chatDoc.save();
    }

    // aggiungi i messaggi in modo atomico per evitare problemi di concorrenza
    await Conversation.findByIdAndUpdate(
      chatDoc._id,
      {
        $push: {
          messages: [
            { role: 'user', content: messages[messages.length - 1].content },
            { role: 'assistant', content: data.choices[0].message.content }
          ]
        }
      },
      { new: true }
    );



    res.status(200).json({
      success: true,
      conversationId,
      choices: data.choices,
      usage: data.usage || null
    });
    return data;
  } catch (error) {
    console.error('❌ Errore OpenAI Chat:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }

};


export const archiveChat = async (req, res) => {
  try {
    const { conversationId } = req.body;
    console.log('request body:', req.body);
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId mancante" });
    }

    // recupera la conversazione originale
    const conversation = await Conversation.findOne({ conversationId });
    if (!conversation) {
      return res.status(404).json({ error: "Conversazione non trovata" });
    }

    // crea archivio
    const archived = new ArchivedConversation({
      conversationId: conversation.conversationId,
      userId: conversation.userId,
      nome_completo: conversation.nome_completo,
      email: conversation.email,
      telefono: conversation.telefono,
      azienda: conversation.azienda,
      qualifica: conversation.qualifica,
      settore: conversation.settore,
      sito_web: conversation.sito_web,
      messaggio: conversation.messaggio,
      leadGenerated: conversation.leadGenerated,
      sourcedLeads: conversation.sourcedLeads,
      progressiveNumber: conversation.progressiveNumber,
      archiviedmessages: conversation.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }))
    });

    await archived.save();

    // elimina conversazione originale
    await Conversation.findOneAndDelete({ conversationId });

    res.json({ success: true, archived });
  } catch (err) {
    console.error("Errore in archiveChat:", err);
    res.status(500).json({ error: "Errore archiviazione" });
  }
};


export const markAsVisualized = async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId mancante" });
    }

    const conversationMark = await Conversation.findOneAndUpdate(
      { conversationId },
      { visualized: true },
      { new: true }
    );

    if (!conversationMark) {
      return res.status(404).json({ error: "Conversazione non trovata" });
    }

    res.json({ success: true, conversationMark });
  } catch (err) {
    console.error("Errore in markAsVisualized:", err);
    res.status(500).json({ error: "Errore aggiornamento conversazione" });
  }
}

export const deleteChat = async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId mancante" });
    }
    const deletedConversation = await Conversation.findOneAndDelete(
      { conversationId })
    if (!deletedConversation) {
      return res.status(404).json({ error: "Conversazione non trovata" });
    }
    res.json({ success: true, deletedConversation });
  } catch (error) {
    console.error("Errore in markAsVisualized:", error);
    res.status(500).json({ error: "Errore eliminazione conversazione" });
  }
}


// Funzione helper per salvare messaggi in MongoDB
export async function saveMessages(from, userMessage, assistantMessage) {
  try {
    // Trova o crea la conversazione
    let chatDoc = await Conversation.findOne({ userId: from });

    if (!chatDoc) {
      chatDoc = new Conversation({
        conversationId: from,
        userId: from,
        progressiveNumber: await getNextSeq('conversation'),
        messages: [],
        nome_completo: '',
        source: "whatsapp"
      });
      await chatDoc.save();
    }

    // Aggiungi messaggi
    await Conversation.findByIdAndUpdate(
      chatDoc._id,
      {
        $push: {
          messages: [
            { role: 'user', content: userMessage },
            { role: 'assistant', content: assistantMessage }
          ]
        }
      },
      { new: true }
    );

    return chatDoc.conversationId;
  } catch (err) {
    console.error("Errore salvataggio messaggi:", err);
    throw err;
  }
}
// export async function saveMessagesFb(from, userMessage, assistantMessage) {
//   try {
//     // Trova o crea la conversazione
//     let chatDoc = await Conversation.findOne({ userId: from });

//     if (!chatDoc) {
//       chatDoc = new Conversation({
//         conversationId: from,
//         userId: from,
//         progressiveNumber: await getNextSeq('conversation'),
//         messages: [],
//         nome_completo: '',
//         source: "facebook"
//       });
//       await chatDoc.save();
//     }

//     // Aggiungi messaggi
//     await Conversation.findByIdAndUpdate(
//       chatDoc._id,
//       {
//         $push: {
//           messages: [
//             { role: 'user', content: userMessage },
//             { role: 'assistant', content: assistantMessage }
//           ]
//         }
//       },
//       { new: true }
//     );

//     return chatDoc.conversationId;
//   } catch (err) {
//     console.error("Errore salvataggio messaggi:", err);
//     throw err;
//   }
// }

export async function saveMessagesFb(from, userMessage, assistantMessage) {
  try {
    // Trova la conversazione e, se non esiste, creala
    const chatDoc = await Conversation.findOneAndUpdate(
      { conversationId: from }, // ricerca per conversationId
      {
        $setOnInsert: { // campi iniziali se la conversazione non esiste
          userId: from,
          progressiveNumber: await getNextSeq('conversation'),
          messages: [],
          nome_completo: '',
          source: "facebook"
        },
        $push: {
          messages: [
            { role: 'user', content: userMessage },
            { role: 'assistant', content: assistantMessage }
          ]
        }
      },
      { new: true, upsert: true } // upsert = crea se non esiste
    );

    return chatDoc.conversationId;
  } catch (err) {
    console.error("Errore salvataggio messaggi:", err);
    throw err;
  }
}
