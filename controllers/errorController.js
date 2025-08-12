const errorController = (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        path: req.path,
        method: req.method,
        availableEndpoints: [
            'GET /api/config',
            'GET /api/health',
            'GET /api/status',
            'POST /api/ai/chat',
            'POST /api/ai/analyze-intent',
            'POST /api/hubspot/create-contact'
        ]
    });
}

export default errorController;