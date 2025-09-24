$filePath = "d:\ALH NEW\index.html"
$content = Get-Content -Path $filePath -Raw

# Remove cart button from header
$content = $content -replace '(?s)<button id="cartBtn" class=".*?<\/button>', ''

# Remove cart dropdown section
$content = $content -replace '(?s)<!-- Cart Dropdown -->.*?<\/div>', ''

# Remove cart-related JavaScript
$content = $content -replace '(?s)/\* ---------- Cart ---------- \*/.*?updateCart\(\)', '// Cart functionality has been removed'

# Remove cart-related event listeners
$content = $content -replace '(?s)addBtn\.addEventListener\(\'click\'.*?\}\);', ''

# Save the changes
$content | Set-Content -Path $filePath -NoNewline

Write-Host "Cart functionality has been removed successfully."
