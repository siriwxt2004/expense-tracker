// js/auth.js
// จัดการหน้า login/register: สลับแท็บ, ส่งฟอร์ม, แสดงข้อความ error/success

document.addEventListener('DOMContentLoaded', () => {
  // ถ้า login อยู่แล้ว ให้ไปหน้า dashboard เลย
  if (localStorage.getItem('token')) {
    window.location.href = 'dashboard.html';
    return;
  }

  const tabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const messageBox = document.getElementById('auth-message');

  function showMessage(text, isSuccess = false) {
    messageBox.textContent = text;
    messageBox.hidden = false;
    messageBox.classList.toggle('is-success', isSuccess);
  }

  function hideMessage() {
    messageBox.hidden = true;
  }

  // สลับแท็บ login / register
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      hideMessage();

      const target = tab.dataset.target;
      loginForm.hidden = target !== 'login-form';
      registerForm.hidden = target !== 'register-form';
    });
  });

  // ส่งฟอร์ม login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const data = await api.login({ username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.user.username);
      window.location.href = 'dashboard.html';
    } catch (err) {
      showMessage(err.message);
    }
  });

  // ส่งฟอร์ม register
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    try {
      await api.register({ username, email, password });
      showMessage('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ', true);
      registerForm.reset();
      // สลับกลับไปแท็บ login ให้อัตโนมัติ
      document.querySelector('.auth-tab[data-target="login-form"]').click();
      showMessage('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ', true);
    } catch (err) {
      showMessage(err.message);
    }
  });
});
