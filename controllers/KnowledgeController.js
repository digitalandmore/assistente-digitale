import AssistenteDigitale from "../models/AssistenteDigitale.js";

 export const getKnowledge = async (req, res) => {
  try {
    const { nome } = req.body; // nome passato dal client

    if (!nome) {
      return res.status(400).json({ error: "Il campo 'nome' è richiesto" });
    }

    // cerca documenti dove assistente.nome = nome passato
    const knowledge = await AssistenteDigitale.find({ "assistente.nome": nome });

    if (!knowledge || knowledge.length === 0) {
      return res.status(404).json({ error: "Nessun assistente trovato con questo nome" });
    }

    res.status(200).json(knowledge);
  } catch (error) {
    console.error("Errore in getKnowledge:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

export const editContact = async (req, res) => {
  try {
    const { nome, contatti } = req.body;

    if (!nome) {
      return res.status(400).json({ error: "Il campo 'nome' è richiesto" });
    }

    if (!contatti || typeof contatti !== "object") {
      return res.status(400).json({ error: "Il campo 'contatti' è richiesto" });
    }

    const updated = await AssistenteDigitale.findOneAndUpdate(
      { "assistente.nome": nome },
      { $set: { contatti } }, 
      { new: true } 
    );

    if (!updated) {
      return res.status(404).json({ error: "Assistente non trovato" });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error("Errore in editContact:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
};

// const editCompanyData = async (req, res) =>{
//   try {
//     const {nome, dati_aziendali} = req.body;
  
//     if (!nome) {
//       return res.status(400).json({ error: "Il campo 'nome' è richiesto" });
//     }

//         if (!dati_aziendali || typeof dati_aziendali !== "object") {
//       return res.status(400).json({ error: "Il campo 'dati_aziendali' è richiesto" });
//     }
//         const updated = await AssistenteDigitale.findOneAndUpdate(
//       { "assistente.nome": nome },
//       { $set: { dati_aziendali  } }, 
//       { new: true } 
//     );
//         if (!updated) {
//       return res.status(404).json({ error: "Assistente non trovato" });
//     }

//     res.status(200).json(updated);
//   } catch (error) {
//      console.error("Errore in editContact:", error);
//     res.status(500).json({ error: "Errore interno del server" });
//   }
// }

export const editCompanyData = async (req, res) => {
  try {
    const { id, assistente } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Il campo 'id' è richiesto" });
    }

    if (!assistente || typeof assistente !== "object") {
      return res.status(400).json({ error: "Il campo 'assistente' è richiesto" });
    }

    const updated = await AssistenteDigitale.findByIdAndUpdate(
      id,
      { $set: { assistente } }, // sovrascrive tutta la sezione assistente
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Assistente non trovato" });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error("❌ Errore in editCompanyData:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
};
