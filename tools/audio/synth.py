"""synth.py — step 3: render each script with Kokoro (kokoro-onnx). python3 -I tools/audio/synth.py <courseDir> <part> <nparts> [voice]
   Run 2 parts in parallel on a 2-core machine. Model files: $KOKORO_DIR (default ~/.cache/kokoro). Skips tracks already rendered."""
import sys, json, os, time, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
cdir=sys.argv[1]; part=int(sys.argv[2]); nparts=int(sys.argv[3]); voice=sys.argv[4] if len(sys.argv)>4 else 'am_michael'
MODEL=os.environ.get('KOKORO_DIR', os.path.expanduser('~/.cache/kokoro'))
T=json.load(open(os.path.join(cdir,'audio','scripts_spoken.json')))
T=sorted(T,key=lambda t:-sum(len(p) for p in t['spoken']))
mine=[t for i,t in enumerate(T) if i%nparts==part]
W=os.path.join(cdir,'audio','wav'); os.makedirs(W,exist_ok=True)
k=Kokoro(os.path.join(MODEL,'kokoro-v1.0.onnx'),os.path.join(MODEL,'voices-v1.0.bin'))
for t in mine:
    out=os.path.join(W,t['id']+'.wav')
    if os.path.exists(out): continue
    t0=time.time(); parts=[]; sr=24000
    for p in t['spoken']:
        if not p.strip(): continue
        s,sr=k.create(p,voice=voice,speed=1.0,lang='en-us'); parts.append(s); parts.append(np.zeros(int(sr*0.28),dtype=np.float32))
    sf.write(out+'.tmp.wav',np.concatenate(parts),sr); os.rename(out+'.tmp.wav',out)
    print(t['id'],round(sum(len(x) for x in parts)/sr),'s audio',round(time.time()-t0),'s',flush=True)
print('done part',part,flush=True)
