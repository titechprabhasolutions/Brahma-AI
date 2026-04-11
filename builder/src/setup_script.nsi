; Archive options
SetCompress force
SetCompressor /FINAL /SOLID lzma
SetCompressorDictSize 128
SetDatablockOptimize on
SetDateSave off
Unicode true

; Includes
!include 'FileFunc.nsh'
!include 'LogicLib.nsh'
!include 'MUI2.nsh'
!include 'x64.nsh'
!include 'WinVer.nsh'

!insertmacro GetParameters
!insertmacro GetOptions

; Defines
!define APP_AUTHOR "Henry++"
!define APP_WEBSITE "https://github.com/henrypp"

!define COPYRIGHT "(c) ${APP_AUTHOR}. All rights reversed."
!define LICENSE_FILE "${APP_FILES_DIR}\64\License.txt"

!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_COMPONENTSPAGE_NODESC

!define MUI_WELCOMEFINISHPAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Wizard\nsis3-branding.bmp"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Header\nsis3-metro.bmp"

!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_FUNCTION RunApplication

!define MUI_FINISHPAGE_SHOWREADME
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Show release notes"
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION ShowReleaseNotes
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED

!define MUI_FINISHPAGE_NOREBOOTSUPPORT

!define MUI_LANGDLL_REGISTRY_ROOT "HKLM"
!define MUI_LANGDLL_REGISTRY_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}"
!define MUI_LANGDLL_REGISTRY_VALUENAME "NSIS:Language"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${LICENSE_FILE}"
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE IsPortable
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

LicenseLangString MUILicense ${LANG_ENGLISH} "${LICENSE_FILE}"

; Language files
!insertmacro MUI_LANGUAGE "Arabic"
!insertmacro MUI_LANGUAGE "Albanian"
!insertmacro MUI_LANGUAGE "Belarusian"
!insertmacro MUI_LANGUAGE "Catalan"
!insertmacro MUI_LANGUAGE "Croatian"
!insertmacro MUI_LANGUAGE "Czech"
!insertmacro MUI_LANGUAGE "Danish"
!insertmacro MUI_LANGUAGE "Dutch"
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Farsi"
!insertmacro MUI_LANGUAGE "French"
!insertmacro MUI_LANGUAGE "German"
!insertmacro MUI_LANGUAGE "Greek"
!insertmacro MUI_LANGUAGE "Korean"
!insertmacro MUI_LANGUAGE "Hungarian"
!insertmacro MUI_LANGUAGE "Indonesian"
!insertmacro MUI_LANGUAGE "Italian"
!insertmacro MUI_LANGUAGE "Japanese"
!insertmacro MUI_LANGUAGE "Lithuanian"
!insertmacro MUI_LANGUAGE "Polish"
!insertmacro MUI_LANGUAGE "Portuguese"
!insertmacro MUI_LANGUAGE "PortugueseBR"
!insertmacro MUI_LANGUAGE "Romanian"
!insertmacro MUI_LANGUAGE "Russian"
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "Spanish"
!insertmacro MUI_LANGUAGE "Swedish"
!insertmacro MUI_LANGUAGE "Thai"
!insertmacro MUI_LANGUAGE "TradChinese"
!insertmacro MUI_LANGUAGE "Turkish"
!insertmacro MUI_LANGUAGE "Ukrainian"
!insertmacro MUI_RESERVEFILE_LANGDLL

; Options
AllowSkipFiles off
AutoCloseWindow false
LicenseBkColor /windows
LicenseForceSelection checkbox
ManifestSupportedOS all
ManifestLongPathAware true
ManifestDPIAware true
ShowInstDetails show
SilentUnInstall silent
XPStyle on

Name "${APP_NAME}"
BrandingText "${COPYRIGHT}"

Caption "${APP_NAME} v${APP_VERSION}"
UninstallCaption "${APP_NAME}"

Icon "${NSISDIR}\Contrib\Graphics\Icons\orange-install-nsis.ico"
UninstallIcon "${NSISDIR}\Contrib\Graphics\Icons\orange-uninstall-nsis.ico"

