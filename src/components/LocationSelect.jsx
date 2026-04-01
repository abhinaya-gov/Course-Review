import { voters } from '../data/courses';

export default function LocationSelect({ onSelect, onBack }) {
  const techVoters = voters.filter(v => v.department === 'Tech');

  return (
    <div className="home">
      <div className="home-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="home-logo">💻</div>
        <h1>Technology</h1>
        <p>Select your location to continue.</p>
      </div>
      <div className="location-cards">
        {techVoters.map(voter => (
          <button key={voter.id} className="location-card" onClick={() => onSelect(voter)}>
            <span className="location-name">{voter.location}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
