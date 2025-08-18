import Conversation from '../models/Conversation.js';

 const updateLeadField = async (req, res) => {
    try {
        const { conversationId, field, value } = req.body;

        // Aggiorna il campo nella mappa leadData
        const update = { $set: {} };
        update.$set[`leadData.${field}`] = value;

        const updatedConv = await Conversation.findOneAndUpdate(
            { conversationId },
            update,
            { new: true, upsert: true } // crea la conversazione se non esiste
        );

        res.json({ success: true, updatedConv });
    } catch (err) {
        console.error('❌ Errore aggiornamento leadData:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
export default updateLeadField;