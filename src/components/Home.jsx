export default function Home({ onSelect }) {
  const departments = [
    // { id: 'design',   label: 'Design',     icon: '🎨', desc: 'UI/UX, Graphic Design, Motion & more' },
    // { id: 'business', label: 'Business',   icon: '💼', desc: 'Marketing, Sales, Management & more' },
    // { id: 'tech',     label: 'Technology', icon: '💻', desc: 'Engineering, AI, Data & more' },
    { id: 'design',   label: 'Design', desc: 'UI/UX, Graphic Design, Motion & more' },
    { id: 'business', label: 'Business', desc: 'Marketing, Sales, Management & more' },
    { id: 'tech',     label: 'Technology', desc: 'Engineering, AI, Data & more' },
  ];

  return (
    <div className="home">
      <div className="home-header">
        {/* <div className="home-logo">📚</div> */}
        <h1>Online Courses ZS 2028 Batch</h1>
        <p>Select your department below to start reviewing courses.</p>
      </div>
      <div className="dept-cards">
        {departments.map(dept => (
          <button key={dept.id} className="dept-card" onClick={() => onSelect(dept.id)}>
            <span className="dept-icon">{dept.icon}</span>
            <span className="dept-name">{dept.label}</span>
            <span className="dept-desc">{dept.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
