import Conversation from '../models/Conversation.js';

export const updateLeadStatus = async (conversationId, hubspotId) => {
  try {
    const updatedConversation = await Conversation.findOneAndUpdate(
      { conversationId },
      {
        userId: hubspotId,
        leadGenerated: true
      },
      { new: true }
    );

    if (updatedConversation) {
      console.log("✅ Conversazione aggiornata con HubSpot ID:", hubspotId);
    } else {
      console.warn("⚠️ Nessuna conversazione trovata da aggiornare:", conversationId);
    }

    return updatedConversation;
  } catch (err) {
    console.error("❌ Errore aggiornando la conversazione:", err.message);
    throw err;
  }
};