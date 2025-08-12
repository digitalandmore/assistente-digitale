// services/chatService.js
import Conversation, { findOne } from '../models/Conversation';
import { v4 as uuidv4 } from 'uuid';

async function saveChat(userId, conversationId, userMessage, assistantMessage) {
    try {
        let conv = conversationId
            ? await findOne({ conversationId })
            : null;

        if (!conv) {
            conv = new Conversation({
                userId: userId || 'guest',
                conversationId: conversationId || uuidv4(),
                messages: []
            });
        }

        conv.messages.push({ role: "user", content: userMessage });
        conv.messages.push({ role: "assistant", content: assistantMessage });
        await conv.save();

        return conv.conversationId;
    } catch (err) {
        console.error("❌ Errore salvataggio chat:", err);
        return null;
    }
}

export default { saveChat };

