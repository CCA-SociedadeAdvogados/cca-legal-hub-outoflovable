# Content-Security-Policy (CSP)

A CSP é aplicada via cabeçalhos HTTP no `vercel.json`.

## Estado atual: `Report-Only` (não bloqueia)

A política está em **`Content-Security-Policy-Report-Only`**: o browser **reporta**
violações na consola mas **não bloqueia** nada. Serve para validar a política em
produção sem risco antes de a tornar bloqueante.

## Origens externas conhecidas (já contempladas)

| Recurso | Origem | Diretiva |
|---|---|---|
| Supabase (REST, Storage, Functions) | `https://*.supabase.co` | `connect-src` |
| Supabase Realtime | `wss://*.supabase.co` | `connect-src` |
| Google Fonts (CSS) | `https://fonts.googleapis.com` | `style-src` |
| Google Fonts (ficheiros) | `https://fonts.gstatic.com` | `font-src` |
| Favicon / og:image / avatares / storage | vários `https:` | `img-src` (mantém `https:`) |

Notas:
- **LegalBI** (`https://bi.cca.law`) abre em **nova aba** (`window.open`) → navegação de topo, **não** precisa de entrada na CSP.
- **SharePoint** é acedido pelas Edge Functions (backend) → **não** precisa de entrada na CSP do browser.

## ⚠️ Falta confirmar antes de bloquear: `VITE_API_URL`

`src/components/contracts/ContractTriageAgent.tsx` faz `fetch` direto ao agente
externo de triagem em `import.meta.env.VITE_API_URL`. Essa **origem tem de ser
adicionada ao `connect-src`** na versão bloqueante (ex.: `https://o-teu-agente.onrender.com`).
Em desenvolvimento o fallback é `http://localhost:8000`.

## Como passar a bloqueante

1. Fazer deploy com a versão `Report-Only` (atual) e usar a app normalmente.
2. Na consola do browser, recolher as origens reportadas como violação (sobretudo
   o `connect-src` do `VITE_API_URL`, e quaisquer imagens/fontes externas).
3. Acrescentar essas origens às diretivas em baixo.
4. Trocar a chave do header de `Content-Security-Policy-Report-Only` para
   **`Content-Security-Policy`** no `vercel.json`.

## Política bloqueante proposta (preencher `VITE_API_URL`)

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: blob: https:;
font-src 'self' data: https://fonts.gstatic.com;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://<ORIGEM-DO-VITE_API_URL>;
frame-ancestors 'none';
object-src 'none';
base-uri 'self';
form-action 'self'
```

Valor para `vercel.json` (uma linha, já com a chave bloqueante):

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://<ORIGEM-DO-VITE_API_URL>; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
}
```

> Notas de design:
> - `style-src 'unsafe-inline'` é necessário (Tailwind/shadcn aplicam estilos inline; `chart.tsx` injeta um `<style>`). Remover `'unsafe-inline'` exigiria *nonces*/hashes em todos os estilos inline.
> - `img-src https:` é deliberadamente amplo (imagens são baixo risco e há várias origens: favicon, og, storage). Pode ser restringido às origens reais se se quiser apertar.
> - `script-src 'self'` — confirmado que o `index.html` não carrega scripts externos.
