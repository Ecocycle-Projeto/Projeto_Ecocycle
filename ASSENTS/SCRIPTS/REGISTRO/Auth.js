// ASSENTS/SCRIPTS/REGISTRO/Auth.js
class Auth {
    static socket = null;
    static connected = false;

    static async connect() {
        return new Promise((resolve, reject) => {
            if (this.connected) return resolve(true);
            
            this.socket = new WebSocket("ws://localhost:8765");
            
            this.socket.onopen = () => {
                this.connected = true;
                console.log("Conectado ao servidor WebSocket");
                resolve(true);
            };
            
            this.socket.onerror = (error) => {
                console.error("Erro na conexão WebSocket:", error);
                reject(error);
            };
            
            this.socket.onclose = () => {
                this.connected = false;
                console.log("Conexão WebSocket fechada");
            };
        });
    }

    static async login(email, senha) {
        try {
            await this.connect();
            
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    resolve({ success: false, message: "Tempo de conexão esgotado" });
                }, 5000);
                
                const handler = (event) => {
                    clearTimeout(timeout);
                    resolve(JSON.parse(event.data));
                    this.socket.removeEventListener('message', handler);
                };
                
                this.socket.addEventListener('message', handler);
                this.socket.send(JSON.stringify({
                    action: "login",
                    email: email,
                    senha: senha
                }));
            });
        } catch (error) {
            return { success: false, message: "Erro ao conectar com o servidor" };
        }
    }

    static async cadastrar(nome, email, senha) {
        try {
            await this.connect();
            
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    resolve({ success: false, message: "Tempo de conexão esgotado" });
                }, 5000);
                
                const handler = (event) => {
                    clearTimeout(timeout);
                    resolve(JSON.parse(event.data));
                    this.socket.removeEventListener('message', handler);
                };
                
                this.socket.addEventListener('message', handler);
                this.socket.send(JSON.stringify({
                    action: "cadastro",
                    nome: nome,
                    email: email,
                    senha: senha
                }));
            });
        } catch (error) {
            return { success: false, message: "Erro ao conectar com o servidor" };
        }
    }
}