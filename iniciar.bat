@echo off
chcp 65001 >nul
cd /d "%~dp0"
title GoGreen

where npm >nul 2>nul
if errorlevel 1 (
  echo O Node.js nao esta instalado. Instale a versao LTS em https://nodejs.org e rode este arquivo de novo.
  start "" "https://nodejs.org"
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando as dependencias. Na primeira vez leva alguns minutos...
  call npm install
  if errorlevel 1 (
    echo A instalacao falhou. Veja a mensagem acima.
    pause
    exit /b 1
  )
)

echo.
echo Abrindo o GoGreen no navegador. Para parar, feche esta janela.
echo.
call npm run dev -- --open
pause
