Option Explicit

Dim shell, fso, scriptFolder, serverPath

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptFolder = fso.GetParentFolderName(WScript.ScriptFullName)
serverPath = fso.BuildPath(scriptFolder, "dist\YTM_Discord_RPC_silent_v6.exe")

If Not fso.FileExists(serverPath) Then
    MsgBox "Não encontrei dist\YTM_Discord_RPC_silent_v6.exe. Gere o executável ou reinstale o pacote.", vbExclamation, "YTM Discord RPC"
    WScript.Quit 1
End If

shell.CurrentDirectory = scriptFolder
shell.Run """" & serverPath & """", 0, False

Set fso = Nothing
Set shell = Nothing
