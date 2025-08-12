const statusController = (req, res) => {
    res.json({
        status: 'active',
        message: 'Assistente Digitale API is running',
        backend: 'https://assistente-digitale.onrender.com',
        endpoints: {
            config: '/api/config',
            health: '/api/health',
            ai_chat: '/api/ai/chat',
            ai_intent: '/api/ai/analyze-intent',
            hubspot: '/api/hubspot/create-contact'
        }
    });
}

export default statusController;