# CCA Legal Hub

## Sobre o projecto

Plataforma de gestão jurídica para CCA - Sociedade de Advogados.

## Como editar o código

**Usando o seu IDE**

Clone o repositório e trabalhe localmente. Necessita de Node.js & npm instalados.

```sh
# Clonar o repositório
git clone <YOUR_GIT_URL>

# Entrar na pasta do projecto
cd <YOUR_PROJECT_NAME>

# Instalar dependências
npm i

# Iniciar o servidor de desenvolvimento
npm run dev
```

**Editar directamente no GitHub**

- Navegue até ao ficheiro desejado.
- Clique no botão "Edit" (ícone de lápis) no canto superior direito.
- Faça as alterações e confirme o commit.

**Usar GitHub Codespaces**

- Navegue até à página principal do repositório.
- Clique no botão "Code" (botão verde) perto do canto superior direito.
- Seleccione o separador "Codespaces".
- Clique em "New codespace" para lançar um novo ambiente Codespace.

## Tecnologias utilizadas

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## Variáveis de ambiente necessárias (Supabase Edge Functions)

- `OPENROUTER_API_KEY` — chave de API do OpenRouter para chamadas de IA
- `SUPABASE_URL` — URL do projecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — chave de serviço do Supabase
