"""Exercise native framing, real macOS assertions, explicit stop, EOF and expiry."""
import json, os, struct, subprocess, time
host = os.path.expanduser('~/Library/Application Support/Ultimate Guitar Zombie/ug-zombie-host')
def start(): return subprocess.Popen([host], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
def send(p, active):
    data = json.dumps({'active': active}).encode()
    p.stdin.write(struct.pack('<I', len(data)) + data); p.stdin.flush()
    n = struct.unpack('<I', p.stdout.read(4))[0]
    assert json.loads(p.stdout.read(n))['ok']
def has_assertion(p):
    output = subprocess.check_output(['pmset', '-g', 'assertions'], text=True)
    return any(f'pid {p.pid}(' in line and 'Ultimate Guitar autoscroll' in line for line in output.splitlines())
p = start()
try:
    send(p, True); assert has_assertion(p)
    send(p, False); assert not has_assertion(p)
    send(p, True); p.stdin.close(); p.wait(timeout=3); assert not has_assertion(p)
finally:
    if p.poll() is None: p.kill(); p.wait()
p = start()
try:
    send(p, True); time.sleep(13); assert not has_assertion(p), 'heartbeat expiry releases assertion'
    p.stdin.close(); p.wait(timeout=3)
finally:
    if p.poll() is None: p.kill(); p.wait()
print('Mac native helper assertions, stop, EOF and heartbeat expiry passed.')
