// updateChatNumbers.mjs
import mongoose from "mongoose";
import Conversation from "./models/Conversation.js"; // il tuo modello Conversation
import Counter from "./models/counter.js"; // il modello Counter

// Connessione al DB
const MONGO_URI =  // cambia con il tuo DB
await mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
console.log("Connesso a MongoDB");

// Recupero o creo il contatore
let counter = await Counter.findById("conversation");
if (!counter) {
  counter = new Counter({ _id: "conversation", seq: 0 });
  await counter.save();
}

// Recupera tutte le chat ordinate per createdAt (opzionale, così i numeri seguono l'ordine cronologico)
const chats = await Conversation.find().sort({ createdAt: 1 });

for (const chat of chats) {
  counter.seq += 1;
  chat.progressiveNumber = counter.seq;
  await chat.save();
  console.log(`Chat ${chat._id} aggiornata con numero: ${chat.progressiveNumber}`);
}

// Salva il contatore aggiornato
await counter.save();
console.log("Aggiornamento completato");

mongoose.disconnect();
