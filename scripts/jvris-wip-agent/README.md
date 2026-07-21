# jvris-wip-agent — sync do CCA_WIP (JVRIS) para o Legal Hub

Conector **I1** do blueprint do Hub (decisão Q1): traz os registos de trabalho
(fact_wip — colaborador × dossier × dia, com horas e valor) para o cache do
Supabase (`jvris_wip_registos`), de onde o cockpit alimenta o relatório de
Assuntos (horas, consumo mensal, trabalho executado).

Mesmo padrão do `bc-sync-agent`: a base `CCA_WIP` (SQL Server 2016,
`PT-LX-SQL01\SQLEXP_2016_Prod`) **só é acessível na rede da CCA**, por isso o
agente corre numa máquina do domínio (VPN/VLAN) e escreve no Supabase com a
service role key. O Supabase/Vercel nunca falam diretamente com o SQL Server.

## Pré-requisitos

- Máquina **na rede da CCA** (VPN/VLAN) com Windows PowerShell 5.1+.
- Conta de domínio com **permissão de leitura** no `CCA_WIP`
  (Windows Authentication / Integrated Security — sem username/password).
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Settings → API).
- As organizações no Legal Hub têm de ter `client_code` preenchido — o mapeamento
  é `fact_wip.Cli → organizations.client_code`. Linhas de clientes sem org
  correspondente são ignoradas e contadas (`rows_skipped_no_org`).

## Execução

> ⚠️ A GPO da CCA bloqueia a execução direta de `.ps1` — correr via
> `Invoke-Expression`, como é padrão na firma:

```powershell
$env:SUPABASE_URL = 'https://scjxhhkutsiswsgsuiqo.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = '<service-role-key>'
powershell -NoProfile -Command "iex (Get-Content 'C:\agents\jvris-wip-agent\sync.ps1' -Raw)"
```

Primeiro teste sem escrever nada (só contagens e sanity-check):

```powershell
$env:JVRIS_DRY_RUN = '1'
powershell -NoProfile -Command "iex (Get-Content 'C:\agents\jvris-wip-agent\sync.ps1' -Raw)"
```

### Variáveis

| Variável | Default | Descrição |
|---|---|---|
| `JVRIS_CONN_STR` | `Server=PT-LX-SQL01\SQLEXP_2016_Prod;Database=CCA_WIP;Integrated Security=True;TrustServerCertificate=True;Connection Timeout=30` | Connection string SQL Server |
| `SUPABASE_URL` | — | URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Service role (nunca a anon) |
| `JVRIS_WINDOW_MONTHS` | `24` | Janela de histórico (além de TODO o WIP vivo, que entra sempre) |
| `JVRIS_DRY_RUN` | — | `1` = ler e mostrar contagens, sem escrever |

## Agendamento (Task Scheduler)

Diário fora de horas do ETL do JVRIS (ex.: 07:30), ação:

```
Programa: powershell.exe
Argumentos: -NoProfile -Command "iex (Get-Content 'C:\agents\jvris-wip-agent\sync.ps1' -Raw)"
```

com as variáveis de ambiente definidas ao nível do sistema/tarefa.

## O que o agente faz

1. Lê `fact_wip` — registos com `Dia >=` janela **ou** `IsWIP = 1` (o WIP
   vivo antigo entra sempre; registos recentes já faturados também, para o
   cache refletir a transição WIP → faturado).
2. Normaliza as datas "vazias" do JVRIS (`< '1901-01-01'` → `NULL`).
3. Mapeia `Cli → organizations.client_code` e faz upsert em lotes de 500 por
   `(organization_id, dossier_code, colab_code, dia)` — idempotente.
4. Calcula o WIP "vivo" com o filtro-base
   (`IsWIP=1`, sem `DossierFec`/`DossierSus`, `DossierDep` preenchido) e
   compara com os valores de referência — **≈ 2,0–2,2 M € / ≈ 3 100–3 250
   dossiers**. Abaixo disso o sync fica em estado `warning` (possível leitura
   a meio do ETL).
5. Regista cada execução em `jvris_wip_sync_logs` (leitura no cockpit: só CCA).

## Segurança

- `jvris_wip_registos` e `jvris_wip_sync_logs` têm RLS: **leitura apenas para
  utilizadores CCA** (`is_cca_user`/`is_platform_admin`); não há políticas de
  escrita — só o service role (o agente) escreve.
- Estes dados (valores e horas por colaborador) **nunca são expostos ao portal
  do cliente**; qualquer exposição futura terá de passar por um RPC curado,
  como o resto do financeiro.
