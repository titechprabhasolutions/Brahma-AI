import xml.dom.minidom
import hashlib

import argparse
from helper import *

parser = argparse.ArgumentParser (add_help=False, description='Update internal rules.')
parser.add_argument ('--mode', help='working mode (update/unpack/pack)', required=True)
parser.add_argument ('--i', help='in file', required=True)
parser.add_argument ('--o', help='out file', required=True)

args = parser.parse_args ()

ARG_MODE=args.mode
ARG_FILE_IN=args.i
ARG_FILE_OUT=args.o

CURRENT_DIRECTORY = os.path.dirname (os.path.abspath (__file__))
PROJECT_DIRECTORY = os.path.join (CURRENT_DIRECTORY, '..', '..', ARG_FILE_IN)
WSB_DIR = os.path.join (CURRENT_DIRECTORY, '..', '..', '!repos', 'WindowsSpyBlocker', 'data', 'firewall')

# File information
PROFILE2_FOURCC = b'\x73\x77\x63\x31'
PROFILE2_FOURCC_LENGTH = len (PROFILE2_FOURCC)
PROFILE2_HASH_LENGTH = 32

check_path_with_status ('Profile file', ARG_FILE_IN, True)
check_path_with_status ('WSB directory', WSB_DIR)

if ARG_MODE != 'update' and ARG_MODE != 'pack' and ARG_MODE != 'unpack':
	log_status (status.FAILED, 'Unknown mode specified "%s"' % (ARG_MODE))
	os.sys.exit ('')

def get_hash (buffer):
	return hashlib.sha256 (buffer).digest ()

def is_valid_hash (buffer, compare_hash):
	current_hash = get_hash (buffer)

	return (current_hash == compare_hash)

def is_valid_signature (signature):
	return (signature == PROFILE2_FOURCC)

def parse_xml (data):
	# toprettyxml() hack
	data = data.replace ('\n', '')
	data = data.replace ('\t', '')

	xml_doc = xml.dom.minidom.parseString (data)
	xml_root = xml_doc.getElementsByTagName ('root')

	return xml_doc, xml_root

def save_file (file_path, buffer):
	with open (file_path, 'wb') as fn:
		fn.write (buffer)
		fn.close ()

def load_profile (file_path, mode):
	with open (file_path, 'rb') as fn:

		# read file size
		fn.seek (0, os.SEEK_END)

		if fn.tell () <= (PROFILE2_FOURCC_LENGTH + PROFILE2_HASH_LENGTH):
			log_status (status.FAILED, 'Length failure: "' + get_file_name (file_path) + '"')
			fn.close ()

			return None

		fn.seek (0, os.SEEK_SET) # restore position

		# read signature value
		signature_value = fn.read (PROFILE2_FOURCC_LENGTH)

		if not is_valid_signature (signature_value):
			log_status (status.FAILED, 'Signature failure: "' + get_file_name (file_path) + '"')
			fn.close ()

			return None

		# read sha256 value
		hash_value = fn.read (PROFILE2_HASH_LENGTH)
		lznt_buffer = fn.read ()

		fn.close ()

		buffer_data = (len (lznt_buffer) * ctypes.c_ubyte).from_buffer_copy (lznt_buffer)
		buffer_data = unpack_buffer_lznt (buffer_data)

		if not buffer_data:
			log_status (status.FAILED, 'Decompression failure: "' + get_file_name (file_path) + '"')
			return None

		if not is_valid_hash (buffer_data, hash_value):
			log_status (status.FAILED, 'Hash failure: "' + get_file_name (file_path) + '"')
			return None

		return buffer_data

def save_profile (file_path, hash_value, xml_buffer, mode):
	if mode == 'unpack':
		log_status (status.SUCCESS, 'Write %s size...' % (format_size (len (xml_buffer))))

		with open (file_path, 'wb') as fn:
			fn.write (xml_buffer)
			fn.close ()
	elif mode == 'update' or mode == 'pack':
		buffer_length = len (xml_buffer)
		buffer_data = (buffer_length * ctypes.c_ubyte).from_buffer_copy (xml_buffer)

		buffer_data = pack_buffer_lznt (buffer_data)

		if not buffer_data:
			log_status (status.FAILED, 'Compression failed...')
			return

		log_status (status.SUCCESS, 'Compress buffer with %s size to %s (%s saved)...' % (format_size (buffer_length), format_size (len (buffer_data)), format_size (buffer_length - len (buffer_data))))

		with open (file_path, 'wb') as fn:
			fn.write (PROFILE2_FOURCC) # compressed profile signature
			fn.write (hash_value) # sha256 hash of uncompressed data

			fn.write (buffer_data)

			fn.close ()

# Start parse
buffer = load_profile (ARG_FILE_IN, ARG_MODE)

if not buffer:
	log_status (status.FAILED, 'Loading failure...')
	os.sys.exit ('')

buffer_hash = get_hash (buffer)
buffer = bytes (buffer).decode ('utf-8')

xml_doc, xml_root = parse_xml (buffer)

# Get timestamp
timestamp = int (xml_root[0].getAttribute ('timestamp'))
total_rules_count = 0

if ARG_MODE == 'update':
	# Cleanup xml
	for node in xml_doc.getElementsByTagName ('rules_blocklist'):
		parent = node.parentNode
		parent.removeChild (node)

	xml_root[0].appendChild (xml_doc.createElement ('rules_blocklist'))
	xml_section = xml_doc.getElementsByTagName ('rules_blocklist')

	if not xml_section:
		raise Exception ('Parse xml failure.')

	# Enumerate Windows Spy Blocker spy/extra and update rules
	for file_name in os.listdir (WSB_DIR):
		module_name = os.path.splitext (file_name)[0]
		module_path = os.path.join (WSB_DIR, file_name)

		log_status (status.TITLE, 'Parsing "' + module_name + '" rules')

		lastmod = int (os.path.getmtime (module_path))

		if lastmod > timestamp:
			timestamp = lastmod

		with open (module_path, 'r') as fn:
			rows = fn.readlines ()
			natural_sort (rows)
			fn.close ()

			count = 0

			for string in rows:
				line = string.strip ('\n\r\t ')

				if not line or line.startswith ('#') or line.startswith ('<') or line.startswith ('>') or line.startswith ('='):
					continue

				count += 1

				new_item = xml_doc.createElement ('item')

				new_item.setAttribute ('name', module_name + '_' + line)
				new_item.setAttribute ('rule', line)

				xml_section[0].appendChild (new_item)

			if count != 0:
				log_status (status.SUCCESS, 'Found %i %s rules...' % (count, module_name))
			else:
				log_status (status.WARNING, 'Not found %s rules...' % (module_name))

			total_rules_count += count

	# Set new rule timestamp
	xml_root[0].setAttribute ('timestamp', str (timestamp))

# Generate xml string
data = xml_doc.toprettyxml (indent='\t', newl='\n')

if not data:
	raise Exception ('Write xml failure.')

data = data.replace ('/>', ' />')
data = bytes (data, 'utf-8')

# Save profile file
log_status (status.TITLE, 'Saving file')

save_profile (ARG_FILE_OUT, buffer_hash, data, ARG_MODE)

print ('\nBlocklist rules count: %s\nBlocklist timestamp: %s\n' % (str (total_rules_count), str (timestamp)))
