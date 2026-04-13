@echo off
REM===============================================================================
REM pi-profile - Profile management for pi coding agent (Windows)
REM
REM Manages isolated profile directories with their own:
REM   - auth.json (API keys)
REM   - settings.json (preferences)
REM   - models.json (custom models)
REM   - sessions/ (conversation history)
REM   - skills/, prompts/, themes/, extensions/
REM
REM Usage:
REM   pi-profile list              List all profiles
REM   pi-profile create <name>     Create new profile
REM   pi-profile use <name>        Set as sticky default
REM   pi-profile show [name]       Show profile details
REM   pi-profile delete <name>     Delete a profile
REM   pi-profile rename <a> <b>    Rename a profile
REM   pi-profile copy <from> <to>  Copy profile
REM   pi-profile export <name> [f] Export to zip
REM   pi-profile import <file> [n] Import from zip
REM   pi-profile shell <name> [c]  Run with profile env
REM   pi-profile edit [name]       Open profile in editor
REM   pi-profile wrapper <name>   Create standalone wrapper
REM===============================================================================

setlocal enabledelayedexpansion

set "PI_BASE=%PI_CODING_AGENT_DIR%"
if not defined PI_BASE set "PI_BASE=%USERPROFILE%\.pi"
set "PROFILES_DIR=%PI_BASE%\profiles"
set "CURRENT_PROFILE_FILE=%PI_BASE%\current-profile"
set "AGENT_DIR=%PI_BASE%\agent"

set "COMMAND=%~1"

if "%COMMAND%"=="" goto usage
if "%COMMAND%"=="help" goto usage
if "%COMMAND%"=="-h" goto usage
if "%COMMAND%"=="--help" goto usage

REM-------------------------------------------------------------------------------
REM Command Dispatcher
REM-------------------------------------------------------------------------------

if "%COMMAND%"=="list" goto cmd_list
if "%COMMAND%"=="ls" goto cmd_list
if "%COMMAND%"=="create" goto cmd_create
if "%COMMAND%"=="new" goto cmd_create
if "%COMMAND%"=="use" goto cmd_use
if "%COMMAND%"=="switch" goto cmd_use
if "%COMMAND%"=="show" goto cmd_show
if "%COMMAND%"=="info" goto cmd_show
if "%COMMAND%"=="delete" goto cmd_delete
if "%COMMAND%"=="rm" goto cmd_delete
if "%COMMAND%"=="remove" goto cmd_delete
if "%COMMAND%"=="rename" goto cmd_rename
if "%COMMAND%"=="mv" goto cmd_rename
if "%COMMAND%"=="copy" goto cmd_copy
if "%COMMAND%"=="cp" goto cmd_copy
if "%COMMAND%"=="export" goto cmd_export
if "%COMMAND%"=="dump" goto cmd_export
if "%COMMAND%"=="import" goto cmd_import
if "%COMMAND%"=="load" goto cmd_import
if "%COMMAND%"=="shell" goto cmd_shell
if "%COMMAND%"=="run" goto cmd_shell
if "%COMMAND%"=="edit" goto cmd_edit
if "%COMMAND%"=="wrapper" goto cmd_wrapper

echo ERROR: Unknown command '%COMMAND%'
echo.
goto usage

REM-------------------------------------------------------------------------------
REM Usage
REM-------------------------------------------------------------------------------

:usage
echo.
echo   pi-profile - Profile management for pi coding agent
echo.
echo   USAGE
echo     pi-profile list              List all profiles
echo     pi-profile create ^<name^>     Create new profile
echo     pi-profile use ^<name^>       Set as sticky default
echo     pi-profile show [name]        Show profile details
echo     pi-profile delete ^<name^>     Delete a profile
echo     pi-profile rename ^<a^> ^<b^>  Rename a profile
echo     pi-profile copy ^<from^> ^<to^> Copy profile
echo     pi-profile export ^<name^> [f] Export to zip
echo     pi-profile import ^<file^> [n] Import from zip
echo     pi-profile shell ^<name^> [c]  Run with profile env
echo     pi-profile edit [name]        Open profile in editor
echo     pi-profile wrapper ^<name^>   Create standalone wrapper
echo.
echo   PROFILE LAYOUT
echo     ^~/.pi/
echo     ^├── agent/                    Default profile
echo     ^├── profiles/
echo     ^^│   ^├── work/
echo     ^│   ^└── personal/
echo     ^└── current-profile
echo.
echo   ENVIRONMENT
echo     PI_PROFILE=^<name^^>           Override active profile (per-session)
echo     PI_CODING_AGENT_DIR=^<path^>  Full override
echo.
exit /b 1

