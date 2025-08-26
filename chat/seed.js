// seed.js
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AssistenteDigitale from "../models/AssistenteDigitale.js"; // importa lo schema che ti ho fatto prima

// setup __dirname per ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// connessione a MongoDB
const MONGO_URI =  // cambia se serve
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => {
  console.log("✅ Connessione a MongoDB stabilita");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Errore di connessione a MongoDB:", err);
});

// leggi il file JSON (quello che mi hai passato)
const jsonPath = path.join(__dirname, "assistente-digitale.json"); // salva il tuo JSON in questo file
const rawData = fs.readFileSync(jsonPath);
const jsonData = JSON.parse(rawData);

async function seedDatabase() {
  try {
    // elimina eventuali documenti vecchi
    await AssistenteDigitale.deleteMany({});
    console.log("🗑️ Collezione pulita");

    // inserisci i dati del file json
    const doc = new AssistenteDigitale(jsonData);
    await doc.save();

    console.log("🎉 Dati inseriti con successo!");
    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Errore durante il popolamento:", error);
    mongoose.connection.close();
  }
}

seedDatabase();
