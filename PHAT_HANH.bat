@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Phat hanh ban moi cua skill: kiem toan bo, dong goi, mo san cho de tai len.
rem Hong mot muc la dung lai - khong co file .zip nao ra de lo tay tai len.

where node >nul 2>nul
if errorlevel 1 (
  echo May nay chua co Node. Cai ban LTS tai https://nodejs.org roi chay lai.
  pause
  exit /b 1
)

node skills\soan-van-ban\scripts\dong_goi.js
if errorlevel 1 (
  echo.
  echo CHUA DONG GOI DUOC - xem loi o tren. Khong tai gi len.
  pause
  exit /b 1
)

start "" "%~dp0dist"
start "" "https://claude.ai/customize/skills"
echo.
echo Da mo thu muc dist va trang Customize.
echo Tai dist\vpdk.zip len muc Plugins - plugin gom 3 skill soan-van-ban, soan-tra-lai va soan-tra-loi-cctt.
echo Tai khoan chua co muc Plugins thi tai dist\skill-le\soan-van-ban.zip len muc Skills.
pause
