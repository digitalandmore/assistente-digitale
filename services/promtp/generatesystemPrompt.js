async function loadConfiguration(nomeAssistente) {
    try {
        const response = await fetch("https://assistente-digitale.onrender.com/api/ai/getknowledge", {
            method: "POST", // perché il nome lo passiamo nel body
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nome: nomeAssistente }) // es: "Assistente Digitale"
        });

        if (!response.ok) {
            throw new Error(`Errore caricamento configurazione: ${response.status}`);
        }

        const result = await response.json();

        // Se il backend ritorna un array prendo il primo, altrimenti ritorno l’oggetto
        return Array.isArray(result) ? result[0] : result;

    } catch (err) {
        console.error("❌ loadConfiguration error:", err);
        return null; // così initAI riceve null e puoi gestirlo
    }
}

export async function generateSystemPrompt(assistenteConfig) {
    const oggi = new Date().toLocaleDateString("it-IT");

    if (!assistenteConfig || typeof assistenteConfig !== "object") {
        throw new Error("Configurazione assistente non caricata");
    }

    const {
        assistente,
        settori_sviluppati = {},
        contatti = {},
        pricing = {},
        processo_implementazione = [],
        faq = [],
    } = assistenteConfig;

    if (!assistente) {
        throw new Error("Configurazione assistente incompleta");
    }

    const systemPrompt = `
Sei l'${assistente.nome}, consulente AI professionale per PMI.

=== INFORMAZIONI AZIENDA ===
Data: ${oggi}
Nome: ${assistente.nome}
Descrizione: ${assistente.descrizione}
Sviluppatore: ${assistente.sviluppatore?.nome || "DIGITAL&MORE"} - ${assistente.sviluppatore?.specializzazione ||
        "Soluzioni digitali innovative per PMI"
        }

=== SERVIZI CON DEMO LIVE DISPONIBILI ===
${Object.entries(settori_sviluppati)
            .filter(([_, servizio]) => servizio.status === "Demo Disponibile")
            .map(
                ([_, servizio]) => `
🟢 ${servizio.nome}:
- ${servizio.descrizione}  
- Demo LIVE: ${servizio.demo_url || "N/A"}
- Funzionalità: ${servizio.funzionalita?.join(", ") || "Non specificate"
                    }
- Benefici: ${servizio.benefici?.join(", ") || "Non specificati"}`
            )
            .join("")}

=== SERVIZI IN SVILUPPO (DEMO NON DISPONIBILI) ===
${Object.entries(settori_sviluppati)
            .filter(([_, servizio]) => servizio.status === "In Sviluppo")
            .map(
                ([_, servizio]) => `
🟡 ${servizio.nome}:
- ${servizio.descrizione}
- Settori target: ${servizio.settori_target?.join(", ") || "Non specificati"
                    }
- Funzionalità: ${servizio.funzionalita?.join(", ") || "Non specificate"
                    }`
            )
            .join("")}

=== PRICING E SERVIZI ===
${pricing.policy || "Preventivo personalizzato"}
Consulenza gratuita: ${pricing.consulenza_gratuita ? "SÌ - SEMPRE GRATUITA" : "No"
        }
Trial disponibile: ${pricing.trial_disponibile || "Non specificato"}

=== PROCESSO IMPLEMENTAZIONE ===
${processo_implementazione.length > 0
            ? processo_implementazione
                .map(
                    (fase, i) =>
                        `${i + 1}. ${fase.fase}: ${fase.descrizione} (${fase.durata})`
                )
                .join("\n")
            : "Processo personalizzato basato sulle esigenze"
        }

=== FAQ COMPLETE ===
${faq.length > 0
            ? faq
                .map(
                    (item, i) => `Q${i + 1}: ${item.domanda}\nR${i + 1}: ${item.risposta}`
                )
                .join("\n\n")
            : "FAQ in aggiornamento"
        }

=== CONTATTI ===
📧 Email: ${contatti.email_commerciale || "info@assistente-digitale.it"}  
📞 Telefono: ${contatti.telefono || "+39 0983 535253"}  
💬 WhatsApp: https://wa.me/390983535253  
🌐 Sito Web: ${assistente.sito_web}  
👨‍💻 Sviluppatore: ${assistente.sviluppatore?.nome || "DIGITAL&MORE"} (${assistente.sviluppatore?.sito || "-"})  

=== LEAD GENERATION ===
STRATEGIA COMMERCIALE:
1. Fornisci SEMPRE informazioni sui NOSTRI servizi specifici
2. NON dare consigli generici su argomenti esterni
3. RIPORTA sempre la conversazione ai nostri servizi
4. CONCLUDI SEMPRE con l'invito alla consulenza sui nostri servizi

ESEMPI INVITI SPECIFICI:
- "Ti interessa una consulenza gratuita per vedere come il nostro Assistente Digitale può aiutare il tuo business?"
- "Vuoi che organizziamo una consulenza per implementare queste funzionalità sul tuo sito?"
- "Posso aiutarti con una consulenza gratuita per integrare questi sistemi nella tua azienda?"

QUANDO l'utente chiede di servizi esterni ai nostri:
RIPORTA la conversazione ai nostri servizi con esempi concreti.

SOLO quando l'utente conferma ESPLICITAMENTE l'interesse per la consulenza:
- Risposte affermative chiare dopo il tuo invito
- Conferme dirette come "Sì", "Mi interessa", "Procediamo"

ALLORA rispondi ESATTAMENTE: "LEAD_GENERATION_START"

QUANDO l'utente chiede demo:
- ALLORA rispondi esattamente DEMO_CONFIRMED
- OGNI volta che nella risposta inserisci le demo rispondi esattamente DEMO_CONFIRMED
+ NON fornire nessun altro testo oltre a DEMO_CONFIRMED
+ NON includere link, frasi aggiuntive o spiegazioni
+ Rispondi SOLO con la stringa DEMO_CONFIRMED
IMPORTANTE: NON interpretare domande o richieste di info come conferme.
Lascia che sia l'utente a confermare esplicitamente.

=== FORMATTAZIONE RISPOSTA ===
IMPORTANTE: Usa SEMPRE la formattazione HTML nelle tue risposte:
... (segue come nel template originale) ...
`;

    return systemPrompt;
}
export async function initAI(nomeAssistente) {
    try {
        // 1️⃣ Recupero configurazione dal backend
        const assistenteConfig = await loadConfiguration(nomeAssistente);

        if (!assistenteConfig) {
            throw new Error("Configurazione non trovata");
        }

        // 2️⃣ Genero il system prompt dinamico
        const systemPrompt = await generateSystemPrompt(assistenteConfig);

        // 3️⃣ Uso systemPrompt nella chiamata a OpenAI
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // o il modello che preferisci
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "Ciao, dimmi cosa puoi fare per la mia azienda" }
                ]
            })
        });

        const data = await response.json();
        console.log("💬 Risposta AI:", data.choices[0].message.content);

    } catch (err) {
        console.error("❌ Errore initAI:", err);
    }
}