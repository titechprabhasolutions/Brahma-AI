import glob
import hashlib
import logging
import math
import os
import time
import platform
import re
import shutil

import ctypes
from ctypes import wintypes

class status:
	TITLE  = 'xx'
	FAILED  = '\033[31m' # red
	SUCCESS  = '\033[32m' # green
	WARNING  = '\033[33m' # orange
	BLUE  = '\033[34m' # blue
	PURPLE  = '\033[35m' # purple
	WHITE  = '\033[0m'  # white (normal)

COMPRESS_FORMAT = {
	'COMPRESSION_FORMAT_LZNT1' : ctypes.c_uint16 (2),
	'COMPRESSION_FORMAT_XPRESS' : ctypes.c_uint16 (3),
	'COMPRESSION_FORMAT_XPRESS_HUFF' : ctypes.c_uint16 (4)
	}

COMPRESS_ENGINE = {
	'COMPRESSION_ENGINE_STANDARD' : ctypes.c_uint16 (0),
	'COMPRESSION_ENGINE_MAXIMUM' : ctypes.c_uint16 (256)
	}

def is_os_64bit ():
	return platform.machine ().endswith ('64')

def clr_to_console (clr):
	if clr == status.TITLE:
		return '\n'

	elif clr == status.FAILED:
		return status.FAILED + '[failed]' + status.WHITE + '  - '

	elif clr == status.SUCCESS:
		return status.SUCCESS + '[success]' + status.WHITE + ' - '

	elif clr == status.WARNING:
		return status.WARNING + '[warning]' + status.WHITE + ' - '

	return '[debug]   - '

def log_status (clr, text):
	if clr == status.TITLE:
		text += ':'

	print (clr_to_console (clr) + text)

def check_path_with_status (title, path, is_file=False):
	is_exists = False

	if is_file:
		is_exists = os.path.isfile (path)
	else:
		is_exists = os.path.isdir (path)

	if is_exists:
		log_status (status.SUCCESS, title + ' "' + get_file_name (path) + '" was found')
	else:
		log_status (status.FAILED, title + ' "' + get_file_name (path) + '" was not found')
		os.sys.exit ('')

def natural_sort (list, key=lambda s:s):
	def get_alphanum_key_func (key):
		convert = lambda text: int (text) if text.isdigit () else text
		return lambda s: [convert (c) for c in re.split ('([0-9]+)', key (s))]

	list.sort (key=get_alphanum_key_func (key))

def format_size (size, decimal_places=2):
	for unit in ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']:
		if size < 1024.0 or unit == 'PiB':
			break

		size /= 1024.0

	return f"{size:.{decimal_places}f} {unit}"

def pack_buffer_lznt (buffer_data):
	format_and_engine = wintypes.USHORT (COMPRESS_FORMAT['COMPRESSION_FORMAT_LZNT1'].value | COMPRESS_ENGINE['COMPRESSION_ENGINE_MAXIMUM'].value)

	workspace_buffer_size = wintypes.ULONG ()
	workspace_fragment_size = wintypes.ULONG ()

	# RtlGetCompressionWorkSpaceSize
	ctypes.windll.ntdll.RtlGetCompressionWorkSpaceSize.restype = wintypes.LONG
	ctypes.windll.ntdll.RtlGetCompressionWorkSpaceSize.argtypes = (
		wintypes.USHORT,
		wintypes.PULONG,
		wintypes.PULONG
	)

	result = ctypes.windll.ntdll.RtlGetCompressionWorkSpaceSize (
		format_and_engine,
		ctypes.byref(workspace_buffer_size),
		ctypes.byref(workspace_fragment_size)
	)

	if result != 0:
		log_status (status.FAILED, 'RtlGetCompressionWorkSpaceSize failed: 0x{0:X} {0:d} ({1:s})'.format (result, ctypes.FormatError (result)))
		return None

	# Allocate memory
	compressed_buffer = ctypes.create_string_buffer (len (buffer_data))
	compressed_length = wintypes.ULONG ()

	workspace = ctypes.create_string_buffer (workspace_fragment_size.value)

	# RtlCompressBuffer
	ctypes.windll.ntdll.RtlCompressBuffer.restype = wintypes.LONG
	ctypes.windll.ntdll.RtlCompressBuffer.argtypes = (
		wintypes.USHORT,
		wintypes.LPVOID,
		wintypes.ULONG,
		wintypes.LPVOID,
		wintypes.ULONG,
		wintypes.ULONG,
		wintypes.PULONG,
		wintypes.LPVOID
	)

	result = ctypes.windll.ntdll.RtlCompressBuffer (
		format_and_engine,
		ctypes.addressof (buffer_data),
		ctypes.sizeof (buffer_data),
		ctypes.addressof (compressed_buffer),
		ctypes.sizeof (compressed_buffer),
		wintypes.ULONG (4096),
		ctypes.byref (compressed_length),
		ctypes.addressof (workspace)
	)
	if result != 0:
		log_status (status.FAILED, 'RtlCompressBuffer failed: 0x{0:X} {0:d} ({1:s})'.format (result, ctypes.FormatError (result)))
		return None

	buffer = (compressed_length.value * ctypes.c_ubyte).from_buffer_copy (compressed_buffer)

	return buffer

