import { voters } from '../data/courses';

const techVoters = voters.filter(v => v.department === 'Tech');

const SITE_STYLES = {
  Coursera: { background: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  Udemy:    { background: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE' },
  Android:  { background: '#FFF7ED', color: '#9A3412', border: '#FED7AA' },
  LinkedIn: { background: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
};

function getSite(link) {
  if (!link) return null;
  try {
    const host = new URL(link).hostname.replace('www.', '');
    if (host.includes('coursera.org')) return 'Coursera';
    if (host.includes('udemy.com')) return 'Udemy';
    if (host.includes('developer.android.com')) return 'Android';
    if (host.includes('linkedin.com')) return 'LinkedIn';
    return host.split('.')[0].charAt(0).toUpperCase() + host.split('.')[0].slice(1);
  } catch {
    return null;
  }
}

function VotePair({ value, onYes, onNo, disabled }) {
  return (
    <div className="vote-pair">
      <button
        className={`vote-checkbox ${value === 'yes' ? 'yes' : 'unselected'} ${disabled ? 'disabled' : ''}`}
        onClick={disabled ? undefined : onYes}
        disabled={disabled}
        title="Yes"
      >✓</button>
      <button
        className={`vote-checkbox ${value === 'no' ? 'no' : 'unselected'} ${disabled ? 'disabled' : ''}`}
        onClick={disabled ? undefined : onNo}
        disabled={disabled}
        title="No"
      >✗</button>
    </div>
  );
}

export default function CourseCard({ course, index, vote, onVote, isTech, lockedLocation }) {
  const lockedVote = isTech ? vote?.[lockedLocation] : vote;
  const cardClass = `course-card ${lockedVote === 'yes' ? 'voted-yes' : lockedVote === 'no' ? 'voted-no' : ''}`;

  return (
    <div className={cardClass}>
      <div className="card-header">
        <div className="card-title-row">
          <span className="card-index">{index}</span>
          <div className="card-title-block">
            <div className="card-title-line">
              <h3 className="card-title">{course.title}</h3>
              {course.isUserAdded && <span className="user-added-badge">Community</span>}
              {getSite(course.link) && (() => {
                const label = getSite(course.link);
                const st = SITE_STYLES[label] || { background: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
                return (
                  <span className="site-badge" style={{ background: st.background, color: st.color, borderColor: st.border }}>
                    {label}
                  </span>
                );
              })()}
            </div>
            {course.subtitle && <p className="card-subtitle">{course.subtitle}</p>}
            {course.description && <p className="card-description">{course.description}</p>}
          </div>
          {course.link && (
            <a href={course.link} target="_blank" rel="noopener noreferrer" className="card-link-btn">
              Open ↗
            </a>
          )}
        </div>
      </div>

      <div className="card-body">
        {course.skills.length > 0 && (
          <div className="tag-section">
            <span className="tag-label">Skills</span>
            <div className="tags">
              {course.skills.map(skill => (
                <span key={skill} className="tag tag-skill">{skill}</span>
              ))}
            </div>
          </div>
        )}
        {course.tools.length > 0 && (
          <div className="tag-section">
            <span className="tag-label">Tools</span>
            <div className="tags">
              {course.tools.map(tool => (
                <span key={tool} className="tag tag-tool">{tool}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card-footer">
        {isTech ? (
          <div className="tech-vote-rows">
            {techVoters.map(tv => {
              const isLocked = lockedLocation && lockedLocation !== tv.id;
              return (
                <div key={tv.id} className={`tech-vote-row ${isLocked ? 'row-disabled' : ''}`}>
                  <span className="tech-location-name">{tv.location}</span>
                  <VotePair
                    value={vote?.[tv.id]}
                    onYes={() => onVote(tv.id, 'yes')}
                    onNo={() => onVote(tv.id, 'no')}
                    disabled={isLocked}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="single-vote-row">
            <span className="vote-label">Your vote</span>
            <VotePair
              value={vote}
              onYes={() => onVote('yes')}
              onNo={() => onVote('no')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
