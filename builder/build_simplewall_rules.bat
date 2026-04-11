@echo off

if [%1]==[] (
	echo Usage: build_simplewall_rules.bat file_path
	pause
	exit
)

python ./src/build_simplewall_rules.py --mode=%1 --i=%2 --o=%3
