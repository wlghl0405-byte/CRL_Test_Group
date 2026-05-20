import React, { useState, useEffect, useRef } from 'react';
import { SearchResult } from '../lib/types';

interface Props {
  newResults: SearchResult[];
}

const rowKey = (r: SearchResult) => `${r.run_id}|${r.query_id}`;

export default function ResultTable({ newResults }: Props) {
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [filterExam, setFilterExam] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [failOnly, setFailOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const masterCheckRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/results')
      .then((r) => r.json())
      .then((d) => setAllResults(d.results || []));
  }, []);

  useEffect(() => {
    if (newResults.length > 0) {
      setAllResults((prev) => {
        const ids = new Set(newResults.map(rowKey));
        const deduped = prev.filter((r) => !ids.has(rowKey(r)));
        return [...newResults, ...deduped];
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

  // 마스터 체크박스 indeterminate 처리
  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selectedKeys.has(rowKey(r)));
  const someFilteredSelected = filtered.some((r) => selectedKeys.has(rowKey(r)));
  useEffect(() => {
    if (masterCheckRef.current) {
      masterCheckRef.current.indeterminate = someFilteredSelected && !allFilteredSelected;
    }
  }, [someFilteredSelected, allFilteredSelected]);

  const toggleRow = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.delete(rowKey(r)));
        return next;
      });
    } else {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.add(rowKey(r)));
        return next;
      });
    }
  };

  const apiDelete = async (body: object) => {
    const res = await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setAllResults(data.results || []);
    setSelectedKeys(new Set());
  };

  const handleDeleteSelected = async () => {
    const targets = filtered.filter((r) => selectedKeys.has(rowKey(r)));
    if (targets.length === 0) return;
    if (!confirm(`선택한 ${targets.length}건을 삭제하시겠습니까?`)) return;
    await apiDelete({
      action: 'delete_selected',
      ids: targets.map((r) => ({ run_id: r.run_id, query_id: r.query_id })),
    });
  };

  const handleDeleteOne = async (r: SearchResult) => {
    if (!confirm(`해당 수집 결과를 삭제하시겠습니까?\n"${r.query_text}"`)) return;
    await apiDelete({
      action: 'delete_selected',
      ids: [{ run_id: r.run_id, query_id: r.query_id }],
    });
  };

  const handleDeleteAll = async () => {
    if (!confirm(`전체 수집 결과 ${allResults.length}건을 모두 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    await apiDelete({ action: 'delete_all' });
  };

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

  const formatDatetime = (val: string) => {
    const [date, time] = val.split('T');
    return { date: date ?? val, time: time ?? '' };
  };

  const selectedCount = filtered.filter((r) => selectedKeys.has(rowKey(r))).length;

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
        <div className="filter-bar-actions">
          <button
            className="btn btn-sm btn-danger"
            onClick={handleDeleteSelected}
            disabled={selectedCount === 0}
          >
            선택 삭제 {selectedCount > 0 && `(${selectedCount}건)`}
          </button>
          <button
            className="btn btn-sm btn-danger-outline"
            onClick={handleDeleteAll}
            disabled={allResults.length === 0}
          >
            전체 삭제
          </button>
        </div>
      </div>

      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  ref={masterCheckRef}
                  checked={allFilteredSelected}
                  onChange={toggleAll}
                  title={allFilteredSelected ? '전체 해제' : '전체 선택'}
                />
              </th>
              <th>실행 시각</th>
              <th>시험 회차</th>
              <th>공개 단계</th>
              <th>질의 유형</th>
              <th>질의</th>
              <th>답변 본문</th>
              <th>링크</th>
              <th>수집 상태</th>
              <th>실패 사유</th>
              <th>소요(초)</th>
              <th>삭제</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const key = rowKey(r);
              const expandKey = key + i;
              const links = parseLinks(r.source_links);
              const isExpanded = expandedId === expandKey;
              const isSelected = selectedKeys.has(key);
              return (
                <tr key={expandKey} className={`${r.collection_status === '수집 실패' ? 'row-fail' : ''} ${isSelected ? 'row-selected' : ''}`}>
                  <td>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleRow(key)} />
                  </td>
                  <td className="cell-datetime">
                    {(() => { const { date, time } = formatDatetime(r.executed_at); return <><span className="datetime-date">{date}</span><span className="datetime-time">{time}</span></>; })()}
                  </td>
                  <td className="cell-exam">{r.exam_name}</td>
                  <td className="cell-stage">{r.stage_name}</td>
                  <td className="cell-type">{r.category}</td>
                  <td className="cell-query">{r.query_text}</td>
                  <td className="cell-body-wide">
                    <div
                      className={isExpanded ? 'text-expanded' : 'text-collapsed'}
                      onClick={() => setExpandedId(isExpanded ? null : expandKey)}
                    >
                      {r.answer_text || '—'}
                    </div>
                    {r.answer_text && (
                      <button className="btn btn-xs" onClick={() => setExpandedId(isExpanded ? null : expandKey)}>
                        {isExpanded ? '접기' : '펼치기'}
                      </button>
                    )}
                  </td>
                  <td className="cell-links">
                    {links.map((l, j) => (
                      <a key={j} href={l.href} target="_blank" rel="noreferrer" className="link-barogage">
                        바로가기{links.length > 1 ? ` ${j + 1}` : ''}
                      </a>
                    ))}
                  </td>
                  <td>
                    <span className={r.collection_status === '수집 성공' ? 'badge badge-success' : 'badge badge-fail'}>
                      {r.collection_status}
                    </span>
                  </td>
                  <td className="cell-error">{r.error_message}</td>
                  <td className="cell-elapsed">{r.elapsed_seconds}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteOne(r)}>삭제</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={12} className="no-data">수집 결과가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
