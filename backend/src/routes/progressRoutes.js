  import express from 'express';
  import { saveProgress, getTeacherProgress, getStudentProgress } from '../controllers/progressController.js';
  import authMiddleware from '../middleware/authMiddleware.js';
  import requireRole from '../middleware/requireRole.js';
  import {
    getStudentSettings,
    getTeacherControls,
    setGameAvailability,
    setStudentDifficulty,
  } from '../controllers/classroomController.js';
  import {
    getStudentProfile,
    updateStudentProfile,
    purchaseAvatarItem,
    saveGameReview,
    getTeacherReviews,
    getLearningSections,
    updateLearningSection,
    saveLessonProgress,
    submitLearningExam,
    getTeacherLearningResults,
  } from '../controllers/experienceController.js';

  const router = express.Router();

  router.post('/', authMiddleware, requireRole('estudiante'), saveProgress);
  router.get('/teacher', authMiddleware, requireRole('docente'), getTeacherProgress);
  router.get('/student', authMiddleware, requireRole('estudiante'), getStudentProgress);
  router.get('/settings', authMiddleware, requireRole('estudiante'), getStudentSettings);
  router.get('/classroom/controls', authMiddleware, requireRole('docente'), getTeacherControls);
  router.put('/classroom/games/:gameName', authMiddleware, requireRole('docente'), setGameAvailability);
  router.put('/classroom/students/:studentId/difficulty', authMiddleware, requireRole('docente'), setStudentDifficulty);
  router.get('/profile', authMiddleware, requireRole('estudiante'), getStudentProfile);
  router.put('/profile', authMiddleware, requireRole('estudiante'), updateStudentProfile);
  router.post('/profile/purchase', authMiddleware, requireRole('estudiante'), purchaseAvatarItem);
  router.post('/reviews', authMiddleware, requireRole('estudiante'), saveGameReview);
  router.get('/reviews/teacher', authMiddleware, requireRole('docente'), getTeacherReviews);
  router.get('/learning/sections', authMiddleware, getLearningSections);
  router.put('/learning/sections/:sectionId', authMiddleware, requireRole('docente'), updateLearningSection);
  router.put('/learning/sections/:sectionId/progress', authMiddleware, requireRole('estudiante'), saveLessonProgress);
  router.post('/learning/sections/:sectionId/exam', authMiddleware, requireRole('estudiante'), submitLearningExam);
  router.get('/learning/results/teacher', authMiddleware, requireRole('docente'), getTeacherLearningResults);

  export default router;
