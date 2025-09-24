$filesToRemove = @(
    'checkout.html',
    'checkout\index.html',
    'cart-test.html',
    'test-admin.html',
    'test-buttons.html',
    'test-cart.js',
    'test-security.html',
    'thankyou-demo.html',
    'cart-verification.js',
    'add-checkout-handler.ps1',
    'add-test-script.ps1',
    'add-verification-script.ps1',
    'clean-html.ps1',
    'fix-checkout.js',
    'fix-inline-events.ps1',
    'fix-specific-handlers.ps1',
    'remove-problematic-lines.ps1',
    'update-cart-script.ps1',
    'update-cart-styles.ps1',
    'update-checkout-button.ps1',
    'update-checkout-links.ps1',
    'update-header.ps1',
    'update-product.ps1',
    'index-backup.html'
)

$removed = 0
foreach ($file in $filesToRemove) {
    $path = "d:\ALH NEW\$file"
    if (Test-Path $path) {
        Remove-Item $path -Force -Recurse
        Write-Host "Removed: $file"
        $removed++
    }
}

Write-Host "Cleanup complete! Removed $removed files."