REM-------------------------------------------------------------------------------
REM Helper Functions (subroutines)
REM-------------------------------------------------------------------------------

:ensure_dirs
if not exist "%PROFILES_DIR%" mkdir "%PROFILES_DIR%"
if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"
exit /b 0

:get_profile_dir
set "PROFILE_DIR=%PROFILES_DIR%\%~1"
exit /b 0

:get_current_profile
set "CURRENT_PROFILE="
if exist "%CURRENT_PROFILE_FILE%" (
    set /p CURRENT_PROFILE=<"%CURRENT_PROFILE_FILE%"
)
exit /b 0

:validate_name
echo %~1 | findstr /r "^[a-zA-Z][a-zA-Z0-9_-]*$" >nul
if errorlevel 1 (
    echo ERROR: Invalid profile name '%~1'. Use letters, numbers, hyphens, underscores.
    exit /b 1
)
if "%~1"=="agent" (
    echo ERROR: 'agent' is a reserved name.
    exit /b 1
)
exit /b 0

REM-------------------------------------------------------------------------------
REM cmd_list - List all profiles
REM-------------------------------------------------------------------------------

:cmd_list
echo.
echo   Pi Profiles
echo   ===========
echo.

call :get_current_profile
set "current=%CURRENT_PROFILE%"

REM Always show default
if "%current%"=="" (
    echo   * default  ^<- active
) else (
    echo     default
)
echo     %AGENT_DIR%
echo.

REM Show profiles
if exist "%PROFILES_DIR%" (
    dir /b /ad "%PROFILES_DIR%" 2>nul | findstr /v "^$" > "%TEMP%\pi_profiles.txt"
    if exist "%TEMP%\pi_profiles.txt" (
        :list_loop
        set /p profile=<"%TEMP%\pi_profiles.txt"
        if defined profile (
            if "!profile!"=="!current!" (
                echo   * !profile!  ^<- active
            ) else (
                echo     !profile!
            )
            echo     %PROFILES_DIR%\!profile!
            echo.
            set profile=
            goto list_loop
        )
        del "%TEMP%\pi_profiles.txt" 2>nul
    )
) else (
    echo   No profiles created yet. Run 'pi-profile create ^<name^>' to create one.
)

echo.
exit /b 0

REM-------------------------------------------------------------------------------
REM cmd_create - Create a new profile
REM-------------------------------------------------------------------------------

:cmd_create
set "NAME=%~2"
if "%NAME%"=="" (
    echo ERROR: Usage: pi-profile create ^<name^>
    exit /b 1
)

call :validate_name %NAME%
if errorlevel 1 exit /b 1

call :ensure_dirs
call :get_profile_dir %NAME%

if exist "%PROFILE_DIR%" (
    echo ERROR: Profile '%NAME%' already exists at %PROFILE_DIR%
    exit /b 1
)

REM Create profile directory structure
mkdir "%PROFILE_DIR%\sessions" 2>nul
mkdir "%PROFILE_DIR%\skills" 2>nul
mkdir "%PROFILE_DIR%\prompts" 2>nul
mkdir "%PROFILE_DIR%\themes" 2>nul
mkdir "%PROFILE_DIR%\extensions" 2>nul

REM Copy default settings if exists
if exist "%AGENT_DIR%\settings.json" (
    copy "%AGENT_DIR%\settings.json" "%PROFILE_DIR%\settings.json" >nul
) else (
    echo {} > "%PROFILE_DIR%\settings.json"
)

REM Create auth template
echo { "providers": {} } > "%PROFILE_DIR%\auth.json"

REM Copy models if exists
if exist "%AGENT_DIR%\models.json" (
    copy "%AGENT_DIR%\models.json" "%PROFILE_DIR%\models.json" >nul
)

echo Created profile '%NAME%' at %PROFILE_DIR%
echo Use 'pi-profile use %NAME%' to activate it
exit /b 0

