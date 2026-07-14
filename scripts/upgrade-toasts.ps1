# upgrade-toasts.ps1
# Replaces all inline toast <div> blocks with the shared <Toast /> component

$files = Get-ChildItem -Path "app/dashboard" -Recurse -Filter "*.tsx" | Where-Object {
    $content = Get-Content $_.FullName -Raw
    ($content -match "setToast\(null\)") -and ($content -notmatch 'from "@/app/components/Toast"')
}

foreach ($file in $files) {
    $path = $file.FullName
    $content = Get-Content $path -Raw -Encoding UTF8

    # Skip the local Toast sub-component file itself
    if ($path -match "_components\\Toast\.tsx$") {
        Write-Host "SKIP (sub-component): $path"
        continue
    }

    Write-Host "Processing: $path"

    # 1. Inject import after "use client"; line
    if ($content -notmatch 'from "@/app/components/Toast"') {
        $content = $content -replace '("use client";\r?\n)', ('$1import { Toast } from "@/app/components/Toast";' + "`n")
    }

    # 2. Remove auto-hide toast useEffect blocks (they are now handled inside Toast.tsx)
    $content = $content -replace '(?s)\s*// Auto hide toast\r?\n\s*useEffect\(\(\) => \{[^}]+\}, \[toast\]\);', ''

    # 3. Replace inline toast rendering blocks with shared <Toast /> component
    # Pattern A: with {/* Toast */} comment above
    $toastBlock = '{/* Toast */}' + "`n" +
                  '      {toast && (' + "`n" +
                  '        <Toast' + "`n" +
                  '          message={toast.message}' + "`n" +
                  '          type={toast.type}' + "`n" +
                  '          onClose={() => setToast(null)}' + "`n" +
                  '        />' + "`n" +
                  '      )}'

    $content = $content -replace '(?s)\{/\* Toast \*/\}\s*\{toast &&\s*\(\s*<div\s+className=\{[^/]+\}\s*>\s*\{toast\.message\}\s*</div>\s*\)\}', $toastBlock

    # Pattern B: without comment, with template literal className
    $toastBlockSimple = '{toast && (' + "`n" +
                        '        <Toast' + "`n" +
                        '          message={toast.message}' + "`n" +
                        '          type={toast.type}' + "`n" +
                        '          onClose={() => setToast(null)}' + "`n" +
                        '        />' + "`n" +
                        '      )}'

    $content = $content -replace '(?s)\{toast &&\s*\(\s*<div\s+className=\{[^/]+\}\s*>\s*\{toast\.message\}\s*</div>\s*\)\}', $toastBlockSimple

    # Pattern C: simple (non-template) className
    $content = $content -replace '(?s)\{toast &&\s*\(\s*<div\s+className="[^"]+"\s*>\s*\{toast\.message\}\s*</div>\s*\)\}', $toastBlockSimple

    # Pattern D: multiline with child text element
    $content = $content -replace '(?s)\{toast &&\s*\(\s*<div[^>]+>\s*\{toast\.message\}\s*</div>\s*\)\}', $toastBlockSimple

    Set-Content $path $content -Encoding UTF8 -NoNewline
    Write-Host "  -> Updated: $($file.Name)"
}

Write-Host ""
Write-Host "Done! Run: npx tsc --noEmit"
