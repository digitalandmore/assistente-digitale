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
        const { message, conversationHistory } = req.body;
        
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ 
                success: false, 
                error: 'OpenAI non configurato sul server' 
            });
        }
        
        const intentPrompt = `
Analizza il messaggio utente ed estrai intento, azione consigliata e severità (se sintomi).

MESSAGGIO: "${message}"

CONTESTO (ultimi messaggi):
${conversationHistory ? conversationHistory.map(msg => `${msg.sender}: ${msg.content}`).join('\n') : 'Nessun contesto'}

CATEGORIE:
- patient_status_yes / patient_status_no
- new_appointment
- manage_appointment
- checkup_request
- question_doctor
- info_general
- symptoms (se il testo parla di dolore/sintomi)
- none

AZIONI (coerenti con il client):
"ASK_PATIENT_STATUS" | "OFFER_CHECKUP" | "GENERATED_PATIENT" | "SEARCH_CURRENT_PATIENT" |
"NEW_APPOINTMENT" | "MANAGE_APPOINTMENT" | "QUESTION_DOCTOR" | "SYMPTOM_FOLLOWUP" |
"INFO" | "NONE"

TRIAGE SINTOMI (se presenti): classifica severity da 1 a 5:
- 1: lieve (sensibilità saltuaria, lieve fastidio)
- 2: lieve fastidioso (ipersensibilità, dolore <3/10, senza gonfiore)
- 3: moderato (dolore 4-6/10 o notturno, senza segni sistemici)
- 4: grave (dolore 7-8/10 continuo, gonfiore localizzato, sanguinamento non massivo, dente fratturato)
- 5: molto grave/urgente (ascesso esteso, gonfiore che altera il viso, febbre + dolore, trauma con perdita dente, sanguinamento persistente)

RISPONDI SOLO JSON:
{
  "category": "…",
  "action": "…",
  "severity": 1|2|3|4|5|null,
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
export {analizeIntent, analizeDentalIntent};


