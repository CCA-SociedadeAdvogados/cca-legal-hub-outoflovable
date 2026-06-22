# Content-Security-Policy (CSP)

A CSP é aplicada via cabeçalhos HTTP no `vercel.json`.

## Estado atual: `Content-Security-Policy` (bloqueante)

A política está **bloqueante**. O `script-src 'self'` está estrito (a proteção
mais importante — impede injeção/execução de scripts não próprios), tal como
`object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'` e `form-action 'self'`.

### `connect-src` apertado ao Supabase

O `connect-src` está restrito a `'self' https://*.supabase.co wss://*.supabase.co`.
Confirmou-se que **não existe `VITE_API_URL`** configurado no Vercel, pelo que o
frontend só comunica com o Supabase (REST, Storage, Functions, Realtime). Se for
adicionado um agente de triagem externo no futuro (`VITE_API_URL`), acrescentar
essa origem aqui:

```
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://<ORIGEM-DO-VITE_API_URL>;
```

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

## Nota: agente de triagem (`VITE_API_URL`)

`src/components/contracts/ContractTriageAgent.tsx` faz `fetch` a
`import.meta.env.VITE_API_URL` (fallback `http://localhost:8000`). Esta variável
**não está configurada no Vercel**, pelo que a triagem externa não tem backend em
produção. Se vier a ser ativada, adicionar a origem ao `connect-src`.

## Política bloqueante atual (em `vercel.json`)

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
}
```

> Notas de design:
> - `style-src 'unsafe-inline'` é necessário (Tailwind/shadcn aplicam estilos inline; `chart.tsx` injeta um `<style>`). Remover `'unsafe-inline'` exigiria *nonces*/hashes em todos os estilos inline.
> - `img-src https:` é deliberadamente amplo (imagens são baixo risco e há várias origens: favicon, og, storage). Pode ser restringido às origens reais se se quiser apertar.
> - `script-src 'self'` — confirmado que o `index.html` não carrega scripts externos.
