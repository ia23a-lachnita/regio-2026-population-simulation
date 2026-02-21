@echo off
echo === Workspace Reset Script ===
echo.
echo This will COMPLETELY RESET the workspace to initial state.
echo All work in workspace/ and delivery/ will be DELETED!
echo.
set "confirm="
if /i "%~1"=="--yes" set "confirm=y"
if /i "%~1"=="-y" set "confirm=y"
if "%confirm%"=="" set /p confirm="Continue? (y/N): "
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
robocopy boilerplate workspace /E ^
  /XD node_modules dist out release build coverage .turbo .cache .parcel-cache .next .nuxt .svelte-kit .vite .vscode ^
  /XF *.tsbuildinfo > nul
if errorlevel 8 (
  echo   ERROR: Failed to copy boilerplate
  exit /b 1
)
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
  echo - [ ] Validate schema and routes
  echo - [ ] Verify routes/pages/components exist
  echo - [ ] Confirm core functionality implemented
  echo - Status: NOT STARTED
  echo.
  echo ## Phase 6: Package
  echo - [ ] Run verification (pnpm run verify:win^)
  echo - [ ] Test packaged executable launch (workspace/release/win-unpacked/*.exe^)
  echo - [ ] Verify executable/installer names use real app name (no boilerplate/template placeholders^)
  echo - [ ] Run automated UI acceptance tests for analysis + criterion lifecycle
  echo - [ ] Confirm DB file exists after launch
  echo - [ ] Create delivery/ structure
  echo - [ ] Generate documentation
  echo - Evidence:
  echo   - verify_command:
  echo   - verify_exit_code:
  echo   - exe_tested:
  echo   - artifact_naming_check:
  echo   - launch_timestamp:
  echo   - db_path:
  echo   - db_exists:
  echo   - ui_acceptance_command:
  echo   - ui_acceptance_exit_code:
  echo   - ui_acceptance_report:
  echo   - ui_acceptance_scenarios:
  echo   - error_summary:
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
