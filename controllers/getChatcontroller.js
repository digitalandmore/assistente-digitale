import Conversation from '../models/Conversation.js';
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

export default getChatController;