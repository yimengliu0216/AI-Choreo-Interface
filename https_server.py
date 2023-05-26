import http.server, ssl
from http import HTTPStatus
from urllib import parse
import json
from io import BytesIO
from multiprocessing import set_start_method
from concurrent.futures import ThreadPoolExecutor as Executor

import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cgi-bin'))
import sample
import visualize.vis_utils
from utils.parser_util import sample_args, edit_args



class meshHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        """Version of send_head that support CGI scripts"""
        if self.is_mesh_request():
            return self.gen_mesh()
        else:
            return http.server.SimpleHTTPRequestHandler.send_head(self)

    def is_mesh_request(self):
        collapsed_path = http.server._url_collapse_path(self.path)
        dir_sep = collapsed_path.split('/')
        # print(collapsed_path)
        if len(dir_sep) >= 2 and dir_sep[1] == 'cgi-bin':
            return True
        else:
            return False

    def gen_mesh(self):
        collapsed_path = http.server._url_collapse_path(self.path)
        dir_sep = collapsed_path.split('/')
        if len(dir_sep) < 3 or dir_sep[1] != 'cgi-bin' or not dir_sep[2].startswith('gen_mesh.py'):
            self.send_error(
                HTTPStatus.NOT_FOUND,
                "Request URL not found"
            )
            return
        rest, _, query = self.path.partition('?')
        if not query:
            self.send_error(
                HTTPStatus.BAD_REQUEST,
                "query must not be empty"
            )
            return
        
        query = parse.parse_qs(query)
        
        if 'text' in query:
            motion, all_save_files = sampler.infer(query['text'][0], 9.8) # text, len
            for fn in all_save_files:
                executer.submit(renderer.render2json, fn + '.pkl', fn + '.json')
                # renderer.render2json(fn + '.pkl', fn + '.json')

            all_save_files_json = json.dumps(all_save_files)

            self.send_response(HTTPStatus.OK)
            self.send_header("Content-type", "application/json")
            self.send_header("Content-Length", str(len(all_save_files_json)))
            self.end_headers()
            return BytesIO(all_save_files_json.encode())

        elif 'url' in query and 'extendlen' in query:
            motion = sampler.extend(query['url'][0], query['extendlen'][0]) # motion, len
            motion_json = json.dumps(renderer.render(motion))

            self.send_response(HTTPStatus.OK)
            self.send_header("Content-type", "application/json")
            self.send_header("Content-Length", str(len(motion_json)))
            self.end_headers()
            return BytesIO(motion_json.encode())
        
        elif 'url' in query and 'selected_partial_body' in query and 'text_partial_edit' in query:
            motion = sampler.partial_edit(query['url'][0], query['selected_partial_body'][0], query['text_partial_edit'][0]) # motion, partial body, text
            motion_json = json.dumps(renderer.render(motion))

            self.send_response(HTTPStatus.OK)
            self.send_header("Content-type", "application/json")
            self.send_header("Content-Length", str(len(motion_json)))
            self.end_headers()
            return BytesIO(motion_json.encode())
        
        elif 'url' in query and 'quality' in query:
            motion = quality_editor.quality_edit(query['url'][0], query['quality'][0]) # motion, partial body, text
            motion_json = json.dumps(renderer.render(motion))

            self.send_response(HTTPStatus.OK)
            self.send_header("Content-type", "application/json")
            self.send_header("Content-Length", str(len(motion_json)))
            self.end_headers()
            return BytesIO(motion_json.encode())
        
        elif 'url1' in query and 'url2' in query:
            motion = sampler.connect(query['url1'][0], query['url2'][0]) # motion1, motion2
            motion_json = json.dumps(renderer.render(motion))

            self.send_response(HTTPStatus.OK)
            self.send_header("Content-type", "application/json")
            self.send_header("Content-Length", str(len(motion_json)))
            self.end_headers()
            return BytesIO(motion_json.encode())

        else:
            self.send_error(
                HTTPStatus.BAD_REQUEST,
                "Query does not contain text or url field"
            )
            return 
        

if __name__ == '__main__':

    # args = sample_args()
    sampler = sample.Sampler(sample_args())
    quality_editor = sample.QualityEditor(edit_args())
    renderer = visualize.vis_utils.npyobj2dict()
    executer = Executor()

    server_address = ('0.0.0.0', 8437)

    httpd = http.server.ThreadingHTTPServer(server_address, meshHTTPRequestHandler)
    httpd.socket = ssl.wrap_socket(httpd.socket,
                                server_side=True,
                                certfile='/home/yimengliu/ssl/servername.crt',
                                keyfile='/home/yimengliu/ssl/servername.key',
                                ssl_version=ssl.PROTOCOL_TLSv1_2)
    print("start serving")
    httpd.serve_forever()
