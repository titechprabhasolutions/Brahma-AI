import argparse
from helper import *

parser = argparse.ArgumentParser (add_help=False, description='Build project packages.')
parser.add_argument ('--name', help='project full name')
parser.add_argument ('--name-short', help='project short name', required=True)
parser.add_argument ('--version', help='project short name', required=True)

args = parser.parse_args ()

APP_NAME=args.name
APP_NAME_SHORT=args.name_short
APP_VERSION=args.version

# Set script configuration
CURRENT_DIRECTORY = os.path.dirname (os.path.abspath (__file__))
PROJECT_DIRECTORY = os.path.join (CURRENT_DIRECTORY, '..', '..', APP_NAME_SHORT)
BIN_DIRECTORY = os.path.join (PROJECT_DIRECTORY, 'bin')
OUT_DIRECTORY = os.path.join (os.path.join (os.environ['USERPROFILE']), 'Desktop')
TMP_DIRECTORY = os.path.join (os.environ['TEMP'], 'builder', APP_NAME_SHORT)

PORTABLE_FILE = os.path.join (OUT_DIRECTORY, APP_NAME_SHORT + '-' + APP_VERSION + '-bin.7z')
PDB_PACKAGE_FILE = os.path.join (OUT_DIRECTORY, APP_NAME_SHORT + '-' + APP_VERSION + '-pdb.7z')
SETUP_FILE = os.path.join (OUT_DIRECTORY, APP_NAME_SHORT + '-' + APP_VERSION + '-setup.exe')
CHECKSUM_FILE = os.path.join (OUT_DIRECTORY, APP_NAME_SHORT + '-' + APP_VERSION + '.sha256')

# Checking configuration
log_status (status.TITLE, 'Checking configuration')

check_path_with_status ('Project name', PROJECT_DIRECTORY)
check_path_with_status ('Binaries directory', BIN_DIRECTORY)

# Remove previous packages
log_status (status.TITLE, 'Remove previous packages')

file_remove (PORTABLE_FILE)
file_remove (PDB_PACKAGE_FILE)
file_remove (SETUP_FILE)
file_remove (SETUP_FILE + '.sig')
file_remove (CHECKSUM_FILE)

# Copy GIT configuration
log_status (status.TITLE, 'Copy GIT configuration')

if os.path.isfile (os.path.join (CURRENT_DIRECTORY, '.github', 'FUNDING.yml')):
	file_copy (os.path.join (CURRENT_DIRECTORY, '.github', 'FUNDING.yml'), os.path.join (PROJECT_DIRECTORY, '.github', 'FUNDING.yml'))

#if os.path.isfile (os.path.join (CURRENT_DIRECTORY, '.editorconfig')):
#	file_copy (os.path.join (CURRENT_DIRECTORY, '.editorconfig'), os.path.join (PROJECT_DIRECTORY, '.editorconfig'))

if os.path.isfile (os.path.join (CURRENT_DIRECTORY, '.gitattributes')):
	file_copy (os.path.join (CURRENT_DIRECTORY, '.gitattributes'), os.path.join (PROJECT_DIRECTORY, '.gitattributes'))

if os.path.isfile (os.path.join (CURRENT_DIRECTORY, '.gitignore')):
	file_copy (os.path.join (CURRENT_DIRECTORY, '.gitignore'), os.path.join (PROJECT_DIRECTORY, '.gitignore'))

if os.path.isfile (os.path.join (CURRENT_DIRECTORY, '.gitmodules')):
	file_copy (os.path.join (CURRENT_DIRECTORY, '.gitmodules'), os.path.join (PROJECT_DIRECTORY, '.gitmodules'))

if os.path.isfile (os.path.join (BIN_DIRECTORY, 'History.txt')):
	file_copy (os.path.join (BIN_DIRECTORY, 'History.txt'), os.path.join (PROJECT_DIRECTORY, 'CHANGELOG.md'))

# Cleaning temporary files
if os.path.isdir (TMP_DIRECTORY):
	log_status (status.TITLE, 'Cleaning temporary files')
	dir_remove (TMP_DIRECTORY)

is_buildfor_64 = os.path.isdir (os.path.join (BIN_DIRECTORY, '64'))
is_buildfor_arm64 = os.path.isdir (os.path.join (BIN_DIRECTORY, 'arm64'))

is_readme_exist = os.path.isfile (os.path.join (BIN_DIRECTORY, 'Readme.txt'))
is_history_exist = os.path.isfile (os.path.join (BIN_DIRECTORY, 'History.txt'))
is_license_exist = os.path.isfile (os.path.join (BIN_DIRECTORY, 'License.txt'))

is_config_exist = os.path.isfile (os.path.join (BIN_DIRECTORY, APP_NAME_SHORT + '.ini'))
is_locale_exist = os.path.isfile (os.path.join (BIN_DIRECTORY, APP_NAME_SHORT + '.lng'))

