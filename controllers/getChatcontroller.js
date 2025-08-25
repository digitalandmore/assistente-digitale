import Conversation from '../models/Conversation.js';
import ArchiviedConversation from '../models/ArchiviedConversation.js';
import path from 'path';
const getChatController = async (req, res) => {
  try {
    const conversations = await Conversation.find();
    res.status(200).json({
      success: true,
      count: conversations.length,
      conversations
    });
  } catch (error) {
    console.error('Errore nel recupero delle conversazioni:', error);
    res.status(500).json({
      success: false,
      error: 'Errore server nel recupero delle conversazioni'
    });
  }
}



const getArchiviedChatController = async (req, res) => {
  try {
    const archiviedConversation = await ArchiviedConversation.find();
    res.status(200).json({
      success: true,
      count: archiviedConversation.length,
      conversations: archiviedConversation
    });
  } catch (error) {
    console.error('Errore nel recupero delle conversazioni:', error);
    res.status(500).json({
      success: false,
      error: 'Errore server nel recupero delle conversazioni'
    });
  }
}

const DeleteChatContoller = async (req, res) => {
  try {
    const { conversationId } = req.body;
    console.log('request body:', req.body);
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId mancante" });
    }

    // recupera la conversazione originale
    const conversation = await ArchiviedConversation.findOne({ conversationId });
    if (!conversation) {
      return res.status(404).json({ error: "Conversazione non trovata" });
    }
    await ArchiviedConversation.findOneAndDelete(conversationId)
  } catch (error) {
    console.error('Errore nel recupero delle conversazioni:', error);
    res.status(500).json({
      success: false,
      error: 'Errore server nel recupero delle conversazioni'
    });
  }
}


const restoreChat = async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId mancante" });
    }

    // recupera la conversazione archiviata
    const conversation = await ArchiviedConversation.findOne({ conversationId });
    if (!conversation) {
      return res.status(404).json({ error: "Conversazione non trovata" });
    }

    // crea conversazione attiva
    const restore = new Conversation({
      conversationId: conversation._id.toString(),
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
      messages: conversation.archiviedmessages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }))
    });

    await restore.save();

    // elimina conversazione archiviata
    await ArchiviedConversation.findOneAndDelete({ conversationId });

    res.json({ success: true, restored: restore });
  } catch (err) {
    console.error("Errore in restoreChat:", err);
    res.status(500).json({ error: "Errore ripristino" });
  }
};

export { getChatController, getArchiviedChatController, DeleteChatContoller, restoreChat }