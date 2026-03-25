$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envPath = Join-Path $repoRoot ".env"
$openAiApiKey = $null

if (Test-Path $envPath) {
    $envLines = Get-Content $envPath -Encoding Unicode
    foreach ($line in $envLines) {
        if ($line -match '^\s*OPENAI_API_KEY=(.+)\s*$') {
            $openAiApiKey = $matches[1]
            break
        }
    }
}

if (-not $openAiApiKey) {
    throw "OPENAI_API_KEY is missing from $envPath"
}

docker build -t microprelegal $repoRoot
try {
    docker rm -f microprelegal | Out-Null
} catch {
}
docker run -d --name microprelegal -e OPENAI_API_KEY="$openAiApiKey" -p 8000:8000 microprelegal
