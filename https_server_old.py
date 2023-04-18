import http.server, ssl

server_address = ('0.0.0.0', 8435)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)
httpd.socket = ssl.wrap_socket(httpd.socket,
                               server_side=True,
                               certfile='/home/yimengliu/ssl/servername.crt',
                               keyfile='/home/yimengliu/ssl/servername.key',
                               ssl_version=ssl.PROTOCOL_TLS)
print("start serving")
httpd.serve_forever()