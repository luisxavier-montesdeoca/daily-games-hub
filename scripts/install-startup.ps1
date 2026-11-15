# Adds (or with -Remove, deletes) a shortcut in your Startup folder that runs serve-hidden.vbs at login.
param([switch]$Remove)
$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'Daily Games Hub.lnk'
if ($Remove) {
  if (Test-Path $lnk) { Remove-Item $lnk -Confirm:$false; "Removed $lnk" } else { "Not installed." }
  return
}
$vbs = Join-Path $PSScriptRoot 'serve-hidden.vbs'
$s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$s.TargetPath = "$env:WINDIR\System32\wscript.exe"
$s.Arguments = "`"$vbs`""
$s.WorkingDirectory = Split-Path $PSScriptRoot
$s.Description = 'Serves Daily Games Hub at http://localhost:5173'
$s.Save()
"Installed $lnk"
