#!/usr/bin/python3

import cgi, cgitb
import os
import sys
import contextlib
import frontend_backend_msg
import json

if not os.getcwd().endswith('cgi-bin'):
    os.chdir('./cgi-bin')


# cgitb.enable()
# input_data = cgi.FieldStorage()

# print('Content-Type: text/html') # HTML is following
# print('')                         # Leave a blank line
# print('<h1>Addition Results</h1>')
# try:
#     num1 = int(input_data["num1"].value)
#     num2 = int(input_data["num2"].value)
# except:
#     print('<output>Sorry, the script cannot turn your inputs into numbers (integers).</output>')
#     raise SystemExit(1)
# print('<output>{0} + {1} = {2}</output>'.format(num1, num2, num1 + num2))


def send_response(data):
    print("Content-Type: application/json")             # HTML is following
    print("Content-Length: {}".format(len(data)))       # HTML is following
    print()                                             # blank line, end of headers
    print(data)


def main():
    cgitb.enable()

    form = cgi.FieldStorage()
    if 'text' not in form:
        data = '{"error" : "text not in form"}'
        send_response(data)
        raise SystemExit(1)

    text = str(form['text'].value)

    # generate mesh
    with open('gen_mesh.log', 'a') as f:
        with contextlib.redirect_stdout(f):
            ret_dict = frontend_backend_msg.main(text)

    data = json.dumps(ret_dict)
    send_response(data)


if __name__ == '__main__':
    main()
