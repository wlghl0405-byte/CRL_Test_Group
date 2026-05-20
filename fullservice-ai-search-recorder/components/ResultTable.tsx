import React, { useState, useEffect } from 'react';
import { SearchResult } from '../lib/types';

interface Props {
  newResults: SearchResult[];
}

export default function ResultTable({ newResults }: Props) {
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [filterExam, setFilterExam] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [failOnly, setFailOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/results')
      .then((r) => r.json())
      .then((d) => setAllResults(d.results || []));
  }, []);

  useEffect(() => {
    if (newResults.length > 0) {
      setAllResults((prev) => {
        const ids = new Set(newResults.map((r) => r.run_id + r.query_id));
        const filtered = prev.filter((r) => !ids.has(r.run_id + r.query_id));
        return [...newResults, ...filtered];
      });
    }
  }, [newResults]);

  const exams = Array.from(new Set(allResults.map((r) => r.exam_name).filter(Boolean)));
  const stages = Array.from(new Set(allResults.map((r) => r.stage_name).filter(Boolean)));
  const categories = Array.from(new Set(allResults.map((r) => r.category).filter(Boolean)));

  const filtered = allResults.filter((r) => {
    if (filterExam && r.exam_name !== filterExam) return false;
    if (filterStage && r.stage_name !== filterStage) return false;
    if (filterCat && r.category !== filterCat) return false;
    if (filterStatus && r.collection_status !== filterStatus) return false;
    if (failOnly && r.collection_status !== '수집 실패') return false;
    return true;
  });

  const handleDownload = () => {
    window.open('/api/export-results', '_blank');
  };

  const parseLinks = (raw: string) => {
    try {
      return JSON.parse(raw) as { text: string; href: string }[];
    } catch {
      return [];
    }
  };

  return (
    <section className="section">
      <div className="section-header">
        <h2>5. 수집 결과</h2>
        <div className="btn-group">
          <span className="count-badge">총 {filtered.length}건</span>
          <button className="btn btn-primary" onClick={handleDownload}>엑셀 다운로드</button>
        </div>
      </div>

      <div className="filter-bar">
        <select value={filterExam} onChange={(e) => setFilterExam(e.target.value)}>
          <option value="">전체 시험</option>
          {exams.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
          <option value="">전체 단계</option>
          {stages.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">전체 유형</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">전체 상태</option>
          <option value="수집 성공">수집 성공</option>
          <option value="수집 실패">수집 실패</option>
        </select>
        <label>
          <input type="checkbox" checked={failOnly} onChange={(e) => setFailOnly(e.target.checked)} />
          &nbsp;실패 건만 보기
        </label>
      </div>

      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>실행 시각</th>
              <th>시험 회차</th>
              <th>공개 단계</th>
              <th>질의 유형</th>
              <th>질의</th>
              <th>답변 제목</th>
              <th>답변 본문</th>
              <th>링크</th>
              <th>수집 상태</th>
              <th>실패 사유</th>
              <th>소요(초)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const key = r.run_id + r.query_id + i;
              const links = parseLinks(r.source_links);
              const isExpanded = expandedId === key;
              return (
                <tr key={key} className={r.collection_status === '수집 실패' ? 'row-fail' : ''}>
                  <td className="cell-sm">{r.executed_at}</td>
                  <td className="cell-sm">{r.exam_name}</td>
                  <td className="cell-sm">{r.stage_name}</td>
                  <td className="cell-sm">{r.category}</td>
                  <td className="cell-query">{r.query_text}</td>
                  <td className="cell-md">{r.answer_title}</td>
                  <td className="cell-body">
                    <div
                      className={isExpanded ? 'text-expanded' : 'text-collapsed'}
                      onClick={() => setExpandedId(isExpanded ? null : key)}
                    >
                      {r.answer_text || '—'}
                    </div>
                    {r.answer_text && (
                      <button className="btn btn-xs" onClick={() => setExpandedId(isExpanded ? null : key)}>
                        {isExpanded ? '접기' : '펼치기'}
                      </button>
                    )}
                  </td>
                  <td className="cell-links">
                    {links.map((l, j) => (
                      <a key={j} href={l.href} target="_blank" rel="noreferrer" className="link-item">
                        {l.text || l.href}
                      </a>
                    ))}
                  </td>
                  <td>
                    <span className={r.collection_status === '수집 성공' ? 'badge badge-success' : 'badge badge-fail'}>
                      {r.collection_status}
                    </span>
                  </td>
                  <td className="cell-error">{r.error_message}</td>
                  <td>{r.elapsed_seconds}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={11} className="no-data">수집 결과가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
