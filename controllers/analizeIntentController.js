import openAiConfig from "../config/openAiConfig.js";
const analizeIntent = async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;
        
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ 
                success: false, 
                error: 'OpenAI non configurato sul server' 
            });
        }
        
        const intentPrompt = `
Analizza questo messaggio e determina l'intento dell'utente:

MESSAGGIO: "${message}"

CONTESTO CONVERSAZIONE (ultimi messaggi):
${conversationHistory ? conversationHistory.map(msg => `${msg.sender}: ${msg.content}`).join('\n') : 'Nessun contesto'}

POSSIBILI INTENTI:
1. consultation_request - Vuole consulenza/preventivo/informazioni commerciali
2. general_info - Chiede informazioni sui servizi
3. demo_request - Vuole vedere demo
4. pricing_info - Chiede costi/prezzi
5. technical_info - Domande tecniche
6. sector_specific - Domande su settori specifici

PAROLE CHIAVE CONSULENZA: "preventivo", "consulenza", "interessato", "richiedo", "vorrei", "contatto", "chiamata"

Restituisci SOLO un JSON:
{
  "category": "consultation_request|general_info|demo_request|pricing_info|technical_info|sector_specific",
  "intent": "descrizione_breve",
  "wantsConsultation": true/false,
  "confidence": 0.0-1.0
}
`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: openAiConfig.model,
                messages: [{ role: 'user', content: intentPrompt }],
                max_tokens: 200,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI Intent Analysis Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const intentResult = data.choices[0].message.content.trim();
        
        try {
            const intent = JSON.parse(intentResult);
            res.status(200).json({
                success: true,
                intent: intent
            });
        } catch (parseError) {
            // Fallback intent se parsing JSON fallisce
            res.status(200).json({
                success: true,
                intent: {
                    category: 'general_info',
                    intent: 'general_question',
                    wantsConsultation: false,
                    confidence: 0.5
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Errore Intent Analysis:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            intent: {
                category: 'general_info',
                intent: 'fallback',
                wantsConsultation: false,
                confidence: 0.0
            }
        });
    }
}

