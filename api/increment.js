import supabase from '../lib/supabase.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // Try to increment existing row
        const { data: existing } = await supabase
            .from('analytics')
            .select('total_edits')
            .eq('id', 1)
            .single();

        if (existing) {
            const newCount = existing.total_edits + 1;
            const { data, error } = await supabase
                .from('analytics')
                .update({ total_edits: newCount })
                .eq('id', 1)
                .select()
                .single();

            if (error) throw error;
            return res.status(200).json({ totalEdits: data.total_edits });
        } else {
            // Create first row
            const { data, error } = await supabase
                .from('analytics')
                .insert({ id: 1, total_edits: 1 })
                .select()
                .single();

            if (error) throw error;
            return res.status(200).json({ totalEdits: data.total_edits });
        }
    } catch (error) {
        console.error('Increment error:', error);
        return res.status(500).json({ error: 'Failed to increment counter' });
    }
}
