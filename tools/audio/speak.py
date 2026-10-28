"""speak.py — step 2: turn scripts into text a TTS voice reads well (numbers, money, %, fractions, symbols, acronyms).
   python3 tools/audio/speak.py <courseDir>. A pack can add audio/lexicon.json {"ACRONYM": "spoken form"}."""
import re
from num2words import num2words as n2w
ACR = {'AUA':'allowance for uncollectible accounts','AR':'accounts receivable','AP':'accounts payable','FIFO':'fife-oh','LIFO':'life-oh','DDB':'double-declining balance','SL':'straight-line',
 'LCNRV':'lower of cost and net realizable value','NRV':'net realizable value','COGS':'cost of goods sold','SOX':'Sarbanes-Oxley','PCAOB':'P-C-A-O-B','NSF':'N-S-F','EFT':'E-F-T','FOB':'F-O-B',
 'AD':'accumulated depreciation','EI':'ending inventory','CD':'certificate of deposit','FV':'fair value','GP':'gross profit','VR':'V-R','XYZ':'X-Y-Z','CEO':'C-E-O','CFO':'C-F-O','GAAP':'gap',
 'SEC':'S-E-C','DEALOR':'dealer','ACCT':'accounting','WTHR':'W-T-H-R','USD':'dollars','PP':'P-P','JE':'journal entry','JEs':'journal entries','BS':'balance sheet','IS':'income statement','UOP':'units of production','COGAS':'cost of goods available for sale'}
def W(n): return n2w(n).replace(' and ', ' ').replace(',','')
def num(s):
    s=s.replace(',','')
    if '.' in s:
        a,b=s.split('.',1); return W(int(a or 0))+' point '+' '.join(W(int(d)) for d in b)
    n=int(s)
    if 1900<=n<=2099 and ',' not in s and len(s)==4: return n2w(n, to='year')
    return W(n)
def frac(a,d):
    a=int(a); d=int(d)
    if d==2: return 'one half' if a==1 else W(a)+' halves'
    if d==4: return ('one quarter' if a==1 else W(a)+' quarters')
    o=n2w(d,to='ordinal'); o=o.replace(' and ',' ')
    return W(a)+' '+(o if a==1 else o+'s')
def money(m):
    whole=m.group(1).replace(',',''); dec=m.group(2); k=m.group(3)
    if k: return W(int(whole))+' thousand dollars'
    n=int(whole); out=W(n)+(' dollar' if n==1 else ' dollars')
    if dec:
        d=dec[1:]
        if len(d)==2 and d!='00': c=int(d); out+=' and '+W(c)+(' cent' if c==1 else ' cents')
        elif len(d)==1: out+=' and '+W(int(d)*10)+' cents'
    return out
def speak(t):
    t=t.replace('’',"'").replace('‘',"'").replace('“','"').replace('”','"').replace(' ',' ')
    t=re.sub(r'\bDr\.\s','Doctor ',t)
    t=t.replace('e.g.','for example').replace('i.e.','that is').replace('vs.','versus').replace('etc.','and so on').replace('approx.','about')
    t=re.sub(r'(\d+)/(\d+),?\s*n/(\d+)',lambda m: f'{W(int(m.group(1)))}-{W(int(m.group(2)))}, net {W(int(m.group(3)))}',t)
    t=re.sub(r'\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.? (?=\d)',lambda m: {'Jan':'January','Feb':'February','Mar':'March','Apr':'April','Jun':'June','Jul':'July','Aug':'August','Sep':'September','Sept':'September','Oct':'October','Nov':'November','Dec':'December'}[m.group(1)]+' ',t)
    t=re.sub(r'\b(\d+)([A-Z])\b',lambda m: W(int(m.group(1)))+' '+m.group(2),t)
    t=re.sub(r'\bn/(\d+)',lambda m: 'net '+W(int(m.group(1))),t)
    t=re.sub(r'\$(\d[\d,]*)(\.\d+)?(k)?\b',money,t)
    t=re.sub(r'\((\s*)\$',r'(',t)
    t=re.sub(r'(\d+)\s*%',lambda m: num(m.group(1))+' percent',t)
    t=re.sub(r'(?<![\d.,])(\d+)/(\d+)(?![\d/])',lambda m: frac(m.group(1),m.group(2)),t)
    t=re.sub(r'#(\d+)',lambda m: 'number '+num(m.group(1)),t)
    t=re.sub(r'(\d)\s*[–-]\s*(\d)',r'\1 to \2',t)
    t=t.replace('≈',' about ').replace('±',' plus or minus ').replace('≥',' at least ').replace('≤',' at most ')
    t=t.replace('→',', then ').replace('×',' times ').replace('÷',' divided by ').replace('−',' minus ').replace('&',' and ')
    t=re.sub(r'\s=\s|=',' equals ',t)
    t=re.sub(r'=\s*about\b','is about',t)
    t=re.sub(r'\s\+\s|\+(?=\d)',' plus ',t)
    t=re.sub(r'\s>\s',' greater than ',t); t=re.sub(r'\s<\s',' less than ',t)
    t=re.sub(r'(?<=[A-Za-z])/(?=[A-Za-z])',' slash ',t)
    t=re.sub(r'\b\d[\d,]*(?:\.\d+)?\b',lambda m: num(m.group(0)),t)
    t=re.sub(r'(?<=\s)%|^%',' percent',t); t=re.sub(r'\bCh\b\.?','Chapter',t); t=re.sub(r'\s/\s',', ',t)
    t=re.sub(r'\b(Dr)\b','debit',t); t=re.sub(r'\b(Cr)\b','credit',t)
    def caps(m):
        w=m.group(0)
        if w in ACR: return ACR[w]
        if len(w)>=3 or w in ('IN','ON','OR','NO','OF','IS','AT','TO','BY','IF','AS'): return w.lower()
        return w
    t=re.sub(r'\b[A-Z][A-Za-z]*[A-Z]\b|\b[A-Z]{2,}\b',lambda m: caps(m) if m.group(0).isupper() or m.group(0) in ACR else m.group(0),t)
    t=t.replace('"','').replace('(',', ').replace(')',', ').replace(';','.').replace(':',',').replace(' - ',', ').replace('—',', ').replace('…','.')
    t=re.sub(r'\.\s*,','.',t); t=re.sub(r'\s+([,.?])',r'\1',t); t=re.sub(r'\s*,\s*,',',',t); t=re.sub(r',\s*\.','.',t); t=re.sub(r'\s+',' ',t).strip()
    return t
if __name__=='__main__':
    import json,sys,os
    d=os.path.join(sys.argv[1] if len(sys.argv)>1 else '.','audio')
    lex=os.path.join(d,'lexicon.json')
    if os.path.exists(lex): ACR.update(json.load(open(lex)))
    T=json.load(open(os.path.join(d,'scripts_raw.json')))
    for t in T:
        t['spoken']=[speak(p) for p in t['raw']]
    json.dump(T,open(os.path.join(d,'scripts_spoken.json'),'w'),indent=1,ensure_ascii=False)
    leftover=[(t['id'],p) for t in T for p in t['spoken'] if re.search(r'[\d$%=+×÷/−→<>*#@\[\]{}]',p)]
    print('leftover symbols', len(leftover)); [print(i,p[:200]) for i,p in leftover[:15]]
