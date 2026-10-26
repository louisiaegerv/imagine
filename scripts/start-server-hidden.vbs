' Runs start-server.cmd with no console window.
Set shell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
shell.Run """" & scriptDir & "\start-server.cmd""", 0, False