InstallDir "$PROGRAMFILES64\${APP_NAME}"
InstallDirRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}" "InstallLocation"

RequestExecutionLevel admin

!define DEBUG `System::Call kernel32::OutputDebugString(ts)`

!macro CloseInstances
	SetPluginUnload alwaysoff

	System::Call 'kernel32::OpenMutex(i 0x100000, i 0, t "${APP_NAME_SHORT}") p.R0'
	IntPtrCmp $R0 0 skip
		System::Call 'kernel32::CloseHandle(p $R0)'

		IfSilent 0 +1
		Sleep 2000

		System::Get "(p.R1, i) iss"
		Pop $R0
		System::Call "user32::EnumWindows(k R0, i) i.s"

		loop:
			Pop $0
			StrCmp $0 "callback1" 0 done

			System::Call 'user32::GetProp(p R1, t "${APP_NAME}") p.R2'

			IntPtrCmp $R2 0 notfound

			System::Call 'user32::GetWindowThreadProcessId(p R1, *i.R3)'

			# PROCESS_TERMINATE 0x0001
			# PROCESS_QUERY_LIMITED_INFORMATION 0x1000

			System::Call 'kernel32::OpenProcess(i 0x1001, i 0, i R3) p.R4'

			IntPtrCmp $R4 0 notfound

			System::Call 'psapi::GetModuleFileNameEx(p R4, i 0, t.R6, i ${NSIS_MAX_STRLEN}) i.R7'

			IntCmp $R7 0 cleanup
			StrCmp $R6 "$INSTDIR\${APP_NAME_SHORT}.exe" 0 cleanup

			# WM_QUIT 0x0012
			# SMTO_BLOCK = 0x0001

			System::Call 'user32::SendMessageTimeout(p R1, i 0x0012, i 0, i 0, i 0x0001, i 4000, i 0)'
			Sleep 1000

			System::Call 'kernel32::TerminateProcess(p R4, i 0)'
			Sleep 1000

			cleanup:

			System::Call 'kernel32::CloseHandle(p R4)'

			Push 0
			System::Call "$R0"

			Goto loop

			notfound:

			Push 1
			System::Call "$R0"

			Goto loop

			System::Call "$R0"

			Goto loop
		done:

		System::Free $R0
	skip:

	SetPluginUnload manual
!macroend

!define CloseInstances "${CallArtificialFunction} CloseInstances"

Function .onInit
	${If} ${RunningX64}
		SetRegView 64
	${EndIf}

	!insertmacro MUI_LANGDLL_DISPLAY

	Push $R0

	; Check if we are updating current configuration, then check executable existing.
	IfSilent 0 not_update
	ClearErrors

	${GetOptions} $R0 '/u' $0
	IfErrors update 0
	IfFileExists "$INSTDIR\${APP_NAME_SHORT}.exe" update 0
	Abort

	update:
	ClearErrors

	not_update:
	Pop $R0

	; Windows 7 and later only
	${IfNot} ${AtLeastWin7}
		IfSilent skip

		MessageBox MB_OK|MB_ICONEXCLAMATION '${APP_NAME} requires Windows 7 and later!'

		skip:
		Abort
	${EndIf}
FunctionEnd

Function un.onInit
	${If} ${RunningX64}
		SetRegView 64
	${EndIf}

	IfSilent skip

	MessageBox MB_YESNO|MB_ICONEXCLAMATION|MB_DEFBUTTON2 'Are you sure you want to uninstall ${APP_NAME}?' IDYES skip ; MUI_UNTEXT_CONFIRM_SUBTITLE
	Abort

	skip:
FunctionEnd

Function un.onUninstSuccess
	IfSilent skip

	MessageBox MB_OK|MB_ICONINFORMATION '${APP_NAME} was completely removed!'

	skip:
FunctionEnd

