import { useCallback, useEffect, useState } from 'react';
import { BookOpen, MessageSquare, Sprout } from 'lucide-react';
import { getLearningSections, getTeacherLearningResults, getTeacherReviews, saveLearningSection } from '../../services/api';
import './TeacherEducation.css';

const gameNames = {
  'logic-game': 'Algoritmos del explorador',
  'sequence-game': 'Red de servidores',
  'patch-cable': 'Patch Cable',
  'stack-balancer': 'Stack Balancer',
  'bug-game': 'Clínica de código',
};

function StudentReviewsPanel({ token }) {
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getTeacherReviews(token).then((data) => {
      if (!active) return;
      if (data.error) throw new Error(data.error);
      setReviews(data.reviews || []);
    }).catch((loadError) => {
      if (active) setError(loadError.message || 'No se pudieron cargar las opiniones.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        getTeacherReviews(token).then((data) => {
          if (data.error) throw new Error(data.error);
          if (active) setReviews(data.reviews || []);
        }).catch((loadError) => {
          if (active) setError(loadError.message || 'No se pudieron actualizar las opiniones.');
        });
      }
    }, 10000);
    return () => { active = false; window.clearInterval(interval); };
  }, [token]);

  return <section className="teacher-education">
    <div className="page-heading"><div><div className="eyebrow">VOZ DEL GRUPO</div><h1>Opiniones de estudiantes</h1><p>Lee el feedback sobre los juegos para ajustar las próximas misiones.</p></div><span className="education-heading-icon"><MessageSquare aria-hidden="true" /></span></div>
    {error && <div className="alert error" role="alert">{error}</div>}
    <div className="panel feedback-panel"><div className="panel-head"><div><h2>Valoraciones recientes</h2><span className="stat-note">Actualización automática cada 10 segundos</span></div><span className="badge">{reviews.length} opiniones</span></div>
      {loading ? <div className="empty-state">Cargando opiniones…</div> : reviews.length ? <div className="teacher-review-grid">{reviews.map((review) => <article className="teacher-review-card" key={review.id}><div className="teacher-review-top"><strong>{review.student_name}</strong><time>{new Date(`${review.created_at.replace(' ', 'T')}Z`).toLocaleDateString('es-CO')}</time></div><span className="teacher-review-game">{gameNames[review.game_name] || review.game_name}</span><div className="teacher-review-stars" aria-label={`${review.stars} de 5 estrellas`}>{'★'.repeat(review.stars)}<span>{'★'.repeat(5 - review.stars)}</span></div><span className="teacher-review-tag">{review.tag}</span>{review.comment && <p>“{review.comment}”</p>}</article>)}</div> : <div className="empty-state"><Sprout aria-hidden="true" />Aún no hay opiniones. Cuando tus estudiantes envíen feedback, aparecerá aquí.</div>}
    </div>
  </section>;
}

function blankSection() {
  return {
    title: 'Nueva sección',
    ageRange: '5–13 años',
    description: '',
    lessons: [{ title: 'Nueva lección', reading: '', example: '' }],
    questions: [{ prompt: '', options: ['', '', ''], answer: 0, explanation: '' }],
  };
}

function copySection(section) {
  return {
    title: section.title,
    ageRange: section.ageRange,
    description: section.description,
    lessons: section.lessons.map((lesson) => ({ ...lesson })),
    questions: section.questions.map((question) => ({ ...question, options: [...question.options] })),
  };
}