# Copy files
log_status (status.TITLE, 'Copy files')

if not is_readme_exist:
	log_status (status.WARNING, 'Readme.txt was not found')

if not is_history_exist:
	log_status (status.WARNING, 'History.txt was not found')

if not is_license_exist:
	log_status (status.WARNING, 'License.txt was not found')

if not is_config_exist:
	log_status (status.WARNING, 'Default configuration was not found')

if not is_locale_exist:
	log_status (status.WARNING, 'Locale was not found')

if is_buildfor_64:
	os.makedirs (os.path.join (TMP_DIRECTORY, '64'), exist_ok=True)

	file_create (os.path.join (TMP_DIRECTORY, '64', 'portable.dat'), '#PORTABLE#')

	file_copy_mask (os.path.join (BIN_DIRECTORY, '64', '*.exe'), os.path.join (TMP_DIRECTORY, '64'));
	file_copy_mask (os.path.join (BIN_DIRECTORY, '64', '*.scr'), os.path.join (TMP_DIRECTORY, '64'));
	file_copy_mask (os.path.join (BIN_DIRECTORY, '64', '*.dll'), os.path.join (TMP_DIRECTORY, '64'));

	file_copy_mask (os.path.join (BIN_DIRECTORY, '*.bat'), os.path.join (TMP_DIRECTORY, '64'));
	file_copy_mask (os.path.join (BIN_DIRECTORY, '*.reg'), os.path.join (TMP_DIRECTORY, '64'));
	file_copy_mask (os.path.join (BIN_DIRECTORY, '*.dat'), os.path.join (TMP_DIRECTORY, '64'));

	if is_readme_exist:
		file_copy (os.path.join (BIN_DIRECTORY, 'Readme.txt'), os.path.join (TMP_DIRECTORY, '64', 'Readme.txt'))

	if is_history_exist:
		file_copy (os.path.join (BIN_DIRECTORY, 'History.txt'), os.path.join (TMP_DIRECTORY, '64', 'History.txt'))

	if is_license_exist:
		file_copy (os.path.join (BIN_DIRECTORY, 'License.txt'), os.path.join (TMP_DIRECTORY, '64', 'License.txt'))

	if is_config_exist:
		file_copy (os.path.join (BIN_DIRECTORY, APP_NAME_SHORT + '.ini'), os.path.join (TMP_DIRECTORY, '64', APP_NAME_SHORT + '.ini'))

	if is_locale_exist:
		file_copy (os.path.join (BIN_DIRECTORY, APP_NAME_SHORT + '.lng'), os.path.join (TMP_DIRECTORY, '64', APP_NAME_SHORT + '.lng'))

if is_buildfor_arm64:
	os.makedirs (os.path.join (TMP_DIRECTORY, 'ARM64'), exist_ok=True)

	file_create (os.path.join (TMP_DIRECTORY, 'ARM64', 'portable.dat'), '#PORTABLE#')

	file_copy_mask (os.path.join (BIN_DIRECTORY, 'ARM64', '*.exe'), os.path.join (TMP_DIRECTORY, 'ARM64'));
	file_copy_mask (os.path.join (BIN_DIRECTORY, 'ARM64', '*.scr'), os.path.join (TMP_DIRECTORY, 'ARM64'));
	file_copy_mask (os.path.join (BIN_DIRECTORY, 'ARM64', '*.dll'), os.path.join (TMP_DIRECTORY, 'ARM64'));

	file_copy_mask (os.path.join (BIN_DIRECTORY, '*.bat'), os.path.join (TMP_DIRECTORY, 'ARM64'));
	file_copy_mask (os.path.join (BIN_DIRECTORY, '*.reg'), os.path.join (TMP_DIRECTORY, 'ARM64'));
	file_copy_mask (os.path.join (BIN_DIRECTORY, '*.dat'), os.path.join (TMP_DIRECTORY, 'ARM64'));

	if is_readme_exist:
		file_copy (os.path.join (BIN_DIRECTORY, 'Readme.txt'), os.path.join (TMP_DIRECTORY, 'ARM64', 'Readme.txt'))

	if is_history_exist:
		file_copy (os.path.join (BIN_DIRECTORY, 'History.txt'), os.path.join (TMP_DIRECTORY, 'ARM64', 'History.txt'))

	if is_license_exist:
		file_copy (os.path.join (BIN_DIRECTORY, 'License.txt'), os.path.join (TMP_DIRECTORY, 'ARM64', 'License.txt'))

	if is_config_exist:
		file_copy (os.path.join (BIN_DIRECTORY, APP_NAME_SHORT + '.ini'), os.path.join (TMP_DIRECTORY, 'ARM64', APP_NAME_SHORT + '.ini'))

	if is_locale_exist:
		file_copy (os.path.join (BIN_DIRECTORY, APP_NAME_SHORT + '.lng'), os.path.join (TMP_DIRECTORY, 'ARM64', APP_NAME_SHORT + '.lng'))

