# Aayam Face-Recog System - Industrial Network Setup Script
# Run this script as Administrator to configure Windows for Local Network Distribution.

$ErrorActionPreference = "Stop"

function Write-Host-Color ($Message, $Color) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

# 1. Check for Administrator Privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host-Color "CRITICAL: This script MUST be run as Administrator." Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'."
    exit
}

Write-Host-Color "Initializing Industrial Network Configuration..." Cyan

# 2. Set Network Profile to Private
# Windows blocks inbound traffic on 'Public' networks (like Hotspots by default).
Write-Host-Color "Step 1: Optimizing Network Profile for Local Discovery..." White
try {
    $networkProfiles = Get-NetConnectionProfile
    foreach ($profile in $networkProfiles) {
        if ($profile.NetworkCategory -ne 'Private') {
            Set-NetConnectionProfile -InterfaceIndex $profile.InterfaceIndex -NetworkCategory Private
            Write-Host-Color " - Network '$($profile.Name)' switched to PRIVATE." Green
        } else {
            Write-Host-Color " - Network '$($profile.Name)' is already PRIVATE." Gray
        }
    }
} catch {
    Write-Host-Color " ! Failed to set network profile. Manual check required in Settings > Network." Yellow
}

# 3. Configure Windows Firewall Rules
Write-Host-Color "Step 2: Opening Industrial Service Ports (3000, 9001-9003)..." White
$ports = @(3000, 9001, 9002, 9003)
$ruleNamePrefix = "Aayam-Face-Recog-"

foreach ($port in $ports) {
    $ruleName = "$ruleNamePrefix$port"
    if (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue) {
        Remove-NetFirewallRule -Name $ruleName
    }
    New-NetFirewallRule -DisplayName "Aayam Service ($port)" `
                        -Direction Inbound `
                        -LocalPort $port `
                        -Protocol TCP `
                        -Action Allow `
                        -Description "Allows mobile devices to connect to Face-Recog service on port $port" `
                        -Group "Aayam Industrial Attendance"
    Write-Host-Color " - Port $port opened successfully." Green
}

# 4. Dependency Verification
Write-Host-Color "Step 3: Verifying Runtime Dependencies..." White
$dependencies = @{
    "Docker" = "docker --version"
    "Node.js" = "node -v"
    "Python" = "python --version"
}

foreach ($dep in $dependencies.Keys) {
    try {
        Invoke-Expression $dependencies[$dep] | Out-Null
        Write-Host-Color " - $dep: INSTALLED" Green
    } catch {
        Write-Host-Color " - $dep: MISSING (Check your PATH)" Red
    }
}

# 5. Summary and IP Discovery
Write-Host-Color "Step 4: Network Identity Discovery..." White
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPv4Address -notlike "169.254*" }).IPv4Address | Select-Object -First 1

Write-Host "`n"
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " CONFIGURATION COMPLETE" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " YOUR LAN IP: $ip" -ForegroundColor Yellow
Write-Host " PORT 3000  : Accessible via http://$ip:3000" -ForegroundColor Gray
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "You can now connect mobile devices via this IP/Hotspot."
Write-Host "`n"
pause
