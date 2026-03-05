import supabase from '../lib/supabase.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { type, message, email } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const { data, error } = await supabase
            .from('feedback')
            .insert({
                type: type || 'other',
                message: message.trim(),
                email: email?.trim() || null,
                user_agent: req.headers['user-agent'] || null,
            })
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, id: data.id });
    } catch (error) {
        console.error('Feedback error:', error);
        return res.status(500).json({ error: 'Failed to submit feedback' });
    }
}
