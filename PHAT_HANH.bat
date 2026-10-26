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

node scripts\dong_goi.js
if errorlevel 1 (
  echo.
  echo CHUA DONG GOI DUOC - xem loi o tren. Khong tai gi len.
  pause
  exit /b 1
)

start "" "%~dp0dist"
start "" "https://claude.ai/customize/skills"
echo.
echo Da mo thu muc dist va trang Skills.
echo Tai file .zip len vao DUNG skill soan-van-ban-hung-dao - khong xoa roi them lai.
pause
