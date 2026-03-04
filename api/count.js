import supabase from '../lib/supabase.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { data, error } = await supabase
            .from('analytics')
            .select('total_edits')
            .eq('id', 1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        return res.status(200).json({ totalEdits: data?.total_edits ?? 0 });
    } catch (error) {
        console.error('Count fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch count' });
    }
}
