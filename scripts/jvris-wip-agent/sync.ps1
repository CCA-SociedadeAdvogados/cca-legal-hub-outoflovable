# ============================================================
# jvris-wip-agent — sync CCA_WIP (fact_wip) -> Supabase (jvris_wip_registos)
#
# Corre DENTRO da rede da CCA (o PT-LX-SQL01 nao e acessivel externamente),
# com a conta de dominio autenticada (Integrated Security — sem password).
#
# NOTA GPO: a execucao direta de .ps1 esta bloqueada; correr via:
#   powershell -NoProfile -Command "iex (Get-Content 'C:\caminho\sync.ps1' -Raw)"
#
# Configuracao por variaveis de ambiente (ou editar os defaults abaixo):
#   JVRIS_CONN_STR       connection string SQL Server (default: PT-LX-SQL01)
#   SUPABASE_URL         ex.: https://scjxhhkutsiswsgsuiqo.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY   chave service role (NUNCA a anon)
#   JVRIS_WINDOW_MONTHS  janela de historico a sincronizar (default: 24)
#   JVRIS_DRY_RUN        1 = so ler e mostrar contagens, sem escrever
#
# Logica:
#   - Le fact_wip: registos da janela (Dia >= hoje-N meses) OU ainda em WIP
#     (IsWIP=1, independentemente da idade) — assim o WIP "vivo" antigo e os
#     registos ja faturados recentes ficam ambos atualizados no cache.
#   - Datas vazias do JVRIS vem como < '1901-01-01' -> normalizadas para NULL.
#   - Mapeia Cli -> organizations.client_code -> organization_id; linhas sem
#     org correspondente sao contadas e ignoradas (provisionar a org primeiro).
#   - Upsert em lotes por (organization_id, dossier_code, colab_code, dia).
#   - VERIFICACAO no fim: le de volta da cloud (count=exact) os registos
#     escritos nesta execucao; se 0, o estado fica 'error' e o script grita.
#   - Sanity-check: WIP vivo total normal ~= 2,0-2,2 M EUR e ~= 3100-3250
#     dossiers; abaixo disso o estado fica 'warning' (leitura a meio do ETL?).
# ============================================================

$ErrorActionPreference = 'Stop'
$AgentVersion = 'v3-selfverify (2026-07-21)'

# ── Config ───────────────────────────────────────────────────
$ConnStr = if ($env:JVRIS_CONN_STR) { $env:JVRIS_CONN_STR } else {
  'Server=PT-LX-SQL01\SQLEXP_2016_Prod;Database=CCA_WIP;Integrated Security=True;TrustServerCertificate=True;Connection Timeout=30'
}
$SupabaseUrl = $env:SUPABASE_URL
$ServiceKey  = $env:SUPABASE_SERVICE_ROLE_KEY
$WindowMonths = if ($env:JVRIS_WINDOW_MONTHS) { [int]$env:JVRIS_WINDOW_MONTHS } else { 24 }
$DryRun = ($env:JVRIS_DRY_RUN -eq '1')

Write-Host "===== jvris-wip-agent $AgentVersion ====="

if (-not $DryRun -and (-not $SupabaseUrl -or -not $ServiceKey)) {
  Write-Error 'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios (ou JVRIS_DRY_RUN=1).'
  exit 1
}

# Decodifica o "ref" do projeto a partir do JWT (service role) e confirma que
# bate com o SUPABASE_URL — assim vemos SE a chave aponta para o projeto certo.
function Get-JwtRef($jwt) {
  try {
    $p = ($jwt -split '\.')[1]
    $p = $p.Replace('-', '+').Replace('_', '/')
    switch ($p.Length % 4) { 2 { $p += '==' } 3 { $p += '=' } }
    $json = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p))
    return ($json | ConvertFrom-Json).ref
  } catch { return '(indecifravel)' }
}

if (-not $DryRun) {
  $urlHost = ([Uri]$SupabaseUrl).Host           # ex.: scjxhhkutsiswsgsuiqo.supabase.co
  $urlRef  = ($urlHost -split '\.')[0]
  $keyRef  = Get-JwtRef $ServiceKey
  Write-Host "SUPABASE_URL efetivo : $SupabaseUrl  (ref=$urlRef)"
  Write-Host "Chave service role ref: $keyRef"
  if ($keyRef -ne $urlRef -and $keyRef -ne '(indecifravel)') {
    Write-Warning "A chave aponta para o projeto '$keyRef' mas o URL e '$urlRef' — os dados vao para o projeto errado!"
  }
}

$Headers = @{
  'apikey'        = $ServiceKey
  'Authorization' = "Bearer $ServiceKey"
  'Content-Type'  = 'application/json'
}

