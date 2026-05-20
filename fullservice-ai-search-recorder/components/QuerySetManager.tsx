import React, { useState, useRef } from 'react';
import { TestQuery, QueryCategory, Exam } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  queries: TestQuery[];
  exams: Exam[];
  examId: string;
  selectedStage: string;
  selectedQueryIds: Set<string>;
  onQueriesChange: (queries: TestQuery[]) => void;
  onSelectionChange: (ids: Set<string>) => void;
}

const CATEGORIES: QueryCategory[] = [
  '정답', '배점', '등급컷', '정오답률', '난이도',
  '선지별 선택비율', '해설강의', '총평', '라이브 설명회',
  '다시보기', '풀서비스 경로', '예외/방어',
];

const EMPTY_QUERY = (examId: string): TestQuery => ({
  query_id: uuidv4(),
  exam_id: examId,
  category: '정답',
  sub_category: '',
  query_text: '',
  priority: 'medium',
  note: '',
});

export default function QuerySetManager({
  queries, exams, examId, selectedStage, selectedQueryIds, onQueriesChange, onSelectionChange,
}: Props) {
  const [filterCat, setFilterCat] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterExam, setFilterExam] = useState(true);
  const [filterExamId, setFilterExamId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<TestQuery | null>(null);
  const [form, setForm] = useState<TestQuery>(EMPTY_QUERY(examId));
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [previewQueries, setPreviewQueries] = useState<TestQuery[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const apiPost = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/save-queries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const filtered = queries.filter((q) => {
    if (filterExam) {
      if (q.exam_id !== examId) return false;
    } else if (filterExamId) {
      if (q.exam_id !== filterExamId) return false;
    }
    if (filterCat && q.category !== filterCat) return false;
    if (filterPriority && q.priority !== filterPriority) return false;
    return true;
  });

  const handleFilterExamChange = (checked: boolean) => {
    setFilterExam(checked);
    if (checked) {
      setFilterExamId(examId);
    }
  };

  const handleFilterExamIdChange = (value: string) => {
    setFilterExamId(value);
    setFilterExam(value === examId);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_QUERY(examId));
    setShowForm(true);
  };

  const openEdit = (q: TestQuery) => {
    setEditTarget(q);
    setForm({ ...q });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.category) return alert('유형을 선택하세요.');
    if (!form.query_text.trim()) return alert('질의 내용을 입력하세요.');
    const data = await apiPost({ action: editTarget ? 'update' : 'add', query: form });
    onQueriesChange(data.queries);
    setShowForm(false);
  };

  const handleDelete = async (q: TestQuery) => {
    if (!confirm(`질의를 삭제하시겠습니까?\n"${q.query_text}"`)) return;
    const data = await apiPost({ action: 'delete', query: q });
    onQueriesChange(data.queries);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErrors([]);
    setPreviewQueries(null);
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const base64 = btoa(Array.from(uint8).map((b) => String.fromCharCode(b)).join(''));
    const data = await apiPost({ action: 'upload', fileBase64: base64, exam_id: examId });
    if (data.errors?.length > 0 && !data.queries?.length) {
      setUploadErrors(data.errors);
      return;
    }
    setPreviewQueries(data.queries || []);
    setUploadErrors(data.errors || []);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSavePreview = async () => {
    if (!previewQueries) return;
    const data = await apiPost({ action: 'bulk', queries: previewQueries });
    onQueriesChange(data.queries);
    setPreviewQueries(null);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedQueryIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const selectAll = () => {
    const allIds = new Set(filtered.map((q) => q.query_id));
    onSelectionChange(allIds);
  };

  const clearAll = () => onSelectionChange(new Set());

  return (
    <section className="section">
      <div className="section-header">
        <h2>3. 테스트 질의 세트 관리</h2>
        <div className="btn-group">
          <button className="btn" onClick={() => fileRef.current?.click()}>엑셀/CSV 업로드</button>
          <input ref={fileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="btn btn-primary" onClick={openAdd}>+ 직접 추가</button>
        </div>
      </div>

      {uploadErrors.length > 0 && (
        <div className="alert alert-error">
          <strong>업로드 오류</strong>
          <ul>{uploadErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {previewQueries && (
        <div className="preview-box">
          <h4>업로드 미리보기 ({previewQueries.length}건)</h4>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>query_id</th><th>category</th><th>질의</th><th>priority</th>
                </tr>
              </thead>
              <tbody>
                {previewQueries.map((q) => (
                  <tr key={q.query_id}>
                    <td>{q.query_id}</td>
                    <td>{q.category}</td>
                    <td>{q.query_text}</td>
                    <td>{q.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={handleSavePreview}>저장</button>
            <button className="btn" onClick={() => setPreviewQueries(null)}>취소</button>
          </div>
        </div>
      )}

      <div className="filter-bar">
        <label>
          현재 회차만
          <input
            type="checkbox"
            checked={filterExam}
            onChange={(e) => handleFilterExamChange(e.target.checked)}
          />
        </label>
        <select
          value={filterExam ? examId : filterExamId}
          onChange={(e) => handleFilterExamIdChange(e.target.value)}
        >
          <option value="">전체 회차</option>
          {exams.map((ex) => (
            <option key={ex.exam_id} value={ex.exam_id}>{ex.exam_name}</option>
          ))}
        </select>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">전체 유형</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">전체 우선순위</option>
          <option value="high">high</option>
          <option value="medium">medium</option>
          <option value="low">low</option>
        </select>
        <button className="btn btn-sm" onClick={selectAll}>전체 선택</button>
        <button className="btn btn-sm" onClick={clearAll}>선택 해제</button>
        <span className="count-badge">{selectedQueryIds.size}건 선택 / {filtered.length}건 표시</span>
      </div>

      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>선택</th>
              <th>exam_id</th>
              <th>유형</th>
              <th>세부유형</th>
              <th>질의</th>
              <th>우선순위</th>
              <th>비고</th>
              <th>수정</th>
              <th>삭제</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => (
              <tr key={q.query_id} className={selectedQueryIds.has(q.query_id) ? 'row-selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedQueryIds.has(q.query_id)}
                    onChange={() => toggleSelect(q.query_id)}
                  />
                </td>
                <td>{q.exam_id}</td>
                <td>{q.category}</td>
                <td>{q.sub_category}</td>
                <td className="cell-query">{q.query_text}</td>
                <td>
                  <span className={`badge badge-${q.priority}`}>{q.priority}</span>
                </td>
                <td>{q.note}</td>
                <td><button className="btn btn-sm" onClick={() => openEdit(q)}>수정</button></td>
                <td><button className="btn btn-sm btn-danger" onClick={() => handleDelete(q)}>삭제</button></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="no-data">질의가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal modal-wide">
            <h3>{editTarget ? '질의 수정' : '질의 추가'}</h3>
            <div className="form-row">
              <label>유형 *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as QueryCategory })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>세부유형</label>
              <input value={form.sub_category} onChange={(e) => setForm({ ...form, sub_category: e.target.value })} />
            </div>
            <div className="form-row">
              <label>질의 내용 *</label>
              <textarea rows={3} value={form.query_text} onChange={(e) => setForm({ ...form, query_text: e.target.value })} />
            </div>
            <div className="form-row">
              <label>우선순위</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TestQuery['priority'] })}>
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
            </div>
            <div className="form-row">
              <label>비고</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleSubmit}>저장</button>
              <button className="btn" onClick={() => setShowForm(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
