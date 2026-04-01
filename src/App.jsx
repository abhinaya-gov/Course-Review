import { useState, useEffect } from 'react';
import Home from './components/Home';
import Sidebar from './components/Sidebar';
import CourseCard from './components/CourseCard';
import AddCourseForm from './components/AddCourseForm';
import { courses as staticCourses, voters } from './data/courses';
import { submitVotes, saveCourse, fetchUserCourses, fetchExistingVotes } from './airtable';

const techVoters = voters.filter(v => v.department === 'Tech');

export default function App() {
  const [view, setView] = useState('home'); // 'home' | 'courses'
  const [selectedVoter, setSelectedVoter] = useState(null); // null when tech
  const [selectedDept, setSelectedDept] = useState(null);   // 'design'|'business'|'tech'
  const [votes, setVotes] = useState({});
  const [originalVotes, setOriginalVotes] = useState({});
  const [lockedLocation, setLockedLocation] = useState(null); // locks tech to one location on first vote
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  // User-added courses
  const [userCourses, setUserCourses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingCourse, setAddingCourse] = useState(false);
  const [hasPriorVotes, setHasPriorVotes] = useState(false);

  // Fetch user courses on mount
  useEffect(() => {
    fetchUserCourses().then(setUserCourses).catch(console.error);
  }, []);

  const allCourses = [...staticCourses, ...userCourses];
  const isTech = selectedDept === 'tech';

  const visibleCourses = allCourses.filter(c =>
    c.departments.includes('all') || c.departments.includes(selectedDept)
  );

  // Count only votes that differ from what was originally loaded (used for submit button)
  const votedCount = isTech
    ? Object.keys(votes).filter(courseId => {
        const cur = votes[courseId] || {};
        const orig = originalVotes[courseId] || {};
        return JSON.stringify(cur) !== JSON.stringify(orig);
      }).length
    : Object.keys(votes).filter(courseId => votes[courseId] !== originalVotes[courseId]).length
      + Object.keys(originalVotes).filter(courseId => !(courseId in votes)).length;

  // Count visible courses that have a vote (saved or picked this session) for the progress bar
  const savedCount = isTech
    ? lockedLocation
      ? visibleCourses.filter(c => votes[c.id]?.[lockedLocation]).length
      : 0
    : visibleCourses.filter(c => c.id in votes).length;

  const handleDeptSelect = async (deptId) => {
    const isTechDept = deptId === 'tech';
    const voter = isTechDept ? null : voters.find(v => v.id === deptId);
    setSelectedDept(deptId);
    setVotes({});
    setOriginalVotes({});
    setLockedLocation(null);
    setHasPriorVotes(false);
    setSelectedVoter(voter);
    setView('courses');

    try {
      const records = await fetchExistingVotes(
        isTechDept ? null : voter.label,
        isTechDept
      );
      if (records.length === 0) return;

      const courses = [...staticCourses, ...userCourses];
      const priorVotes = {};

      if (isTechDept) {
        for (const rec of records) {
          const course = courses.find(c => c.title === rec.fields.Course);
          const tv = techVoters.find(v => v.label === rec.fields.Voter);
          if (!course || !tv) continue;
          if (!priorVotes[course.id]) priorVotes[course.id] = {};
          priorVotes[course.id][tv.id] = rec.fields.Vote === 'Helpful' ? 'yes' : 'no';
        }
      } else {
        for (const rec of records) {
          const course = courses.find(c => c.title === rec.fields.Course);
          if (!course) continue;
          priorVotes[course.id] = rec.fields.Vote === 'Helpful' ? 'yes' : 'no';
        }
      }

      if (Object.keys(priorVotes).length > 0) {
        setVotes(priorVotes);
        setOriginalVotes(priorVotes);
        setHasPriorVotes(true);
      }
    } catch (e) {
      console.error('Failed to load prior votes:', e);
    }
  };

  // Design/Business: clicking same value again clears it
  const handleVote = (courseId, value) => {
    setVotes(prev => {
      if (prev[courseId] === value) {
        const next = { ...prev };
        delete next[courseId];
        return next;
      }
      return { ...prev, [courseId]: value };
    });
  };

  // Tech: locks to first location clicked, clicking same value again clears it
  const handleTechVote = (courseId, locationId, value) => {
    if (lockedLocation && lockedLocation !== locationId) return;
    if (!lockedLocation) setLockedLocation(locationId);

    setVotes(prev => {
      const courseVotes = { ...(prev[courseId] || {}) };
      if (courseVotes[locationId] === value) delete courseVotes[locationId];
      else courseVotes[locationId] = value;

      const next = { ...prev };
      if (Object.keys(courseVotes).length === 0) delete next[courseId];
      else next[courseId] = courseVotes;
      return next;
    });
  };

  const handleAddCourse = async (courseData) => {
    setAddingCourse(true);
    try {
      await saveCourse(courseData);
      // Re-fetch to get the Airtable record ID
      const updated = await fetchUserCourses();
      setUserCourses(updated);
      setShowAddForm(false);
    } catch (e) {
      console.error('Failed to add course:', e);
      alert(e.message || 'Failed to add course. Please try again.');
    } finally {
      setAddingCourse(false);
    }
  };

  const handleSubmit = async () => {
    if (votedCount === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitVotes({ selectedVoter, isTech, techVoters }, votes, visibleCourses);
      setSubmitted(true);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="success-screen">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h1>Review Submitted!</h1>
          <p>Thank you, <strong>{isTech ? 'Technology' : selectedVoter.label}</strong>.</p>
          {/* <p>Your review for {votedCount} course{votedCount !== 1 ? 's' : ''} have been recorded.</p> */}
          <p>Your reviews have been recorded.</p>
        </div>
      </div>
    );
  }

  if (view === 'home') {
    return <Home onSelect={handleDeptSelect} />;
  }

  return (
    <div className="app">
      <Sidebar
        label={isTech ? 'Technology' : selectedVoter.label}
        department={isTech ? 'Tech' : selectedVoter.department}
        location={isTech ? null : selectedVoter.location}
        votedCount={votedCount}
        savedCount={savedCount}
        totalCount={visibleCourses.length}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
        onBack={() => { setView('home'); setSelectedVoter(null); setSelectedDept(null); setVotes({}); setLockedLocation(null); }}
      />
      <main className="main">
        <div className="course-list">
          <div className="course-list-header">
            <div className="course-list-header-row">
              <div>
                <h2>Online Courses ({visibleCourses.length})</h2>
                <p>
                  {isTech
                    ? 'Check each course per location — click left box for ✓ (yes), right box for ✗ (no), click again to clear.'
                    : 'Click left box for ✓ (yes), right box for ✗ (no), click again to clear.'}
                </p>
              </div>
              <button
                className="btn-add-course"
                onClick={() => setShowAddForm(true)}
              >
                + Suggest Course
              </button>
            </div>
          </div>
          {hasPriorVotes && (
            <div className="prior-votes-banner">
              You have already chosen. Your previous choices are shown below — change anything and resubmit to update.
            </div>
          )}
          {visibleCourses.map((course, i) => (
            <CourseCard
              key={course.id}
              course={course}
              index={i + 1}
              isTech={isTech}
              lockedLocation={lockedLocation}
              vote={votes[course.id]}
              onVote={isTech
                ? (locationId, value) => handleTechVote(course.id, locationId, value)
                : (value) => handleVote(course.id, value)
              }
            />
          ))}
          <div className="bottom-submit">
            <button
              className="btn-submit"
              onClick={handleSubmit}
              disabled={submitting || votedCount === 0}
            >
              {submitting ? 'Submitting...' : `Submit ${votedCount} Review${votedCount !== 1 ? 's' : ''}`}
            </button>
            {error && <p className="error-text">{error}</p>}
          </div>
        </div>
      </main>

      {showAddForm && (
        <AddCourseForm
          onSubmit={handleAddCourse}
          onClose={() => setShowAddForm(false)}
          submitting={addingCourse}
        />
      )}
    </div>
  );
}
