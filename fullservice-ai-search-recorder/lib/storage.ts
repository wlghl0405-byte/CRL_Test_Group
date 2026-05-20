import fs from 'fs';
import path from 'path';
import { TimelineStage, TestQuery, SearchResult, ExecutionLog } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'saved');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filename: string, fallback: T): T {
  ensureDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(filename: string, data: unknown) {
  ensureDir();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Timeline
export function loadTimelines(): Record<string, TimelineStage[]> {
  return readJSON<Record<string, TimelineStage[]>>('exam_timelines.json', {});
}

export function saveTimelines(data: Record<string, TimelineStage[]>) {
  writeJSON('exam_timelines.json', data);
}

// Queries
export function loadQueries(): TestQuery[] {
  return readJSON<TestQuery[]>('test_queries.json', []);
}

export function saveQueries(data: TestQuery[]) {
  writeJSON('test_queries.json', data);
}

// Results
export function loadResults(): SearchResult[] {
  return readJSON<SearchResult[]>('search_results.json', []);
}

export function saveResults(data: SearchResult[]) {
  writeJSON('search_results.json', data);
}

// Logs
export function loadLogs(): ExecutionLog[] {
  return readJSON<ExecutionLog[]>('execution_logs.json', []);
}

export function saveLogs(data: ExecutionLog[]) {
  writeJSON('execution_logs.json', data);
}
