export interface Exam {
  exam_id: string;
  exam_name: string;
  exam_type: '학력평가' | '모의평가' | '수능';
  exam_month: number;
  year: number;
  active_yn: boolean;
}

export interface TimelineStage {
  timeline_id: string;
  exam_id: string;
  stage_order: number;
  stage_name: string;
  expected_time: string;
  actual_time: string;
  note: string;
  active_yn: boolean;
}

export interface TestQuery {
  query_id: string;
  exam_id: string;
  category: QueryCategory;
  sub_category: string;
  query_text: string;
  priority: 'high' | 'medium' | 'low';
  note: string;
  target_stage?: string;
  poc_yn?: boolean;
}

export type QueryCategory =
  | '정답'
  | '배점'
  | '등급컷'
  | '정오답률'
  | '난이도'
  | '선지별 선택비율'
  | '해설강의'
  | '총평'
  | '라이브 설명회'
  | '다시보기'
  | '풀서비스 경로'
  | '예외/방어';

export interface SourceLink {
  text: string;
  href: string;
}

export interface SearchResult {
  run_id: string;
  exam_id: string;
  exam_name: string;
  stage_name: string;
  query_id: string;
  category: string;
  query_text: string;
  answer_title: string;
  answer_text: string;
  answer_html: string;
  source_links: string;
  executed_at: string;
  collection_status: '수집 성공' | '수집 실패';
  error_message: string;
  elapsed_seconds: number;
}

export interface ExecutionLog {
  run_id: string;
  query_id: string;
  query_text: string;
  execution_order: number;
  started_at: string;
  ended_at: string;
  elapsed_seconds: number;
  collection_status: '수집 성공' | '수집 실패';
  error_message: string;
}

export interface SearchRunRequest {
  exam_id: string;
  exam_name: string;
  stage_name: string;
  queries: TestQuery[];
}

export interface SearchRunResponse {
  success: boolean;
  results: SearchResult[];
  logs: ExecutionLog[];
  error?: string;
}

export interface SavedData {
  exam_timelines: Record<string, TimelineStage[]>;
  test_queries: TestQuery[];
  search_results: SearchResult[];
  execution_logs: ExecutionLog[];
}
