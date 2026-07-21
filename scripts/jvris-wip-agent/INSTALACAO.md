# Instalação do agente "JVRIS WIP Sync" — guia para IT

> **Para:** administrador de sistemas CCA
> **Objetivo:** instalar um script agendado que copia diariamente os registos
> de trabalho do JVRIS (base `CCA_WIP`) para a base de dados do Legal Hub
> (portal do cliente CCA, alojado no Supabase).
> **Tempo estimado:** 15–20 minutos.

## O que é isto

O Legal Hub precisa das horas registadas no JVRIS, mas o servidor SQL
(`PT-LX-SQL01`) não é acessível a partir da cloud. A solução é um script
PowerShell (`sync.ps1`) que corre **numa máquina da rede da CCA**, lê a tabela
`fact_wip` do `CCA_WIP` e envia os dados para a cloud por HTTPS. É o mesmo
modelo do agente do Business Central que já corre na firma.

O script:
- **só lê** do SQL Server (nenhuma escrita no JVRIS);
- não instala nada (usa o .NET/PowerShell já incluído no Windows);
- corre com Windows Authentication (a conta da tarefa precisa apenas de
  **leitura** na BD `CCA_WIP`).

## Requisitos

| # | Requisito |
|---|---|
| 1 | Máquina Windows do domínio, ligada de forma permanente e com acesso de rede ao `PT-LX-SQL01` (ex.: a mesma do agente Business Central) |
| 2 | Conta de serviço/domínio com permissão de **leitura (db_datareader)** na BD `CCA_WIP` da instância `PT-LX-SQL01\SQLEXP_2016_Prod` |
| 3 | Saída HTTPS para `https://scjxhhkutsiswsgsuiqo.supabase.co` (porta 443) |
| 4 | A chave `SUPABASE_SERVICE_ROLE_KEY` — **fornecida em separado, por canal seguro**, por quem gere o Legal Hub (não consta deste documento) |

## 1. Instalar o ficheiro

Copiar o `sync.ps1` (em anexo, ou em `scripts/jvris-wip-agent/` no repositório
`cca-legal-hub-outoflovable`) para:

```
C:\agents\jvris-wip-agent\sync.ps1
```

> Nota: a GPO da firma bloqueia a execução direta de `.ps1`; por isso todas as
> execuções abaixo usam `iex (Get-Content ... -Raw)`, o padrão já usado na CCA.

## 2. Teste de leitura (sem escrever nada)

Numa consola PowerShell com a conta que terá a permissão de leitura:

```powershell
$env:JVRIS_DRY_RUN = '1'
powershell -NoProfile -Command "iex (Get-Content 'C:\agents\jvris-wip-agent\sync.ps1' -Raw)"
```

**Resultado esperado** — uma linha do tipo:

```
fact_wip: NNNNN linhas lidas | WIP vivo: 2,1 M EUR em 3180 dossiers
DRY RUN: nada foi escrito no Supabase.
```

- Valores de referência saudáveis: **2,0–2,2 M €** e **3 100–3 250 dossiers**.
- Muito abaixo disto: provável leitura durante o ETL do JVRIS — repetir noutra hora.
- Erro de ligação: verificar rede até ao `PT-LX-SQL01` e a permissão de leitura no `CCA_WIP`.

## 3. Primeira execução real

Com a chave fornecida por canal seguro (substituir `<CHAVE>`):

```powershell
Remove-Item Env:JVRIS_DRY_RUN -ErrorAction SilentlyContinue
$env:SUPABASE_URL = 'https://scjxhhkutsiswsgsuiqo.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = '<CHAVE>'
powershell -NoProfile -Command "iex (Get-Content 'C:\agents\jvris-wip-agent\sync.ps1' -Raw)"
```

Deve terminar com `Concluido: N upserted ... estado=success`. A execução é
idempotente — pode repetir-se sem duplicar dados.

## 4. Agendar (Task Scheduler)

1. **Agendador de Tarefas** → **Criar Tarefa…**
2. **Geral:** nome `JVRIS WIP Sync`; conta = a conta com leitura no `CCA_WIP`;
   marcar **"Executar quer o utilizador tenha ou não sessão iniciada"**.
3. **Acionadores:** Novo → Diariamente às **07:30** (fora da janela do ETL do JVRIS).
4. **Ações:** Nova →
   - Programa: `powershell.exe`
   - Argumentos:
     ```
     -NoProfile -Command "$env:SUPABASE_URL='https://scjxhhkutsiswsgsuiqo.supabase.co'; $env:SUPABASE_SERVICE_ROLE_KEY='<CHAVE>'; iex (Get-Content 'C:\agents\jvris-wip-agent\sync.ps1' -Raw)"
     ```
5. Guardar (introduzir a password da conta) e testar: botão direito → **Executar**.

## 5. Verificação e suporte

- Cada execução fica registada na tabela `jvris_wip_sync_logs` do Legal Hub
  (estado `success` / `warning` / `error`, contagens e mensagem de erro) —
  quem gere o Legal Hub consegue confirmar do lado da cloud.
- Estado `warning` = valores de WIP fora do intervalo de referência (leitura
  a meio do ETL); o sync seguinte normaliza.
- Problemas típicos:
  - `Login failed` / timeout SQL → permissão de leitura em falta ou máquina sem rota para o `PT-LX-SQL01`.
  - Erro HTTPS 401 → chave errada/expirada — pedir nova a quem gere o Legal Hub.
  - `rows_skipped_no_org` alto → códigos de cliente do JVRIS sem organização no portal (tratado do lado do Legal Hub, não é problema do agente).

## Segurança

- A `SUPABASE_SERVICE_ROLE_KEY` dá escrita na base do portal: guardar **apenas**
  na definição da tarefa agendada dessa máquina; não enviar por email/chat nem
  guardar em ficheiros partilhados.
- O agente nunca escreve no JVRIS; apenas lê `fact_wip`.
- Os dados sincronizados ficam numa tabela que só os utilizadores internos da
  CCA conseguem ler no portal (RLS); nunca são expostos a clientes.
