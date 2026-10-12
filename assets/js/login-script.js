/* ============================================================
   ATLAS PSU - login page
   Chairperson and faculty share one form. Faculty pick who they are
   from the faculty list the chairperson saved in this browser.
   Real authentication is not available yet, so a session is only
   stored in sessionStorage for the dashboards to read.
   ============================================================ */
(function () {
  'use strict';

  const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@psu\.palawan\.edu\.ph$/i;
  const MIN_PASSWORD = 8;
  const OTHER = '__other';
  const DESTINATION = { chairperson: 'dashboard.html', faculty: '../faculty/dashboard.html' };

  const $ = id => document.getElementById(id);
  const form = $('authForm');
  const errorBox = $('errorMsg');
  const facultySelect = $('facultyName');
  const state = { role: 'chairperson', mode: 'signin' };

  /* ---------- Cached faculty list and profiles ---------- */
  function readJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch { return fallback; }
  }

  function facultyNames() {
    const names = readJSON('facultyData', []).map(f => f && f.name).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }

  function fillFacultyOptions() {
    const names = facultyNames();
    facultySelect.innerHTML = '';
    const add = (value, text, extra) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      Object.assign(option, extra);
      facultySelect.appendChild(option);
    };
    add('', 'Select your name', { disabled: true, selected: true });
    names.forEach(name => add(name, name));
    add(OTHER, 'My name is not listed');
    if (!names.length) {
      facultySelect.value = OTHER;
      $('facultyManual').hidden = false;
    }
  }

  /* ---------- Form state ---------- */
  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.toggle('show', Boolean(message));
  }

  function setActive(selector, attribute, value) {
    document.querySelectorAll(selector).forEach(button => {
      const active = button.dataset[attribute] === value;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active);
    });
  }

  function render() {
    form.dataset.role = state.role;
    form.dataset.mode = state.mode;
    setActive('.seg-btn', 'role', state.role);
    setActive('.tab-btn', 'mode', state.mode);
    const signUp = state.mode === 'signup';
    $('submitBtn').textContent = signUp ? 'Create Account' : 'Sign In';
    $('password').autocomplete = signUp ? 'new-password' : 'current-password';
    $('password').placeholder = signUp ? 'Create a password' : 'Enter password';
    showError('');
  }

  document.querySelectorAll('.seg-btn').forEach(button =>
    button.addEventListener('click', () => { state.role = button.dataset.role; render(); }));
  document.querySelectorAll('.tab-btn').forEach(button =>
    button.addEventListener('click', () => { state.mode = button.dataset.mode; render(); }));

  facultySelect.addEventListener('change', () => {
    const other = facultySelect.value === OTHER;
    $('facultyManual').hidden = !other;
    if (other) { $('facultyManual').focus(); return; }
    const profile = readJSON('facultyProfiles', {})[facultySelect.value];
    if (profile) {
      if (profile.email && !$('email').value) $('email').value = profile.email;
      if (profile.dept && !$('department').value) $('department').value = profile.dept;
    }
  });

  document.querySelectorAll('.pw-toggle').forEach(button =>
    button.addEventListener('click', () => {
      const input = $(button.dataset.target);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.textContent = show ? 'Hide' : 'Show';
      button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    }));

  /* ---------- Submit ---------- */
  function facultyChoice() {
    const value = facultySelect.value;
    return value === OTHER ? $('facultyManual').value.trim() : value;
  }

  function validate() {
    const signUp = state.mode === 'signup';
    const verb = signUp ? 'register' : 'sign in';
    const email = $('email').value.trim();
    const password = $('password').value;

    if (state.role === 'faculty' && !facultyChoice()) {
      return facultySelect.value === OTHER ? 'Please enter your full name.' : 'Please select your name.';
    }
    if (state.role === 'chairperson' && signUp && !$('fullName').value.trim()) return 'Please enter your full name.';
    if (!$('department').value) return 'Please select your department.';
    if (!EMAIL_PATTERN.test(email)) return `Please ${verb} with your PSU corporate email (name@psu.palawan.edu.ph).`;
    if (!password) return 'Please enter your password.';
    if (signUp) {
      if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
      if (password !== $('confirmPassword').value) return 'Passwords do not match.';
    }
    return '';
  }

  function startSession() {
    const dept = $('department').value;
    const email = $('email').value.trim();
    sessionStorage.clear();
    sessionStorage.setItem('atlasRole', state.role);
    sessionStorage.setItem('atlasDept', dept);

    if (state.role === 'faculty') {
      const name = facultyChoice();
      const profiles = readJSON('facultyProfiles', {});
      profiles[name] = { email, dept };
      try { localStorage.setItem('facultyProfiles', JSON.stringify(profiles)); } catch { /* storage unavailable */ }
      sessionStorage.setItem('atlasFaculty', name);
      sessionStorage.setItem('atlasUser', name);
      sessionStorage.setItem('atlasEmail', email);
    } else {
      const signUp = state.mode === 'signup';
      sessionStorage.setItem('atlasUser', signUp ? $('fullName').value.trim() : email);
    }
    window.location.href = DESTINATION[state.role];
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const message = validate();
    if (message) { showError(message); return; }
    startSession();
  });

  /* ---------- Start ---------- */
  fillFacultyOptions();
  if (new URLSearchParams(window.location.search).get('role') === 'faculty') state.role = 'faculty';
  render();
})();