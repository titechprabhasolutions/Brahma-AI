import configparser
import argparse
from helper import *

# Colored terminal fix
os.system ('')

parser = argparse.ArgumentParser (add_help=False, description='Copy project locale.')
parser.add_argument ('--name-src', help='project short name source', required=True)
parser.add_argument ('--name-dst', help='project short name destination', required=True)
parser.add_argument ('--locale-key', help='key to found and replace', required=True)

args = parser.parse_args ()

APP_NAME_SHORT_SRC=args.name_src
APP_NAME_SHORT_DST=args.name_dst
LOCALE_KEY=args.locale_key

# Set current script configuration
CURRENT_DIRECTORY = os.path.dirname (os.path.abspath (__file__))
PROJECT_DIRECTORY_SRC = os.path.join (CURRENT_DIRECTORY, '..', '..', APP_NAME_SHORT_SRC)
PROJECT_DIRECTORY_DST = os.path.join (CURRENT_DIRECTORY, '..', '..', APP_NAME_SHORT_DST)
I18N_DIRECTORY_SRC = os.path.join (PROJECT_DIRECTORY_SRC, 'bin', 'i18n')
I18N_DIRECTORY_DST = os.path.join (PROJECT_DIRECTORY_DST, 'bin', 'i18n')

# Checking configuration
log_status (status.TITLE, 'Checking configuration')

check_path_with_status ('Project name (src)', PROJECT_DIRECTORY_SRC)
check_path_with_status ('Project name (dst)', PROJECT_DIRECTORY_DST)
check_path_with_status ('i18n directory (src)', I18N_DIRECTORY_SRC)
check_path_with_status ('i18n directory (dst)', I18N_DIRECTORY_DST)

log_status (status.SUCCESS, 'Key to copy "' + LOCALE_KEY + '" is set')

log_status (status.TITLE, 'Start parsing localization')

for name in os.listdir (I18N_DIRECTORY_SRC):
	if not name.endswith ('.ini'):
		continue

	locale_name = os.path.splitext (name)[0]
	locale_path_src = os.path.join (I18N_DIRECTORY_SRC, name)

	locale_ini_src = configparser.ConfigParser (delimiters='=', interpolation=None)
	locale_ini_src.optionxform = str

	locale_ini_src.read (locale_path_src, encoding='utf-16')

	if not locale_name in locale_ini_src or not LOCALE_KEY in locale_ini_src[locale_name]:
		log_status (status.FAILED, 'Locale "' + locale_name + '" key "' + LOCALE_KEY + '" was not found')

	else:
		locale_path_dst = os.path.join (I18N_DIRECTORY_DST, name)

		locale_ini_dst = configparser.ConfigParser (delimiters='=', interpolation=None)
		locale_ini_dst.optionxform = str

		locale_ini_dst.read (locale_path_dst, encoding='utf-16')

		if not locale_name in locale_ini_dst:
			log_status (status.FAILED, 'Locale "' + LOCALE_KEY + '" was incorrect')
			continue

		if not LOCALE_KEY in locale_ini_src[locale_name]:
			log_status (status.FAILED, 'Locale "' + LOCALE_KEY + '" was not found')
			continue

		locale_value = locale_ini_src.get (locale_name, LOCALE_KEY, fallback=None, raw=True)

		if not locale_value:
			log_status (status.FAILED, 'Locale "' + LOCALE_KEY + '" was empty in "' + locale_name + '"')
			continue

		if LOCALE_KEY in locale_ini_dst[locale_name] and locale_ini_dst[locale_name][LOCALE_KEY] == locale_value:
			log_status (status.WARNING, 'Locale "' + locale_name + '" was already the same')
			continue

		log_status (status.SUCCESS, 'Locale "' + locale_name + '" key was updated')

		locale_ini_dst.set (locale_name, LOCALE_KEY, locale_value)

		# Update locale
		locale_content = ''

		with open (locale_path_dst, mode='r', encoding='utf-16') as ini_file:
			lines = ini_file.readlines ()
			ini_file.close ()

			for line in lines:
				if line.startswith (';'):
					locale_content = locale_content + line
				else:
					break

			if locale_content:
				locale_content = locale_content + '\n'

			locale_content = locale_content + '[' + locale_name + ']\n'
			ini_file.close ()

		for name,value in locale_ini_dst.items (locale_name, raw=True):
			locale_content = locale_content + name + '=' + value + '\n'

		with open (locale_path_dst, 'w', encoding='utf-16') as ini_file:
			ini_file.write (locale_content)
			ini_file.close ()
