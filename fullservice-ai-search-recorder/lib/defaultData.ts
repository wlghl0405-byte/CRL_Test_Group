import { Exam, TimelineStage } from './types';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_EXAMS: Exam[] = [
  { exam_id: 'exam_2026_03', exam_name: '2026년 3월 학력평가', exam_type: '학력평가', exam_month: 3, year: 2026, active_yn: true },
  { exam_id: 'exam_2026_05', exam_name: '2026년 5월 학력평가', exam_type: '학력평가', exam_month: 5, year: 2026, active_yn: true },
  { exam_id: 'exam_2026_06', exam_name: '2026년 6월 모의평가', exam_type: '모의평가', exam_month: 6, year: 2026, active_yn: true },
  { exam_id: 'exam_2026_07', exam_name: '2026년 7월 학력평가', exam_type: '학력평가', exam_month: 7, year: 2026, active_yn: true },
  { exam_id: 'exam_2026_09', exam_name: '2026년 9월 모의평가', exam_type: '모의평가', exam_month: 9, year: 2026, active_yn: true },
  { exam_id: 'exam_2026_10', exam_name: '2026년 10월 학력평가', exam_type: '학력평가', exam_month: 10, year: 2026, active_yn: true },
  { exam_id: 'exam_2026_11', exam_name: '2026년 11월 수능', exam_type: '수능', exam_month: 11, year: 2026, active_yn: true },
];

export const DEFAULT_TIMELINE_STAGES = [
  '시험 종료',
  '사전 채점 오픈',
  '정답 공개',
  'AI전략팀 데이터 확보',
  '마이스 관리자 반영',
  '채점 서비스 오픈',
  '국어/수학 1차 등급컷 오픈',
  '사탐/과탐 1차 등급컷 오픈',
  '2차 등급컷 오픈',
  '메가스터디 자체 등급컷 확정',
  '성적 발표 확정',
  '라이브 설명회 진행 전',
  '라이브 설명회 종료 후',
  '다시보기 공개 전',
  '다시보기 공개 후',
];

export function createDefaultTimeline(exam_id: string): TimelineStage[] {
  return DEFAULT_TIMELINE_STAGES.map((stage_name, index) => ({
    timeline_id: uuidv4(),
    exam_id,
    stage_order: index + 1,
    stage_name,
    expected_time: '',
    actual_time: '',
    note: '',
    active_yn: true,
  }));
}
