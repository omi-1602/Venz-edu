// Simple localStorage-backed mock database to unblock flows quickly.
// Collections: users, courses, enrollments, assignments, submissions

(function () {
  const LS = window.localStorage;

  function initMockDb() {
    if (!LS.getItem('mock_users')) LS.setItem('mock_users', JSON.stringify([]));
    if (!LS.getItem('mock_courses')) LS.setItem('mock_courses', JSON.stringify([]));
    if (!LS.getItem('mock_enrollments')) LS.setItem('mock_enrollments', JSON.stringify([]));
    if (!LS.getItem('mock_assignments')) LS.setItem('mock_assignments', JSON.stringify([]));
    if (!LS.getItem('mock_submissions')) LS.setItem('mock_submissions', JSON.stringify([]));
  }

  function uid() {
    return 'mock_' + Math.random().toString(36).slice(2, 10);
  }

  function getUsers() { return JSON.parse(LS.getItem('mock_users') || '[]'); }
  function setUsers(v) { LS.setItem('mock_users', JSON.stringify(v)); }

  function findUserByEmail(email) { return getUsers().find(u => u.email === email); }

  async function signUpMock({ email, password, displayName, role }) {
    initMockDb();
    if (!email || !password || !displayName || !role) throw new Error('Missing fields');
    const exists = findUserByEmail(email);
    if (exists) throw new Error('User already exists');
    const u = {
      uid: uid(), email, password, displayName, role,
      verified: true, status: 'active', createdAt: Date.now(), lastLogin: Date.now()
    };
    const users = getUsers(); users.push(u); setUsers(users);
    LS.setItem('user', JSON.stringify({ uid: u.uid, email: u.email, displayName: u.displayName, role: u.role }));
    return { success: true, user: u };
  }

  async function loginMock({ email, password }) {
    initMockDb();
    const u = findUserByEmail(email);
    if (!u || u.password !== password) throw new Error('Invalid credentials');
    u.lastLogin = Date.now(); setUsers(getUsers().map(x => x.uid === u.uid ? u : x));
    LS.setItem('user', JSON.stringify({ uid: u.uid, email: u.email, displayName: u.displayName, role: u.role }));
    return { success: true, user: u };
  }

  async function googleLoginMock() {
    initMockDb();
    const email = `user_${uid()}@mock.local`; const displayName = 'Mock User';
    const u = { uid: uid(), email, password: null, displayName, role: 'student', verified: true, status: 'active', createdAt: Date.now(), lastLogin: Date.now() };
    const users = getUsers(); users.push(u); setUsers(users);
    LS.setItem('user', JSON.stringify({ uid: u.uid, email: u.email, displayName: u.displayName, role: u.role }));
    return { success: true, user: u };
  }

  async function resetPasswordMock(email) {
    initMockDb();
    const u = findUserByEmail(email);
    if (!u) throw new Error('User not found');
    return { success: true, message: 'Mock reset link generated' };
  }

  function seedMockData() {
    initMockDb();
    const courses = JSON.parse(LS.getItem('mock_courses')); if (courses.length) return;
    const courseId = uid();
    courses.push({
      id: courseId,
      title: 'Mastering Java: From Zero to Hero',
      description: 'Comprehensive Java course aligned with dashboard',
      mentorId: 'mentor-sample', mentorName: 'Sample Mentor',
      category: 'programming', level: 'beginner', isPublished: true,
      createdAt: Date.now(), rating: 4.8
    });
    LS.setItem('mock_courses', JSON.stringify(courses));
    LS.setItem('mock_assignments', JSON.stringify([
      { id: uid(), courseId, title: 'Assignment 1: Intro to Java', dueDate: Date.now() + 7*24*3600*1000, maxScore: 100, createdAt: Date.now() }
    ]));
  }

  // Expose globally
  window.mockDb = {
    initMockDb,
    signUpMock,
    loginMock,
    googleLoginMock,
    resetPasswordMock,
    seedMockData,
  };
})();
