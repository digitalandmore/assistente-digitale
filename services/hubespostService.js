import openAiConfig from '../config/openAiConfig.js';
let hubspotPropertiesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minuti

// Funzione per ottenere proprietà HubSpot
export async function getHubSpotProperties() {
    try {
        const now = Date.now();
        if (hubspotPropertiesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
            console.log('📋 Usando cache proprietà HubSpot');
            return hubspotPropertiesCache;
        }
        
        const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
        if (!HUBSPOT_API_KEY) {
            throw new Error('HubSpot API Key non disponibile');
        }

        console.log('🔄 Caricamento proprietà HubSpot da API...');
        
        const response = await fetch('https://api.hubapi.com/crm/v3/properties/contacts', {
            headers: {
                'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HubSpot Properties API Error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Filtra solo proprietà scrivibili
        const writableProperties = result.results.filter(prop => 
            !prop.readOnlyValue && 
            prop.modificationMetadata?.readOnlyValue !== true
        );
        
        hubspotPropertiesCache = writableProperties;
        cacheTimestamp = now;
        
        console.log(`✅ Caricate ${writableProperties.length} proprietà HubSpot scrivibili`);
        return writableProperties;
        
    } catch (error) {
        console.error('❌ Errore caricamento proprietà HubSpot:', error.message);
        return [];
    }
}

// AI Property Mapper - Mappa dati a proprietà HubSpot con AI
 async function mapPropertiesWithAI(inputData, availableProperties) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API Key non disponibile per mapping');
        }
        
        // Prepara lista proprietà per AI
        const propertyList = availableProperties.map(prop => ({
            name: prop.name,
            label: prop.label,
            type: prop.type,
            description: prop.description || ''
        }));
        
        const aiPrompt = `
Devi mappare i dati di un lead da chat a proprietà HubSpot esistenti.

DATI INPUT:
${JSON.stringify(inputData, null, 2)}

PROPRIETÀ HUBSPOT DISPONIBILI (SOLO SCRIVIBILI):
${JSON.stringify(propertyList.slice(0, 50), null, 2)}

REGOLE MAPPING AGGIORNATE:
1. Mappa SOLO a proprietà esistenti nell'elenco sopra
2. Se una proprietà non esiste, NON includerla 
3. Usa nomi esatti delle proprietà (case-sensitive)
4. Per nome completo, splitta in firstname/lastname
5. Per campi custom, cerca proprietà simili o usa "message"

MAPPING SPECIFICO PER HUBSPOT:
- nome_completo → firstname, lastname 
- email → email
- telefono → phone  
- azienda → company
- sito_web → website
- qualifica → jobtitle
- settore → industry
- messaggio → message

ATTENZIONE CAMPI CON VALORI FISSI:
- lead_source → NON mappare a hs_analytics_source (usa OTHER_CAMPAIGNS se necessario)
- hs_analytics_source → usa solo: ORGANIC_SEARCH, PAID_SEARCH, EMAIL_MARKETING, SOCIAL_MEDIA, REFERRALS, OTHER_CAMPAIGNS, DIRECT_TRAFFIC, OFFLINE, PAID_SOCIAL
- hs_lead_status → usa solo: NEW, OPEN, IN_PROGRESS, OPEN_DEAL, UNQUALIFIED, ATTEMPTED_TO_CONTACT, CONNECTED, BAD_TIMING

NON includere mai:
- Valori custom per campi enum di HubSpot
- Proprietà che non esistono nella lista disponibile
- lead_source_detail, user_agent o altri metadati

Restituisci SOLO un JSON valido con il mapping, senza spiegazioni:

{
  "firstname": "Mario",
  "lastname": "Rossi",
  "email": "mario@example.com",
  "company": "Azienda Srl",
  "phone": "+39123456789",
  "website": "example.com",
  "jobtitle": "Manager",
  "industry": "Tecnologia",
  "message": "Messaggio del lead",
  "hs_analytics_source": "OTHER_CAMPAIGNS",
  "hs_lead_status": "NEW"
}
`;

        console.log('🤖 Chiamata AI per mapping proprietà HubSpot');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: openAiConfig.model,
                messages: [{ role: 'user', content: aiPrompt }],
                max_tokens: 500,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const aiResult = data.choices[0].message.content.trim();
        aiResult = aiResult.replace(/```json\s*|```/g, '');
        // Parse JSON response
        let mappedProperties;
        try {
            mappedProperties = JSON.parse(aiResult);
            console.log('🤖 AI Property Mapping completato:', Object.keys(mappedProperties));
        } catch (parseError) {
            console.log('⚠️ AI response non JSON, uso fallback');
            throw new Error('AI mapping failed: ' + aiResult);
        }
        
        return mappedProperties;
        
    } catch (error) {
        console.error('❌ Errore AI Property Mapping:', error.message);
        // Fallback con mapping manuale
        return mapPropertiesFallback(inputData);
    }
}
export {  mapPropertiesWithAI };
// Fallback mapping senza AI
export function mapPropertiesFallback(inputData) {
    const [firstName, ...lastNameArray] = (inputData.nome_completo || '').split(' ');
    
    return {
        firstname: firstName || '',
        lastname: lastNameArray.join(' ') || '',
        email: inputData.email || '',
        company: inputData.azienda || '',
        phone: inputData.telefono || '',
        website: inputData.sito_web || '',
        jobtitle: inputData.qualifica || '',
        industry: inputData.settore || '',
        message: inputData.messaggio || '',
        hs_lead_status: 'NEW',
        lifecyclestage: 'lead'
    };
}