REM-------------------------------------------------------------------------------
REM cmd_use - Set active profile
REM-------------------------------------------------------------------------------

:cmd_use
set "NAME=%~2"
if "%NAME%"=="" (
    echo ERROR: Usage: pi-profile use ^<name^>
    exit /b 1
)

if "%NAME%"=="default" (
    if exist "%CURRENT_PROFILE_FILE%" del "%CURRENT_PROFILE_FILE%"
    echo Using default profile (global %AGENT_DIR%)
    exit /b 0
)

call :validate_name %NAME%
if errorlevel 1 exit /b 1

call :get_profile_dir %NAME%

if not exist "%PROFILE_DIR%" (
    echo ERROR: Profile '%NAME%' does not exist. Run 'pi-profile create %NAME%' first.
    exit /b 1
)

echo %NAME% > "%CURRENT_PROFILE_FILE%"
echo Switched to profile '%NAME%'
echo Active directory: %PROFILE_DIR%
exit /b 0

REM-------------------------------------------------------------------------------
REM cmd_show - Show profile details
REM-------------------------------------------------------------------------------

:cmd_show
call :get_current_profile
set "NAME=%~2"
if "%NAME%"=="" set "NAME=%CURRENT_PROFILE%"

if "%NAME%"=="" (
    echo.
    echo   Current Profile: default
    echo   ========================
    echo.
    echo   Using global agent directory:
    echo     %AGENT_DIR%
    echo.
    goto :cmd_show_dir_default
)

REM Validate name unless it's "default"
if not "%NAME%"=="default" (
    call :validate_name %NAME% 2>nul
)

if "%NAME%"=="default" (
    set "SHOW_DIR=%AGENT_DIR%"
) else (
    call :get_profile_dir %NAME%
    set "SHOW_DIR=%PROFILE_DIR%"
)

if not exist "%SHOW_DIR%" (
    echo ERROR: Profile '%NAME%' does not exist
    exit /b 1
)

echo.
echo   Profile: %NAME%
echo   ===============
echo.
echo   Location: %SHOW_DIR%
echo.

:cmd_show_dir_default
echo   Contents:
echo.

REM Auth
if exist "%SHOW_DIR%\auth.json" (
    for %%A in ("%SHOW_DIR%\auth.json") do set "size=%%~zA"
    if !size! GTR 50 (
        echo   [x] auth.json
    ) else (
        echo   [o] auth.json (empty)
    )
) else (
    echo   [-] auth.json (not set)
)

REM Settings
if exist "%SHOW_DIR%\settings.json" (
    echo   [x] settings.json
) else (
    echo   [o] settings.json (default)
)

REM Models
if exist "%SHOW_DIR%\models.json" (
    echo   [x] models.json
) else (
    echo   [o] models.json (inherited)
)

REM Sessions
if exist "%SHOW_DIR%\sessions" (
    dir /b /a-d "%SHOW_DIR%\sessions\*.jsonl" 2>nul | findstr "^" >nul
    if errorlevel 1 (
        echo   [o] sessions/ (empty)
    ) else (
        dir /b /a-d "%SHOW_DIR%\sessions\*.jsonl" 2>nul | find /c /v "" > "%TEMP%\pi_count.txt"
        set /p count=<"%TEMP%\pi_count.txt"
        del "%TEMP%\pi_count.txt" 2>nul
        echo   [x] sessions/ (!count! files)
    )
) else (
    echo   [-] sessions/ (not created)
)

REM Skills
if exist "%SHOW_DIR%\skills" (
    dir /s /b "%SHOW_DIR%\skills\SKILL.md" 2>nul | find /c /v "" > "%TEMP%\pi_count.txt"
    set /p count=<"%TEMP%\pi_count.txt"
    del "%TEMP%\pi_count.txt" 2>nul
    if !count! GTR 0 (
        echo   [x] skills/ (!count! skills)
    ) else (
        echo   [o] skills/ (none)
    )
) else (
    echo   [o] skills/ (none)
)

echo.
exit /b 0

REM-------------------------------------------------------------------------------
REM cmd_delete - Delete a profile
REM-------------------------------------------------------------------------------

:cmd_delete
set "NAME=%~2"
if "%NAME%"=="" (
    echo ERROR: Usage: pi-profile delete ^<name^>
    exit /b 1
)

