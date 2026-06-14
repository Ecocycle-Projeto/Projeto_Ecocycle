// static/scripts/auth-guard.js

const role = localStorage.getItem('role');
const token = localStorage.getItem('access_token');

// Redireciona para login se não estiver autenticado
if (!token) {
    window.location.href = 'login.html';
}

// Função disponível globalmente em todas as páginas
function isAdmin() {
    return role === 'admin';
}

function isEmpresa() {
    return role === 'empresa';
}

function isUsuario() {
    return role === 'usuario';
}

document.addEventListener('DOMContentLoaded', () => {
    const menuAdmin = document.getElementById('menuAdmin');
    if (menuAdmin && isAdmin()) {
        menuAdmin.style.display = 'block';
    }
});

// Páginas que só admin pode acessar
const paginasAdmin = [
    'admin_pontos.html',
    'admin_user.html',
    'admin_empresas.html',
    'admin_condominios.html'
];

const paginaAtual = window.location.pathname.split('/').pop();

if (paginasAdmin.includes(paginaAtual) && !isAdmin()) {
    alert('Acesso negado. Área restrita para administradores.');
    window.location.href = 'ecomap.html';
}