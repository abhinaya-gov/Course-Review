import { useState, useEffect } from 'react';
import { courses as staticCourses } from '../data/courses';
import { fetchUserCourses } from '../airtable';

const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN;
const TABLE = 'tblzpWziv0tWT3yak';

const TECH_LOCATIONS = ['Chennai', 'Thenkasi', 'Tharuvai', 'Kumbakonam'];
const TECH_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4'];

const GROUPS = [
  { key: 'tech',     label: 'Tech',            dept: 'Tech' },
  { key: 'business', label: 'Business',         dept: 'Business' },
  { key: 'design',   label: 'Design',           dept: 'Design' },
  { key: 'all',      label: 'All Departments',  dept: null },
];

async function fetchAllVotes() {
  const records = [];
  let offset = null;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}`);
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) throw new Error('Failed to fetch votes');
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

function aggregateVotes(records) {
  // voteMap:    { courseTitle: { voterLabel: 'Helpful'|'Not Helpful' } }
  // voterTimes: { voterLabel: latestISO }
  // voterDepts: { voterLabel: 'Tech'|'Business'|'Design' }
  const voteMap    = {};
  const voterTimes = {};
  const voterDepts = {};

  for (const rec of records) {
    const title  = rec.fields.Course;
    const voter  = rec.fields.Voter;
    const vote   = rec.fields.Vote;
    const dept   = rec.fields.Department;
    const time   = rec.fields['Submitted At'];
    if (!title || !voter || !vote) continue;

    if (!voteMap[title]) voteMap[title] = {};
    voteMap[title][voter] = vote;

    if (dept) voterDepts[voter] = dept;
    if (time && (!voterTimes[voter] || time > voterTimes[voter])) {
      voterTimes[voter] = time;
    }
  }
  return { voteMap, voterTimes, voterDepts };
}

function VoteCell({ vote }) {
  if (vote === 'Helpful')     return <span style={{ color: '#16a34a', fontSize: 16 }}>✓</span>;
  if (vote === 'Not Helpful') return <span style={{ color: '#dc2626', fontSize: 16 }}>✗</span>;
  return <span style={{ color: '#d1d5db' }}>—</span>;
}

export default function ResultsPage() {
  const [data,        setData]        = useState(null);
  const [userCourses, setUserCourses] = useState([]);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    Promise.all([fetchAllVotes(), fetchUserCourses()])
      .then(([records, uc]) => {
        setData(aggregateVotes(records));
        setUserCourses(uc);
      })
      .catch(e => setError(e.message));
  }, []);

  if (!data && !error) return <div style={s.page}><p style={s.muted}>Loading votes...</p></div>;
  if (error)           return <div style={s.page}><p style={s.error}>Error: {error}</p></div>;

  const { voteMap, voterTimes, voterDepts } = data;

  // Build voter columns per group
  // Tech: fixed location columns
  // Business/Design: unique voter names for that dept, sorted alphabetically
  // All: all voters across all depts
  const techVoterCols = TECH_LOCATIONS.map((loc, i) => ({
    label: `Tech – ${loc}`,
    short: loc,
    color: TECH_COLORS[i],
  }));

  const nonTechVotersByDept = {};
  for (const [voter, dept] of Object.entries(voterDepts)) {
    if (dept === 'Tech') continue;
    if (!nonTechVotersByDept[dept]) nonTechVotersByDept[dept] = [];
    nonTechVotersByDept[dept].push(voter);
  }
  for (const dept of Object.keys(nonTechVotersByDept)) {
    nonTechVotersByDept[dept].sort();
  }

  const deptColors = { Design: '#ec4899', Business: '#f59e0b' };

  const voterColsForGroup = (groupKey) => {
    if (groupKey === 'tech')     return techVoterCols;
    if (groupKey === 'business') return (nonTechVotersByDept['Business'] || []).map(v => ({ label: v, short: v, color: deptColors.Business }));
    if (groupKey === 'design')   return (nonTechVotersByDept['Design']   || []).map(v => ({ label: v, short: v, color: deptColors.Design }));
    // 'all': tech cols + all non-tech voters
    return [
      ...techVoterCols,
      ...(nonTechVotersByDept['Business'] || []).map(v => ({ label: v, short: v, color: deptColors.Business })),
      ...(nonTechVotersByDept['Design']   || []).map(v => ({ label: v, short: v, color: deptColors.Design })),
    ];
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Course Voting Results</h1>
      </div>

      {GROUPS.map(group => {
        const voterCols = voterColsForGroup(group.key);
        const courses = [...staticCourses, ...userCourses]
          .filter(c => c.departments.includes(group.key))
          .map(c => {
            const byVoter  = voteMap[c.title] || {};
            // Only count votes from relevant voters for this group
            const relevant = voterCols.map(v => byVoter[v.label]).filter(Boolean);
            const yesCount = relevant.filter(v => v === 'Helpful').length;
            const noCount  = relevant.filter(v => v === 'Not Helpful').length;
            const total    = yesCount + noCount;
            const pct      = total > 0 ? Math.round((yesCount / total) * 100) : null;
            return { ...c, byVoter, yesCount, noCount, total, pct };
          })
          .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.total - a.total);

        return (
          <section key={group.key} style={s.section}>
            <h2 style={s.groupLabel}>{group.label}</h2>
            <div style={s.tableWrap}>
              <div style={s.headerRow}>
                <div style={s.courseCol}>Course</div>
                {voterCols.map(v => (
                  <div key={v.label} style={{ ...s.voterCol, color: v.color }}>
                    <div>{v.short}</div>
                    {voterTimes[v.label] && (
                      <div style={s.voterTime}>
                        {new Date(voterTimes[v.label]).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                ))}
                <div style={s.statsCol}>Yes</div>
                <div style={s.statsCol}>No</div>
                <div style={{ ...s.statsCol, flex: 2 }}>% Yes</div>
              </div>

              {courses.map((course, i) => (
                <div key={course.id} style={{ ...s.row, background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <div style={s.courseCol}>
                    {course.link
                      ? <a href={course.link} target="_blank" rel="noreferrer" style={s.link}>{course.title}</a>
                      : course.title}
                  </div>
                  {voterCols.map(v => (
                    <div key={v.label} style={s.voterCol}>
                      <VoteCell vote={course.byVoter[v.label]} />
                    </div>
                  ))}
                  <div style={{ ...s.statsCol, color: '#16a34a', fontWeight: 600 }}>{course.yesCount || '—'}</div>
                  <div style={{ ...s.statsCol, color: '#dc2626', fontWeight: 600 }}>{course.noCount || '—'}</div>
                  <div style={{ ...s.statsCol, flex: 2 }}>
                    {course.pct !== null ? (
                      <div style={s.barWrap}>
                        <div style={{ ...s.bar, width: `${course.pct}%`, background: course.pct >= 70 ? '#16a34a' : course.pct >= 40 ? '#f59e0b' : '#dc2626' }} />
                        <span style={s.barLabel}>{course.pct}%</span>
                      </div>
                    ) : <span style={s.muted}>—</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const s = {
  page:       { fontFamily: 'system-ui, sans-serif', maxWidth: 1300, margin: '0 auto', padding: '32px 24px', background: '#f9fafb', minHeight: '100vh' },
  header:     { marginBottom: 32 },
  title:      { fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 },
  muted:      { color: '#9ca3af' },
  error:      { color: '#dc2626' },
  section:    { marginBottom: 48 },
  groupLabel: { fontSize: 18, fontWeight: 700, color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: 8, marginBottom: 0 },
  tableWrap:  { background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' },
  headerRow:  { display: 'flex', alignItems: 'center', padding: '10px 16px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' },
  row:        { display: 'flex', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#111827' },
  courseCol:  { flex: 4, paddingRight: 12 },
  voterCol:   { flex: 1, textAlign: 'center', minWidth: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  voterTime:  { fontSize: 9, fontWeight: 400, color: '#9ca3af', textTransform: 'none', letterSpacing: 0 },
  statsCol:   { flex: 1, textAlign: 'center', minWidth: 40 },
  link:       { color: '#2563eb', textDecoration: 'none' },
  barWrap:    { display: 'flex', alignItems: 'center', gap: 6 },
  bar:        { height: 8, borderRadius: 4, minWidth: 2, maxWidth: 60 },
  barLabel:   { fontSize: 12, fontWeight: 600, color: '#374151' },
};
