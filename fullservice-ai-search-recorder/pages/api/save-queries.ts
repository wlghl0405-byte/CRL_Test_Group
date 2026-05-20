import type { NextApiRequest, NextApiResponse } from 'next';
import { loadQueries, saveQueries } from '../../lib/storage';
import { parseExcelBuffer } from '../../lib/querySet';
import { TestQuery } from '../../lib/types';
import { v4 as uuidv4 } from 'uuid';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const queries = loadQueries();
    return res.status(200).json({ queries });
  }

  if (req.method === 'POST') {
    const { action, query, queries: bulkQueries, fileBase64, exam_id } = req.body as {
      action: 'add' | 'update' | 'delete' | 'bulk' | 'upload';
      query?: TestQuery;
      queries?: TestQuery[];
      fileBase64?: string;
      exam_id?: string;
    };

    const current = loadQueries();

    if (action === 'add' && query) {
      query.query_id = query.query_id || uuidv4();
      current.push(query);
      saveQueries(current);
      return res.status(200).json({ success: true, queries: current });
    }

    if (action === 'update' && query) {
      const idx = current.findIndex((q) => q.query_id === query.query_id);
      if (idx === -1) return res.status(404).json({ error: '질의를 찾을 수 없음' });
      current[idx] = query;
      saveQueries(current);
      return res.status(200).json({ success: true, queries: current });
    }

    if (action === 'delete' && query) {
      const filtered = current.filter((q) => q.query_id !== query.query_id);
      saveQueries(filtered);
      return res.status(200).json({ success: true, queries: filtered });
    }

    if (action === 'bulk' && bulkQueries) {
      const merged = [...current];
      for (const q of bulkQueries) {
        const existing = merged.findIndex((m) => m.query_id === q.query_id);
        if (existing >= 0) merged[existing] = q;
        else merged.push(q);
      }
      saveQueries(merged);
      return res.status(200).json({ success: true, queries: merged });
    }

    if (action === 'upload' && fileBase64 && exam_id) {
      const buffer = Buffer.from(fileBase64, 'base64');
      const { queries: parsed, errors } = parseExcelBuffer(buffer, exam_id);
      if (errors.length > 0 && parsed.length === 0) {
        return res.status(400).json({ errors });
      }
      return res.status(200).json({ success: true, queries: parsed, errors });
    }

    return res.status(400).json({ error: '알 수 없는 action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
