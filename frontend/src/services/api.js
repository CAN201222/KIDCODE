const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok && !data.error) data.error = 'La solicitud no se pudo completar.';
  return data;
}

export const registerUser = async (userData) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return readResponse(response);
};

export const loginUser = async (credentials) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  return readResponse(response);
};

export const saveProgress = async (token, progressData) => {
  const response = await fetch(`${API_URL}/progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(progressData),
  });

  return readResponse(response);
};

export const getTeacherProgress = async (token) => {
  const response = await fetch(`${API_URL}/progress/teacher`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return readResponse(response);
};

export const getStudentProgress = async (token) => {
  const response = await fetch(`${API_URL}/progress/student`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readResponse(response);
};
export const getStudentSettings = async (token) => {
  const response = await fetch(`${API_URL}/progress/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readResponse(response);
};

async function updateTeacherControl(token, path, body) {
  const response = await fetch(`${API_URL}/progress/classroom/${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return readResponse(response);
}

export const getTeacherControls = async (token) => {
  const response = await fetch(`${API_URL}/progress/classroom/controls`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readResponse(response);
};

export const setGameAvailability = (token, gameName, enabled) =>
  updateTeacherControl(token, `games/${encodeURIComponent(gameName)}`, { enabled });

export const setStudentDifficulty = (token, studentId, difficulty) =>
  updateTeacherControl(token, `students/${encodeURIComponent(studentId)}/difficulty`, { difficulty });

async function authenticatedRequest(token, path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_URL}/progress/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return readResponse(response);
}

export const getStudentProfile = (token) => authenticatedRequest(token, 'profile');
export const updateStudentProfile = (token, profile) =>
  authenticatedRequest(token, 'profile', { method: 'PUT', body: profile });
export const purchaseAvatarItem = (token, itemId) =>
  authenticatedRequest(token, 'profile/purchase', { method: 'POST', body: { itemId } });
export const saveGameReview = (token, review) =>
  authenticatedRequest(token, 'reviews', { method: 'POST', body: review });
export const getTeacherReviews = (token) => authenticatedRequest(token, 'reviews/teacher');
export const getLearningSections = (token) => authenticatedRequest(token, 'learning/sections');
export const saveLearningSection = (token, sectionId, section) =>
  authenticatedRequest(token, `learning/sections/${encodeURIComponent(sectionId)}`, { method: 'PUT', body: section });
export const saveLessonProgress = (token, sectionId, completedLessons) =>
  authenticatedRequest(token, `learning/sections/${encodeURIComponent(sectionId)}/progress`, {
    method: 'PUT',
    body: { completedLessons },
  });
export const submitLearningExam = (token, sectionId, answers) =>
  authenticatedRequest(token, `learning/sections/${encodeURIComponent(sectionId)}/exam`, {
    method: 'POST',
    body: { answers },
  });
export const getTeacherLearningResults = (token) => authenticatedRequest(token, 'learning/results/teacher');
