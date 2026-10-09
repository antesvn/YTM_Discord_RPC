Option Explicit

Dim shell, fso, scriptFolder, serverPath, command

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptFolder = fso.GetParentFolderName(WScript.ScriptFullName)
serverPath = fso.BuildPath(scriptFolder, "server.js")

If Not fso.FileExists(serverPath) Then
    MsgBox "Não encontrei o arquivo server.js na mesma pasta deste VBS.", vbExclamation, "YTM Discord RPC"
    WScript.Quit 1
End If

shell.CurrentDirectory = scriptFolder
command = "node """ & serverPath & """"
shell.Run command, 0, False

Set fso = Nothing
Set shell = Nothing
