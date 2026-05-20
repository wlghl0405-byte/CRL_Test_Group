import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import ExamSelector from '../components/ExamSelector';
import TimelineEditor from '../components/TimelineEditor';
import QuerySetManager from '../components/QuerySetManager';
import SearchRunner from '../components/SearchRunner';
import ResultTable from '../components/ResultTable';
import { Exam, TestQuery, SearchResult, ExecutionLog } from '../lib/types';

export default function Home() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedStage, setSelectedStage] = useState('');
  const [queries, setQueries] = useState<TestQuery[]>([]);
  const [selectedQueryIds, setSelectedQueryIds] = useState<Set<string>>(new Set());
  const [newResults, setNewResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    fetch('/api/exams').then((r) => r.json()).then((d) => {
      setExams(d.exams || []);
      if (d.exams?.length > 0 && !selectedExam) {
        setSelectedExam(d.exams[0]);
      }
    });
    fetch('/api/save-queries').then((r) => r.json()).then((d) => {
      setQueries(d.queries || []);
    });
  }, []);

  const handleComplete = (results: SearchResult[], _logs: ExecutionLog[]) => {
    setNewResults(results);
  };

  return (
    <>
      <Head>
        <title>풀서비스 출시 검수 자동화 도구</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="app">
        <header className="app-header">
          <h1>풀서비스 출시 검수 자동화 도구</h1>
          <p className="header-sub">메가스터디 AI검색 답변 자동 수집 시스템 — 1차 구현</p>
        </header>

        <main className="app-main">
          <ExamSelector
            exams={exams}
            selectedExamId={selectedExam?.exam_id || ''}
            onSelect={(exam) => {
              setSelectedExam(exam);
              setSelectedStage('');
            }}
            onExamsChange={setExams}
          />

          {selectedExam && (
            <TimelineEditor
              examId={selectedExam.exam_id}
              examName={selectedExam.exam_name}
              selectedStage={selectedStage}
              onStageSelect={setSelectedStage}
            />
          )}

          {selectedExam && (
            <QuerySetManager
              queries={queries}
              exams={exams}
              examId={selectedExam.exam_id}
              selectedStage={selectedStage}
              selectedQueryIds={selectedQueryIds}
              onQueriesChange={setQueries}
              onSelectionChange={setSelectedQueryIds}
            />
          )}

          {selectedExam && (
            <SearchRunner
              examId={selectedExam.exam_id}
              examName={selectedExam.exam_name}
              selectedStage={selectedStage}
              allQueries={queries}
              selectedQueryIds={selectedQueryIds}
              onComplete={handleComplete}
            />
          )}

          <ResultTable newResults={newResults} />
        </main>

        <footer className="app-footer">
          <p>풀서비스 출시 검수 자동화 도구 v1.0 — 1차 구현</p>
        </footer>
      </div>
    </>
  );
}