function TeacherAcademyPanel({ token }) {
  const [sections, setSections] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sectionsData, resultData] = await Promise.all([getLearningSections(token), getTeacherLearningResults(token)]);
      if (sectionsData.error) throw new Error(sectionsData.error);
      if (resultData.error) throw new Error(resultData.error);
      const loadedSections = sectionsData.sections || [];
      setSections(loadedSections);
      setResults(resultData.results || []);
      const selectedSection = loadedSections.find((section) => section.id === selectedId) || loadedSections[0];
      if (selectedSection) {
        setSelectedId(selectedSection.id);
        setDraft(copySection(selectedSection));
      }
    } catch (loadError) {
      setError(loadError.message || 'No se pudo cargar el módulo educativo.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedId]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    let active = true;
    const refreshResults = () => {
      if (document.visibilityState !== 'visible') return;
      getTeacherLearningResults(token).then((data) => {
        if (data.error) throw new Error(data.error);
        if (active) setResults(data.results || []);
      }).catch((loadError) => {
        if (active) setError(loadError.message || 'No se pudieron actualizar los resultados.');
      });
    };
    const interval = window.setInterval(refreshResults, 10000);
    return () => { active = false; window.clearInterval(interval); };
  }, [token]);

  const changeDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const changeLesson = (index, key, value) => setDraft((current) => ({
    ...current,
    lessons: current.lessons.map((lesson, lessonIndex) => lessonIndex === index ? { ...lesson, [key]: value } : lesson),
  }));
  const changeQuestion = (index, key, value) => setDraft((current) => ({
    ...current,
    questions: current.questions.map((question, questionIndex) => questionIndex === index ? { ...question, [key]: value } : question),
  }));
  const changeOption = (questionIndex, optionIndex, value) => setDraft((current) => ({
    ...current,
    questions: current.questions.map((question, index) => index === questionIndex
      ? { ...question, options: question.options.map((option, itemIndex) => itemIndex === optionIndex ? value : option) }
      : question),
  }));

  const addSection = () => {
    const id = `seccion-${Date.now()}`;
    setSections((current) => [...current, { id, ...blankSection() }]);
    setSelectedId(id);
    setDraft(blankSection());
    setMessage('');
  };

  const selectSection = (section) => {
    setSelectedId(section.id);
    setDraft(copySection(section));
    setMessage('');
  };

  const save = async (event) => {
    event.preventDefault();
    if (!selectedId || !draft) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await saveLearningSection(token, selectedId, draft);
      if (response.error) throw new Error(response.error);
      setSections((current) => {
        const updated = { id: selectedId, ...draft };
        const existingIndex = current.findIndex((section) => section.id === selectedId);
        return existingIndex < 0 ? [...current, updated] : current.map((section) => section.id === selectedId ? updated : section);
      });
      setMessage('Sección guardada. Los cambios ya están disponibles para el grupo.');
    } catch (saveError) {
      setError(saveError.message || 'No se pudo guardar la sección.');
    } finally {
      setSaving(false);
    }
  };

  return <section className="teacher-education">
    <div className="page-heading"><div><div className="eyebrow">CMS EDUCATIVO</div><h1>Aprende Código</h1><p>Edita lecturas, ejemplos y parciales. Los resultados aprobados quedan registrados aquí.</p></div><span className="education-heading-icon"><BookOpen aria-hidden="true" /></span></div>
    {error && <div className="alert error" role="alert">{error}</div>}
    {message && <div className="alert success" role="status">{message}</div>}
    <div className="panel teacher-academy-editor"><div className="panel-head"><div><h2>Contenido de las secciones</h2><span className="stat-note">Las preguntas se evalúan en el servidor; se aprueba con 70%.</span></div><button className="secondary-btn" type="button" onClick={addSection}>＋ Crear sección</button></div>
      {loading ? <div className="empty-state">Cargando secciones…</div> : <>
        <div className="academy-editor-layout"><nav className="academy-editor-nav" aria-label="Secciones para editar">{sections.map((section) => <button type="button" key={section.id} className={selectedId === section.id ? 'active' : ''} onClick={() => selectSection(section)}>{section.title}</button>)}</nav>
          {draft && <form className="academy-editor-form" onSubmit={save}>
            <label>Título<input required maxLength="100" value={draft.title} onChange={(event) => changeDraft('title', event.target.value)} /></label>
            <label>Edad sugerida<input maxLength="30" value={draft.ageRange} onChange={(event) => changeDraft('ageRange', event.target.value)} /></label>
            <label>Descripción<textarea required rows="2" value={draft.description} onChange={(event) => changeDraft('description', event.target.value)} /></label>
            <div className="cms-section-title"><h3>Lecturas y ejemplos</h3><button type="button" className="quiet-btn" onClick={() => changeDraft('lessons', [...draft.lessons, { title: '', reading: '', example: '' }])}>＋ Agregar lectura</button></div>
            {draft.lessons.map((lesson, index) => <fieldset className="cms-item" key={`lesson-${index}`}><legend>Lección {index + 1}</legend><label>Título<input required value={lesson.title} onChange={(event) => changeLesson(index, 'title', event.target.value)} /></label><label>Lectura<textarea required rows="3" value={lesson.reading} onChange={(event) => changeLesson(index, 'reading', event.target.value)} /></label><label>Ejemplo<textarea required rows="2" value={lesson.example} onChange={(event) => changeLesson(index, 'example', event.target.value)} /></label></fieldset>)}
            <div className="cms-section-title"><h3>Preguntas del parcial</h3><button type="button" className="quiet-btn" onClick={() => changeDraft('questions', [...draft.questions, { prompt: '', options: ['', '', ''], answer: 0, explanation: '' }])}>＋ Agregar pregunta</button></div>
            {draft.questions.map((question, questionIndex) => <fieldset className="cms-item" key={`question-${questionIndex}`}><legend>Pregunta {questionIndex + 1}</legend><label>Enunciado<input required value={question.prompt} onChange={(event) => changeQuestion(questionIndex, 'prompt', event.target.value)} /></label><div className="cms-option-grid">{question.options.map((option, optionIndex) => <label key={`option-${optionIndex}`}>Opción {String.fromCharCode(65 + optionIndex)}<input required value={option} onChange={(event) => changeOption(questionIndex, optionIndex, event.target.value)} /></label>)}</div><label>Respuesta correcta<select value={question.answer} onChange={(event) => changeQuestion(questionIndex, 'answer', Number(event.target.value))}>{question.options.map((_, optionIndex) => <option value={optionIndex} key={optionIndex}>Opción {String.fromCharCode(65 + optionIndex)}</option>)}</select></label><label>Explicación<textarea required rows="2" value={question.explanation} onChange={(event) => changeQuestion(questionIndex, 'explanation', event.target.value)} /></label></fieldset>)}
            <button className="primary-btn" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar contenido de la sección'}</button>
          </form>}
        </div>
      </>}
    </div>
    <div className="panel"><div className="panel-head"><div><h2>Resultados de parciales</h2><span className="stat-note">Registro en tiempo real de intentos y certificaciones</span></div><span className="badge">{results.length} resultados</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Estudiante</th><th>Sección</th><th>Calificación</th><th>Respuestas</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>{results.map((result) => <tr key={result.id}><td>{result.studentName}</td><td>{result.sectionTitle}</td><td>{Number(result.score).toFixed(1)}%</td><td>{result.correctAnswers}/{result.totalQuestions}</td><td><span className={`badge ${result.passed ? '' : 'badge-warning'}`}>{result.passed ? 'Aprobado' : 'Por reforzar'}</span></td><td>{new Date(`${result.completedAt.replace(' ', 'T')}Z`).toLocaleString('es-CO')}</td></tr>)}{!results.length && <tr><td className="empty-state" colSpan="6">Todavía no hay resultados de parciales.</td></tr>}</tbody></table></div></div>
  </section>;
}

export default function TeacherEducation({ token, section }) {
  return section === 'feedback' ? <StudentReviewsPanel token={token} /> : <TeacherAcademyPanel token={token} />;
}
