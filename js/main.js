// Logica basica per a la botiga
console.log("Botiga iniciada");

// Mostra l'usuari autenticat (o "Inicia sessio") a la dreta de la capcalera
document.addEventListener("DOMContentLoaded", () => {
  const userNameLink = document.getElementById("user-name");
  const logoutBtnHeader = document.getElementById("logout-btn-header");

  if (!userNameLink) return;

  const username = localStorage.getItem("username");

  if (username) {
    userNameLink.textContent = username;
    if (logoutBtnHeader) {
      logoutBtnHeader.style.display = "inline-block";
      logoutBtnHeader.addEventListener("click", () => {
        localStorage.removeItem("username");
        const loginHref = userNameLink.getAttribute("href") || "login.html";
        window.location.href = loginHref;
      });
    }
  } else {
    userNameLink.textContent = "Inicia sessio";
    if (logoutBtnHeader) {
      logoutBtnHeader.style.display = "none";
    }
  }
});