Section "!${APP_NAME}"
	SectionIn RO

	SetOutPath $INSTDIR

	DetailPrint "Close running instances..."

	${CloseInstances}

	${If} ${IsNativeARM64}
		File "${APP_FILES_DIR}\ARM64\${APP_NAME_SHORT}.exe"
		File /nonfatal "${APP_FILES_DIR}\ARM64\${APP_NAME_SHORT}.exe.sig"
	${Else}
		File "${APP_FILES_DIR}\64\${APP_NAME_SHORT}.exe"
		File /nonfatal "${APP_FILES_DIR}\64\${APP_NAME_SHORT}.exe.sig"
	${EndIf}

	File "${APP_FILES_DIR}\64\History.txt"
	File "${APP_FILES_DIR}\64\License.txt"
	File "${APP_FILES_DIR}\64\Readme.txt"

	WriteUninstaller $INSTDIR\uninstall.exe

	; Create uninstall entry
	Call CreateUninstallEntry

	Push $R0

	${GetParameters} $R0
	${GetOptions} $R0 '/u' $0

	IfErrors +2
	Call RunApplication

	Pop $R0
SectionEnd

Section "Localization"
	SetOutPath $INSTDIR

	File /nonfatal "${APP_FILES_DIR}\64\${APP_NAME_SHORT}.lng"
SectionEnd

Section "Create desktop shortcut" SecShortcut1
	IfSilent skip

	CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_NAME_SHORT}.exe"

	skip:
SectionEnd

Section "Create start menu shortcuts" SecShortcut2
	IfSilent skip

	CreateDirectory "$SMPROGRAMS\${APP_NAME}"

	CreateShortCut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_NAME_SHORT}.exe"
	CreateShortCut "$SMPROGRAMS\${APP_NAME}\License.lnk" "$INSTDIR\License.txt"
	CreateShortCut "$SMPROGRAMS\${APP_NAME}\History.lnk" "$INSTDIR\History.txt"
	CreateShortCut "$SMPROGRAMS\${APP_NAME}\Readme.lnk" "$INSTDIR\Readme.txt"
	CreateShortCut "$SMPROGRAMS\${APP_NAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"

	skip:
SectionEnd

Section /o "Store settings in application directory (portable mode)" SecPortable
	IfFileExists "$INSTDIR\portable.dat" portable
	IfFileExists "$INSTDIR\${APP_NAME_SHORT}.ini" portable not_portable

	Push $R0

	; Create portable indicator file
	not_portable:

	FileOpen $R0 "$INSTDIR\portable.dat" w
	FileWrite $R0 "#PORTABLE#" ; for is not being empty
	FileClose $R0

	portable:

	Pop $R0
SectionEnd

