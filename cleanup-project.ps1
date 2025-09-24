$files = @(
    'cart-test.html',
    'cart-verification.js',
    'test-cart.js',
    'cart-fixed.js',
    'index-backup.html',
    'test-admin.html',
    'test-buttons.html',
    'test-security.html',
    'thankyou-demo.html',
    'add-checkout-script.ps1',
    'add-test-script.ps1',
    'add-verification-script.ps1',
    'clean-html.ps1',
    'fix-inline-events.ps1',
    'fix-specific-handlers.ps1',
    'remove-problematic-lines.ps1',
    'update-cart-styles.ps1',
    'update-checkout-link.ps1',
    'update-header.ps1',
    'update-product.ps1'
)

$removed = 0
foreach ($file in $files) {
    if (Test-Path "d:\ALH NEW\$file") {
        Remove-Item "d:\ALH NEW\$file" -Force
        Write-Host "Removed: $file"
        $removed++
    }
}

Write-Host "Cleanup complete! Removed $removed files."
