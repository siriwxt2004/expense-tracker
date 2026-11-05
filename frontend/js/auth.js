// js/auth.js
// จัดการหน้า login/register: สลับแท็บ, ส่งฟอร์ม, แสดงข้อความ error/success, toggle รหัสผ่าน

document.addEventListener('DOMContentLoaded', () => {
  // เริ่มต้นสร้าง icons ของ Lucide ถ้ามี
  if (window.lucide) {
    window.lucide.createIcons();
  }

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
    const iconName = isSuccess ? 'check-circle' : 'alert-circle';
    messageBox.innerHTML = `
      <i data-lucide="${iconName}" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
      <span>${text}</span>
    `;
    messageBox.hidden = false;
    messageBox.classList.toggle('is-success', isSuccess);
    if (window.lucide) window.lucide.createIcons();
  }

  function hideMessage() {
    messageBox.hidden = true;
    messageBox.innerHTML = '';
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
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // ปุ่มสลับดู/ซ่อนรหัสผ่าน
  document.querySelectorAll('.password-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.targetInput;
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      btn.innerHTML = isPassword
        ? '<i data-lucide="eye-off" style="width: 18px; height: 18px;"></i>'
        : '<i data-lucide="eye" style="width: 18px; height: 18px;"></i>';

      if (window.lucide) window.lucide.createIcons();
    });
  });

  // ส่งฟอร์ม login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>กำลังเข้าสู่ระบบ...</span>';

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const data = await api.login({ username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.user.username);
      window.location.href = 'dashboard.html';
    } catch (err) {
      showMessage(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // ส่งฟอร์ม register
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>กำลังบันทึกข้อมูล...</span>';

    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    try {
      await api.register({ username, email, password });
      registerForm.reset();
      // สลับกลับไปแท็บ login ให้อัตโนมัติ
      const loginTab = document.querySelector('.auth-tab[data-target="login-form"]');
      if (loginTab) loginTab.click();
      showMessage('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบด้วยบัญชีของคุณ', true);
    } catch (err) {
      showMessage(err.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      if (window.lucide) window.lucide.createIcons();
    }
  });
});
