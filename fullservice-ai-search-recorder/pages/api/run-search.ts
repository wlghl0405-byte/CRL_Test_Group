import type { NextApiRequest, NextApiResponse } from 'next';
import { runSearch } from '../../lib/megastudySearch';
import { loadResults, saveResults, loadLogs, saveLogs } from '../../lib/storage';
import { TestQuery } from '../../lib/types';

export const config = { api: { bodyParser: { sizeLimit: '5mb' }, responseLimit: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { exam_id, exam_name, stage_name, queries } = req.body as {
    exam_id: string;
    exam_name: string;
    stage_name: string;
    queries: TestQuery[];
  };

  if (!exam_id || !exam_name || !stage_name || !queries?.length) {
    return res.status(400).json({ error: '필수 파라미터 누락 (exam_id, exam_name, stage_name, queries)' });
  }

  try {
    const { results, logs } = await runSearch({
      exam_id,
      exam_name,
      stage_name,
      queries,
    });

    const existingResults = loadResults();
    saveResults([...existingResults, ...results]);

    const existingLogs = loadLogs();
    saveLogs([...existingLogs, ...logs]);

    return res.status(200).json({ success: true, results, logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
