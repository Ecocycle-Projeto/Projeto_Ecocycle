//-- O código Abaixo é referente ao botão principal da página index. 

document.addEventListener("DOMContentLoaded", function() {
    const botao = document.getElementById("botao-principal");
  
    botao.addEventListener("click", function() {
      window.location.href = "login.html";
    });

//-- O código abaixo é referente ao botão de extensão.

  });

document.addEventListener("DOMContentLoaded", function(){
    document.getElementById("botão-extensão").addEventListener("click", function() {
        const section = document.getElementById("section-tres");
        if (section.style.display === "none") {
          section.style.display = "block";
        } else {
          section.style.display = "none";
        }
      });
});

document.addEventListener("DOMContentLoaded", function(){
    const botao1 = document.getElementById("botao-section-tres");

    botao1.addEventListener("click", function(){
      window.location.href = "login.html"
    });
});