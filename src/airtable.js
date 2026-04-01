const FUNCTION_URL = '/.netlify/functions/airtable';

async function call(action, params = {}) {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

export async function submitVotes({ selectedVoter, isTech, techVoters }, votes, courses) {
  const timestamp = new Date().toISOString();

  const existingRecords = await call('fetchExistingVotes', {
    voterLabel: isTech ? null : selectedVoter.label,
    isTech,
  });

  const existingMap = {};
  for (const rec of existingRecords) {
    const key = `${rec.fields.Course}|${rec.fields.Voter}`;
    existingMap[key] = { id: rec.id, vote: rec.fields.Vote };
  }

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
  const toPatch = [];
  const toDelete = [];

  for (const [key, fields] of Object.entries(desiredMap)) {
    const existing = existingMap[key];
    if (!existing) {
      toInsert.push({ fields });
    } else if (existing.vote !== fields.Vote) {
      toPatch.push({ id: existing.id, fields: { Vote: fields.Vote, 'Submitted At': timestamp } });
    }
  }

  for (const [key, { id }] of Object.entries(existingMap)) {
    if (!desiredMap[key]) toDelete.push(id);
  }

  await call('submitVotes', { toInsert, toPatch, toDelete });
}

export async function saveCourse(course) {
  return call('saveCourse', { course });
}

export async function fetchExistingVotes(voterLabel, isTech) {
  return call('fetchExistingVotes', { voterLabel, isTech });
}

export async function fetchUserCourses() {
  const records = await call('fetchUserCourses');
  return records
    .filter(rec => rec.fields.Title)
    .map(rec => ({
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
