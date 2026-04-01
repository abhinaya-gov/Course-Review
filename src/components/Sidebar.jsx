export default function Sidebar({ department, location, votedCount, savedCount, totalCount, onSubmit, submitting, error, onBack, onChangeLocation }) {
  const progress = totalCount > 0 ? (savedCount / totalCount) * 100 : 0;

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-logo">
          {/* <span className="logo-icon">📚</span> */}
          <span className="logo-text">Course Approvals</span>
        </div>

        <div className="voter-identity">
          <p className="sidebar-label">Reviewing as</p>
          <div className="identity-badge">
            <span className="identity-dept">{department}</span>
            {location && <span className="identity-location">{location}</span>}
          </div>
          {onChangeLocation && (
            <button className="btn-change-location" onClick={onChangeLocation}>Change location</button>
          )}
        </div>
      </div>

      <div className="sidebar-bottom">
        <div className="progress-section">
          <div className="progress-label">
            <span>Progress</span>
            <span className="progress-count">{savedCount} / {totalCount}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <button
          className="btn-submit"
          onClick={onSubmit}
          disabled={submitting || votedCount === 0}
        >
          {/* {submitting ? 'Submitting...' : `Submit ${votedCount} Review${votedCount !== 1 ? 's' : ''}`} */}
          {submitting ? 'Submitting...' : `Submit My Choice${votedCount !== 1 ? 's' : ''}`}
        </button>

        {error && <p className="sidebar-error">{error}</p>}

        <button className="back-link" onClick={onBack}>← Change department</button>
      </div>
    </aside>
  );
}
