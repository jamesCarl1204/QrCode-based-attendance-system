document.addEventListener('DOMContentLoaded', () => {
  const loginSelector = document.getElementById('loginSelector');
  const loginFormWrap = document.getElementById('loginFormWrap');
  const registerView = document.getElementById('registerView');
  const forgotPasswordView = document.getElementById('forgotPasswordView');

  const roleCards = document.querySelectorAll('.role-tab-btn');
  const backToRoles = document.getElementById('backToRoles');
  const goToRegister = document.getElementById('goToRegister');
  const goToLogin = document.getElementById('goToLogin');
  const goToForgotPassword = document.getElementById('goToForgotPassword');
  const backFromForgot = document.getElementById('backFromForgot');

  const loginTitle = document.getElementById('loginTitle');
  const loginSubtext = document.getElementById('loginSubtext');
  const loginFormIcon = document.getElementById('loginFormIcon');
  const loginForm = document.getElementById('loginForm');
  const loginGeneralError = document.getElementById('loginGeneralError');
  const loginEmailError = document.getElementById('loginEmailError');
  const loginPasswordError = document.getElementById('loginPasswordError');

  const registerForm = document.getElementById('registerForm');
  const registerGeneralError = document.getElementById('registerGeneralError');

  const forgotPasswordTitle = document.getElementById('forgotPasswordTitle');
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  const forgotPasswordGeneralError = document.getElementById('forgotPasswordGeneralError');
  const forgotPasswordSuccess = document.getElementById('forgotPasswordSuccess');
  const forgotEmailError = document.getElementById('forgotEmailError');
  const forgotNewPasswordError = document.getElementById('forgotNewPasswordError');
  const forgotConfirmPasswordError = document.getElementById('forgotConfirmPasswordError');

  let currentRole = 'student';

  function showPanel(panel) {
    [loginSelector, loginFormWrap, registerView, forgotPasswordView].forEach(p => p.classList.remove('active'));
    panel.classList.add('active');
  }

  roleCards.forEach(card => {
    card.addEventListener('click', () => {
      roleCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentRole = card.dataset.role;

      clearLoginErrors();

      if (currentRole === 'teacher') {
        loginTitle.textContent = 'Teacher Login';
        loginSubtext.textContent = 'Log in to manage your classes';
        loginFormIcon.className = 'fas fa-chalkboard-teacher';
      } else {
        loginTitle.textContent = 'Student Login';
        loginSubtext.textContent = 'Log in to view your attendance';
        loginFormIcon.className = 'fas fa-user-graduate';
      }

      showPanel(loginFormWrap);
    });
  });

  backToRoles.addEventListener('click', () => {
    loginForm.reset();
    clearLoginErrors();
    showPanel(loginSelector);
  });

  goToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    showPanel(registerView);
  });

  goToLogin.addEventListener('click', () => {
    registerForm.reset();
    clearRegisterErrors();
    showPanel(loginSelector);
  });

  goToForgotPassword.addEventListener('click', (e) => {
    e.preventDefault();
    clearForgotErrors();
    forgotPasswordForm.reset();
    forgotPasswordSuccess.textContent = '';
    forgotPasswordSuccess.classList.remove('active');
    forgotPasswordTitle.textContent = currentRole === 'teacher' ? 'Reset Teacher Password' : 'Reset Student Password';
    showPanel(forgotPasswordView);
  });

  backFromForgot.addEventListener('click', () => {
    forgotPasswordForm.reset();
    clearForgotErrors();
    showPanel(loginFormWrap);
  });

  function clearLoginErrors() {
    loginGeneralError.textContent = '';
    loginGeneralError.classList.remove('active');
    loginEmailError.textContent = '';
    loginPasswordError.textContent = '';
  }

 function clearRegisterErrors() {
  registerGeneralError.textContent = '';
  registerGeneralError.classList.remove('active');
  ['studentIdNumber', 'firstName', 'middleName', 'lastName', 'registerEmail', 'registerPassword', 'confirmPassword', 'parentEmail']
    .forEach(id => {
      const el = document.getElementById(id + 'Error');
      if (el) el.textContent = '';
    });
}

  function clearForgotErrors() {
    forgotPasswordGeneralError.textContent = '';
    forgotPasswordGeneralError.classList.remove('active');
    forgotEmailError.textContent = '';
    forgotNewPasswordError.textContent = '';
    forgotConfirmPasswordError.textContent = '';
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearLoginErrors();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const endpoint = currentRole === 'teacher' ? '/api/login/teacher' : '/api/login/student';

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in…';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        // Keep the loading state active through the redirect so the button
        // doesn't flash back before the browser navigates away.
        window.location.href = data.redirect;
        return;
      } else {
        if (data.generalError) {
          loginGeneralError.textContent = data.generalError;
          loginGeneralError.classList.add('active');
        }
        if (data.errors) {
          if (data.errors.email) loginEmailError.textContent = data.errors.email;
          if (data.errors.password) loginPasswordError.textContent = data.errors.password;
        }
      }
    } catch (err) {
      loginGeneralError.textContent = 'Unable to reach the server. Please try again.';
      loginGeneralError.classList.add('active');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  });

  registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearRegisterErrors();

  const submitBtn = registerForm.querySelector('button[type="submit"]');
  const originalBtnHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account…';

  const payload = {
    studentIdNumber: document.getElementById('studentIdNumber').value.trim(),
    firstName: document.getElementById('firstName').value.trim(),
    middleName: document.getElementById('middleName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    email: document.getElementById('registerEmail').value.trim(),
    password: document.getElementById('registerPassword').value,
    confirmPassword: document.getElementById('confirmPassword').value,
    parentEmail: document.getElementById('parentEmail').value.trim()
  };

  try {
    const res = await fetch('/api/register/student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      
      window.location.href = data.redirect;
      return;
    } else {
      if (data.generalError) {
        registerGeneralError.textContent = data.generalError;
        registerGeneralError.classList.add('active');
      }
      if (data.errors) {
        const map = {
          studentIdNumber: 'studentIdNumberError',
          firstName: 'firstNameError',
          middleName: 'middleNameError',
          lastName: 'lastNameError',
          email: 'registerEmailError',
          password: 'registerPasswordError',
          confirmPassword: 'confirmPasswordError',
          parentEmail: 'parentEmailError'
        };
        Object.keys(data.errors).forEach(key => {
          const el = document.getElementById(map[key]);
          if (el) el.textContent = data.errors[key];
        });
      }
    }
  } catch (err) {
    registerGeneralError.textContent = 'Unable to reach the server. Please try again.';
    registerGeneralError.classList.add('active');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
  }
});

  forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearForgotErrors();
    forgotPasswordSuccess.textContent = '';
    forgotPasswordSuccess.classList.remove('active');

    const email = document.getElementById('forgotEmail').value.trim();
    const newPassword = document.getElementById('forgotNewPassword').value;
    const confirmNewPassword = document.getElementById('forgotConfirmPassword').value;
    const endpoint = currentRole === 'teacher' ? '/api/forgot-password/teacher' : '/api/forgot-password/student';

    const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting…';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, newPassword, confirmNewPassword })
      });
      const data = await res.json();

      if (data.success) {
        forgotPasswordForm.reset();
        forgotPasswordSuccess.textContent = 'Password reset successful. You can now log in with your new password.';
        forgotPasswordSuccess.classList.add('active');
      } else {
        if (data.generalError) {
          forgotPasswordGeneralError.textContent = data.generalError;
          forgotPasswordGeneralError.classList.add('active');
        }
        if (data.errors) {
          if (data.errors.email) forgotEmailError.textContent = data.errors.email;
          if (data.errors.newPassword) forgotNewPasswordError.textContent = data.errors.newPassword;
          if (data.errors.confirmNewPassword) forgotConfirmPasswordError.textContent = data.errors.confirmNewPassword;
        }
      }
    } catch (err) {
      forgotPasswordGeneralError.textContent = 'Unable to reach the server. Please try again.';
      forgotPasswordGeneralError.classList.add('active');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  });

  showPanel(loginSelector);
});