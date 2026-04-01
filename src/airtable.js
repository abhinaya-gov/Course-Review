const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN;
const TABLE = 'tblzpWziv0tWT3yak';
const USER_COURSES_BASE_ID = 'applezeBdAlZpJCD0';
const USER_COURSES_TABLE = 'tblDtQcIlV2JTAN09';

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function submitVotes({ selectedVoter, isTech, techVoters }, votes, courses) {
  const timestamp = new Date().toISOString();

  // Fetch existing records to diff against
  const existingRecords = await fetchExistingVotes(
    isTech ? null : selectedVoter.label,
    isTech
  );

  // Build map: "CourseTitle|VoterLabel" -> { recordId, vote }
  const existingMap = {};
  for (const rec of existingRecords) {
    const key = `${rec.fields.Course}|${rec.fields.Voter}`;
    existingMap[key] = { id: rec.id, vote: rec.fields.Vote };
  }

  // Build desired state: "CourseTitle|VoterLabel" -> { fields }
  const desiredMap = {};
  if (isTech) {
    courses.forEach(course => {
      const courseVotes = votes[course.id] || {};
      techVoters.forEach(tv => {
        if (courseVotes[tv.id]) {
          const key = `${course.title}|${tv.label}`;
          desiredMap[key] = {
            Voter: tv.label,
            Department: 'Tech',
            Location: tv.location,
            Course: course.title,
            Vote: courseVotes[tv.id] === 'yes' ? 'Helpful' : 'Not Helpful',
            'Submitted At': timestamp,
          };
        }
      });
    });
  } else {
    courses.filter(c => votes[c.id]).forEach(course => {
      const key = `${course.title}|${selectedVoter.label}`;
      desiredMap[key] = {
        Voter: selectedVoter.label,
        Department: selectedVoter.department,
        Location: selectedVoter.location || '',
        Course: course.title,
        Vote: votes[course.id] === 'yes' ? 'Helpful' : 'Not Helpful',
        'Submitted At': timestamp,
      };
    });
  }

  const toInsert = [];
  const toPatch  = []; // { id, fields }
  const toDelete = []; // record ids

  // New or changed
  for (const [key, fields] of Object.entries(desiredMap)) {
    const existing = existingMap[key];
    if (!existing) {
      toInsert.push({ fields });
    } else if (existing.vote !== fields.Vote) {
      toPatch.push({ id: existing.id, fields: { Vote: fields.Vote, 'Submitted At': timestamp } });
    }
    // unchanged → skip
  }

  // Removed (existed before, not in desired)
  for (const [key, { id }] of Object.entries(existingMap)) {
    if (!desiredMap[key]) toDelete.push(id);
  }

  // POST new records
  for (const batch of chunk(toInsert, 10)) {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: batch }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(JSON.stringify(e)); }
  }

  // PATCH changed records
  for (const batch of chunk(toPatch, 10)) {
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: batch.map(r => ({ id: r.id, fields: r.fields })) }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(JSON.stringify(e)); }
  }

  // DELETE removed records
  for (const batch of chunk(toDelete, 10)) {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}`);
    batch.forEach(id => url.searchParams.append('records[]', id));
    await fetch(url.toString(), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
  }
}

export async function saveCourse(course) {
  const response = await fetch(
    `https://api.airtable.com/v0/${USER_COURSES_BASE_ID}/${USER_COURSES_TABLE}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              Title: course.title,
              Description: course.description || '',
              Link: course.link || '',
              Departments: course.departments.join(','),
              Skills: course.skills.join(','),
              Tools: course.tools.join(','),
            },
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('Airtable save course error:', JSON.stringify(error, null, 2));
    throw new Error(error?.error?.message || 'Failed to save course');
  }

  const data = await response.json();
  return data.records[0];
}

export async function fetchExistingVotes(voterLabel, isTech) {
  const formula = isTech
    ? `{Department}="Tech"`
    : `{Voter}="${voterLabel}"`;

  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}`);
  url.searchParams.set('filterByFormula', formula);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.records;
}

export async function fetchUserCourses() {
  const allRecords = [];
  let offset = null;

  do {
    const url = new URL(`https://api.airtable.com/v0/${USER_COURSES_BASE_ID}/${USER_COURSES_TABLE}`);
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Airtable fetch courses error:', JSON.stringify(error, null, 2));
      return [];
    }

    const data = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords
    .filter(rec => rec.fields.Title)
    .map((rec) => ({
    id: `user-${rec.id}`,
    isUserAdded: true,
    title: rec.fields.Title,
    subtitle: null,
    description: rec.fields.Description || null,
    link: rec.fields.Link || null,
    departments: (rec.fields.Departments || 'all').split(',').map(d => d.trim()),
    skills: (rec.fields.Skills || '').split(',').map(s => s.trim()).filter(Boolean),
    tools: (rec.fields.Tools || '').split(',').map(s => s.trim()).filter(Boolean),
  }));
}

