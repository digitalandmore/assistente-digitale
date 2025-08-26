import mongoose from "mongoose";
import Conversation from "./models/Conversation.js"; // path corretto al tuo model

const MONGO_URI = "mongodb+srv://assistente-digitale:mq3qEAuzlfCxeVAP@cluster0.zkeifcp.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0"; // cambia con il tuo

const migrate = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    const conversations = await Conversation.find({ createdAt: { $exists: true } });

    for (const conv of conversations) {
      // se già ha createdAt/updatedAt di Mongoose, salta
      if (conv.updatedAt) continue;

      const oldCreated = conv.createdAt;

      // forza i nuovi campi
      conv.createdAt = oldCreated; 
      conv.updatedAt = oldCreated;

      await conv.save();
      console.log(`✔ Migrata conversation ${conv.conversationId}`);
    }

    console.log("✅ Migrazione completata");
    mongoose.disconnect();
  } catch (err) {
    console.error("❌ Errore migrazione:", err);
    mongoose.disconnect();
  }
};

migrate();
