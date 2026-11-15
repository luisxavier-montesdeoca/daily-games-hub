' Starts the built app at http://localhost:5173 with no window.
' Windows runs this at login through a shortcut in the Startup folder
' (created by scripts/install-startup.ps1). To stop it, end the "Node.js" process in Task Manager.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
sh.Run "node node_modules\vite\bin\vite.js preview", 0, False
