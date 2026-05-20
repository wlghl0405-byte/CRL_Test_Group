import type { NextApiRequest, NextApiResponse } from 'next';
import { loadResults, saveResults } from '../../lib/storage';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ results: loadResults() });
  }

  if (req.method === 'POST') {
    const { action, ids } = req.body as {
      action: 'delete_selected' | 'delete_all';
      ids?: Array<{ run_id: string; query_id: string }>;
    };

    const all = loadResults();

    if (action === 'delete_all') {
      saveResults([]);
      return res.status(200).json({ results: [] });
    }

    if (action === 'delete_selected' && ids?.length) {
      const keySet = new Set(ids.map((id) => `${id.run_id}|${id.query_id}`));
      const remaining = all.filter((r) => !keySet.has(`${r.run_id}|${r.query_id}`));
      saveResults(remaining);
      return res.status(200).json({ results: remaining });
    }

    return res.status(400).json({ error: '잘못된 요청' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
