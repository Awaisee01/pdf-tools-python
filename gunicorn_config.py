import multiprocessing

bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"  # 'gevent' is optional if you need async
timeout = 120
keepalive = 5

accesslog = "-"
errorlog = "-"
loglevel = "info"

# Ensure temp files are cleaned up on worker exit if needed
# (handled by app.py background thread, but good to know)
