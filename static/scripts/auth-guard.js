// static/scripts/auth-guard.js

const role = localStorage.getItem('role');
const token = localStorage.getItem('access_token');
const paginaAtual = window.location.pathname.split('/').pop();

// 1. Redireciona para o login de forma ABSOLUTA caso não esteja autenticado
if (!token && paginaAtual !== 'login.html') {
    window.location.href = '/templates/login.html'; // Ajuste aqui para a rota real do seu login no Flask se for '/login'
}

function isAdmin() {
    return role === 'admin';
}

function isEmpresa() {
    return role === 'empresa';
}

function isUsuario() {
    return role === 'usuario';
}

// Controle do menu administrativo
document.addEventListener('DOMContentLoaded', () => {
    const menuAdmin = document.getElementById('menuAdmin');
    if (menuAdmin) {
        if (isAdmin()) {
            menuAdmin.style.display = 'block';
        } else {
            menuAdmin.style.display = 'none';
        }
    }
});

const paginasAdmin = [
    'admin_pontos.html',
    'admin_user.html',
    'admin_empresas.html',
    'admin_condominios.html'
];

if (paginasAdmin.includes(paginaAtual) && !isAdmin()) {
    alert('Acesso negado. Área restrita para administradores.');
    window.location.href = '/ecomap.html'; // Redirecionamento absoluto
}