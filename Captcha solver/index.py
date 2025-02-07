import easyocr
import sys
reader = easyocr.Reader(['en'], gpu=False, verbose=False) # this needs to run only once to load the model into memory
result = reader.readtext(  sys.argv[1], detail = 0)
print(result, flush=True);