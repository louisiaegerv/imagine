@echo off
rem Starts the production server (run `pnpm build` first). Used by the login
rem auto-start entry; output goes to %LOCALAPPDATA%\imagine\server.log.
rem Set IMAGINE_PORT to override the default port (4000).
cd /d "%~dp0.."
if not defined IMAGINE_PORT set IMAGINE_PORT=4000
if not exist "%LOCALAPPDATA%\imagine" mkdir "%LOCALAPPDATA%\imagine"
echo [%date% %time%] starting on port %IMAGINE_PORT% >> "%LOCALAPPDATA%\imagine\server.log"
call pnpm exec next start -p %IMAGINE_PORT% >> "%LOCALAPPDATA%\imagine\server.log" 2>&1
