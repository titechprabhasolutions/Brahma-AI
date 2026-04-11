import argparse
import stat
from helper import *

def find_and_set (dct, name, value):
	for k,v in dct.items ():
		if v['name'] == name:
			v['value'] = value
			return

	log_status (status.FAILED, 'String was not found: "' + name + '"')

# https://www.alchemysoftware.com/livedocs/ezscript/Topics/Catalyst/Language.htm
def get_locale_name (name):
	ldict = {
			'Azerbaijani': 'az',
			'Belarusian': 'be',
			'Bosnian': 'bs',
			'Bulgarian': 'bg',
			'Catalan': 'ca',
			'Chinese': 'zh',
			'Chinese (Simplified)': 'zh-CN',
			'Chinese (Traditional)': 'zh-TW',
			'Czech': 'cs',
			'Dutch': 'nl',
			'Finnish': 'fi',
			'French': 'fr',
			'German': 'de',
			'Hungarian': 'hu',
			'Indonesian': 'id',
			'Italian': 'it',
			'Japanese': 'ja',
			'Kazakh': 'kk',
			'Korean': 'ko',
			'Persian': 'fa',
			'Polish': 'pl',
			'Portuguese': 'pt',
			'Portuguese (Brazil)': 'pt-BR',
			'Portuguese (Portugal)': 'pt-PT',
			'Romanian': 'ro',
			'Russian': 'ru',
			'Serbian': 'sr',
			'Slovak': 'sk',
			'Spanish': 'es',
			'Swedish': 'sv',
			'Turkish': 'tr',
			'Ukrainian': 'uk',
	}

	new_name = None

	for lname, lcode in ldict.items():
		if name.lower () == lname.lower ():
			new_name = lcode
			break

	if not new_name:
		log_status (status.WARNING, 'Locale name was not found: "' + name + '"')
		new_name = name

	return new_name

parser = argparse.ArgumentParser (add_help=False, description='Build project locale.')
parser.add_argument ('--name-short', help='project short name', required=True)

args = parser.parse_args ()

APP_NAME_SHORT=args.name_short

# Set current script configuration
CURRENT_DIRECTORY = os.path.dirname (os.path.abspath (__file__))
PROJECT_DIRECTORY = os.path.join (CURRENT_DIRECTORY, '..', '..', APP_NAME_SHORT)
I18N_DIRECTORY = os.path.join (PROJECT_DIRECTORY, 'bin', 'i18n')
EXAMPLE_DIRECTORY = os.path.join (I18N_DIRECTORY, '!example.txt')
LOCALE_FILE = os.path.join (PROJECT_DIRECTORY, 'bin', APP_NAME_SHORT + '.lng')
RESOURCE_RC = os.path.join (PROJECT_DIRECTORY, 'src', 'resource.rc')
RESOURCE_H = os.path.join (PROJECT_DIRECTORY, 'src', 'resource.h')

# Checking configuration
log_status (status.TITLE, 'Checking configuration')

check_path_with_status ('Project name', PROJECT_DIRECTORY)
check_path_with_status ('Resource header', RESOURCE_H, True)
check_path_with_status ('Resource code', RESOURCE_RC, True)

ID_ACCELERATOR = 1
ID_CONTROL = 100
ID_DIALOG = 100
ID_ICON = 100
ID_RCDATA = 1
ID_STRING = 1
ID_PTR = 100

strings_array = {}

# Update resource header
log_status (status.TITLE, 'Update resource header')

clr = status.FAILED

