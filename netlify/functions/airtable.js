const VOTES_BASE_ID = process.env.AIRTABLE_BASE_ID;
const VOTES_TABLE = 'tblzpWziv0tWT3yak';
const USER_COURSES_BASE_ID = 'applezeBdAlZpJCD0';
const USER_COURSES_TABLE = 'tblDtQcIlV2JTAN09';
const TOKEN = process.env.AIRTABLE_TOKEN;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function fetchExistingVotes(voterLabel, isTech) {
  const formula = isTech ? `{Department}="Tech"` : `{Voter}="${voterLabel}"`;
  const url = new URL(`https://api.airtable.com/v0/${VOTES_BASE_ID}/${VOTES_TABLE}`);
  url.searchParams.set('filterByFormula', formula);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.records;
}

async function submitVotes({ toInsert, toPatch, toDelete }) {
  for (const batch of chunk(toInsert, 10)) {
    const res = await fetch(`https://api.airtable.com/v0/${VOTES_BASE_ID}/${VOTES_TABLE}`, {
      method: 'POST', headers, body: JSON.stringify({ records: batch }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(JSON.stringify(e)); }
  }
  for (const batch of chunk(toPatch, 10)) {
    const res = await fetch(`https://api.airtable.com/v0/${VOTES_BASE_ID}/${VOTES_TABLE}`, {
      method: 'PATCH', headers, body: JSON.stringify({ records: batch.map(r => ({ id: r.id, fields: r.fields })) }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(JSON.stringify(e)); }
  }
  for (const batch of chunk(toDelete, 10)) {
    const url = new URL(`https://api.airtable.com/v0/${VOTES_BASE_ID}/${VOTES_TABLE}`);
    batch.forEach(id => url.searchParams.append('records[]', id));
    await fetch(url.toString(), { method: 'DELETE', headers });
  }
}

async function saveCourse(course) {
  const res = await fetch(`https://api.airtable.com/v0/${USER_COURSES_BASE_ID}/${USER_COURSES_TABLE}`, {
    method: 'POST', headers,
    body: JSON.stringify({
      records: [{
        fields: {
          Title: course.title,
          Description: course.description || '',
          Link: course.link || '',
          Departments: course.departments.join(','),
          Skills: course.skills.join(','),
          Tools: course.tools.join(','),
        },
      }],
    }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e?.error?.message || 'Failed to save course'); }
  const data = await res.json();
  return data.records[0];
}

async function fetchUserCourses() {
  const allRecords = [];
  let offset = null;
  do {
    const url = new URL(`https://api.airtable.com/v0/${USER_COURSES_BASE_ID}/${USER_COURSES_TABLE}`);
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) return [];
    const data = await res.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);
  return allRecords;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { action, ...params } = body;

  try {
    let result;
    if (action === 'fetchExistingVotes') {
      result = await fetchExistingVotes(params.voterLabel, params.isTech);
    } else if (action === 'submitVotes') {
      await submitVotes(params);
      result = { success: true };
    } else if (action === 'saveCourse') {
      result = await saveCourse(params.course);
    } else if (action === 'fetchUserCourses') {
      result = await fetchUserCourses();
    } else {
      return { statusCode: 400, body: `Unknown action: ${action}` };
    }
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
