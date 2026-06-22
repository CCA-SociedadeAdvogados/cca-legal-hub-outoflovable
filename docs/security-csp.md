# Content-Security-Policy (CSP)

A CSP é aplicada via cabeçalhos HTTP no `vercel.json`.

## Estado atual: `Content-Security-Policy` (bloqueante)

A política está **bloqueante**. O `script-src 'self'` está estrito (a proteção
mais importante — impede injeção/execução de scripts não próprios), tal como
`object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'` e `form-action 'self'`.

### `connect-src` ainda amplo (`https: wss:`) — aperto fino pendente

O `connect-src` permite, por agora, qualquer destino `https:`/`wss:`. Isto é
deliberado: o `ContractTriageAgent` faz `fetch` ao agente externo em
`VITE_API_URL`, cuja **origem exata ainda não foi confirmada**. Assim que essa
origem for conhecida, apertar para:

```
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://<ORIGEM-DO-VITE_API_URL>;
```

Até lá, manter `https: wss:` garante que o Triage e o Supabase funcionam sem
violações, mantendo já bloqueado o essencial (`script-src`, etc.).

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

## ⚠️ Aperto fino pendente: `VITE_API_URL`

`src/components/contracts/ContractTriageAgent.tsx` faz `fetch` direto ao agente
externo de triagem em `import.meta.env.VITE_API_URL`. Para apertar o `connect-src`
(remover o `https:` amplo), essa **origem tem de ser adicionada explicitamente**
(ex.: `https://o-teu-agente.onrender.com`). Em desenvolvimento o fallback é
`http://localhost:8000`.

## Política totalmente apertada (quando `VITE_API_URL` for conhecido)

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