with open (RESOURCE_H, 'r') as fn:
	lines = fn.readlines ()
	fn.close ()

	header_content = ''

	for line in lines:
		line = line.strip ('\r\n')

		if not line.startswith ('#define '):
			header_content += line + '\n'

		else:
			var = line.split (' ')

			if len (var) < 3 or not var[1] or not var[2] or not var[2].strip ().isdigit ():
				header_content += line + '\n'

			else:
				res_name = var[1].strip ()
				res_id = int (var[2].strip ())

				if res_name.startswith ('IDC_') or res_name.startswith ('IDM_'):
					res_id = ID_CONTROL
					ID_CONTROL += 1

				elif res_name.startswith ('IDS_'):
					res_id = ID_STRING
					ID_STRING += 1

					strings_array[str (res_id)] = {'name': res_name, 'value': ''}

				elif res_name.startswith ('IDI_'):
					res_id = ID_ICON
					ID_ICON += 1

				elif res_name.startswith ('IDD_'):
					res_id = ID_DIALOG
					ID_DIALOG += 1

				elif res_name.startswith ('IDR_'):
					res_id = ID_RCDATA
					ID_RCDATA += 1

				elif res_name.startswith ('IDA_'):
					res_id = ID_ACCELERATOR
					ID_ACCELERATOR += 1

				elif res_name.startswith ('IDP_'):
					res_id = ID_PTR
					ID_PTR += 1

				header_content += '#define ' + res_name + ' ' + str (res_id) + '\n'

	if header_content:
		with open (RESOURCE_H, 'w', newline='\r\n') as fn:
			clr = status.SUCCESS

			fn.write (header_content)
			fn.close ()

log_status (clr, 'Update header content "' + get_file_name (RESOURCE_H) + '"')

log_status (status.TITLE, 'Checking strings resources')

if len (strings_array):
	clr = status.SUCCESS
else:
	clr = status.FAILED

log_status (clr, str (len (strings_array)) + ' string(s) was found')

if clr == status.FAILED:
	os.sys.exit ()

# Parse strings from resource code
log_status (status.TITLE, 'Parse strings from resource code')

clr = status.FAILED

with open (RESOURCE_RC, 'r') as fn:
	lines = fn.readlines ()

	for line in lines:
		line = line.strip ('\t\r\n ')

		if line.startswith ('IDS_'):
			part = line.partition (' ')

			if part[0] and part[2]:
				key = part[0].strip ('\t "')

				start_pos = str.index (part[2], '"')
				end_pos= str.rindex (part[2], '"')

				val = part[2][start_pos:end_pos]
				val = val.replace ('""', '"').strip ('\t "')

				if key and val:
					find_and_set (strings_array, key, val)
					clr = status.SUCCESS

	fn.close ()

log_status (clr, 'Parsing was finished')

if clr != status.SUCCESS:
	os.sys.exit ()

# Create locale example file
log_status (status.TITLE, 'Create locale example file')

clr = status.FAILED

with open (EXAMPLE_DIRECTORY, 'w', encoding='utf-16', newline='\r\n') as fn:
	fn.write ('; <language name>\n' + '; <author information>' + '\n\n' + '[<locale name here>]\n')

	for k,v in strings_array.items ():
		if v['value']:
			clr = status.SUCCESS
			fn.write (v['name'] + '=' + v['value'] + '\n')

	fn.close ()

log_status (clr, 'Write file "' + get_file_name (EXAMPLE_DIRECTORY) + '" was finished')

if not os.path.isdir (I18N_DIRECTORY):
	log_status (bcolor.FAILED, 'Locale directory "' + I18N_DIRECTORY + '" was not found.')
	os.sys.exit ()

# Get localization timestamp
i18n_files = os.listdir (I18N_DIRECTORY)

locale_timestamp = 0
locale_lastname = ''

for name in i18n_files:
	if not name.endswith ('.ini'):
		continue

	locale_name = os.path.splitext (name)[0]
	locale_path = os.path.join (I18N_DIRECTORY, name)

	lastmod = os.path.getmtime (locale_path);

	if lastmod > locale_timestamp:
		locale_timestamp = lastmod
		locale_lastname = locale_name

locale_timestamp = int (locale_timestamp)

# Enumerate localizations
log_status (status.TITLE, 'Enumerate localizations')

