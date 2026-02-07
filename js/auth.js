// Frontend authentication helpers using Firebase (Compat)

// Ensure firebaseConfig and SDKs are loaded before this script.

// Sign Up
async function signUp({ email, password, displayName, role }) {
  try {
    const signupFn = firebase.functions().httpsCallable("signupUser");
    const res = await signupFn({ email, password, displayName, role });
    alert(res.data.message || "Account created");
    return res.data;
  } catch (e) {
    console.warn("Signup failed; falling back to mock DB:", e?.message || e);
    try {
      const res = await window.mockDb.signUpMock({ email, password, displayName, role });
      alert("signup successful");
      window.location.href = "dash.html";
      return res;
    } catch (e) {
      alert("Error: " + (e.message || "Signup failed"));
      throw e;
    }
  }
}

// Login (email/password via Firebase Auth + server metadata update)
async function login({ email, password }) {
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    const loginFn = firebase.functions().httpsCallable("loginUser");
    const res = await loginFn({ email });
    localStorage.setItem("user", JSON.stringify(res.data.user));
    window.location.href = "dash.html";
    return res.data;
  } catch (e) {
    console.warn("Login failed; falling back to mock DB:", e?.message || e);
    try {
      const res = await window.mockDb.loginMock({ email, password });
      alert("login successful");
      window.location.href = "dash.html";
      return res;
    } catch (e) {
      alert("Error: " + (e.message || "Login failed"));
      throw e;
    }
  }
}

// Google Login
async function googleLogin() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    // Force account selection to avoid silent sign-in with cached account
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await firebase.auth().signInWithPopup(provider);
    const idToken = await result.user.getIdToken();
    const fn = firebase.functions().httpsCallable("handleGoogleLogin");
    const res = await fn({ idToken });
    localStorage.setItem("user", JSON.stringify(res.data.user));
    window.location.href = "dash.html";
    return res.data;
  } catch (e) {
    console.warn("Google login failed; using mock:", e?.message || e);
    try {
      const res = await window.mockDb.googleLoginMock();
      alert("google login successful");
      window.location.href = "dash.html";
      return res;
    } catch (e) {
      alert("Error: " + (e.message || "Google login failed"));
      throw e;
    }
  }
}

// Password Reset
async function resetPassword(email) {
  try {
    const fn = firebase.functions().httpsCallable("requestPasswordReset");
    const res = await fn({ email });
    alert(res.data.message || "Reset link sent");
    return res.data;
  } catch (e) {
    console.warn("Reset failed; using mock:", e?.message || e);
    try {
      const res = await window.mockDb.resetPasswordMock(email);
      alert(res.message || "reset link generated");
      return res;
    } catch (e) {
      alert("Error: " + (e.message || "Reset failed"));
      throw e;
    }
  }
}

// Logout
async function logout() {
  await firebase.auth().signOut();
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// Expose globally for inline handlers
window.signUp = signUp;
window.login = login;
window.googleLogin = googleLogin;
window.resetPassword = resetPassword;
window.logout = logout;
