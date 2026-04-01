import { useState } from 'react';

const DEPT_OPTIONS = [
  { value: 'tech', label: 'Tech' },
  { value: 'business', label: 'Business' },
  { value: 'design', label: 'Design' },
  { value: 'all', label: 'All Departments' },
];

export default function AddCourseForm({ onSubmit, onClose, submitting }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    link: '',
    departments: [],
    skills: '',
    tools: '',
  });
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleDept = (value) => {
    setForm(prev => {
      const deps = prev.departments.includes(value)
        ? prev.departments.filter(d => d !== value)
        : [...prev.departments, value];
      return { ...prev, departments: deps };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError('Course title is required.');
      return;
    }
    if (!form.link.trim()) {
      setError('Course link is required.');
      return;
    }
    if (form.departments.length === 0) {
      setError('Select at least one department.');
      return;
    }

    const course = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      link: form.link.trim(),
      departments: form.departments,
      skills: form.skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      tools: form.tools
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
    };

    onSubmit(course);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Suggest a Course</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="add-course-form">
          <div className="form-group">
            <label className="form-label">
              Course Title <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Machine Learning with Python"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="A short description of what this course covers..."
              rows={3}
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Course Link <span className="required">*</span>
            </label>
            <input
              type="url"
              className="form-input"
              placeholder="https://www.coursera.org/learn/..."
              value={form.link}
              onChange={e => handleChange('link', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Department <span style={{ fontSize: '0.9em', color: '#6b7280', fontWeight: 'normal' }}>(Can choose more than 1)</span><span className="required">*</span>
            </label>
            <div className="dept-chips">
              {DEPT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`dept-chip ${form.departments.includes(opt.value) ? 'selected' : ''}`}
                  onClick={() => toggleDept(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Skills</label>
            <input
              type="text"
              className="form-input"
              placeholder="Comma-separated, e.g. Python, Data Analysis, Machine Learning"
              value={form.skills}
              onChange={e => handleChange('skills', e.target.value)}
            />
            <span className="form-hint">Separate with commas</span>
          </div>

          <div className="form-group">
            <label className="form-label">Tools</label>
            <input
              type="text"
              className="form-input"
              placeholder="Comma-separated, e.g. TensorFlow, Jupyter, Python"
              value={form.tools}
              onChange={e => handleChange('tools', e.target.value)}
            />
            <span className="form-hint">Separate with commas</span>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