def unpack_buffer_lznt (buffer_data):
	format_and_engine = wintypes.USHORT (COMPRESS_FORMAT['COMPRESSION_FORMAT_XPRESS'].value)

	# Allocate memory
	uncompressed_buffer = ctypes.create_string_buffer (len (buffer_data) * 8)
	uncompressed_length = wintypes.ULONG ()

	# RtlDecompressBuffer
	ctypes.windll.ntdll.RtlDecompressBuffer.restype = wintypes.LONG
	ctypes.windll.ntdll.RtlDecompressBuffer.argtypes = (
		wintypes.USHORT,
		wintypes.LPVOID,
		wintypes.ULONG,
		wintypes.LPVOID,
		wintypes.ULONG,
		wintypes.PULONG
	)

	result = ctypes.windll.ntdll.RtlDecompressBuffer (
		format_and_engine,
		ctypes.addressof (uncompressed_buffer),
		ctypes.sizeof (uncompressed_buffer),
		ctypes.addressof (buffer_data),
		ctypes.sizeof (buffer_data),
		ctypes.byref (uncompressed_length)
	)

	if result != 0:
		log_status (status.FAILED, 'RtlDecompressBuffer failed: 0x{0:X} {0:d} ({1:s})'.format (result, ctypes.FormatError (result)))
		return None

	buffer = (uncompressed_length.value * ctypes.c_ubyte).from_buffer_copy (uncompressed_buffer)

	return buffer

def compress_buffer_to_file_lznt (buffer_data, buffer_length, file):
	buffer = pack_buffer_lznt (buffer_data)

	if buffer == None:
		log_status (status.FAILED, 'Compression failed...')
		return

	log_status (status.SUCCESS, 'Compress buffer with %s size to %s (%s saved)...' % (format_size (buffer_length), format_size (len (buffer)), format_size (buffer_length - len (buffer))))

	with open (file, 'wb') as fn:
		fn.write (buffer)
		fn.close ()

def compress_file_lznt (file_o, file_s):
	with open (file_o, 'rb') as fn:
		data = fn.read ()
		fn.close ()

		if not data:
			log_status (status.WARNING, 'File is empty: "' + get_file_name (file_o) + '"')

		else:
			buffer_length = len (data)
			buffer_data = (buffer_length * ctypes.c_ubyte).from_buffer_copy (data)

			compress_buffer_to_file_lznt (buffer_data, buffer_length, file_s)

def get_file_name (path):
	dir_name = os.path.basename (os.path.dirname (path))

	dir_name = os.path.basename (os.path.dirname (path))

	if not dir_name:
		dir_name = os.path.basename (path)

	if not dir_name:
		return path

	dir_sub_name = os.path.join (dir_name, os.path.basename (path))

	if not dir_sub_name:
		dir_sub_name = os.path.basename (path)

	return dir_sub_name

def get_sha256 (path):
	with open (path, 'rb') as fn:
		buff = fn.read ()
		fn.close ()

		return hashlib.sha256 (buff).hexdigest ()

	return None