call :validate_name %NAME%
if errorlevel 1 exit /b 1

call :get_profile_dir %NAME%

if not exist "%PROFILE_DIR%" (
    echo ERROR: Profile '%NAME%' does not exist
    exit /b 1
)

call :get_current_profile
if "%NAME%"=="%CURRENT_PROFILE%" (
    echo WARNING: This is the currently active profile!
    echo Run 'pi-profile use default' first to switch away
    exit /b 1
)

echo Delete profile '%NAME%' at %PROFILE_DIR%?
echo Press Ctrl+C to cancel, or Enter to continue...
pause >nul

rmdir /s /q "%PROFILE_DIR%"
echo Deleted profile '%NAME%'
exit /b 0

REM-------------------------------------------------------------------------------
REM cmd_rename - Rename a profile
REM-------------------------------------------------------------------------------

:cmd_rename
set "OLD=%~2"
set "NEW=%~3"
if "%OLD%"=="" (
    echo ERROR: Usage: pi-profile rename ^<old^> ^<new^>
    exit /b 1
)
if "%NEW%"=="" (
    echo ERROR: Usage: pi-profile rename ^<old^> ^<new^>
    exit /b 1
)

call :validate_name %OLD%
if errorlevel 1 exit /b 1
call :validate_name %NEW%
if errorlevel 1 exit /b 1

call :get_profile_dir %OLD%
set "OLD_DIR=%PROFILE_DIR%"
call :get_profile_dir %NEW%
set "NEW_DIR=%PROFILE_DIR%"

if not exist "%OLD_DIR%" (
    echo ERROR: Profile '%OLD%' does not exist
    exit /b 1
)
if exist "%NEW_DIR%" (
    echo ERROR: Profile '%NEW%' already exists
    exit /b 1
)

move "%OLD_DIR%" "%NEW_DIR%" >nul

call :get_current_profile
if "%OLD%"=="%CURRENT_PROFILE%" (
    echo %NEW% > "%CURRENT_PROFILE_FILE%"
    echo Updated active profile marker
)

echo Renamed '%OLD%' to '%NEW%'
exit /b 0

REM-------------------------------------------------------------------------------
REM cmd_copy - Copy a profile
REM-------------------------------------------------------------------------------

:cmd_copy
set "FROM=%~2"
set "TO=%~3"
if "%FROM%"=="" (
    echo ERROR: Usage: pi-profile copy ^<from^> ^<to^>
    exit /b 1
)
if "%TO%"=="" (
    echo ERROR: Usage: pi-profile copy ^<from^> ^<to^>
    exit /b 1
)

call :validate_name %FROM%
if errorlevel 1 exit /b 1
call :validate_name %TO%
if errorlevel 1 exit /b 1

call :get_profile_dir %FROM%
set "FROM_DIR=%PROFILE_DIR%"
call :get_profile_dir %TO%
set "TO_DIR=%PROFILE_DIR%"

if not exist "%FROM_DIR%" (
    echo ERROR: Profile '%FROM%' does not exist
    exit /b 1
)
if exist "%TO_DIR%" (
    echo ERROR: Profile '%TO%' already exists
    exit /b 1
)

xcopy /e /i /y "%FROM_DIR%" "%TO_DIR%" >nul
echo Copied '%FROM%' to '%TO%'
echo Use 'pi-profile use %TO%' to activate it
exit /b 0

REM-------------------------------------------------------------------------------
REM cmd_export - Export profile to zip
REM-------------------------------------------------------------------------------

:cmd_export
set "NAME=%~2"
set "OUTPUT=%~3"
if "%NAME%"=="" (
    echo ERROR: Usage: pi-profile export ^<name^> [output-file]
    exit /b 1
)
if "%OUTPUT%"=="" set "OUTPUT=%NAME%.zip"

call :validate_name %NAME%
if errorlevel 1 exit /b 1

call :ensure_dirs
call :get_profile_dir %NAME%

if not exist "%PROFILE_DIR%" (
    echo ERROR: Profile '%NAME%' does not exist
    exit /b 1
)

REM Use PowerShell for zip compression
powershell -command "Compress-Archive -Path '%PROFILE_DIR%\*' -DestinationPath '%OUTPUT%' -Force"
echo Exported to %OUTPUT%
exit /b 0

