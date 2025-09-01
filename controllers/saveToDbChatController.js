

import { v4 as uuidv4 } from 'uuid';
import Conversation from '../models/Conversation.js';

export const saveToDbChatController = async (req, res) => {
  try {
    const {
      messages,
      conversationId: incomingConversationId,
      userId,
      nome_completo,
      email,
      telefono,
      azienda,
      qualifica,
      settore,
      sito_web,
      messaggio
    } = req.body;

    // Genera un nuovo conversationId se non fornito
    let conversationId = incomingConversationId;
    if (!conversationId) {
      conversationId = uuidv4();
    }

    // Verifica che ci siano messaggi
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Nessun messaggio fornito"
      });
    }

    // Salva solo l'ultimo messaggio
    const lastMessage = messages[messages.length - 1];

    // Prepara l'update object
    const updateObject = {
      $push: {
        messages: {
          role: lastMessage.role,
          content: lastMessage.content,
          timestamp: new Date()
        }
      },
      $set: { updatedAt: new Date() }
    };

    // Aggiungi userId se fornito
    if (userId) {
      updateObject.$set.userId = userId;
    }

    // Aggiungi username se fornito
    if (nome_completo) {
      updateObject.$set.nome_completo = nome_completo;
    }

    // Aggiungi email se fornito
    if (email) {
      updateObject.$set.email = email;
    }

    // Aggiungi telephone se fornito
    if (telefono) {
      updateObject.$set.telefono = telefono;
    }
    if (azienda) {
      updateObject.$set.azienda = azienda;
    }
    if (qualifica) {
      updateObject.$set.qualifica = qualifica;
    }
    if (settore) {
      updateObject.$set.settore = settore;
    }
    if (sito_web) {
      updateObject.$set.sito_web = sito_web;
    }
    if (messaggio) {
      updateObject.$set.messaggio = messaggio;
    }

    await Conversation.findOneAndUpdate(
      { conversationId },
      updateObject,
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      conversationId,
      message: "Messaggio e dati salvati con successo"
    });

  } catch (error) {
    console.error('❌ Errore salvataggio chat:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
//saveLead
export const setLeadGenerationTrue = async (req, res) => {
  try {
    const { conversationId } = req.body; // viene dal frontend (localStorage)

    if (!conversationId) {
      return res.status(400).json({ message: 'conversationId mancante' });
    }

    // cerca per campo conversationId (non per _id)
    const updatedConversation = await Conversation.findOneAndUpdate(
      { conversationId },              // filtro
      { leadGeneration: true },        // update
      { new: true }                    // restituisce il documento aggiornato
    );

    if (!updatedConversation) {
      return res.status(404).json({ message: 'Conversazione non trovata' });
    }

    return res.status(200).json({
      message: 'leadGeneration impostato a true',
      conversation: updatedConversation
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Errore del server', error });
  }
};