# Calculate binaries hash
binary_hash_64 = None
binary_hash_arm64 = None

if os.path.isfile (os.path.join (TMP_DIRECTORY, '64', APP_NAME_SHORT + '.exe')):
	binary_hash_64 = file_get_sha256 (os.path.join (TMP_DIRECTORY, '64', APP_NAME_SHORT + '.exe'))

elif os.path.isfile (os.path.join (TMP_DIRECTORY, '64', APP_NAME_SHORT + '.scr')):
	binary_hash_64 = file_get_sha256 (os.path.join (TMP_DIRECTORY, '64', APP_NAME_SHORT + '.scr'))

if os.path.isfile (os.path.join (TMP_DIRECTORY, 'ARM64', APP_NAME_SHORT + '.exe')):
	binary_hash_arm64 = file_get_sha256 (os.path.join (TMP_DIRECTORY, 'ARM64', APP_NAME_SHORT + '.exe'))

elif os.path.isfile (os.path.join (TMP_DIRECTORY, 'ARM64', APP_NAME_SHORT + '.scr')):
	binary_hash_arm64 = file_get_sha256 (os.path.join (TMP_DIRECTORY, 'ARM64', APP_NAME_SHORT + '.scr'))

# Sign binaries with GPG
log_status (status.TITLE, 'Sign binaries with GPG')

if is_buildfor_64:
	file_sign_mask (os.path.join (TMP_DIRECTORY, '64', '*.exe'))
	file_sign_mask (os.path.join (TMP_DIRECTORY, '64', '*.scr'))
	file_sign_mask (os.path.join (TMP_DIRECTORY, '64', '*.dll'))

if is_buildfor_arm64:
	file_sign_mask (os.path.join (TMP_DIRECTORY, 'ARM64', '*.exe'))
	file_sign_mask (os.path.join (TMP_DIRECTORY, 'ARM64', '*.scr'))
	file_sign_mask (os.path.join (TMP_DIRECTORY, 'ARM64', '*.dll'))

# Create portable package
log_status (status.TITLE, 'Create portable package')

log_status (status.SUCCESS, 'Running 7z.exe')

file_pack_directory (PORTABLE_FILE, TMP_DIRECTORY)

# Create setup package (optional)
log_status (status.TITLE, 'Create setup package (optional)')

if APP_NAME != '':
	log_status (status.SUCCESS, 'Running makensis.exe')

	os.system ('makensis.exe /V2 /DAPP_FILES_DIR="' + TMP_DIRECTORY + '" /DAPP_NAME="' + APP_NAME + '" /DAPP_NAME_SHORT="' + APP_NAME_SHORT + '" /DAPP_VERSION="' + APP_VERSION + '" /X"OutFile ' + SETUP_FILE +'" src\setup_script.nsi')

	log_status (status.TITLE, 'Sign installer with GPG')

	file_sign (SETUP_FILE)
else:
	log_status (status.WARNING, 'Disabled by command line')

log_status (status.TITLE, 'Cleaning temporary files')

dir_remove (TMP_DIRECTORY)

# Create debug symbols package
log_status (status.TITLE, 'Create debug symbols package')

if is_buildfor_64:
	file_copy (os.path.join (BIN_DIRECTORY, '64', APP_NAME_SHORT + '.pdb'), os.path.join (TMP_DIRECTORY, '64', APP_NAME_SHORT + '.pdb'))

if is_buildfor_arm64:
	file_copy (os.path.join (BIN_DIRECTORY, 'ARM64', APP_NAME_SHORT + '.pdb'), os.path.join (TMP_DIRECTORY, 'ARM64', APP_NAME_SHORT + '.pdb'))

file_pack_directory (PDB_PACKAGE_FILE, TMP_DIRECTORY)

# Calculate sha256 checksum for files
log_status (status.TITLE, 'Calculate SHA256 checksum for files')

hash_string = ''

if os.path.isfile (PORTABLE_FILE):
	hash_string += file_get_sha256 (PORTABLE_FILE)

if os.path.isfile (SETUP_FILE):
	hash_string += file_get_sha256 (SETUP_FILE)

if os.path.isfile (PDB_PACKAGE_FILE):
	hash_string += file_get_sha256 (PDB_PACKAGE_FILE)

if binary_hash_64:
	hash_string += '#64-bit\n' + binary_hash_64

if binary_hash_arm64:
	hash_string += '#ARM64\n' + binary_hash_arm64

if hash_string:
	file_create (CHECKSUM_FILE, hash_string)
else:
	log_status (status.FAILED, 'Hash string is empty!')

# Cleaning temporary files
log_status (status.TITLE, 'Cleaning temporary files')

dir_remove (TMP_DIRECTORY)

