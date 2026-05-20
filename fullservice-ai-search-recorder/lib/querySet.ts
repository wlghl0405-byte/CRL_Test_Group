import * as XLSX from 'xlsx';
import { TestQuery, QueryCategory } from './types';
import { v4 as uuidv4 } from 'uuid';

const REQUIRED_COLUMNS = ['category', 'query_text'];
const VALID_CATEGORIES: QueryCategory[] = [
  '정답', '배점', '등급컷', '정오답률', '난이도',
  '선지별 선택비율', '해설강의', '총평', '라이브 설명회',
  '다시보기', '풀서비스 경로', '예외/방어',
];

export interface ParseResult {
  queries: TestQuery[];
  errors: string[];
}

export function parseExcelBuffer(buffer: Buffer, fallbackExamId: string): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const errors: string[] = [];
  if (rows.length === 0) {
    return { queries: [], errors: ['파일에 데이터가 없습니다.'] };
  }

  const headers = Object.keys(rows[0]);
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    return { queries: [], errors: [`필수 컬럼 누락: ${missing.join(', ')}`] };
  }

  const queries: TestQuery[] = [];
  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const category = String(row['category'] || '').trim() as QueryCategory;
    if (!VALID_CATEGORIES.includes(category)) {
      errors.push(`행 ${rowNum}: category 값 "${category}"이 유효하지 않습니다.`);
    }

    const priorityRaw = String(row['priority'] || '').toLowerCase();
    const validPriority = ['high', 'medium', 'low'].includes(priorityRaw)
      ? (priorityRaw as 'high' | 'medium' | 'low')
      : 'medium';

    queries.push({
      query_id: String(row['query_id'] || '').trim() || uuidv4(),
      exam_id: String(row['exam_id'] || '').trim() || fallbackExamId,
      category,
      sub_category: String(row['sub_category'] || '').trim(),
      query_text: String(row['query_text'] || '').trim(),
      priority: validPriority,
      note: String(row['note'] || '').trim(),
    });
  });

  return { queries, errors };
}