REM-------------------------------------------------------------------------------
REM cmd_import - Import profile from zip
REM-------------------------------------------------------------------------------

:cmd_import
set "INPUT=%~2"
set "NAME=%~3"
if "%INPUT%"=="" (
    echo ERROR: Usage: pi-profile import ^<file^> [name]
    exit /b 1
)
if not exist "%INPUT%" (
    echo ERROR: File not found: %INPUT%
    exit /b 1
)
if "%NAME%"=="" (
    for %%F in ("%INPUT%") do set "NAME=%%~nF"
    REM Remove common suffixes
    set "NAME=!NAME:.profile=!"
    set "NAME=!NAME:_profile=!"
    set "NAME=!NAME:profile_=!"
)

call :validate_name %NAME%
if errorlevel 1 exit /b 1

call :ensure_dirs
call :get_profile_dir %NAME%

if exist "%PROFILE_DIR%" (
    echo ERROR: Profile '%NAME%' already exists
    exit /b 1
)

REM Extract to temp first
set "TEMP_DIR=%TEMP%\pi_import_%RANDOM%"
mkdir "%TEMP_DIR%"
powershell -command "Expand-Archive -Path '%INPUT%' -DestinationPath '%TEMP_DIR%' -Force"

REM Find extracted folder
for /d %%D in ("%TEMP_DIR%\*") do (
    move "%%D" "%PROFILE_DIR%" >nul
)

rmdir /s /q "%TEMP_DIR%" 2>nul
echo Imported as profile '%NAME%'
echo Use 'pi-profile use %NAME%' to activate it
exit /b 0

REM-------------------------------------------------------------------------------
REM cmd_shell - Run with profile environment
REM-------------------------------------------------------------------------------

:cmd_shell
set "NAME=%~2"
if "%NAME%"=="" (
    echo ERROR: Usage: pi-profile shell ^<name^> [command...]
    exit /b 1
)

if "%NAME%"=="default" (
    set "PI_PROFILE="
) else (
    call :validate_name %NAME%
    if errorlevel 1 exit /b 1
    set "PI_PROFILE=%NAME%"
)

shift
shift

if "%~1"=="" (
    echo Starting interactive shell with PI_PROFILE=%PI_PROFILE%
    echo Run 'exit' to return
    cmd /k
) else (
    cmd /c "set PI_PROFILE=%PI_PROFILE% && %*"
)
exit /b 0

REM-------------------------------------------------------------------------------
REM cmd_edit - Open profile in editor
REM-------------------------------------------------------------------------------

:cmd_edit
call :get_current_profile
set "NAME=%~2"
if "%NAME%"=="" set "NAME=%CURRENT_PROFILE%"

if "%NAME%"=="" (
    set "EDIT_DIR=%AGENT_DIR%"
) else (
    if not "%NAME%"=="default" (
        call :get_profile_dir %NAME%
        set "EDIT_DIR=%PROFILE_DIR%"
    ) else (
        set "EDIT_DIR=%AGENT_DIR%"
    )
)

if not exist "%EDIT_DIR%" (
    echo ERROR: Profile '%NAME%' does not exist
    exit /b 1
)

start "" "%EDIT_DIR%"
exit /b 0

REM-------------------------------------------------------------------------------
REM cmd_wrapper - Create standalone wrapper
REM-------------------------------------------------------------------------------

:cmd_wrapper
set "NAME=%~2"
if "%NAME%"=="" (
    echo ERROR: Usage: pi-profile wrapper ^<name^>
    exit /b 1
)

call :validate_name %NAME%
if errorlevel 1 exit /b 1

set "WRAPPER_DIR=%LOCALAPPDATA%\Microsoft\WindowsApps"
set "WRAPPER_PATH=%WRAPPER_DIR%\pi-%NAME%.cmd"

REM Create the wrapper
(
    echo @echo off
    echo REM Auto-generated by pi-profile
    echo REM Profile: %NAME%
    echo set PI_PROFILE=%NAME%
    echo start pi %%*
) > "%WRAPPER_PATH%"

echo Created wrapper: %WRAPPER_PATH%
echo You can now run 'pi-%NAME%' to use the '%NAME%' profile
exit /b 0