# Datas "vazias" do JVRIS (< 1901-01-01) -> $null
function Normalize-Date($v) {
  if ($v -eq $null -or $v -is [System.DBNull]) { return $null }
  $d = [datetime]$v
  if ($d -lt [datetime]'1901-01-01') { return $null }
  return $d.ToString('yyyy-MM-dd')
}

$startIso = (Get-Date).ToUniversalTime().ToString('o')
$log = @{ started_at = $startIso; status = 'running' }
$logId = $null
if (-not $DryRun) {
  try {
    $resp = Invoke-RestMethod -Method Post -Uri "$SupabaseUrl/rest/v1/jvris_wip_sync_logs" `
      -Headers ($Headers + @{ 'Prefer' = 'return=representation' }) -Body (ConvertTo-Json $log)
    $logId = $resp[0].id
    Write-Host "Registo de log criado: $logId"
  } catch {
    Write-Warning "Nao foi possivel criar o registo de log (a escrita na cloud pode estar a falhar!): $_"
    if ($_.Exception.Response) {
      try {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Warning ("Resposta da cloud: " + $sr.ReadToEnd())
      } catch {}
    }
  }
}

try {
  # ── 1. Organizacoes (mapa client_code -> organization_id) ──
  $orgMap = @{}
  if (-not $DryRun) {
    $orgs = Invoke-RestMethod -Method Get -Headers $Headers `
      -Uri "$SupabaseUrl/rest/v1/organizations?select=id,client_code&client_code=not.is.null"
    foreach ($o in $orgs) { if ($o.client_code) { $orgMap[$o.client_code.Trim().ToUpper()] = $o.id } }
    Write-Host "Organizacoes com client_code: $($orgMap.Count)"
  }

  # ── 2. Ler fact_wip ─────────────────────────────────────────
  $cutoff = (Get-Date).AddMonths(-$WindowMonths).ToString('yyyy-MM-dd')
  $sql = @"
SELECT Cli, ClienteNome, Dos, DossierDes, DossierDep, DossierRes,
       Clb, ColabNome, ValReg, HorasReg, Dia, DiaFac, IsWIP, DossierFec, DossierSus
FROM fact_wip
WHERE Dia >= '$cutoff' OR IsWIP = 1
"@

  $conn = New-Object System.Data.SqlClient.SqlConnection($ConnStr)
  $conn.Open()
  $cmd = $conn.CreateCommand()
  $cmd.CommandTimeout = 300
  $cmd.CommandText = $sql
  $rdr = $cmd.ExecuteReader()

  $rows = New-Object System.Collections.Generic.List[object]
  $wipTotal = 0.0
  $wipDossiers = New-Object System.Collections.Generic.HashSet[string]
  while ($rdr.Read()) {
    $dossierFec = Normalize-Date $rdr['DossierFec']
    $dossierSus = Normalize-Date $rdr['DossierSus']
    $isWip = ([bool]$rdr['IsWIP'])
    $dep = if ($rdr['DossierDep'] -is [System.DBNull]) { $null } else { [string]$rdr['DossierDep'] }

    # Filtro-base de WIP "vivo" — so para os sanity-checks
    if ($isWip -and -not $dossierFec -and -not $dossierSus -and $dep) {
      $val = if ($rdr['ValReg'] -is [System.DBNull]) { 0 } else { [double]$rdr['ValReg'] }
      $wipTotal += $val
      [void]$wipDossiers.Add([string]$rdr['Dos'])
    }

    $rows.Add([pscustomobject]@{
      cli_code     = ([string]$rdr['Cli']).Trim()
      cliente_nome = if ($rdr['ClienteNome'] -is [System.DBNull]) { $null } else { [string]$rdr['ClienteNome'] }
      dossier_code = ([string]$rdr['Dos']).Trim()
      dossier_des  = if ($rdr['DossierDes'] -is [System.DBNull]) { $null } else { [string]$rdr['DossierDes'] }
      dossier_dep  = $dep
      dossier_res  = if ($rdr['DossierRes'] -is [System.DBNull]) { $null } else { [string]$rdr['DossierRes'] }
      colab_code   = if ($rdr['Clb'] -is [System.DBNull]) { '' } else { ([string]$rdr['Clb']).Trim() }
      colab_nome   = if ($rdr['ColabNome'] -is [System.DBNull]) { $null } else { [string]$rdr['ColabNome'] }
      valor_reg    = if ($rdr['ValReg'] -is [System.DBNull]) { $null } else { [double]$rdr['ValReg'] }
      horas_reg    = if ($rdr['HorasReg'] -is [System.DBNull]) { $null } else { [double]$rdr['HorasReg'] }
      dia          = Normalize-Date $rdr['Dia']
      dia_fac      = Normalize-Date $rdr['DiaFac']
      is_wip       = $isWip
      dossier_fec  = $dossierFec
      dossier_sus  = $dossierSus
    })
  }
  $conn.Close()
  Write-Host "fact_wip: $($rows.Count) linhas lidas | WIP vivo: $([math]::Round($wipTotal/1e6,2)) M EUR em $($wipDossiers.Count) dossiers"

  if ($DryRun) {
    Write-Host 'DRY RUN: nada foi escrito no Supabase.'
    exit 0
  }

  # ── 3. Mapear org e upsert em lotes ─────────────────────────
  $skipped = 0
  $payload = New-Object System.Collections.Generic.List[object]
  foreach ($r in $rows) {
    $orgId = $orgMap[$r.cli_code.ToUpper()]
    if (-not $orgId) { $skipped++; continue }
    if (-not $r.dia) { $skipped++; continue }
    $payload.Add(($r | Select-Object *, @{ n = 'organization_id'; e = { $orgId } } -ExcludeProperty cli_norm))
  }

  $upserted = 0
  $batchSize = 500
  for ($i = 0; $i -lt $payload.Count; $i += $batchSize) {
    $batch = $payload[$i..([math]::Min($i + $batchSize - 1, $payload.Count - 1))]
    $body = ConvertTo-Json @($batch) -Depth 4
    try {
      Invoke-RestMethod -Method Post `
        -Uri "$SupabaseUrl/rest/v1/jvris_wip_registos?on_conflict=organization_id,dossier_code,colab_code,dia" `
        -Headers ($Headers + @{ 'Prefer' = 'resolution=merge-duplicates,return=minimal' }) `
        -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) | Out-Null
    } catch {
      if ($_.Exception.Response) {
        try {
          $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
          Write-Warning ("Lote $i rejeitado pela cloud: " + $sr.ReadToEnd())
        } catch {}
      }
      throw
    }
    $upserted += $batch.Count
    Write-Host "  upsert $upserted / $($payload.Count)"
  }

  # ── 4. VERIFICACAO: ler de volta o que ficou na cloud ───────
  # Le a contagem exata de registos escritos nesta execucao (synced_at >= inicio).
  $confirmed = -1
  try {
    $vr = Invoke-WebRequest -Method Get -UseBasicParsing `
      -Uri "$SupabaseUrl/rest/v1/jvris_wip_registos?select=id&synced_at=gte.$startIso" `
      -Headers ($Headers + @{ 'Prefer' = 'count=exact'; 'Range-Unit' = 'items'; 'Range' = '0-0' })
    $cr = $vr.Headers['Content-Range']            # ex.: "0-0/52949" (ou "*/0")
    if ($cr) { $confirmed = [int](($cr -split '/')[-1]) }
  } catch {
    Write-Warning "Falhou a verificacao de leitura: $_"
  }
  Write-Host "VERIFICACAO: $confirmed registos confirmados na cloud (lidos de volta apos escrita)"

  # ── 5. Sanity-check + fecho do log ──────────────────────────
  $status = 'success'
  $warn = $null
  if ($confirmed -le 0) {
    $status = 'error'
    $warn = "A escrita reportou $upserted upserts mas a leitura de volta encontrou $confirmed registos — os dados NAO ficaram neste projeto ($($([Uri]$SupabaseUrl).Host))."
    Write-Warning $warn
  } elseif ($wipTotal -lt 1500000 -or $wipDossiers.Count -lt 2500) {
    $status = 'warning'
    $warn = "WIP abaixo do intervalo de referencia (2,0-2,2 M EUR / 3100-3250 dossiers) — leitura a meio do ETL?"
    Write-Warning $warn
  }

  if ($logId) {
    $patch = @{
      finished_at = (Get-Date).ToUniversalTime().ToString('o'); status = $status
      rows_read = $rows.Count; rows_upserted = $upserted; rows_skipped_no_org = $skipped
      orgs_matched = $orgMap.Count
      wip_total_eur = [math]::Round($wipTotal, 2); wip_dossiers = $wipDossiers.Count
      error = $warn; details = @{ confirmed_readback = $confirmed; agent_version = $AgentVersion }
    }
    Invoke-RestMethod -Method Patch -Uri "$SupabaseUrl/rest/v1/jvris_wip_sync_logs?id=eq.$logId" `
      -Headers $Headers -Body (ConvertTo-Json $patch) | Out-Null
  }
  Write-Host "Concluido: $upserted enviados, $confirmed confirmados na cloud, $skipped ignoradas (sem org/data), estado=$status"
  if ($status -eq 'error') { exit 2 }
} catch {
  Write-Error "Sync falhou: $_"
  if ($logId) {
    $patch = @{ finished_at = (Get-Date).ToUniversalTime().ToString('o'); status = 'error'; error = "$_" }
    try {
      Invoke-RestMethod -Method Patch -Uri "$SupabaseUrl/rest/v1/jvris_wip_sync_logs?id=eq.$logId" `
        -Headers $Headers -Body (ConvertTo-Json $patch) | Out-Null
    } catch {}
  }
  exit 1
}