def file_get_sha256 (path):
	file_name = get_file_name (path)

	if not os.path.isfile (path):
		log_status (status.WARNING, 'File hash. Not found: "' + file_name + '"')
		return None

	hash_code = get_sha256 (path)

	if hash_code:
		log_status (status.SUCCESS, 'File hash: "' + os.path.basename (path) + '" - ' + hash_code)
		return hash_code + ' *' + os.path.basename (path) + '\n'

	log_status (status.FAILED, 'File hash. Failed: "' + file_name + '"')

	return None

def file_create (path, data):
	try:
		fn = open (path, 'w', newline='')

		if data:
			fn.write (data)

		fn.close ()

	except Exception as e:
		log_status (status.FAILED, 'Create file. Exception: "' + get_file_name (path) + '" (' + str (e) + ')')

	else:
		log_status (status.SUCCESS, 'Create file: "' + get_file_name (path) + '"')

def file_copy (src_file, dst_file, made_dir=True):
	if not os.path.isfile (src_file):
		log_status (status.FAILED, 'File copy. Not found: "' + get_file_name (src_file) + '"')
		return

	dst_dir = os.path.dirname (os.path.abspath (dst_file))
	file_name = get_file_name (dst_file)

	if not os.path.isdir (dst_dir):
		if made_dir:
			os.makedirs (dst_dir, exist_ok=True)
		else:
			log_status (status.WARNING, 'File copy. Dest directory: "' + get_file_name (dst_dir) + '" was not found.')
			return

	# Check file existence
	if os.path.isfile (dst_file):
		if get_sha256 (dst_file) == get_sha256 (src_file):
			log_status (status.WARNING, 'File copy. Not modified: "' + file_name + '"')
			return

	try:
		shutil.copyfile (src_file, dst_file)

	except Exception as e:
		log_status (status.FAILED, 'File copy. Exception: "' + file_name + '" (' + str (e) + ')')

	else:
		log_status (status.SUCCESS, 'File copy: "' + file_name + '"')

def file_remove (path):
	file_name = get_file_name (path)

	if not os.path.isfile (path):
		log_status (status.WARNING, 'File delete. Not found: "' + file_name + '"')
		return

	try:
		os.remove (path)

	except Exception as e:
		log_status (status.FAILED, 'File delete. Exception: "' + file_name + '" (' + str (e) + ')')

	else:
		log_status (status.SUCCESS, 'File delete: "' + file_name + '"')

def file_sign (path):
	if not os.path.isfile (path):
		log_status (status.FAILED, 'File sign. Not found: "' + get_file_name (path) + '"')
		return

	path_sign = path + '.sig'

	file_remove (path_sign)

	log_status (status.SUCCESS, 'File sign: "' + get_file_name (path) + '"')

	os.system ('gpg.exe --output "' + path_sign + '" --detach-sign "' + path + '"')

def file_copy_mask (mask, dst_dir):
	for fn in glob.glob (mask):
		file_copy (fn, os.path.join (dst_dir, os.path.basename (fn)))

def file_sign_mask (mask):
	for fn in glob.glob (mask):
		file_sign (fn)

def dir_remove (path):
	if not os.path.isdir (path):
		log_status (status.FAILED, 'Directory delete. Not found: "' + get_file_name (path) + '"')
		return

	for fn in glob.glob (os.path.join (path, '*')):
		if os.path.isdir (fn):
			dir_remove (fn);
		else:
			file_remove (fn)

def file_pack_directory (out_file, directory):
	# МАТЬ ЕБАЛ ДОКУМЕНТАЦИЮ КОМАНДНОЙ СТРОКИ "7z.exe a -h"
	# ТАМ ПОНЯТНО РОВНО - НИ-ХУ-Я БЛЯТЬ!
	os.system ('7z.exe a -mm=LZMA2 -mx=9 -mfb=257 -mtc=off -slp -bb1 "' + out_file + '" -r "' + directory + '"')

def initialize_helper ():
	# Colored terminal fix
	os.system ('')

	logging.basicConfig (level=logging.INFO)

#if __name__ == 'helper':
initialize_helper ()
