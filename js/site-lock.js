document.addEventListener('DOMContentLoaded', () => {
  const overlay   = document.getElementById('siteLockScreen');
  const pwdInput  = document.getElementById('sitePassword');
  const unlockBtn = document.getElementById('siteUnlockBtn');
  const errMsg    = document.getElementById('siteLockError');

  // se lo sblocco è già avvenuto in questa sessione, salta il blocco
  if (sessionStorage.getItem('siteUnlocked') === 'true') {
    overlay.remove();   // rimuove l’overlay, così non resta in DOM
    return;
  }

  const check = () => {
    const ok = pwdInput.value.trim() === 'tavernacani';   // ← cambia qui!
    if (ok){
      sessionStorage.setItem('siteUnlocked', 'true');
      overlay.remove();
    } else {
      errMsg.hidden = false;
      pwdInput.value = '';
      pwdInput.focus();
    }
  };

  unlockBtn.addEventListener('click',  check);
  pwdInput.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
});
