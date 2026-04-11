@echo off

if [%1]==[] (
	echo Usage: build.bat app_name_short app_version app_name
	pause
	exit
)

python ./src/build_package.py --name-short=%1 --version=%2 --name=%3
