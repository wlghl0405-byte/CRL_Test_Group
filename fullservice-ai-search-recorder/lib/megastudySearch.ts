import { chromium } from 'playwright';
import { TestQuery, SearchResult, ExecutionLog, SourceLink } from './types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const MEGASTUDY_URL = process.env.MEGASTUDY_AI_SEARCH_URL || 'https://www.megastudy.net/search_ai/search_main.asp';
const HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== 'false';
const SEARCH_DELAY_MS = parseInt(process.env.SEARCH_DELAY_MS || '5000');
const AI_ANSWER_TIMEOUT_MS = parseInt(process.env.AI_ANSWER_TIMEOUT_MS || '30000');
const MAX_RETRY = parseInt(process.env.MAX_RETRY_COUNT || '1');

export interface RunSearchOptions {
  exam_id: string;
  exam_name: string;
  stage_name: string;
  queries: TestQuery[];
  onProgress?: (current: number, total: number, query_text: string) => void;
}

export interface RunSearchOutput {
  results: SearchResult[];
  logs: ExecutionLog[];
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchOneQuery(
  page: import('playwright').Page,
  query: TestQuery,
  exam_id: string,
  exam_name: string,
  stage_name: string,
  execution_order: number,
  run_id: string,
): Promise<{ result: SearchResult; log: ExecutionLog }> {
  const started_at = new Date().toISOString();
  const startTime = Date.now();

  let answer_title = '';
  let answer_text = '';
  let answer_html = '';
  let source_links: SourceLink[] = [];
  let collection_status: '수집 성공' | '수집 실패' = '수집 실패';
  let error_message = '';

  try {
    // 페이지 이동
    await page.goto(MEGASTUDY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 검색창 대기 및 입력
    await page.waitForSelector('textarea#kwd2', { timeout: 15000 });
    await page.fill('textarea#kwd2', query.query_text);
    await page.keyboard.press('Enter');

    // AI모드 탭 처리
    try {
      await page.waitForSelector(
        'a[href*="ai"], button:has-text("AI모드"), li:has-text("AI모드"), a:has-text("AI모드"), [data-tab*="ai"]',
        { timeout: 5000 },
      );
      const aiTab = page.locator(
        'a:has-text("AI모드"), button:has-text("AI모드"), li:has-text("AI모드"), [data-tab*="ai"]',
      ).first();
      if (await aiTab.isVisible()) {
        await aiTab.click();
      }
    } catch {
      // AI모드 탭이 없거나 이미 활성화된 경우 계속 진행
    }

    // AI 답변 영역 대기
    let aiContainerFound = false;
    const waitConditions = [
      () => page.waitForSelector('#ai-summary-container', { timeout: AI_ANSWER_TIMEOUT_MS, state: 'visible' }),
      () => page.waitForSelector('.unified-ai-talk__result-title', { timeout: AI_ANSWER_TIMEOUT_MS, state: 'visible' }),
      () => page.waitForFunction(
        () => {
          const el = document.querySelector('.unified-ai-talk__depth-text');
          return el && (el.textContent?.trim().length ?? 0) > 0;
        },
        { timeout: AI_ANSWER_TIMEOUT_MS },
      ),
    ];

    for (const cond of waitConditions) {
      try {
        await cond();
        aiContainerFound = true;
        break;
      } catch {
        // 다음 조건 시도
      }
    }

    if (!aiContainerFound) {
      throw new Error('AI모드 답변 영역 미노출 또는 로딩 시간 초과');
    }

    // 답변 수집
    const titleEl = page.locator('#ai-summary-container .unified-ai-talk__result-title').first();
    const bodyEl = page.locator('#ai-summary-container .unified-ai-talk__depth-text').first();

    answer_title = (await titleEl.textContent({ timeout: 5000 }).catch(() => '')) || '';
    answer_text = (await bodyEl.textContent({ timeout: 5000 }).catch(() => '')) || '';
    answer_html = (await bodyEl.innerHTML({ timeout: 5000 }).catch(() => '')) || '';

    // 링크 수집
    const links = await bodyEl.locator('a').all().catch(() => []);
    for (const link of links) {
      const text = (await link.textContent().catch(() => '')) || '';
      const href = (await link.getAttribute('href').catch(() => '')) || '';
      if (href) source_links.push({ text: text.trim(), href });
    }

    answer_title = answer_title.trim();
    answer_text = answer_text.trim();
    collection_status = '수집 성공';
  } catch (err) {
    error_message = err instanceof Error ? err.message : String(err);
    collection_status = '수집 실패';
  }

  const ended_at = new Date().toISOString();
  const elapsed_seconds = Math.round((Date.now() - startTime) / 1000);
  const executed_at = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

  const result: SearchResult = {
    run_id,
    exam_id,
    exam_name,
    stage_name,
    query_id: query.query_id,
    category: query.category,
    query_text: query.query_text,
    answer_title,
    answer_text,
    answer_html,
    source_links: JSON.stringify(source_links),
    executed_at,
    collection_status,
    error_message,
    elapsed_seconds,
  };

  const log: ExecutionLog = {
    run_id,
    query_id: query.query_id,
    query_text: query.query_text,
    execution_order,
    started_at,
    ended_at,
    elapsed_seconds,
    collection_status,
    error_message,
  };

  return { result, log };
}

export async function runSearch(options: RunSearchOptions): Promise<RunSearchOutput> {
  const { exam_id, exam_name, stage_name, queries, onProgress } = options;
  const run_id = uuidv4();
  const results: SearchResult[] = [];
  const logs: ExecutionLog[] = [];
  const executedQueryIds = new Set<string>();

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];

      // 중복 실행 방지
      if (executedQueryIds.has(query.query_id)) continue;
      executedQueryIds.add(query.query_id);

      onProgress?.(i + 1, queries.length, query.query_text);

      let res: { result: SearchResult; log: ExecutionLog } | null = null;
      for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
        try {
          res = await searchOneQuery(page, query, exam_id, exam_name, stage_name, i + 1, run_id);
          if (res.result.collection_status === '수집 성공') break;
          if (attempt < MAX_RETRY) {
            await delay(3000);
          }
        } catch {
          if (attempt === MAX_RETRY) {
            const now = new Date().toISOString();
            res = {
              result: {
                run_id,
                exam_id,
                exam_name,
                stage_name,
                query_id: query.query_id,
                category: query.category,
                query_text: query.query_text,
                answer_title: '',
                answer_text: '',
                answer_html: '',
                source_links: '[]',
                executed_at: now,
                collection_status: '수집 실패',
                error_message: '예상치 못한 오류 발생',
                elapsed_seconds: 0,
              },
              log: {
                run_id,
                query_id: query.query_id,
                query_text: query.query_text,
                execution_order: i + 1,
                started_at: now,
                ended_at: now,
                elapsed_seconds: 0,
                collection_status: '수집 실패',
                error_message: '예상치 못한 오류 발생',
              },
            };
          }
        }
      }

      if (res) {
        results.push(res.result);
        logs.push(res.log);
      }

      if (i < queries.length - 1) {
        const jitter = Math.floor(Math.random() * 5000);
        await delay(SEARCH_DELAY_MS + jitter);
      }
    }
  } finally {
    await browser.close();
  }

  return { results, logs };
}
