@echo off
echo === Workspace Reset Script ===
echo.
echo This will COMPLETELY RESET the workspace to initial state.
echo All work in workspace/ and delivery/ will be DELETED!
echo.
set /p confirm="Continue? (y/N): "
if /i not "%confirm%"=="y" (
  echo Reset cancelled.
  exit /b 1
)

echo.
echo [1/4] Cleaning workspace...

REM Remove workspace completely
if exist workspace (
  echo   Removing workspace directory...
  rmdir /S /Q workspace
  echo   OK Workspace removed
) else (
  echo   Workspace doesn't exist (nothing to remove)
)

REM Remove delivery folder
if exist delivery (
  echo   Removing delivery directory...
  rmdir /S /Q delivery
  echo   OK Delivery removed
)

REM Clean extracted input files
if exist input\extracted (
  echo   Removing extracted input files...
  rmdir /S /Q input\extracted
  echo   OK Extracted files removed
)

echo.
echo [2/4] Creating fresh workspace from boilerplate...

if not exist boilerplate (
  echo   ERROR: boilerplate directory not found!
  echo   Cannot create workspace without boilerplate
  exit /b 1
)

echo   Copying boilerplate to workspace...
xcopy /E /I /Y /Q boilerplate workspace > nul
if exist workspace\node_modules rmdir /S /Q workspace\node_modules
if exist workspace\dist rmdir /S /Q workspace\dist
echo   OK Boilerplate copied

echo   Creating .context directory...
if not exist workspace\.context mkdir workspace\.context
if not exist workspace\.context\source-docs mkdir workspace\.context\source-docs
echo   OK Context directory created

echo.
echo [3/4] Creating PROGRESS.md...

(
  echo # Implementation Progress
  echo.
  echo Update this file after completing each phase!
  echo.
  echo ## Phase 0: Prepare Input Files
  echo - [ ] Run: cd utils ^&^& python prepare-input.py
  echo - [ ] Verify: workspace/.context/source-docs/ created
  echo - [ ] Check: Images extracted (wireframes, diagrams^)
  echo - Status: NOT STARTED
  echo.
  echo ## Phase 1: Extract Requirements
  echo - [ ] Read all converted markdown files
  echo - [ ] Review wireframe images
  echo - [ ] Create REQUIREMENTS.md
  echo - Status: NOT STARTED
  echo.
  echo ## Phase 2: Analyze Domain
  echo - [ ] Read REQUIREMENTS.md
  echo - [ ] Create DOMAIN_MODEL.md (entities, relationships^)
  echo - Status: NOT STARTED
  echo.
  echo ## Phase 3: Generate Plan
  echo - [ ] Create IMPLEMENTATION_PLAN.md (step-by-step tasks^)
  echo - Status: NOT STARTED
  echo.
  echo ## Phase 4: Implement
  echo - [ ] Update database schema
  echo - [ ] Create TypeScript interfaces
  echo - [ ] Build all pages and components
  echo - [ ] Implement routing and features
  echo - Status: NOT STARTED
  echo.
  echo ## Phase 5: Validate
  echo - [ ] Run build check (pnpm run build^)
  echo - [ ] Validate schema and routes
  echo - [ ] Test functionality
  echo - Status: NOT STARTED
  echo.
  echo ## Phase 6: Package
  echo - [ ] Build executable (pnpm run electron:build^)
  echo - [ ] Create delivery/ structure
  echo - [ ] Generate documentation
  echo - Status: NOT STARTED
) > workspace\.context\PROGRESS.md

echo   OK PROGRESS.md created

echo.
echo [4/4] Checking input folder...

dir /b input 2>nul | findstr /v "extracted" >nul
if errorlevel 1 (
  echo   WARNING: Input folder is empty!
  echo   Please add competition ZIP/PDF to input/ before starting
) else (
  echo   OK Input files found:
  for %%f in (input\*.zip input\*.pdf input\*.txt input\*.md input\*.json) do (
    if exist "%%f" echo     - %%~nxf
  )
)

echo.
echo =========================================
echo WORKSPACE RESET COMPLETE
echo =========================================
echo.
echo Next Steps:
echo.
echo 1. Start your AI agent (Claude Code, Gemini CLI, etc.^)
echo.
echo 2. Type: START
echo.
echo The AI will read CLAUDE.md (or GEMINI.md^) and autonomously
echo complete all 7 phases (Phase 0-6^).
echo.
echo Working directory: %CD%
echo.
pause