lng_content = '; ' + APP_NAME_SHORT + '\n'
lng_content = lng_content + '; https://github.com/henrypp/' + APP_NAME_SHORT + '/tree/master/bin/i18n\n'
lng_content = lng_content + ';\n; DO NOT MODIFY THIS FILE -- YOUR CHANGES WILL BE ERASED!\n\n'

for name in i18n_files:
	if not name.endswith ('.ini'):
		continue

	clr = status.FAILED

	locale_name = os.path.splitext (name)[0]
	locale_path = os.path.join (I18N_DIRECTORY, name)
	locale_sname = locale_name
	#locale_sname = get_locale_name (locale_name)

	try:
		ini_file = open (locale_path, mode='r', encoding='utf-16')
		lines = ini_file.readlines ()
		ini_file.close ()

	except Exception as e:
		log_status (status.FAILED, 'Parsing "' + name + '" (' + str (e) + ')')

	else:
		# Get locale structure
		locale_content = ''
		locale_desc = ''
		locale_array = {}

		for line in lines:
			if line.startswith (';'):
				locale_desc += line
			else:
				break

		if locale_desc:
			locale_desc += '\n'

		# Write locale header
		locale_content += locale_desc + '[' + locale_name + ']\n'
		lng_content += locale_desc + '[' + locale_sname + ']\n'

		# Write locale timestamp
		if locale_name.lower () == 'russian':
			lng_content += '000=' + str (locale_timestamp) + '\n'

		# Parse locale string array
		for line in lines:
			line = line.strip ('\t\n ')

			if line.startswith (';'):
				continue

			part = line.partition ('=')

			if part[0] and part[2]:
				key = part[0].strip ('\t\n ');
				value = part[2].strip ('\t\n ');

				locale_array[key] = value

		# Write parsed locale array into a file
		for k,v in strings_array.items ():
			if not v['value']:
				continue

			key = v['name']
			number_key = '{:03}'.format (int (k))

			if number_key in locale_array:
				value = locale_array[number_key]

			elif key in locale_array:
				value = locale_array[key]

			else:
				value = v['value']

			locale_content += key + '=' + value + '\n'

			if value != v['value']:  # write only localized strings
				lng_content += number_key + '=' + value + '\n'

			clr = status.SUCCESS

		# Line-ending hack
		if i18n_files[-1] != name:
			lng_content += '\n'

		# Write updated language template
		filemtime = os.path.getmtime (locale_path);

		with open (locale_path, 'w', encoding='utf-16', newline='\r\n') as ini_file:
			ini_file.write (locale_content)
			ini_file.close ()

		os.utime (locale_path, (filemtime, filemtime))

		log_status (clr, 'Parsing "' + name + '"')

# Write updated language content
log_status (status.TITLE, 'Write updated language content')

if os.path.isfile (LOCALE_FILE):
	os.chmod (LOCALE_FILE, stat.S_IWRITE)

try:
	lng_file = open (LOCALE_FILE, 'w', encoding='utf-16', newline='\r\n')
	lng_file.write (lng_content)
	lng_file.close ()

except Exception as e:
	log_status (status.FAILED, 'Write locale "' + get_file_name (LOCALE_FILE) + '" (' + str (e) + ')')

else:
	log_status (status.SUCCESS, 'Write locale "' + get_file_name (LOCALE_FILE) + '"')

# Copy localization to binaries folders
file_copy (LOCALE_FILE, os.path.join (PROJECT_DIRECTORY, 'bin', '64', os.path.basename (LOCALE_FILE)), made_dir=False)
file_copy (LOCALE_FILE, os.path.join (PROJECT_DIRECTORY, 'bin', 'ARM64', os.path.basename (LOCALE_FILE)), made_dir=False)

print ('\nLocale timestamp: ' + str (locale_timestamp) + ' (' + locale_lastname + ').')