Section "Uninstall"
	IfFileExists $INSTDIR\${APP_NAME_SHORT}.exe installed

	MessageBox MB_YESNO "It does not appear that ${APP_NAME} is installed in the installation directory.$\r$\nContinue anyway (not recommended)?" IDYES installed
	Abort

	installed:

	${CloseInstances}

	ExecWait '"$INSTDIR\${APP_NAME_SHORT}.exe" -uninstall'

	; Remove shortcuts
	RMDir /r "$SMPROGRAMS\${APP_NAME}"
	Delete "$DESKTOP\${APP_NAME}.lnk"

	; Clean registry
	DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}"
	DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}"

	DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}"
	DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}"

	; Remove "skipuac" entry
	nsExec::Exec 'schtasks /delete /f /tn "${APP_NAME_SHORT}Task"'

	; Remove "skipuac" entry (deprecated)
	nsExec::Exec 'schtasks /delete /f /tn "${APP_NAME_SHORT}SkipUac"'

	; Remove configuration from %appdata% only for non-portable mode
	IfFileExists "$INSTDIR\portable.dat" portable
	IfFileExists "$INSTDIR\${APP_NAME_SHORT}.ini" portable not_portable

	not_portable:
	RMDir /r "$APPDATA\${APP_AUTHOR}\${APP_NAME}"
	RMDir "$APPDATA\${APP_AUTHOR}"

	portable:

	; Remove internal directories
	RMDir /r "$INSTDIR\cache"
	RMDir /r "$INSTDIR\crashdump"
	RMDir /r "$INSTDIR\plugins"

	; Remove install directory
	Delete "$INSTDIR\${APP_NAME_SHORT}.scr"
	Delete "$INSTDIR\${APP_NAME_SHORT}.scr.sig"
	Delete "$INSTDIR\${APP_NAME_SHORT}.exe"
	Delete "$INSTDIR\${APP_NAME_SHORT}.exe.sig"
	Delete "$INSTDIR\${APP_NAME_SHORT}.pdb"
	Delete "$INSTDIR\${APP_NAME_SHORT}.sig"
	Delete "$INSTDIR\${APP_NAME_SHORT}.lng"
	Delete "$INSTDIR\${APP_NAME_SHORT}.ini"
	Delete "$INSTDIR\${APP_NAME_SHORT}_debug.log"
	Delete "$INSTDIR\portable.dat"
	Delete "$INSTDIR\Readme.txt"
	Delete "$INSTDIR\History.txt"
	Delete "$INSTDIR\License.txt"
	Delete "$INSTDIR\FAQ.txt"

	${If} ${APP_NAME_SHORT} == 'simplewall'
		Delete "$INSTDIR\profile.xml"
		Delete "$INSTDIR\profile.xml.bak"

		Delete "$INSTDIR\profile_internal.xml"
		Delete "$INSTDIR\profile_internal.sp"
	${EndIf}

	Delete "$INSTDIR\Uninstall.exe"

	RMDir "$INSTDIR"
SectionEnd

Function CreateUninstallEntry
	WriteRegExpandStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}" "InstallLocation" '"$INSTDIR"'
	WriteRegExpandStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}" "UninstallString" '"$INSTDIR\uninstall.exe"'

	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}" "DisplayName" "${APP_NAME}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}" "DisplayIcon" '"$INSTDIR\${APP_NAME_SHORT}.exe"'
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}" "DisplayVersion" "${APP_VERSION}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}" "Publisher" "${APP_AUTHOR}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}" "URLInfoAbout" "${APP_WEBSITE}"

	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}" "Installed" 1
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}" "NoModify" 1
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_SHORT}" "NoRepair" 1
FunctionEnd

Function RunApplication
	${If} ${FileExists} $INSTDIR\${APP_NAME_SHORT}.exe
		Exec '"$INSTDIR\${APP_NAME_SHORT}.exe"'
	${EndIf}
FunctionEnd

Function ShowReleaseNotes
	IfSilent skip

	${If} ${FileExists} $INSTDIR\History.txt
		ExecShell "" '"$INSTDIR\History.txt"'
	${EndIf}

	skip:
FunctionEnd

Function IsPortable
	IfFileExists "$INSTDIR\portable.dat" portable 0
	IfFileExists "$INSTDIR\${APP_NAME_SHORT}.ini" portable not_portable

	portable:
	SectionSetFlags ${SecPortable} ${SF_SELECTED}

	SectionSetFlags ${SecShortcut1} 0
	SectionSetFlags ${SecShortcut2} 0

	Goto skip

	not_portable:
	SectionSetFlags ${SecPortable} 0

	SectionSetFlags ${SecShortcut1} ${SF_SELECTED}
	SectionSetFlags ${SecShortcut2} ${SF_SELECTED}

	skip:
FunctionEnd

; Version info
VIAddVersionKey "Comments" "${APP_WEBSITE}"
VIAddVersionKey "CompanyName" "${APP_AUTHOR}"
VIAddVersionKey "FileDescription" "${APP_NAME}"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "InternalName" "${APP_NAME_SHORT}"
VIAddVersionKey "LegalCopyright" "${COPYRIGHT}"
VIAddVersionKey "OriginalFilename" "${APP_NAME_SHORT}-${APP_VERSION}-setup.exe"
VIAddVersionKey "ProductName" "${APP_NAME}"
VIAddVersionKey "ProductVersion" "${APP_VERSION}"
VIProductVersion "${APP_VERSION}.0.0"