const analizeDentalIntent = async (req, res) => {
   try {
    const { message, conversationHistory = [], context = {} } = req.body || {};
    if (!process.env.OPENAI_API_KEY && !openAiConfig?.apiKey) {
      return res.status(500).json({ success: false, error: "OpenAI non configurato sul server" });
    }

    // TRIAGE canonical list (usata come riferimento: l’AI sceglie una domanda per volta)
    const TRIAGE_QUESTIONS = [
      "Da quando è iniziato il problema?",
      "Intensità del dolore da 0 a 10?",
      "Gonfiore, febbre o alito/sapore cattivo?",
      "Trauma recente, dente rotto o sanguinamento persistente?",
      "Quale dente/arcata e cosa lo scatena (caldo/freddo/masticazione)?"
    ];

    // Stato triage (se presente) passato dal client
    const triageCtx = context?.triage || { active: false, step: 0, answers: {}, source: null };

    // Prompt: chiediamo SOLO JSON, includendo schema e constraints
    const system = `
Sei un classificatore per uno studio dentistico. Rispondi **solo** in JSON (nessun testo extra).
Se il messaggio contiene sintomi, attiva un triage a **una domanda per volta** usando l'elenco domande fornito.
Non ripetere tutte le domande insieme. Se il triage è in corso, fornisci **solo la prossima domanda**.
Severità (1-5) secondo la scala fornita. "urgent" è true se severity >= 4.
`;

    const user = `
Analizza il messaggio e restituisci:
- category (tra: patient_status_yes, patient_status_no, new_appointment, manage_appointment, checkup_request, question_doctor, info_general, symptoms, none)
- action (tra: "ASK_PATIENT_STATUS","OFFER_CHECKUP","GENERATED_PATIENT","SEARCH_CURRENT_PATIENT","NEW_APPOINTMENT","MANAGE_APPOINTMENT","QUESTION_DOCTOR","SYMPTOM_FOLLOWUP","INFO","NONE")
- severity: 1|2|3|4|5|null (solo se sintomi)
- confidence: 0.0-1.0
- urgent: boolean (true se severity >= 4)
- triage: oggetto con:
  - needed: true/false
  - question: string (la *prossima* domanda da porre, UNA SOLA)
  - next_index: numero indice della domanda (0..${TRIAGE_QUESTIONS.length - 1})
  - done: true/false (true quando hai raccolto abbastanza info e non servono altre domande)

LINEE GUIDA TRIAGE:
- Domande canoniche (ordine):
  0) ${TRIAGE_QUESTIONS[0]}
  1) ${TRIAGE_QUESTIONS[1]}
  2) ${TRIAGE_QUESTIONS[2]}
  3) ${TRIAGE_QUESTIONS[3]}
  4) ${TRIAGE_QUESTIONS[4]}
- Se triage attivo, proponi esattamente la *domanda successiva* (next_index = step corrente).
- Se hai già abbastanza informazioni cliniche, imposta done=true e non proporre altre domande.

SCALA SEVERITÀ:
1: lieve (sensibilità saltuaria, lieve fastidio)
2: lieve fastidioso (ipersensibilità, dolore <3/10, senza gonfiore)
3: moderato (dolore 4-6/10 o notturno, senza segni sistemici)
4: grave (dolore 7-8/10 continuo, gonfiore localizzato, sanguinamento non massivo, dente fratturato)
5: molto grave/urgente (ascesso esteso, gonfiore che altera il viso, febbre + dolore, trauma con perdita dente, sanguinamento persistente)

CONTESTO:
- leadGenActive: ${Boolean(context?.leadGenActive)}
- isCurrentPatient: ${Boolean(context?.isCurrentPatient)}
- triage.active: ${Boolean(triageCtx.active)}
- triage.step: ${Number(triageCtx.step) || 0}
- triage.answers (parziale): ${JSON.stringify(triageCtx.answers || {}).slice(0, 200)}

MESSAGGIO UTENTE:
"${String(message || "").slice(0, 1000)}"

STORIA (ultimi messaggi, max 3):
${conversationHistory.map(m => `${m.sender}: ${m.content}`).join("\n").slice(0, 800)}

RISPOSTA SOLO JSON con questo schema ESATTO:
{
  "category": "patient_status_yes|patient_status_no|new_appointment|manage_appointment|checkup_request|question_doctor|info_general|symptoms|none",
  "action": "ASK_PATIENT_STATUS|OFFER_CHECKUP|GENERATED_PATIENT|SEARCH_CURRENT_PATIENT|NEW_APPOINTMENT|MANAGE_APPOINTMENT|QUESTION_DOCTOR|SYMPTOM_FOLLOWUP|INFO|NONE",
  "severity": 1|2|3|4|5|null,
  "confidence": 0.0-1.0,
  "urgent": true|false,
  "triage": {
    "needed": true|false,
    "question": "string|empty if not needed or done",
    "next_index": 0|1|2|3|4|0,
    "done": true|false
  }
}
`;

    // Helper per robust parsing
    const safeParse = (txt) => {
      if (!txt) return null;
      let s = String(txt).trim();
      // rimuovi backticks/fences
      s = s.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
      try { return JSON.parse(s); } catch { return null; }
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiConfig.apiKey || process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: openAiConfig.model, // es: "gpt-4o-mini" / "gpt-4.1-mini"
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        // Se il tuo modello supporta JSON mode: aggiungi response_format
        // response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 400
      })
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`OpenAI Intent Analysis Error: ${resp.status} - ${t}`);
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    let intent = safeParse(raw);

    // Retry soft: prova a cercare la prima graffa per recuperare JSON embedded
    if (!intent) {
      const first = raw.indexOf("{");
      const last = raw.lastIndexOf("}");
      if (first !== -1 && last !== -1 && last > first) {
        intent = safeParse(raw.slice(first, last + 1));
      }
    }

    // Default robusti se ancora fallisce
    if (!intent) {
      intent = {
        category: "none",
        action: "ASK_PATIENT_STATUS",
        severity: null,
        confidence: 0.5,
        urgent: false,
        triage: { needed: false, question: "", next_index: 0, done: false }
      };
    }

    // Normalizzazione campi & derive urgent
    const sev = (typeof intent.severity === "number") ? intent.severity : null;
    intent.urgent = Boolean(sev && sev >= 4);
    if (!intent.triage) {
      intent.triage = { needed: false, question: "", next_index: 0, done: false };
    } else {
      // vincoli next_index in range
      if (typeof intent.triage.next_index !== "number" || intent.triage.next_index < 0 || intent.triage.next_index > (TRIAGE_QUESTIONS.length - 1)) {
        intent.triage.next_index = Math.min(Math.max(Number(triageCtx.step) || 0, 0), TRIAGE_QUESTIONS.length - 1);
      }
      if (intent.triage.needed && !intent.triage.done && !intent.triage.question) {
        // se manca la domanda, fornisci fallback coerente
        intent.triage.question = TRIAGE_QUESTIONS[intent.triage.next_index];
      }
    }

    // Risposta OK
    return res.status(200).json({ success: true, intent });

  } catch (error) {
    console.error("❌ Errore Intent Analysis:", error?.message || error);
    // Fallback minimo
    return res.status(500).json({
      success: false,
      error: error?.message || "Intent backend error",
      intent: {
        category: "none",
        action: "ASK_PATIENT_STATUS",
        severity: null,
        confidence: 0.0,
        urgent: false,
        triage: { needed: false, question: "", next_index: 0, done: false }
      }
    });
  }
}
export {analizeIntent, analizeDentalIntent};


